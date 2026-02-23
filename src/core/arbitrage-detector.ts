import { v4 as uuid } from "uuid";
import type { BinaryMarket } from "../types/market.js";
import type { BinaryPriceSnapshot } from "../types/orderbook.js";
import type { ArbitrageOpportunity } from "../types/arbitrage.js";
import type { BotConfig } from "../types/config.js";
import type { Logger } from "../utils/logger.js";

export class ArbitrageDetector {
  constructor(
    private readonly config: BotConfig,
    private readonly logger: Logger,
  ) {}

  detectOpportunities(
    snapshots: BinaryPriceSnapshot[],
    marketMap: Map<string, BinaryMarket>,
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    for (const snapshot of snapshots) {
      const market = marketMap.get(snapshot.conditionId);
      if (!market) continue;

      const opp = this.analyzeSnapshot(snapshot, market);
      if (opp) {
        this.logger.logOpportunity(opp);
        opportunities.push(opp);
      }
    }

    return opportunities;
  }

  private analyzeSnapshot(
    snapshot: BinaryPriceSnapshot,
    market: BinaryMarket,
  ): ArbitrageOpportunity | null {
    if (snapshot.isStale) return null;

    const combinedCost = snapshot.combinedAskCost;

    // No opportunity if combined cost is at or above threshold
    if (combinedCost >= this.config.arbThreshold) return null;

    const grossProfitPerShare = 1.0 - combinedCost;
    const estimatedFeePerShare = (this.config.feeRateBps / 10000) * combinedCost;
    const netProfitPerShare = grossProfitPerShare - estimatedFeePerShare;
    const netProfitBps = (netProfitPerShare / combinedCost) * 10000;

    // Below minimum profit threshold
    if (netProfitBps < this.config.minProfitBps) return null;

    const maxFillableShares = Math.min(
      snapshot.yesBestAskSize,
      snapshot.noBestAskSize,
    );

    // Skip if fillable amount is negligible
    if (maxFillableShares < 1) return null;

    return {
      id: uuid(),
      conditionId: snapshot.conditionId,
      question: market.question,
      yesTokenId: snapshot.yesTokenId,
      noTokenId: snapshot.noTokenId,
      yesBuyPrice: snapshot.yesBestAsk,
      noBuyPrice: snapshot.noBestAsk,
      combinedCost,
      grossProfitPerShare,
      estimatedFeePerShare,
      netProfitPerShare,
      netProfitBps,
      maxFillableShares,
      detectedAt: Date.now(),
      priceSnapshot: snapshot,
    };
  }
}
