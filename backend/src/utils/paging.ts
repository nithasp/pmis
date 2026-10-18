import { Request } from 'express';
import { ListQuery, PagedResult, SortOrder } from '../types/pagination.types';

export const MAX_PAGE_SIZE = 1000;

// The frontend sends `page`, `limit` (-1 or 0 = everything), `search` and `Order` (a JSON array of
// { column, dir }) on every list request.
export function parseListQuery(query: Record<string, unknown>): ListQuery {
  const page = Math.max(1, Math.trunc(Number(query.page ?? 1)) || 1);
  const rawLimit = Number(query.limit ?? 10);
  const limit =
    !Number.isFinite(rawLimit) || rawLimit <= 0 ? null : Math.min(Math.trunc(rawLimit), MAX_PAGE_SIZE);
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 200) : '';
  return { page, limit, offset: limit ? (page - 1) * limit : 0, search, order: parseOrder(query.Order) };
}

export function parseOrder(raw: unknown): SortOrder[] {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((o): o is { column: string; dir: string } => !!o && typeof o === 'object' && typeof o.column === 'string')
    .filter((o) => o.column.trim() !== '' && ['asc', 'desc'].includes(String(o.dir).toLowerCase()))
    .map((o) => ({ column: o.column.trim(), dir: String(o.dir).toLowerCase() as 'asc' | 'desc' }));
}

export const listQuery = (req: Request): ListQuery => parseListQuery(req.query as Record<string, unknown>);

export function pagedResult<T>(items: T[], total: number, query: ListQuery): PagedResult<T> {
  return {
    data: items,
    totalItems: total,
    totalPages: query.limit ? Math.ceil(total / query.limit) : total > 0 ? 1 : 0,
  };
}

export function pageInMemory<T>(items: T[], query: ListQuery): PagedResult<T> {
  const slice = query.limit ? items.slice(query.offset, query.offset + query.limit) : items;
  return pagedResult(slice, items.length, query);
}

export function sortInMemory<T extends Record<string, any>>(items: T[], order: SortOrder[], aliases: Record<string, string> = {}): T[] {
  const first = order[0];
  if (!first) return items;
  const key = aliases[first.column] ?? first.column;
  const dir = first.dir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), 'th') * dir;
  });
}
