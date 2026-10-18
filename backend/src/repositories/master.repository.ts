import pool from '../database';
import { Queryable, Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { pagedResult } from '../utils/paging';
import { requireRow } from '../utils/rows';
import { SqlBuilder } from '../utils/sql';

export interface ListSpec {
  select: string;
  from: string;
  live: string;
  searchColumns: string[];
  sortable: Record<string, string>;
  defaultOrder: string;
}

const AUDIT = 'created_at, created_by, updated_at, updated_by';

// Simple name + status tables share one spec; the richer tables (berths, ports, purposes,
// products) add their joins on top of it.
const simpleSpec = (table: string, alias = 't'): ListSpec => ({
  select: `${alias}.id, ${alias}.name, ${alias}.status, ${alias}.created_at, ${alias}.created_by, ${alias}.updated_at, ${alias}.updated_by`,
  from: `FROM ${table} ${alias}`,
  live: `${alias}.deleted_at IS NULL`,
  searchColumns: [`${alias}.name`],
  sortable: {
    id: `${alias}.id`,
    name: `${alias}.name`,
    status: `${alias}.status`,
    created_at: `${alias}.created_at`,
    updated_at: `${alias}.updated_at`,
    updated_by: `${alias}.updated_by`,
    created_by: `${alias}.created_by`,
  },
  defaultOrder: `${alias}.id ASC`,
});

export const SIMPLE_TABLES: Record<string, { table: string; label: string }> = {
  locate: { table: 'locates', label: 'สถานที่' },
  'use-berth': { table: 'use_berths', label: 'การใช้ท่า' },
  'cargo-type': { table: 'cargo_types', label: 'ตำแหน่งเทียบท่า' },
  'cargo-wharfage': { table: 'cargo_wharfages', label: 'รูปแบบสินค้า' },
  'vessel-type': { table: 'vessel_types', label: 'ประเภทเรือ' },
  'product-group': { table: 'product_groups', label: 'กลุ่มสินค้า' },
};

export const SPECS = {
  simple: simpleSpec,
  port: (): ListSpec => ({
    select: `p.id, p.name, p.locode, p.country_id, p.status, p.${AUDIT.replace(/, /g, ', p.')}, c.name_th AS country_name_th, c.name_en AS country_name_en`,
    from: 'FROM ports p LEFT JOIN countries c ON c.id = p.country_id',
    live: 'p.deleted_at IS NULL',
    searchColumns: ['p.name', 'p.locode', 'c.name_th', 'c.name_en'],
    sortable: { id: 'p.id', name: 'p.name', locode: 'p.locode', status: 'p.status', country: 'c.name_th', updated_at: 'p.updated_at', updated_by: 'p.updated_by' },
    defaultOrder: 'p.id ASC',
  }),
  berth: (): ListSpec => ({
    select: `b.id, b.name_th, b.name_en, b.name_alt, b.berth_type, b.vessel_type_id, b.port_due_rate, b.status, b.${AUDIT.replace(/, /g, ', b.')}, vt.name AS vessel_type_name`,
    from: 'FROM berths b LEFT JOIN vessel_types vt ON vt.id = b.vessel_type_id',
    live: 'b.deleted_at IS NULL',
    searchColumns: ['b.name_th', 'b.name_en', 'b.name_alt'],
    sortable: { id: 'b.id', name: 'b.name_th', name_th: 'b.name_th', name_en: 'b.name_en', name_alt: 'b.name_alt', status: 'b.status', berth_type_name: 'b.berth_type', updated_at: 'b.updated_at', updated_by: 'b.updated_by' },
    defaultOrder: 'b.id ASC',
  }),
  purpose: (): ListSpec => ({
    select: `p.id, p.name, p.purpose_type_id, p.is_government, p.status, p.${AUDIT.replace(/, /g, ', p.')}, pt.code AS purpose_type_code, pt.name_en AS purpose_type_name_en, pt.name_th AS purpose_type_name_th`,
    from: 'FROM purposes p JOIN purpose_types pt ON pt.id = p.purpose_type_id',
    live: 'p.deleted_at IS NULL',
    searchColumns: ['p.name', 'pt.name_en', 'pt.name_th'],
    sortable: { id: 'p.id', purpose_name: 'p.name', name: 'p.name', purpose_type_name: 'pt.name_en', status: 'p.status', updated_at: 'p.updated_at', updated_by: 'p.updated_by' },
    defaultOrder: 'p.id ASC',
  }),
  product: (): ListSpec => ({
    select: `p.id, p.name, p.product_type_id, p.product_group_id, p.status, p.${AUDIT.replace(/, /g, ', p.')}, pt.name AS product_type_name, pg.name AS product_group_name`,
    from: 'FROM products p LEFT JOIN product_types pt ON pt.id = p.product_type_id LEFT JOIN product_groups pg ON pg.id = p.product_group_id',
    live: 'p.deleted_at IS NULL',
    searchColumns: ['p.name', 'pt.name', 'pg.name'],
    sortable: { id: 'p.id', name: 'p.name', product_type_name: 'pt.name', product_group_name: 'pg.name', status: 'p.status', updated_at: 'p.updated_at', updated_by: 'p.updated_by' },
    defaultOrder: 'p.id ASC',
  }),
  productType: (): ListSpec => ({
    select: `pt.id, pt.name, pt.product_group_id, pt.status, pt.${AUDIT.replace(/, /g, ', pt.')}, pg.name AS product_group_name`,
    from: 'FROM product_types pt LEFT JOIN product_groups pg ON pg.id = pt.product_group_id',
    live: 'pt.deleted_at IS NULL',
    searchColumns: ['pt.name', 'pg.name'],
    sortable: { product_type_id: 'pt.id', id: 'pt.id', product_type_name: 'pt.name', product_group_name: 'pg.name', status: 'pt.status', updated_at: 'pt.updated_at', updated_by: 'pt.updated_by' },
    defaultOrder: 'pt.id ASC',
  }),
  vesselFlag: (): ListSpec => ({
    select: `f.id, f.name, f.code, f.path, f.file_id, f.status, f.${AUDIT.replace(/, /g, ', f.')}`,
    from: 'FROM vessel_flags f',
    live: 'f.deleted_at IS NULL',
    searchColumns: ['f.name', 'f.code'],
    sortable: { id: 'f.id', name: 'f.name', status: 'f.status', updated_at: 'f.updated_at', updated_by: 'f.updated_by' },
    defaultOrder: 'f.name ASC',
  }),
};

export class MasterRepository {
  async list(
    spec: ListSpec,
    query: ListQuery,
    extra: (b: SqlBuilder) => void = () => undefined,
    db: Queryable = pool,
  ): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where(spec.live);
    b.like(spec.searchColumns, query.search);
    extra(b);
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*) ${spec.from}${where}`, b.params);
    const { rows } = await db.query(
      `SELECT ${spec.select} ${spec.from}${where}${b.orderBy(query.order, spec.sortable, spec.defaultOrder)}${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, Number(countRows[0]?.count ?? 0), query);
  }

  async all(spec: ListSpec, onlyActive = true, db: Queryable = pool): Promise<Row[]> {
    const alias = spec.live.split('.')[0];
    const { rows } = await db.query(
      `SELECT ${spec.select} ${spec.from} WHERE ${spec.live}${onlyActive ? ` AND ${alias}.status = TRUE` : ''} ORDER BY ${spec.defaultOrder}`,
    );
    return rows;
  }

  async findById(spec: ListSpec, id: number, db: Queryable = pool): Promise<Row | null> {
    const alias = spec.live.split('.')[0];
    const { rows } = await db.query(`SELECT ${spec.select} ${spec.from} WHERE ${spec.live} AND ${alias}.id = $1`, [id]);
    return rows[0] ?? null;
  }

  async insert(table: string, data: Row, db: Queryable = pool): Promise<Row> {
    const cols = Object.keys(data);
    const { rows } = await db.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      cols.map((c) => data[c]),
    );
    return requireRow(rows, `INSERT INTO ${table}`);
  }

  async update(table: string, id: number, data: Row, db: Queryable = pool): Promise<Row | null> {
    const cols = Object.keys(data);
    if (!cols.length) return null;
    const { rows } = await db.query(
      `UPDATE ${table} SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...cols.map((c) => data[c])],
    );
    return rows[0] ?? null;
  }

  async softDelete(table: string, id: number, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query(`UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async jettiesOf(berthIds: number[], db: Queryable = pool): Promise<Map<number, Row[]>> {
    const out = new Map<number, Row[]>();
    if (!berthIds.length) return out;
    const { rows } = await db.query('SELECT id, berth_id, name FROM jetties WHERE berth_id = ANY($1) AND status = TRUE ORDER BY id', [berthIds]);
    for (const r of rows) {
      const list = out.get(r.berth_id as number) ?? [];
      list.push({ id: r.id, name: r.name });
      out.set(r.berth_id as number, list);
    }
    return out;
  }

  async replaceJetties(berthId: number, names: string[], db: Queryable = pool): Promise<void> {
    const { rows: existing } = await db.query('SELECT id, name FROM jetties WHERE berth_id = $1', [berthId]);
    const keep = new Set<number>();
    for (const name of names) {
      const found = existing.find((j) => j.name === name && !keep.has(j.id as number));
      if (found) {
        keep.add(found.id as number);
        await db.query('UPDATE jetties SET status = TRUE WHERE id = $1', [found.id]);
      } else {
        const { rows } = await db.query('INSERT INTO jetties (berth_id, name) VALUES ($1, $2) RETURNING id', [berthId, name]);
        keep.add(rows[0]?.id as number);
      }
    }
    // Jetties referenced by documents are only deactivated, never removed
    for (const j of existing) if (!keep.has(j.id as number)) await db.query('UPDATE jetties SET status = FALSE WHERE id = $1', [j.id]);
  }

  async query(sql: string, params: unknown[] = [], db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(sql, params);
    return rows;
  }
}
