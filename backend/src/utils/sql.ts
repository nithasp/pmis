import { ListQuery, SortOrder } from '../types/pagination.types';

export class SqlBuilder {
  readonly params: unknown[] = [];
  readonly conditions: string[] = [];

  add(value: unknown): string {
    return `$${this.params.push(value)}`;
  }

  where(condition: string): this {
    this.conditions.push(condition);
    return this;
  }

  // Appends `column = $n` when the value is present (empty strings and 0 are treated as "no filter",
  // which is how the frontend sends an unselected dropdown).
  eq(column: string, value: unknown): this {
    if (value === undefined || value === null || value === '' || value === 0 || value === '0' || value === 'undefined' || value === 'null') return this;
    return this.where(`${column} = ${this.add(value)}`);
  }

  in(column: string, values: unknown[]): this {
    const clean = values.filter((v) => v !== undefined && v !== null && v !== '');
    if (!clean.length) return this;
    return this.where(`${column} = ANY(${this.add(clean)})`);
  }

  bool(column: string, value: unknown): this {
    if (value === 'true' || value === true) return this.where(`${column} = TRUE`);
    if (value === 'false' || value === false) return this.where(`${column} = FALSE`);
    return this;
  }

  like(columns: string[], search: string | undefined): this {
    if (!search) return this;
    const p = this.add(`%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
    return this.where(`(${columns.map((c) => `${c} ILIKE ${p}`).join(' OR ')})`);
  }

  between(column: string, from: unknown, to: unknown): this {
    if (from) this.where(`${column} >= ${this.add(from)}`);
    if (to) this.where(`${column} <= ${this.add(to)}`);
    return this;
  }

  whereClause(): string {
    return this.conditions.length ? ` WHERE ${this.conditions.join(' AND ')}` : '';
  }

  orderBy(order: SortOrder[], allowed: Record<string, string>, fallback: string): string {
    const parts = order
      .map((o) => (allowed[o.column] ? `${allowed[o.column]} ${o.dir.toUpperCase()}` : null))
      .filter((p): p is string => !!p);
    return ` ORDER BY ${parts.length ? parts.join(', ') : fallback}`;
  }

  limit(query: ListQuery): string {
    if (!query.limit) return '';
    return ` LIMIT ${this.add(query.limit)} OFFSET ${this.add(query.offset)}`;
  }
}

// The frontend serialises unset filters as the strings "undefined" / "null"; they mean "no filter"
const EMPTY_TOKENS = new Set(['', 'undefined', 'null']);

export const csvList = (value: unknown): string[] =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => !EMPTY_TOKENS.has(v))
    : Array.isArray(value)
      ? value.map(String).filter((v) => !EMPTY_TOKENS.has(v))
      : [];

export const csvIds = (value: unknown): number[] =>
  csvList(value)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
