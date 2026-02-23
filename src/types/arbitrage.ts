import type { BinaryPriceSnapshot } from "./orderbook.js";

export interface ArbitrageOpportunity {
  id: string;
  conditionId: string;
  question: string;
  yesTokenId: string;
  noTokenId: string;

  yesBuyPrice: number;
  noBuyPrice: number;
  combinedCost: number;
  grossProfitPerShare: number;
  estimatedFeePerShare: number;
  netProfitPerShare: number;
  netProfitBps: number;

  maxFillableShares: number;
  detectedAt: number;
  priceSnapshot: BinaryPriceSnapshot;
}

export interface PaperTrade {
  id: string;
  opportunityId: string;
  conditionId: string;
  question: string;

  yesBuyPrice: number;
  noBuyPrice: number;
  shares: number;
  totalCost: number;
  estimatedFee: number;
  expectedSettlementValue: number;
  expectedProfit: number;

  executedAt: number;
  status: "open" | "settled";
  settlementProfit?: number;
}

export interface PortfolioSummary {
  totalPaperTrades: number;
  openPositions: number;
  totalCapitalDeployed: number;
  totalExpectedProfit: number;
  totalSettledProfit: number;
  averageProfitBps: number;
  bestTradeProfitBps: number;
  worstTradeProfitBps: number;
  opportunitiesDetected: number;
  opportunitiesSkipped: number;
}
