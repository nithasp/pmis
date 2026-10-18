import { RoleType } from './auth.types';
import { Queryable } from './database.types';

export interface CountrySeed {
  id: number;
  code: string;
  nameEn: string;
  nameTh: string;
}

export interface ProvinceSeed {
  nameTh: string;
  nameEn: string;
  geographyId: number;
  districts: { nameTh: string; nameEn: string; subDistricts: { nameTh: string; nameEn: string; zipcode: string }[] }[];
}

export interface FlagSeed {
  id: number;
  code: string;
  name: string;
}

export interface BerthSeed {
  nameTh: string;
  nameEn: string;
  nameAlt: string;
  berthType: 'MIT' | 'TCT' | 'Spacial' | 'Other';
  vesselType: string;
  rate: number;
  jetties: string[];
}

export interface OfficerSeed {
  email: string;
  fullName: string;
  roleType: RoleType;
  phone: string;
}

export interface AgencySeed {
  email: string;
  company: string;
  fullName: string;
  tax: string;
  phone: string;
  mobile: string;
  personType: 'corporate' | 'individual';
  status: 'Approved' | 'WaitingApproved';
  province: string;
  district: string;
  subDistrict: string;
  address: string;
}

export interface VesselSeed {
  name: string;
  type: string;
  flag: string;
  imo: string;
  official: string;
  callSign: string;
  mmsi: string;
  grt: number;
  nrt: number;
  dwt: number;
  loa: number;
  beam: number;
  draft: number;
  engine: string;
}

export type SeedIds = Record<string, number>;

export interface SeedContext {
  db: Queryable;
  roles: SeedIds;
  provinces: SeedIds;
  districts: SeedIds;
  subDistricts: Record<string, { id: number; zipcode: string }>;
  vesselTypes: SeedIds;
  flags: SeedIds;
  ports: SeedIds;
  berths: { id: number; type: string; alt: string; rate: number; jetties: number[] }[];
  purposeTypes: SeedIds;
  purposes: { id: number; type: string; typeId: number }[];
  cargoTypes: number[];
  cargoWharfages: number[];
  productTypes: { id: number; groupId: number; name: string; products: { id: number; name: string }[] }[];
  pilots: number[];
  tugs: number[];
  paymentMethods: { id: number; days: number }[];
  paymentTerms: number[];
  cargoOwners: number[];
  customers: number[];
  locates: number[];
  useBerths: number[];
  files: SeedIds;
  officers: Record<string, number>;
  agencies: { id: number; company: string; fullName: string; email: string }[];
  vessels: { id: number; name: string; imo: string; official: string; callSign: string; mmsi: string; flagId: number; typeId: number; ownerId: number; grt: number; loa: number; beam: number; draft: number; owner: string; nrt: number; dwt: number; engine: string }[];
  governmentVessels: number[];
  documents: { id: number; vesselIndex: number; agencyId: number; status: string; berthIds: number[]; docBerthIds: number[]; approvedAt: Date | null; etaFirst: Date; grt: number; berthIndex: number }[];
  logBooks: { id: number; documentId: number; vesselId: number; berthId: number; jettyId: number | null; mooring: Date; departure: Date | null; grt: number }[];
}
