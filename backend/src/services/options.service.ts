import {
  AGENCY_DOCUMENT_STATUS_OPTIONS,
  BERTH_TYPES,
  DOCUMENT_STATUS_OPTIONS,
  VESSEL_IMPORT_STATUS_OPTIONS,
  VESSEL_STATUS_EN,
  VESSEL_STATUS_TH,
} from '../constants/statuses';
import { MasterRepository, SPECS } from '../repositories/master.repository';
import { Row } from '../types/database.types';
import { str } from '../utils/rows';
import { RoleService } from './role.service';
import { UserService } from './user.service';

// The dropdown sources behind frontend/stores/*Options.ts. Each list carries the keys the store
// maps on (`id`, `name`, `nameTh`/`nameEn`, `path`, `ids`, `purposeType`, ...).
export function createOptionsService(master: MasterRepository, roles: RoleService, users: UserService) {
  const q = (sql: string, params: unknown[] = []) => master.query(sql, params);

  return {
    countries: () =>
      q('SELECT id, code, name_th AS "nameTh", name_en AS "nameEn" FROM countries ORDER BY name_en').then((rows) =>
        rows.map((r) => ({ ...r, name: r.nameTh })),
      ),

    provinces: () => q('SELECT id, name_th AS "nameTh", name_en AS "nameEn", geography_id AS "geographyId" FROM provinces ORDER BY name_th'),

    districts: (provinceId: number) =>
      q('SELECT id, name_th AS "nameTh", name_en AS "nameEn", province_id AS "provinceId" FROM districts WHERE province_id = $1 ORDER BY name_th', [provinceId]),

    subDistricts: (districtId: number) =>
      q('SELECT id, name_th AS "nameTh", name_en AS "nameEn", district_id AS "districtId", zipcode FROM sub_districts WHERE district_id = $1 ORDER BY name_th', [
        districtId,
      ]),

    roles: () => roles.options(),

    authorities: () => q('SELECT id, name FROM authorities ORDER BY id'),

    vesselFlags: () => q('SELECT id, name, path, code FROM vessel_flags WHERE deleted_at IS NULL AND status = TRUE ORDER BY name'),

    vesselTypes: () => q('SELECT id, name FROM vessel_types WHERE deleted_at IS NULL AND status = TRUE ORDER BY name'),

    vesselOwners: (search: string) => users.ownerOptions(search),

    vesselStatus: () => Object.keys(VESSEL_STATUS_TH).map((id) => ({ id, name: VESSEL_STATUS_TH[id], nameEn: VESSEL_STATUS_EN[id] })),

    vesselImportStatus: () => VESSEL_IMPORT_STATUS_OPTIONS,

    documentStatus: () => DOCUMENT_STATUS_OPTIONS,

    agencyDocumentStatus: () => AGENCY_DOCUMENT_STATUS_OPTIONS,

    berthTypes: () => BERTH_TYPES,

    async berths(): Promise<Row[]> {
      const rows = await master.all(SPECS.berth());
      const jetties = await master.jettiesOf(rows.map((r) => r.id as number));
      return rows.map((r) => ({
        id: r.id,
        name: r.name_th,
        nameTh: r.name_th,
        nameEn: r.name_en,
        nameAlt: r.name_alt,
        name_alt: r.name_alt,
        berthType: r.berth_type,
        vesselTypeId: r.vessel_type_id ?? 0,
        jettys: jetties.get(r.id as number) ?? [],
      }));
    },

    async jetties(berthId?: number): Promise<Row[]> {
      return q(
        `SELECT j.id, j.name, j.berth_id AS "berthId", b.name_alt AS "berthName" FROM jetties j JOIN berths b ON b.id = j.berth_id
         WHERE j.status = TRUE AND b.deleted_at IS NULL${berthId ? ' AND j.berth_id = $1' : ''} ORDER BY j.berth_id, j.id`,
        berthId ? [berthId] : [],
      );
    },

    purposes: () =>
      q(
        `SELECT p.id, p.name, p.purpose_type_id AS "purposeTypeId", pt.code AS "purposeType", pt.name_en AS "purposeTypeName", p.is_government AS "isGovernment"
         FROM purposes p JOIN purpose_types pt ON pt.id = p.purpose_type_id WHERE p.deleted_at IS NULL AND p.status = TRUE ORDER BY p.id`,
      ),

    purposeTypes: () =>
      q('SELECT id, code AS name, code AS type, code, name_en AS "nameEn", name_th AS "nameTh" FROM purpose_types ORDER BY id'),

    locations: () => q('SELECT id, name FROM locates WHERE deleted_at IS NULL AND status = TRUE ORDER BY name'),

    products: () =>
      q(
        `SELECT id, name, product_type_id AS "productTypeId", product_group_id AS "productGroupId" FROM products
         WHERE deleted_at IS NULL AND status = TRUE ORDER BY name`,
      ),

    productGroups: () => q('SELECT id, name FROM product_groups WHERE deleted_at IS NULL AND status = TRUE ORDER BY id'),

    productTypes: () =>
      q('SELECT id, name, product_group_id AS "productGroupId" FROM product_types WHERE deleted_at IS NULL AND status = TRUE ORDER BY id'),

    cargoTypes: () => q('SELECT id, name FROM cargo_types WHERE deleted_at IS NULL AND status = TRUE ORDER BY id'),

    cargoWharfage: () =>
      q('SELECT id, name, purpose_type_ids AS "purposeType" FROM cargo_wharfages WHERE deleted_at IS NULL AND status = TRUE ORDER BY id').then((rows) =>
        rows.map((r) => ({ ...r, purposeType: str(r.purposeType) })),
      ),

    paymentMethods: () => q('SELECT id, name, payment_period_day AS "paymentPeriodDay" FROM payment_methods ORDER BY id'),

    paymentTerms: () => q('SELECT id, name, days FROM payment_terms ORDER BY id'),

    cargoOwners: () => q('SELECT id, name FROM cargo_owners ORDER BY name'),

    async terms(): Promise<Row> {
      const rows = await q('SELECT id, version, content, created_at AS "createAt" FROM terms ORDER BY id DESC LIMIT 1');
      return rows[0] ?? { id: 0, version: '', content: '', createAt: null };
    },

    customersSearch: (search: string, field: string) =>
      q(
        `SELECT id, code, name, tax_id AS "taxId", contact_name AS "contactName", payment_method_id AS "paymentMethodId", payment_term_id AS "paymentTermId",
                country_id AS "countryId", province_id AS "provinceId", district_id AS "districtId", sub_district_id AS "subDistrictId",
                post_code AS "postCode", stage_province AS "stageProvince", address, phone_number AS "phoneNumber", secondary_phone_number AS "secondaryPhoneNumber"
         FROM customers WHERE ${field === 'tax_id' ? 'tax_id' : 'name'} ILIKE $1 ORDER BY name LIMIT 30`,
        [`%${search}%`],
      ),
  };
}

export type OptionsService = ReturnType<typeof createOptionsService>;
