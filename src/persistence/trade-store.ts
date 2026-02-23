import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { PaperTrade } from "../types/arbitrage.js";
import type { BotConfig } from "../types/config.js";
import type { Logger } from "../utils/logger.js";

export class TradeStore {
  private trades = new Map<string, PaperTrade>();
  private opportunityCount = 0;
  private skippedCount = 0;

  constructor(
    private readonly config: BotConfig,
    private readonly logger: Logger,
  ) {}

  addTrade(trade: PaperTrade): void {
    this.trades.set(trade.id, trade);
  }

  getTrade(id: string): PaperTrade | undefined {
    return this.trades.get(id);
  }

  getOpenTrades(): PaperTrade[] {
    return Array.from(this.trades.values()).filter((t) => t.status === "open");
  }

  getTradesForMarket(conditionId: string): PaperTrade[] {
    return Array.from(this.trades.values()).filter(
      (t) => t.conditionId === conditionId && t.status === "open",
    );
  }

  getAllTrades(): PaperTrade[] {
    return Array.from(this.trades.values());
  }

  updateTrade(id: string, updates: Partial<PaperTrade>): void {
    const trade = this.trades.get(id);
    if (trade) {
      Object.assign(trade, updates);
    }
  }

  incrementOpportunities(): void {
    this.opportunityCount++;
  }

  incrementSkipped(): void {
    this.skippedCount++;
  }

  getOpportunityCount(): number {
    return this.opportunityCount;
  }

  getSkippedCount(): number {
    return this.skippedCount;
  }

  async save(): Promise<void> {
    if (!this.config.persistToFile) return;

    try {
      await mkdir(this.config.dataDir, { recursive: true });
      const filePath = join(this.config.dataDir, "paper-trades.json");
      const data = {
        trades: Array.from(this.trades.values()),
        opportunityCount: this.opportunityCount,
        skippedCount: this.skippedCount,
        savedAt: new Date().toISOString(),
      };
      await writeFile(filePath, JSON.stringify(data, null, 2));
      this.logger.debug("STORE", `Saved ${this.trades.size} trades to ${filePath}`);
    } catch (err) {
      this.logger.error("STORE", "Failed to save trades", err instanceof Error ? err : undefined);
    }
  }

  async load(): Promise<void> {
    if (!this.config.persistToFile) return;

    try {
      const filePath = join(this.config.dataDir, "paper-trades.json");
      const raw = await readFile(filePath, "utf-8");
      const data = JSON.parse(raw);

      if (Array.isArray(data.trades)) {
        for (const trade of data.trades) {
          this.trades.set(trade.id, trade);
        }
      }
      this.opportunityCount = data.opportunityCount ?? 0;
      this.skippedCount = data.skippedCount ?? 0;

      this.logger.info("STORE", `Loaded ${this.trades.size} trades from disk`);
    } catch {
      // File doesn't exist yet -- that's fine
      this.logger.debug("STORE", "No existing trade data found");
    }
  }
}
