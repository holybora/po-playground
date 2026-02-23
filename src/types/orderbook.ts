export interface BinaryPriceSnapshot {
  conditionId: string;
  yesTokenId: string;
  noTokenId: string;

  yesBestAsk: number;
  yesBestAskSize: number;
  yesBestBid: number;
  yesBestBidSize: number;

  noBestAsk: number;
  noBestAskSize: number;
  noBestBid: number;
  noBestBidSize: number;

  combinedAskCost: number;   // yesBestAsk + noBestAsk
  spreadFromParity: number;  // 1.00 - combinedAskCost (positive = arb opportunity)

  timestamp: number;
  isStale: boolean;
}
