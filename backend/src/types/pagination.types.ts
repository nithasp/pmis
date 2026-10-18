export interface SortOrder {
  column: string;
  dir: 'asc' | 'desc';
}

export interface ListQuery {
  page: number;
  limit: number | null;
  offset: number;
  search: string;
  order: SortOrder[];
}

export interface PagedResult<T> {
  data: T[];
  totalItems: number;
  totalPages: number;
}
