export interface BotConfig {
  clobBaseUrl: string;
  gammaBaseUrl: string;
  chainId: number;

  // Scanning
  maxMarketsToScan: number;
  minLiquidityUsd: number;
  minVolumeUsd: number;
  marketRefreshIntervalMs: number;

  // Pricing
  pricePollingIntervalMs: number;
  stalePriceThresholdMs: number;

  // Arbitrage
  arbThreshold: number;
  minProfitBps: number;
  feeRateBps: number;

  // Paper trading
  defaultPositionSizeUsd: number;
  maxOpenPositions: number;
  maxPositionPerMarket: number;

  // Persistence
  persistToFile: boolean;
  dataDir: string;

  // Rate limiting
  clobMaxReqPer10s: number;
  gammaMaxReqPer10s: number;

  // Logging
  logLevel: "debug" | "info" | "warn" | "error";
}
