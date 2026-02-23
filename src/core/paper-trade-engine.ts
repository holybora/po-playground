import { v4 as uuid } from "uuid";
import type { ArbitrageOpportunity, PaperTrade, PortfolioSummary } from "../types/arbitrage.js";
import type { BotConfig } from "../types/config.js";
import type { TradeStore } from "../persistence/trade-store.js";
import type { Logger } from "../utils/logger.js";

export class PaperTradeEngine {
  constructor(
    private readonly config: BotConfig,
    private readonly store: TradeStore,
    private readonly logger: Logger,
  ) {}

  executePaperTrade(opportunity: ArbitrageOpportunity): PaperTrade | null {
    this.store.incrementOpportunities();

    if (!this.canTrade(opportunity)) {
      this.store.incrementSkipped();
      return null;
    }

    // Determine position size (in shares)
    const maxSharesByBudget = this.config.defaultPositionSizeUsd / opportunity.combinedCost;
    const shares = Math.min(maxSharesByBudget, opportunity.maxFillableShares);

    if (shares < 1) {
      this.store.incrementSkipped();
      return null;
    }

    const totalCost = opportunity.combinedCost * shares;
    const estimatedFee = opportunity.estimatedFeePerShare * shares;
    const expectedSettlementValue = 1.0 * shares;
    const expectedProfit = expectedSettlementValue - totalCost - estimatedFee;

    const trade: PaperTrade = {
      id: uuid(),
      opportunityId: opportunity.id,
      conditionId: opportunity.conditionId,
      question: opportunity.question,
      yesBuyPrice: opportunity.yesBuyPrice,
      noBuyPrice: opportunity.noBuyPrice,
      shares,
      totalCost,
      estimatedFee,
      expectedSettlementValue,
      expectedProfit,
      executedAt: Date.now(),
      status: "open",
    };

    this.store.addTrade(trade);
    this.logger.logPaperTrade(trade);
    return trade;
  }

  getPortfolioSummary(): PortfolioSummary {
    const allTrades = this.store.getAllTrades();
    const openTrades = allTrades.filter((t) => t.status === "open");
    const settledTrades = allTrades.filter((t) => t.status === "settled");

    let totalCapitalDeployed = 0;
    let totalExpectedProfit = 0;
    let totalSettledProfit = 0;
    let bestTradeProfitBps = 0;
    let worstTradeProfitBps = Infinity;
    const profitBpsList: number[] = [];

    for (const trade of allTrades) {
      totalCapitalDeployed += trade.totalCost;
      totalExpectedProfit += trade.expectedProfit;
      const bps = (trade.expectedProfit / trade.totalCost) * 10000;
      profitBpsList.push(bps);
      bestTradeProfitBps = Math.max(bestTradeProfitBps, bps);
      worstTradeProfitBps = Math.min(worstTradeProfitBps, bps);
    }

    for (const trade of settledTrades) {
      totalSettledProfit += trade.settlementProfit ?? trade.expectedProfit;
    }

    const averageProfitBps =
      profitBpsList.length > 0
        ? profitBpsList.reduce((a, b) => a + b, 0) / profitBpsList.length
        : 0;

    return {
      totalPaperTrades: allTrades.length,
      openPositions: openTrades.length,
      totalCapitalDeployed,
      totalExpectedProfit,
      totalSettledProfit,
      averageProfitBps,
      bestTradeProfitBps: allTrades.length > 0 ? bestTradeProfitBps : 0,
      worstTradeProfitBps: allTrades.length > 0 ? worstTradeProfitBps : 0,
      opportunitiesDetected: this.store.getOpportunityCount(),
      opportunitiesSkipped: this.store.getSkippedCount(),
    };
  }

  private canTrade(opportunity: ArbitrageOpportunity): boolean {
    const openTrades = this.store.getOpenTrades();
    if (openTrades.length >= this.config.maxOpenPositions) {
      this.logger.debug("TRADE", "Max open positions reached");
      return false;
    }

    const marketTrades = this.store.getTradesForMarket(opportunity.conditionId);
    if (marketTrades.length >= this.config.maxPositionPerMarket) {
      this.logger.debug("TRADE", `Max positions per market reached for ${opportunity.conditionId.slice(0, 12)}...`);
      return false;
    }

    return true;
  }
}
