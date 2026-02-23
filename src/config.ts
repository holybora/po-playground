import "dotenv/config";
import type { BotConfig } from "./types/config.js";

export function loadConfig(): BotConfig {
  return {
    clobBaseUrl: process.env.CLOB_BASE_URL ?? "https://clob.polymarket.com",
    gammaBaseUrl: process.env.GAMMA_BASE_URL ?? "https://gamma-api.polymarket.com",
    chainId: parseInt(process.env.CHAIN_ID ?? "137", 10),

    maxMarketsToScan: parseInt(process.env.MAX_MARKETS ?? "50", 10),
    minLiquidityUsd: parseFloat(process.env.MIN_LIQUIDITY_USD ?? "5000"),
    minVolumeUsd: parseFloat(process.env.MIN_VOLUME_USD ?? "1000"),
    marketRefreshIntervalMs: parseInt(process.env.MARKET_REFRESH_MS ?? "300000", 10),

    pricePollingIntervalMs: parseInt(process.env.PRICE_POLL_MS ?? "2000", 10),
    stalePriceThresholdMs: parseInt(process.env.STALE_PRICE_MS ?? "10000", 10),

    arbThreshold: parseFloat(process.env.ARB_THRESHOLD ?? "0.998"),
    minProfitBps: parseInt(process.env.MIN_PROFIT_BPS ?? "20", 10),
    feeRateBps: parseInt(process.env.FEE_RATE_BPS ?? "0", 10),

    defaultPositionSizeUsd: parseFloat(process.env.POSITION_SIZE_USD ?? "100"),
    maxOpenPositions: parseInt(process.env.MAX_OPEN_POSITIONS ?? "20", 10),
    maxPositionPerMarket: parseInt(process.env.MAX_POS_PER_MARKET ?? "1", 10),

    persistToFile: process.env.PERSIST_TO_FILE !== "false",
    dataDir: process.env.DATA_DIR ?? "./data",

    clobMaxReqPer10s: parseInt(process.env.CLOB_RATE_LIMIT ?? "1400", 10),
    gammaMaxReqPer10s: parseInt(process.env.GAMMA_RATE_LIMIT ?? "250", 10),

    logLevel: (process.env.LOG_LEVEL as BotConfig["logLevel"]) ?? "info",
  };
}
