export interface VesselImportFilter {
  createdById?: number | null;
  status?: unknown;
  excludeStatuses?: string[];
  onlyStatuses?: string[];
  vesselFlagId?: unknown;
  vesselTypeId?: unknown;
  berthId?: unknown;
  jettyId?: unknown;
  purposeTypeId?: unknown;
  productName?: string;
  created?: unknown;
  mooringBegin?: unknown;
  mooringEnd?: unknown;
  unmooringBegin?: unknown;
  unmooringEnd?: unknown;
  vtMooringBegin?: unknown;
  vtMooringEnd?: unknown;
  vtUnmooringBegin?: unknown;
  vtUnmooringEnd?: unknown;
}
