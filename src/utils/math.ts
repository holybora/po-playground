export function parsePrice(priceStr: string): number {
  const val = parseFloat(priceStr);
  if (isNaN(val) || val < 0 || val > 1) return NaN;
  return val;
}

export function combinedAskCost(yesAsk: number, noAsk: number): number {
  return yesAsk + noAsk;
}

export function profitBps(combinedCost: number): number {
  return ((1.0 - combinedCost) / combinedCost) * 10000;
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
