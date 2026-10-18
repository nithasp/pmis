export interface ReportParams {
  startDate?: unknown;
  endDate?: unknown;
  year?: unknown;
  berthId?: unknown;
  productTypeId?: unknown;
}

export interface ReportRange {
  from: Date;
  to: Date;
  berthId: number | null;
  productTypeId: number | null;
  era: 'buddhist' | 'christian';
}
