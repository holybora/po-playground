import type { GammaMarket } from "../types/market.js";
import type { RateLimiter } from "../utils/rate-limiter.js";
import { withRetry } from "../utils/retry.js";
import type { Logger } from "../utils/logger.js";

export interface GammaQueryParams {
  active?: boolean;
  closed?: boolean;
  limit?: number;
  offset?: number;
  liquidity_num_min?: number;
  volume_num_min?: number;
  order?: string;
  ascending?: boolean;
}

export class GammaClient {
  constructor(
    private readonly baseUrl: string,
    private readonly rateLimiter: RateLimiter,
    private readonly logger: Logger,
  ) {}

  async getMarkets(params: GammaQueryParams = {}): Promise<GammaMarket[]> {
    const url = new URL("/markets", this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    await this.rateLimiter.acquire();
    return withRetry(async () => {
      this.logger.debug("GAMMA", `GET ${url.pathname}${url.search}`);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Gamma API ${res.status}: ${res.statusText}`);
      return res.json() as Promise<GammaMarket[]>;
    });
  }

  async getAllActiveMarkets(
    minLiquidity: number,
    minVolume: number,
    maxMarkets: number,
  ): Promise<GammaMarket[]> {
    const allMarkets: GammaMarket[] = [];
    let offset = 0;
    const limit = 100;

    while (allMarkets.length < maxMarkets) {
      const batch = await this.getMarkets({
        active: true,
        closed: false,
        limit,
        offset,
        liquidity_num_min: minLiquidity,
        volume_num_min: minVolume,
        order: "liquidityNum",
        ascending: false,
      });

      if (batch.length === 0) break;
      allMarkets.push(...batch);
      offset += limit;

      if (batch.length < limit) break; // no more pages
    }

    return allMarkets.slice(0, maxMarkets);
  }
}
