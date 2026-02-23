export interface GammaMarket {
  id: number;
  question: string;
  conditionId: string;
  slug: string;
  active: boolean;
  closed: boolean;
  acceptingOrders: boolean;
  enableOrderBook: boolean;
  volume: string;
  volumeNum: number;
  liquidity: string;
  liquidityNum: number;
  endDate: string;
  category: string;
  clobTokenIds: string;   // JSON-stringified array: '["tokenId1","tokenId2"]'
  outcomePrices: string;  // JSON-stringified array: '["0.55","0.45"]'
  outcomes: string;       // JSON-stringified array: '["Yes","No"]'
  bestBid: number;
  bestAsk: number;
  lastTradePrice: number;
  spread: number;
  neg_risk: boolean;
  marketType: string;
}

export interface BinaryMarket {
  conditionId: string;
  question: string;
  slug: string;
  yesTokenId: string;
  noTokenId: string;
  liquidityUsd: number;
  volumeUsd: number;
  endDate: Date;
  category: string;
  negRisk: boolean;
  lastRefreshed: number;
}
