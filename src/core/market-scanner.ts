import type { GammaClient } from "../services/gamma-client.js";
import type { GammaMarket, BinaryMarket } from "../types/market.js";
import type { BotConfig } from "../types/config.js";
import type { Logger } from "../utils/logger.js";

export class MarketScanner {
  constructor(
    private readonly gammaClient: GammaClient,
    private readonly config: BotConfig,
    private readonly logger: Logger,
  ) {}

  async scanMarkets(): Promise<BinaryMarket[]> {
    this.logger.info("SCANNER", "Scanning for active binary markets...");

    const rawMarkets = await this.gammaClient.getAllActiveMarkets(
      this.config.minLiquidityUsd,
      this.config.minVolumeUsd,
      this.config.maxMarketsToScan * 2, // fetch extra to filter
    );

    const binaryMarkets: BinaryMarket[] = [];

    for (const raw of rawMarkets) {
      const parsed = this.parseBinaryMarket(raw);
      if (parsed) binaryMarkets.push(parsed);
      if (binaryMarkets.length >= this.config.maxMarketsToScan) break;
    }

    // Sort by liquidity descending
    binaryMarkets.sort((a, b) => b.liquidityUsd - a.liquidityUsd);

    this.logger.info("SCANNER", `Found ${binaryMarkets.length} binary markets`, {
      topMarket: binaryMarkets[0]?.question ?? "none",
    });

    return binaryMarkets;
  }

  private parseBinaryMarket(raw: GammaMarket): BinaryMarket | null {
    // Must have order book enabled
    if (!raw.enableOrderBook) return null;

    // Parse token IDs - must have exactly 2 (binary)
    let tokenIds: string[];
    try {
      tokenIds = JSON.parse(raw.clobTokenIds);
    } catch {
      return null;
    }
    if (!Array.isArray(tokenIds) || tokenIds.length !== 2) return null;

    // Parse outcomes - must be Yes/No binary
    let outcomes: string[];
    try {
      outcomes = JSON.parse(raw.outcomes);
    } catch {
      return null;
    }
    if (!Array.isArray(outcomes) || outcomes.length !== 2) return null;

    // Determine which token is YES and which is NO
    const yesIndex = outcomes.findIndex(
      (o) => o.toLowerCase() === "yes",
    );
    const noIndex = outcomes.findIndex(
      (o) => o.toLowerCase() === "no",
    );
    if (yesIndex === -1 || noIndex === -1) return null;

    return {
      conditionId: raw.conditionId,
      question: raw.question,
      slug: raw.slug,
      yesTokenId: tokenIds[yesIndex],
      noTokenId: tokenIds[noIndex],
      liquidityUsd: raw.liquidityNum ?? parseFloat(raw.liquidity) ?? 0,
      volumeUsd: raw.volumeNum ?? parseFloat(raw.volume) ?? 0,
      endDate: new Date(raw.endDate),
      category: raw.category,
      negRisk: raw.neg_risk,
      lastRefreshed: Date.now(),
    };
  }
}
