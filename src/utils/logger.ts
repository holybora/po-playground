import type { ArbitrageOpportunity, PaperTrade, PortfolioSummary } from "../types/arbitrage.js";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;

export class Logger {
  private level: number;

  constructor(level: string) {
    this.level = LEVELS[level as keyof typeof LEVELS] ?? LEVELS.info;
  }

  debug(tag: string, msg: string, data?: Record<string, unknown>): void {
    if (this.level <= LEVELS.debug) this.log("DEBUG", tag, msg, data);
  }

  info(tag: string, msg: string, data?: Record<string, unknown>): void {
    if (this.level <= LEVELS.info) this.log("INFO", tag, msg, data);
  }

  warn(tag: string, msg: string, data?: Record<string, unknown>): void {
    if (this.level <= LEVELS.warn) this.log("WARN", tag, msg, data);
  }

  error(tag: string, msg: string, err?: Error, data?: Record<string, unknown>): void {
    if (this.level <= LEVELS.error) {
      this.log("ERROR", tag, msg, data);
      if (err) console.error(err);
    }
  }

  logOpportunity(opp: ArbitrageOpportunity): void {
    this.info(
      "ARB",
      `Opportunity: "${opp.question}" YES@${opp.yesBuyPrice.toFixed(4)} + NO@${opp.noBuyPrice.toFixed(4)} = ${opp.combinedCost.toFixed(4)} | Profit: ${opp.netProfitBps.toFixed(1)} bps | Fillable: ${opp.maxFillableShares.toFixed(1)} shares`,
    );
  }

  logPaperTrade(trade: PaperTrade): void {
    this.info(
      "TRADE",
      `Executed: ${trade.shares.toFixed(1)} shares @ $${trade.totalCost.toFixed(4)}/pair | Cost: $${(trade.totalCost).toFixed(2)} | Expected profit: $${trade.expectedProfit.toFixed(4)} | "${trade.question}"`,
    );
  }

  logPortfolioSummary(summary: PortfolioSummary): void {
    console.log("\n" + "=".repeat(70));
    console.log("  PORTFOLIO SUMMARY");
    console.log("=".repeat(70));
    console.log(`  Total trades:       ${summary.totalPaperTrades}`);
    console.log(`  Open positions:     ${summary.openPositions}`);
    console.log(`  Capital deployed:   $${summary.totalCapitalDeployed.toFixed(2)}`);
    console.log(`  Expected profit:    $${summary.totalExpectedProfit.toFixed(4)}`);
    console.log(`  Settled profit:     $${summary.totalSettledProfit.toFixed(4)}`);
    console.log(`  Avg profit:         ${summary.averageProfitBps.toFixed(1)} bps`);
    console.log(`  Best trade:         ${summary.bestTradeProfitBps.toFixed(1)} bps`);
    console.log(`  Worst trade:        ${summary.worstTradeProfitBps.toFixed(1)} bps`);
    console.log(`  Opportunities seen: ${summary.opportunitiesDetected}`);
    console.log(`  Opportunities skip: ${summary.opportunitiesSkipped}`);
    console.log("=".repeat(70) + "\n");
  }

  logScanCycle(marketsScanned: number, opportunitiesFound: number, tradesExecuted: number, elapsedMs: number): void {
    this.info(
      "CYCLE",
      `Scanned ${marketsScanned} markets | ${opportunitiesFound} opportunities | ${tradesExecuted} trades | ${elapsedMs}ms`,
    );
  }

  private log(level: string, tag: string, msg: string, data?: Record<string, unknown>): void {
    const ts = new Date().toISOString();
    let line = `[${ts}] [${level}] [${tag}] ${msg}`;
    if (data) line += " " + JSON.stringify(data);
    console.log(line);
  }
}
