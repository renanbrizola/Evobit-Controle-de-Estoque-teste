import { formatBRL } from '../utils/index';
import type { AccentTone } from './technical-sheet-types';

const toneClasses: Record<AccentTone, string> = {
  pink: 'text-[var(--brand-accent-700)]',
  cyan: 'text-[var(--state-info-700)]',
  amber: 'text-[var(--brand-accent-700)]',
  lime: 'text-[var(--state-success-700)]',
  orange: 'text-[var(--brand-accent-800)]',
  green: 'text-[var(--state-success-700)]',
  blue: 'text-[var(--brand-primary-700)]',
  purple: 'text-[var(--brand-primary-600)]',
  red: 'text-[var(--state-danger-700)]',
};

export function formatSheetValue(value: number | null, emptyLabel = '---'): string {
  if (value === null) return emptyLabel;
  return formatBRL(value);
}

export function formatPlainNumber(value: number | null, decimals = 0, emptyLabel = '---'): string {
  if (value === null) return emptyLabel;
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentLabel(value: number | null, decimals = 1, emptyLabel = '---'): string {
  if (value === null) return emptyLabel;
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function getToneClassName(tone: AccentTone): string {
  return toneClasses[tone];
}
