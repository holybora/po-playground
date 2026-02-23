import type { ClobClientWrapper } from "../services/clob-client-wrapper.js";
import type { BinaryMarket } from "../types/market.js";
import type { BinaryPriceSnapshot } from "../types/orderbook.js";
import type { BotConfig } from "../types/config.js";
import type { Logger } from "../utils/logger.js";
import { combinedAskCost } from "../utils/math.js";

interface OrderEntry {
  price: string;
  size: string;
}

// The CLOB returns asks sorted descending (highest first) and bids ascending (lowest first).
// Best ask = lowest price in asks array. Best bid = highest price in bids array.
function bestAsk(entries: OrderEntry[]): { price: number; size: number } | null {
  if (!entries?.length) return null;
  let best = { price: Infinity, size: 0 };
  for (const e of entries) {
    const p = parseFloat(e.price);
    if (p < best.price) best = { price: p, size: parseFloat(e.size) };
  }
  return best.price === Infinity ? null : best;
}

function bestBid(entries: OrderEntry[]): { price: number; size: number } | null {
  if (!entries?.length) return null;
  let best = { price: -Infinity, size: 0 };
  for (const e of entries) {
    const p = parseFloat(e.price);
    if (p > best.price) best = { price: p, size: parseFloat(e.size) };
  }
  return best.price === -Infinity ? null : best;
}

export class PriceMonitor {
  constructor(
    private readonly clobClient: ClobClientWrapper,
    private readonly config: BotConfig,
    private readonly logger: Logger,
  ) {}

  async fetchPriceSnapshots(markets: BinaryMarket[]): Promise<BinaryPriceSnapshot[]> {
    const snapshots: BinaryPriceSnapshot[] = [];

    // Process in parallel batches of 10 to balance speed and rate limits
    const batchSize = 10;
    for (let i = 0; i < markets.length; i += batchSize) {
      const batch = markets.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((m) => this.fetchSingleSnapshot(m)),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          snapshots.push(result.value);
        }
      }
    }

    return snapshots;
  }

  private async fetchSingleSnapshot(market: BinaryMarket): Promise<BinaryPriceSnapshot | null> {
    try {
      const [yesBook, noBook] = await Promise.all([
        this.clobClient.getOrderBook(market.yesTokenId),
        this.clobClient.getOrderBook(market.noTokenId),
      ]);

      const yesBest = bestAsk(yesBook.asks);
      const noBest = bestAsk(noBook.asks);

      // Need asks on both sides for arb calculation
      if (!yesBest || !noBest) {
        this.logger.debug("PRICE", `Empty order book for "${market.question.slice(0, 40)}..."`);
        return null;
      }

      const yesBidBest = bestBid(yesBook.bids);
      const noBidBest = bestBid(noBook.bids);

      const combined = combinedAskCost(yesBest.price, noBest.price);
      const now = Date.now();

      return {
        conditionId: market.conditionId,
        yesTokenId: market.yesTokenId,
        noTokenId: market.noTokenId,
        yesBestAsk: yesBest.price,
        yesBestAskSize: yesBest.size,
        yesBestBid: yesBidBest?.price ?? 0,
        yesBestBidSize: yesBidBest?.size ?? 0,
        noBestAsk: noBest.price,
        noBestAskSize: noBest.size,
        noBestBid: noBidBest?.price ?? 0,
        noBestBidSize: noBidBest?.size ?? 0,
        combinedAskCost: combined,
        spreadFromParity: 1.0 - combined,
        timestamp: now,
        isStale: false,
      };
    } catch (err) {
      this.logger.debug("PRICE", `Error fetching snapshot for ${market.conditionId.slice(0, 12)}...`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }
}
