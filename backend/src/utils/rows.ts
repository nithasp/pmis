import { Row } from '../types/database.types';

export function requireRow<T>(rows: T[], statement = 'statement'): T {
  const row = rows[0];
  if (!row) throw new Error(`[db] the ${statement} returned no row`);
  return row;
}

export const toCamel = (key: string): string => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

export const toSnake = (key: string): string => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export function camelRow<T = Row>(row: Row): T {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) out[toCamel(key)] = value instanceof Date ? value.toISOString() : value;
  return out as T;
}

export const camelRows = <T = Row>(rows: Row[]): T[] => rows.map((r) => camelRow<T>(r));

export const iso = (value: unknown): string | null =>
  value instanceof Date ? value.toISOString() : typeof value === 'string' && value ? value : null;

export const num = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const str = (value: unknown, fallback = ''): string =>
  value === undefined || value === null ? fallback : String(value);

export const idOrNull = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};
