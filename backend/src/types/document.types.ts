export interface DocumentFilter {
  agencyUserId?: number | null;
  status?: unknown;
  excludeDraft?: boolean;
  berthId?: unknown;
  berthType?: string;
  begin?: unknown;
  end?: unknown;
  etaBegin?: unknown;
  etaEnd?: unknown;
  vesselStatus?: unknown;
  vesselFlagId?: unknown;
  purposeId?: unknown;
  vesselId?: number | null;
  approvedBegin?: unknown;
  approvedEnd?: unknown;
  keyword?: string;
}
