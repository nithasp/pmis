import pool from '../database';
import { Queryable, Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { VesselFilter } from '../types/vessel.types';
import { pagedResult } from '../utils/paging';
import { requireRow } from '../utils/rows';
import { SqlBuilder } from '../utils/sql';

export const VESSEL_SELECT = `
  v.*, f.name AS vessel_flag_name, f.path AS vessel_flag_path, t.name AS vessel_type_name`;
const VESSEL_FROM = ' FROM vessels v LEFT JOIN vessel_flags f ON f.id = v.vessel_flag_id LEFT JOIN vessel_types t ON t.id = v.vessel_type_id';

const VESSEL_SORT: Record<string, string> = {
  id: 'v.id',
  name: 'v.name',
  vesselName: 'v.name',
  owner: 'v.owner',
  vesselTypeId: 't.name',
  mmsiNumber: 'v.mmsi_number',
  callSign: 'v.call_sign',
  grossTonnage: 'v.gross_tonnage',
  lengthOverall: 'v.length_overall',
  createdAt: 'v.created_at',
  updatedAt: 'v.updated_at',
};

export class VesselRepository {
  async list(filter: VesselFilter, query: ListQuery, db: Queryable = pool): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where('v.deleted_at IS NULL');
    b.eq('v.vessel_flag_id', filter.flag);
    b.eq('v.vessel_type_id', filter.type);
    b.eq('v.owner_id', filter.ownerId);
    if (filter.owner) b.like(['v.owner'], filter.owner);
    b.like(['v.name', 'v.imo_number', 'v.official_number', 'v.owner', 'v.mmsi_number', 'v.call_sign'], query.search);
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*)${VESSEL_FROM}${where}`, b.params);
    const { rows } = await db.query(
      `SELECT ${VESSEL_SELECT}${VESSEL_FROM}${where}${b.orderBy(query.order, VESSEL_SORT, 'v.updated_at DESC')}${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, Number(countRows[0]?.count ?? 0), query);
  }

  async findById(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(`SELECT ${VESSEL_SELECT}${VESSEL_FROM} WHERE v.id = $1 AND v.deleted_at IS NULL`, [id]);
    return rows[0] ?? null;
  }

  async findByIds(ids: number[], db: Queryable = pool): Promise<Map<number, Row>> {
    if (!ids.length) return new Map();
    const { rows } = await db.query(`SELECT ${VESSEL_SELECT}${VESSEL_FROM} WHERE v.id = ANY($1)`, [ids]);
    return new Map(rows.map((r) => [r.id as number, r]));
  }

  async create(data: Row, db: Queryable = pool): Promise<Row> {
    const cols = Object.keys(data);
    const { rows } = await db.query(
      `INSERT INTO vessels (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      cols.map((c) => data[c]),
    );
    return requireRow(rows, 'INSERT INTO vessels');
  }

  async update(id: number, data: Row, db: Queryable = pool): Promise<Row | null> {
    const cols = Object.keys(data);
    const { rows } = await db.query(
      `UPDATE vessels SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...cols.map((c) => data[c])],
    );
    return rows[0] ?? null;
  }

  // Previous versions of a vessel: the snapshot stored on every document it was requested with
  async history(vesselId: number, filter: { begin?: unknown; end?: unknown }, query: ListQuery, db: Queryable = pool): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where('dv.vessel_id = $1');
    b.params.push(vesselId);
    b.where('d.deleted_at IS NULL');
    b.where("d.status IN ('Approved', 'PendingConfirmation', 'PendingConfirmation1', 'PendingConfirmation2', 'PendingApproval')");
    b.between('d.approved_at', filter.begin, filter.end);
    b.like(['dv.vessel_name', 'd.doc_number', 'dv.vessel_imo_number', 'dv.vessel_official_number'], query.search);
    const from = ' FROM document_vessels dv JOIN documents d ON d.id = dv.document_id LEFT JOIN vessel_flags f ON f.id = dv.vessel_flag_id LEFT JOIN vessel_types t ON t.id = dv.vessel_type_id';
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*)${from}${where}`, b.params);
    const { rows } = await db.query(
      `SELECT dv.*, d.doc_number, d.status AS document_status, d.approved_at, d.request_date, d.created_by AS created_name, d.updated_by AS updated_name,
              f.name AS vessel_flag_name, f.path AS vessel_flag_path, t.name AS vessel_type_name
       ${from}${where} ORDER BY d.request_date DESC${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, Number(countRows[0]?.count ?? 0), query);
  }

  // ---- government vessels ---------------------------------------------------------------------
  async listGovernment(query: ListQuery, db: Queryable = pool): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where('g.deleted_at IS NULL');
    b.like(['g.name', 'g.official_number', 'a.name'], query.search);
    const from = ' FROM vessel_governments g LEFT JOIN vessel_flags f ON f.id = g.vessel_flag_id LEFT JOIN authorities a ON a.id = g.authority_id LEFT JOIN vessel_types t ON t.id = g.vessel_type_id';
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*)${from}${where}`, b.params);
    const sort: Record<string, string> = { id: 'g.id', name: 'g.name', lengthOverall: 'g.length_overall', breadthExtreme: 'g.breadth', depth: 'g.depth', displacement: 'g.displacement' };
    const { rows } = await db.query(
      `SELECT g.*, f.name AS vessel_flag_name, f.path AS vessel_flag_path, a.name AS authority_name, t.name AS vessel_type_name
       ${from}${where}${b.orderBy(query.order, sort, 'g.id ASC')}${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, Number(countRows[0]?.count ?? 0), query);
  }

  async findGovernment(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(
      `SELECT g.*, f.name AS vessel_flag_name, f.path AS vessel_flag_path, a.name AS authority_name, t.name AS vessel_type_name
       FROM vessel_governments g LEFT JOIN vessel_flags f ON f.id = g.vessel_flag_id LEFT JOIN authorities a ON a.id = g.authority_id LEFT JOIN vessel_types t ON t.id = g.vessel_type_id
       WHERE g.id = $1 AND g.deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  async createGovernment(data: Row, db: Queryable = pool): Promise<Row> {
    const cols = Object.keys(data);
    const { rows } = await db.query(
      `INSERT INTO vessel_governments (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      cols.map((c) => data[c]),
    );
    return requireRow(rows, 'INSERT INTO vessel_governments');
  }

  async updateGovernment(id: number, data: Row, db: Queryable = pool): Promise<Row | null> {
    const cols = Object.keys(data);
    const { rows } = await db.query(
      `UPDATE vessel_governments SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...cols.map((c) => data[c])],
    );
    return rows[0] ?? null;
  }

  async softDeleteGovernment(id: number, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE vessel_governments SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
    return (rowCount ?? 0) > 0;
  }
}
