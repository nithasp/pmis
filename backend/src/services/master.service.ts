import { withTransaction } from '../database';
import { MasterRepository, SIMPLE_TABLES, SPECS } from '../repositories/master.repository';
import { Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { AppError, notFound } from '../utils/errors';
import { idOrNull, iso, num, str } from '../utils/rows';
import { SqlBuilder } from '../utils/sql';
import { FileService } from './file.service';
import { BERTH_TYPES } from '../constants/statuses';

const audit = (row: Row): Row => ({
  created_at: iso(row.created_at),
  created_by: str(row.created_by),
  updated_at: iso(row.updated_at),
  updated_by: str(row.updated_by),
});

const statusFilter = (b: SqlBuilder, alias: string, value: unknown): void => {
  b.bool(`${alias}.status`, value);
};

export function createMasterService(master: MasterRepository, files: FileService) {
  const simple = (key: string) => {
    const def = SIMPLE_TABLES[key];
    if (!def) throw notFound(`ข้อมูลพื้นฐาน ${key}`, `master data ${key} not found`);
    return def;
  };

  const toSimple = (row: Row): Row => ({ id: row.id, name: row.name, status: row.status, ...audit(row) });

  const toPort = (row: Row): Row => ({
    id: row.id,
    name: row.name,
    locode: str(row.locode),
    country_id: row.country_id ?? 0,
    country_name_th: str(row.country_name_th),
    country_name_en: str(row.country_name_en),
    status: row.status,
    ...audit(row),
  });

  const toBerth = (row: Row, jettys: Row[]): Row => ({
    id: row.id,
    name: row.name_th,
    name_th: row.name_th,
    name_en: row.name_en,
    name_alt: row.name_alt,
    berth_type: row.berth_type,
    berth_type_name: BERTH_TYPES.find((t) => t.code === row.berth_type)?.name ?? row.berth_type,
    vessel_type_id: row.vessel_type_id ?? 0,
    vessel_type: { id: row.vessel_type_id ?? 0, name: str(row.vessel_type_name) },
    port_due_rate: num(row.port_due_rate),
    jettys,
    jettysList: jettys.map((j) => j.name).join(', '),
    status: row.status,
    ...audit(row),
  });

  const toPurpose = (row: Row): Row => ({
    id: row.id,
    purpose_id: row.id,
    sub_purpose_id: row.id,
    name: row.name,
    purpose_name: row.name,
    purpose_type_id: row.purpose_type_id,
    purpose_type_name: str(row.purpose_type_name_en),
    purpose_type_code: str(row.purpose_type_code),
    is_government: row.is_government,
    status: row.status,
    ...audit(row),
  });

  const toProduct = (row: Row): Row => ({
    id: row.id,
    name: row.name,
    product_type_id: row.product_type_id ?? 0,
    product_type_name: str(row.product_type_name),
    product_group_id: row.product_group_id ?? 0,
    product_group_name: str(row.product_group_name),
    status: row.status,
    ...audit(row),
  });

  const toProductType = (row: Row): Row => ({
    id: row.id,
    product_type_id: row.id,
    name: row.name,
    product_type_name: row.name,
    product_group_id: row.product_group_id ?? 0,
    product_group_name: str(row.product_group_name),
    status: row.status,
    ...audit(row),
  });

  const toFlag = (row: Row): Row => ({
    id: row.id,
    name: row.name,
    code: str(row.code),
    path: str(row.path),
    file_id: row.file_id ?? 0,
    status: row.status,
    ...audit(row),
  });

  return {
    async listSimple(key: string, query: ListQuery, status: unknown): Promise<PagedResult<Row>> {
      const def = simple(key);
      const page = await master.list(SPECS.simple(def.table), query, (b) => statusFilter(b, 't', status));
      return { ...page, data: page.data.map(toSimple) };
    },

    async simpleDetail(key: string, id: number): Promise<Row> {
      const def = simple(key);
      const row = await master.findById(SPECS.simple(def.table), id);
      if (!row) throw notFound(def.label, `${key} not found`);
      return toSimple(row);
    },

    async createSimple(key: string, input: Row, by: string): Promise<Row> {
      const def = simple(key);
      const row = await master.insert(def.table, { name: str(input.name).trim(), status: input.status ?? true, created_by: by, updated_by: by });
      return this.simpleDetail(key, row.id as number);
    },

    async updateSimple(key: string, id: number, input: Row, by: string): Promise<Row> {
      const def = simple(key);
      const patch: Row = { updated_by: by };
      if (input.name !== undefined) patch.name = str(input.name).trim();
      if (typeof input.status === 'boolean') patch.status = input.status;
      if (typeof input.activated === 'boolean') patch.status = input.activated;
      if (!(await master.update(def.table, id, patch))) throw notFound(def.label, `${key} not found`);
      return this.simpleDetail(key, id);
    },

    async listPorts(query: ListQuery, filter: { country_id?: unknown; status?: unknown }): Promise<PagedResult<Row>> {
      const page = await master.list(SPECS.port(), query, (b) => {
        b.eq('p.country_id', idOrNull(filter.country_id));
        statusFilter(b, 'p', filter.status);
      });
      return { ...page, data: page.data.map(toPort) };
    },

    async portDetail(id: number): Promise<Row> {
      const row = await master.findById(SPECS.port(), id);
      if (!row) throw notFound('ท่าเรือ', 'port not found');
      return toPort(row);
    },

    async savePort(id: number | null, input: Row, by: string): Promise<Row> {
      const data: Row = { name: str(input.name).trim(), locode: str(input.locode).trim(), country_id: idOrNull(input.country_id), updated_by: by };
      if (typeof input.status === 'boolean') data.status = input.status;
      if (id === null) {
        const row = await master.insert('ports', { ...data, created_by: by });
        return this.portDetail(row.id as number);
      }
      if (!(await master.update('ports', id, data))) throw notFound('ท่าเรือ', 'port not found');
      return this.portDetail(id);
    },

    async listBerths(query: ListQuery, filter: { vessel_type_id?: unknown; status?: unknown; berth_type?: unknown }): Promise<PagedResult<Row>> {
      const page = await master.list(SPECS.berth(), query, (b) => {
        b.eq('b.vessel_type_id', idOrNull(filter.vessel_type_id));
        b.eq('b.berth_type', filter.berth_type ? String(filter.berth_type) : '');
        statusFilter(b, 'b', filter.status);
      });
      const jetties = await master.jettiesOf(page.data.map((r) => r.id as number));
      return { ...page, data: page.data.map((r) => toBerth(r, jetties.get(r.id as number) ?? [])) };
    },

    async berthDetail(id: number): Promise<Row> {
      const row = await master.findById(SPECS.berth(), id);
      if (!row) throw notFound('ท่าเทียบเรือ', 'berth not found');
      const jetties = await master.jettiesOf([id]);
      return toBerth(row, jetties.get(id) ?? []);
    },

    async saveBerth(id: number | null, input: Row, by: string): Promise<Row> {
      const names = (Array.isArray(input.jettys) ? input.jettys : [])
        .map((j: Row) => str(j?.name).trim())
        .filter((n: string) => n.length > 0);
      if (!names.length) throw new AppError('กรุณาระบุท่าเทียบเรืออย่างน้อย 1 ท่า', 400, 'invalid_request', 'At least one jetty is required');
      const data: Row = {
        name_th: str(input.name_th).trim(),
        name_en: str(input.name_en).trim(),
        name_alt: str(input.name_alt).trim(),
        berth_type: str(input.berth_type, 'Other'),
        vessel_type_id: idOrNull(input.vessel_type_id),
        updated_by: by,
      };
      if (typeof input.status === 'boolean') data.status = input.status;
      const berthId = await withTransaction(async (tx) => {
        let targetId = id;
        if (targetId === null) {
          const row = await master.insert('berths', { ...data, created_by: by }, tx);
          targetId = row.id as number;
        } else if (!(await master.update('berths', targetId, data, tx))) {
          throw notFound('ท่าเทียบเรือ', 'berth not found');
        }
        await master.replaceJetties(targetId, names, tx);
        return targetId;
      });
      return this.berthDetail(berthId);
    },

    async listPurposes(query: ListQuery, filter: { status?: unknown; purpose_type?: unknown; purpose_type_id?: unknown }): Promise<PagedResult<Row>> {
      const page = await master.list(SPECS.purpose(), query, (b) => {
        statusFilter(b, 'p', filter.status);
        b.eq('p.purpose_type_id', idOrNull(filter.purpose_type_id));
        if (filter.purpose_type === 'Government') b.where('p.is_government = TRUE');
      });
      return { ...page, data: page.data.map(toPurpose) };
    },

    async purposeDetail(id: number): Promise<Row> {
      const row = await master.findById(SPECS.purpose(), id);
      if (!row) throw notFound('วัตถุประสงค์', 'purpose not found');
      return toPurpose(row);
    },

    async savePurpose(id: number | null, input: Row, by: string): Promise<Row> {
      const purposeTypeId = idOrNull(input.purpose_type_id);
      if (!purposeTypeId) throw new AppError('กรุณาเลือกประเภทวัตถุประสงค์', 400, 'invalid_request', 'purpose_type_id is required');
      const data: Row = { name: str(input.purpose_name ?? input.name).trim(), purpose_type_id: purposeTypeId, updated_by: by };
      if (typeof input.status === 'boolean') data.status = input.status;
      if (id === null) {
        const row = await master.insert('purposes', { ...data, created_by: by });
        return this.purposeDetail(row.id as number);
      }
      if (!(await master.update('purposes', id, data))) throw notFound('วัตถุประสงค์', 'purpose not found');
      return this.purposeDetail(id);
    },

    async purposeTypes(): Promise<Row[]> {
      const rows = await master.query('SELECT * FROM purpose_types ORDER BY id');
      return rows.map((r) => ({ id: r.id, name: r.code, type: r.code, code: r.code, nameEn: r.name_en, nameTh: r.name_th }));
    },

    async listProducts(query: ListQuery, status: unknown): Promise<PagedResult<Row>> {
      const page = await master.list(SPECS.product(), query, (b) => statusFilter(b, 'p', status));
      return { ...page, data: page.data.map(toProduct) };
    },

    async productDetail(id: number): Promise<Row> {
      const row = await master.findById(SPECS.product(), id);
      if (!row) throw notFound('สินค้า', 'product not found');
      return toProduct(row);
    },

    async saveProduct(id: number | null, input: Row, by: string): Promise<Row> {
      const typeId = idOrNull(input.product_type_id);
      const type = typeId ? await master.findById(SPECS.productType(), typeId) : null;
      const data: Row = {
        name: str(input.name).trim(),
        product_type_id: typeId,
        product_group_id: idOrNull(input.product_group_id) ?? (type?.product_group_id as number | null) ?? null,
        updated_by: by,
      };
      if (typeof input.status === 'boolean') data.status = input.status;
      if (id === null) {
        const row = await master.insert('products', { ...data, created_by: by });
        return this.productDetail(row.id as number);
      }
      if (!(await master.update('products', id, data))) throw notFound('สินค้า', 'product not found');
      return this.productDetail(id);
    },

    async listProductTypes(query: ListQuery, status: unknown): Promise<PagedResult<Row>> {
      const page = await master.list(SPECS.productType(), query, (b) => statusFilter(b, 'pt', status));
      return { ...page, data: page.data.map(toProductType) };
    },

    async productTypeDetail(id: number): Promise<Row> {
      const row = await master.findById(SPECS.productType(), id);
      if (!row) throw notFound('ชนิดสินค้า', 'product type not found');
      return toProductType(row);
    },

    async productTypesOfGroup(groupId: number): Promise<Row[]> {
      const rows = await master.query(
        `SELECT pt.*, pg.name AS product_group_name FROM product_types pt LEFT JOIN product_groups pg ON pg.id = pt.product_group_id
         WHERE pt.deleted_at IS NULL AND pt.status = TRUE AND pt.product_group_id = $1 ORDER BY pt.name`,
        [groupId],
      );
      return rows.map(toProductType);
    },

    async productTypeOptions(): Promise<Row[]> {
      const rows = await master.all(SPECS.productType());
      return rows.map((r) => ({ id: r.id, name: r.name, productGroupId: r.product_group_id ?? 0, productGroupName: str(r.product_group_name) }));
    },

    async saveProductType(id: number | null, input: Row, by: string): Promise<Row> {
      let groupId = idOrNull(input.product_group_id);
      const groupName = str(input.product_group_name).trim();
      if (!groupId && groupName) {
        const existing = await master.query('SELECT id FROM product_groups WHERE deleted_at IS NULL AND LOWER(name) = LOWER($1) LIMIT 1', [groupName]);
        groupId = existing[0] ? (existing[0].id as number) : ((await master.insert('product_groups', { name: groupName, created_by: by, updated_by: by })).id as number);
      }
      const data: Row = { name: str(input.product_type_name ?? input.name).trim(), product_group_id: groupId, updated_by: by };
      if (typeof input.status === 'boolean') data.status = input.status;
      if (id === null) {
        const row = await master.insert('product_types', { ...data, created_by: by, status: input.status ?? true });
        return this.productTypeDetail(row.id as number);
      }
      if (!(await master.update('product_types', id, data))) throw notFound('ชนิดสินค้า', 'product type not found');
      return this.productTypeDetail(id);
    },

    async productGroupOptions(): Promise<Row[]> {
      const rows = await master.all(SPECS.simple('product_groups'));
      return rows.map((r) => ({ id: r.id, name: r.name }));
    },

    async listFlags(query: ListQuery, status: unknown): Promise<PagedResult<Row>> {
      const page = await master.list(SPECS.vesselFlag(), query, (b) => statusFilter(b, 'f', status));
      return { ...page, data: page.data.map(toFlag) };
    },

    async flagDetail(id: number): Promise<Row> {
      const row = await master.findById(SPECS.vesselFlag(), id);
      if (!row) throw notFound('ธงเรือ', 'vessel flag not found');
      return toFlag(row);
    },

    async saveFlag(id: number | null, input: Row, by: string): Promise<Row> {
      const data: Row = { name: str(input.name).trim(), updated_by: by };
      const fileId = idOrNull(input.file_id ?? input.fileId);
      if (fileId) {
        const file = await files.find(fileId);
        if (file) {
          data.file_id = fileId;
          data.path = await files.urlOf(file);
        }
      } else if (str(input.filePath ?? input.path)) {
        data.path = str(input.filePath ?? input.path);
      }
      if (typeof input.status === 'boolean') data.status = input.status;
      if (id === null) {
        const row = await master.insert('vessel_flags', { ...data, created_by: by });
        return this.flagDetail(row.id as number);
      }
      if (!(await master.update('vessel_flags', id, data))) throw notFound('ธงเรือ', 'vessel flag not found');
      return this.flagDetail(id);
    },

    pilots(): Promise<Row[]> {
      return master.query('SELECT id, name, number, tel FROM pilots WHERE status = TRUE ORDER BY id');
    },

    tugs(): Promise<Row[]> {
      return master.query('SELECT id, name, type FROM tugs WHERE status = TRUE ORDER BY id');
    },

    all(spec: keyof typeof SPECS, table?: string, onlyActive = true): Promise<Row[]> {
      return master.all(spec === 'simple' ? SPECS.simple(table ?? 'locates') : SPECS[spec](), onlyActive);
    },

    repo: master,
  };
}

export type MasterService = ReturnType<typeof createMasterService>;
