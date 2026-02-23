import { ClobClient } from "@polymarket/clob-client";
import type { OrderBookSummary } from "@polymarket/clob-client";
import type { RateLimiter } from "../utils/rate-limiter.js";
import { withRetry } from "../utils/retry.js";
import type { Logger } from "../utils/logger.js";

export class ClobClientWrapper {
  private client: ClobClient;

  constructor(
    host: string,
    chainId: number,
    private readonly rateLimiter: RateLimiter,
    private readonly logger: Logger,
  ) {
    // Public-only client -- no signer needed for read operations
    this.client = new ClobClient(host, chainId);
  }

  async getOrderBook(tokenId: string): Promise<OrderBookSummary> {
    await this.rateLimiter.acquire();
    return withRetry(async () => {
      this.logger.debug("CLOB", `getOrderBook ${tokenId.slice(0, 12)}...`);
      return this.client.getOrderBook(tokenId);
    });
  }

  async getPrice(tokenId: string, side: "BUY" | "SELL"): Promise<number> {
    await this.rateLimiter.acquire();
    return withRetry(async () => {
      const result = await this.client.getPrice(tokenId, side);
      return parseFloat(String(result));
    });
  }

  async getMidpoint(tokenId: string): Promise<number> {
    await this.rateLimiter.acquire();
    return withRetry(async () => {
      const result = await this.client.getMidpoint(tokenId);
      return parseFloat(String(result));
    });
  }
}
