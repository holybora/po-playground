import { loadConfig } from "./config.js";
import { Logger } from "./utils/logger.js";
import { RateLimiter } from "./utils/rate-limiter.js";
import { GammaClient } from "./services/gamma-client.js";
import { ClobClientWrapper } from "./services/clob-client-wrapper.js";
import { MarketScanner } from "./core/market-scanner.js";
import { PriceMonitor } from "./core/price-monitor.js";
import { ArbitrageDetector } from "./core/arbitrage-detector.js";
import { PaperTradeEngine } from "./core/paper-trade-engine.js";
import { TradeStore } from "./persistence/trade-store.js";
import type { BinaryMarket } from "./types/market.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger(config.logLevel);

  logger.info("BOT", "Polymarket Binary Arbitrage Bot starting...");
  logger.info("BOT", "Configuration:", {
    maxMarkets: config.maxMarketsToScan,
    pollInterval: `${config.pricePollingIntervalMs}ms`,
    arbThreshold: config.arbThreshold,
    minProfitBps: config.minProfitBps,
    positionSize: `$${config.defaultPositionSizeUsd}`,
  });

  // Rate limiters
  const clobLimiter = new RateLimiter(config.clobMaxReqPer10s, 10_000);
  const gammaLimiter = new RateLimiter(config.gammaMaxReqPer10s, 10_000);

  // Services
  const gammaClient = new GammaClient(config.gammaBaseUrl, gammaLimiter, logger);
  const clobClient = new ClobClientWrapper(config.clobBaseUrl, config.chainId, clobLimiter, logger);

  // Core modules
  const scanner = new MarketScanner(gammaClient, config, logger);
  const priceMonitor = new PriceMonitor(clobClient, config, logger);
  const detector = new ArbitrageDetector(config, logger);
  const store = new TradeStore(config, logger);
  const engine = new PaperTradeEngine(config, store, logger);

  // Load persisted state
  await store.load();

  // Initial market scan
  let monitoredMarkets: BinaryMarket[] = [];
  try {
    monitoredMarkets = await scanner.scanMarkets();
  } catch (err) {
    logger.error("BOT", "Failed to scan markets on startup", err instanceof Error ? err : undefined);
    process.exit(1);
  }

  const marketMap = new Map(monitoredMarkets.map((m) => [m.conditionId, m]));
  let lastMarketScan = Date.now();
  let cycleCount = 0;

  // Print monitored markets
  logger.info("BOT", `Monitoring ${monitoredMarkets.length} markets:`);
  for (const m of monitoredMarkets.slice(0, 10)) {
    logger.info("BOT", `  - "${m.question.slice(0, 60)}${m.question.length > 60 ? "..." : ""}" (liq: $${m.liquidityUsd.toFixed(0)})`);
  }
  if (monitoredMarkets.length > 10) {
    logger.info("BOT", `  ... and ${monitoredMarkets.length - 10} more`);
  }

  // Graceful shutdown
  let running = true;
  const shutdown = async () => {
    logger.info("BOT", "Shutting down...");
    running = false;
    await store.save();
    logger.logPortfolioSummary(engine.getPortfolioSummary());
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Main loop
  logger.info("BOT", "Starting scan loop...\n");

  while (running) {
    const cycleStart = Date.now();
    cycleCount++;

    try {
      // Refresh market list if interval elapsed
      if (Date.now() - lastMarketScan > config.marketRefreshIntervalMs) {
        monitoredMarkets = await scanner.scanMarkets();
        lastMarketScan = Date.now();
        marketMap.clear();
        for (const m of monitoredMarkets) {
          marketMap.set(m.conditionId, m);
        }
      }

      // Fetch price snapshots
      const snapshots = await priceMonitor.fetchPriceSnapshots(monitoredMarkets);

      // Log top combined costs for visibility
      if (cycleCount % 5 === 1) {
        const sorted = [...snapshots].sort((a, b) => a.combinedAskCost - b.combinedAskCost);
        const top3 = sorted.slice(0, 3);
        for (const s of top3) {
          const market = marketMap.get(s.conditionId);
          const q = market?.question.slice(0, 45) ?? s.conditionId.slice(0, 12);
          logger.debug(
            "PRICE",
            `"${q}" YES@${s.yesBestAsk.toFixed(4)} + NO@${s.noBestAsk.toFixed(4)} = ${s.combinedAskCost.toFixed(4)} (${s.spreadFromParity > 0 ? "ARB" : "spread"}: ${Math.abs(s.spreadFromParity * 10000).toFixed(1)} bps)`,
          );
        }
      }

      // Detect arbitrage
      const opportunities = detector.detectOpportunities(snapshots, marketMap);

      // Execute paper trades
      let tradesThisCycle = 0;
      for (const opp of opportunities) {
        const trade = engine.executePaperTrade(opp);
        if (trade) tradesThisCycle++;
      }

      const elapsed = Date.now() - cycleStart;
      logger.logScanCycle(snapshots.length, opportunities.length, tradesThisCycle, elapsed);

      // Periodic portfolio summary and save
      if (cycleCount % 30 === 0) {
        logger.logPortfolioSummary(engine.getPortfolioSummary());
        await store.save();
      }

      // Wait for next cycle
      const waitTime = Math.max(0, config.pricePollingIntervalMs - elapsed);
      if (waitTime > 0) await sleep(waitTime);
    } catch (err) {
      logger.error("BOT", "Error in scan cycle", err instanceof Error ? err : undefined);
      await sleep(config.pricePollingIntervalMs);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
