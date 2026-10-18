export interface ListSpec {
  select: string;
  from: string;
  live: string;
  searchColumns: string[];
  sortable: Record<string, string>;
  defaultOrder: string;
}
