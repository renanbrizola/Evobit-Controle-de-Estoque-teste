const COST_DECIMALS = 4;
const PRICE_DECIMALS = 2;

export function roundCost(value: number): number {
  return Math.round(value * Math.pow(10, COST_DECIMALS)) / Math.pow(10, COST_DECIMALS);
}

export function roundPrice(value: number): number {
  return Math.round(value * Math.pow(10, PRICE_DECIMALS)) / Math.pow(10, PRICE_DECIMALS);
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function toFraction(percent: number): number {
  return percent / 100;
}

export function toPercent(fraction: number): number {
  return fraction * 100;
}
