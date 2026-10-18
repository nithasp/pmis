import pool from '../database';
import { Queryable, Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { pagedResult } from '../utils/paging';
import { requireRow } from '../utils/rows';
import { SqlBuilder, csvList } from '../utils/sql';

const SELECT = `
  vi.*, v.name AS vessel_name, v.imo_number, v.official_number, v.vessel_flag_id, f.name AS vessel_flag_name, f.path AS vessel_flag_path,
  v.vessel_type_id, t.name AS vessel_type_name, v.gross_tonnage AS vessel_gross_tonnage, bb.name_alt AS berth_name, j.name AS jetty_name,
  d.doc_number AS document_number, dv.vessel_gross_tonnage AS document_gross_tonnage, d.request_date AS document_date,
  lb.gross_tonnage AS log_book_gross_tonnage, ld.mooring_date AS vt_mooring_date, ld.departure_date AS vt_unmooring_date,
  COALESCE(NULLIF(u.company, ''), u.full_name) AS agency_name`;

const FROM = `
  FROM vessel_imports vi
  LEFT JOIN vessels v ON v.id = vi.vessel_id
  LEFT JOIN vessel_flags f ON f.id = v.vessel_flag_id
  LEFT JOIN vessel_types t ON t.id = v.vessel_type_id
  LEFT JOIN berths bb ON bb.id = vi.berth_id
  LEFT JOIN jetties j ON j.id = vi.jetty_id
  LEFT JOIN documents d ON d.id = vi.document_id
  LEFT JOIN document_vessels dv ON dv.document_id = d.id
  LEFT JOIN log_books lb ON lb.id = vi.log_book_id
  LEFT JOIN LATERAL (
    SELECT MIN(x.mooring_date) AS mooring_date, MAX(x.departure_date) AS departure_date FROM log_book_details x WHERE x.log_book_id = lb.id
  ) ld ON TRUE
  LEFT JOIN users u ON u.id = vi.created_by_id`;

const SORT: Record<string, string> = {
  id: 'id',
  status: 'status',
  vesselName: 'vessel_name',
  documentNumber: 'document_number',
  grt: 'gross_tonnage',
  grtVS: 'gross_tonnage',
  grtVT: 'log_book_gross_tonnage',
  mooringDate: 'mooring_date',
  mooringDateVS: 'mooring_date',
  unmooringDate: 'unmooring_date',
  unmooringDateVS: 'unmooring_date',
  jettyId: 'jetty_id',
  berthName: 'berth_name',
  note: 'note',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

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

export class VesselImportRepository {
  async list(filter: VesselImportFilter, query: ListQuery, db: Queryable = pool): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where('vi.deleted_at IS NULL');
    b.eq('vi.created_by_id', filter.createdById);
    const statuses = csvList(filter.status);
    if (statuses.length) b.in('vi.status', statuses);
    else if (filter.onlyStatuses?.length) b.in('vi.status', filter.onlyStatuses);
    if (filter.excludeStatuses?.length) b.where(`NOT (vi.status = ANY(${b.add(filter.excludeStatuses)}))`);
    b.eq('v.vessel_flag_id', filter.vesselFlagId && Number(filter.vesselFlagId) > 0 ? Number(filter.vesselFlagId) : null);
    b.eq('v.vessel_type_id', filter.vesselTypeId && Number(filter.vesselTypeId) > 0 ? Number(filter.vesselTypeId) : null);
    b.eq('vi.berth_id', filter.berthId && Number(filter.berthId) > 0 ? Number(filter.berthId) : null);
    b.eq('vi.jetty_id', filter.jettyId && Number(filter.jettyId) > 0 ? Number(filter.jettyId) : null);
    const purposeTypeId = Number(filter.purposeTypeId);
    if (purposeTypeId > 0) b.where(`EXISTS (SELECT 1 FROM vessel_import_products p WHERE p.vessel_import_id = vi.id AND p.purpose_type_id = ${b.add(purposeTypeId)})`);
    if (filter.productName) b.where(`EXISTS (SELECT 1 FROM vessel_import_products p WHERE p.vessel_import_id = vi.id AND p.product_name ILIKE ${b.add(`%${filter.productName}%`)})`);
    if (filter.created) b.where(`vi.created_at::date = ${b.add(filter.created)}::date`);
    b.between('vi.mooring_date', filter.mooringBegin, filter.mooringEnd);
    b.between('vi.unmooring_date', filter.unmooringBegin, filter.unmooringEnd);
    b.between('ld.mooring_date', filter.vtMooringBegin, filter.vtMooringEnd);
    b.between('ld.departure_date', filter.vtUnmooringBegin, filter.vtUnmooringEnd);
    b.like(['v.name', 'v.imo_number', 'v.official_number', 'd.doc_number', 'vi.note'], query.search);
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*)${FROM}${where}`, b.params);
    const { rows } = await db.query(
      `SELECT * FROM (SELECT ${SELECT}${FROM}${where}) x${b.orderBy(query.order, SORT, 'created_at DESC, id DESC')}${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, Number(countRows[0]?.count ?? 0), query);
  }

  async findById(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(`SELECT ${SELECT}${FROM} WHERE vi.id = $1 AND vi.deleted_at IS NULL`, [id]);
    return rows[0] ?? null;
  }

  async products(importIds: number[], db: Queryable = pool): Promise<Map<number, Row[]>> {
    const out = new Map<number, Row[]>();
    if (!importIds.length) return out;
    const { rows } = await db.query(
      `SELECT p.*, pt.code AS purpose_type_code, pt.name_en AS purpose_type_name, ct.name AS cargo_type_name, cw.name AS cargo_wharfage_name,
              prt.name AS product_type_name, pg.name AS product_group_name, pr.name AS product_master_name, co.name AS cargo_owner_master_name,
              c.name_en AS country_name
       FROM vessel_import_products p
       LEFT JOIN purpose_types pt ON pt.id = p.purpose_type_id
       LEFT JOIN cargo_types ct ON ct.id = p.cargo_type_id
       LEFT JOIN cargo_wharfages cw ON cw.id = p.cargo_wharfage_id
       LEFT JOIN product_types prt ON prt.id = p.product_type_id
       LEFT JOIN product_groups pg ON pg.id = p.product_group_id
       LEFT JOIN products pr ON pr.id = p.product_id
       LEFT JOIN cargo_owners co ON co.id = p.cargo_owner_id
       LEFT JOIN countries c ON c.id = p.country_id
       WHERE p.vessel_import_id = ANY($1) ORDER BY p.id`,
      [importIds],
    );
    for (const r of rows) {
      const list = out.get(r.vessel_import_id as number) ?? [];
      list.push(r);
      out.set(r.vessel_import_id as number, list);
    }
    return out;
  }

  async create(data: Row, db: Queryable = pool): Promise<Row> {
    const cols = Object.keys(data);
    const { rows } = await db.query(
      `INSERT INTO vessel_imports (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      cols.map((c) => data[c]),
    );
    return requireRow(rows, 'INSERT INTO vessel_imports');
  }

  async update(id: number, data: Row, db: Queryable = pool): Promise<Row | null> {
    const cols = Object.keys(data);
    if (!cols.length) return null;
    const { rows } = await db.query(
      `UPDATE vessel_imports SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...cols.map((c) => data[c])],
    );
    return rows[0] ?? null;
  }

  async softDelete(id: number, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE vessel_imports SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
    return (rowCount ?? 0) > 0;
  }

  async replaceProducts(importId: number, items: Row[], db: Queryable = pool): Promise<void> {
    await db.query('DELETE FROM vessel_import_products WHERE vessel_import_id = $1', [importId]);
    for (const item of items) {
      const cols = Object.keys(item);
      await db.query(
        `INSERT INTO vessel_import_products (vessel_import_id, ${cols.join(', ')}) VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(', ')})`,
        [importId, ...cols.map((c) => item[c])],
      );
    }
  }

  async files(importId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(
      'SELECT l.id AS link_id, l.name, f.* FROM vessel_import_files l JOIN files f ON f.id = l.file_id WHERE l.vessel_import_id = $1 ORDER BY l.id',
      [importId],
    );
    return rows;
  }
}
