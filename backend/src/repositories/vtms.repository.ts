import pool from '../database';
import { Queryable, Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { LogBookFilter } from '../types/vtms.types';
import { pagedResult } from '../utils/paging';
import { requireRow } from '../utils/rows';
import { SqlBuilder, csvIds, csvList } from '../utils/sql';

// A log book joined with its vessel (registered or government), the first detail row and the document
const LOG_BOOK_SELECT = `
  lb.*, d.doc_number AS document_number, d.status AS document_status, d.agency_user_id,
  COALESCE(NULLIF(u.company, ''), u.full_name, lb.agency_name) AS agency_display_name,
  COALESCE(v.name, g.name) AS vessel_name, COALESCE(v.imo_number, '') AS vessel_imo_number,
  COALESCE(v.official_number, g.official_number) AS vessel_official_number, COALESCE(v.vessel_type_id, g.vessel_type_id) AS vessel_type_id,
  COALESCE(vt.name, gt.name) AS vessel_type_name, COALESCE(vf.path, gf.path) AS vessel_flag_path, COALESCE(vf.name, gf.name) AS vessel_flag_name,
  COALESCE(vf.id, gf.id) AS vessel_flag_id,
  ld.id AS detail_id, ld.type_doc, ld.document_berth_id AS detail_document_berth_id, ld.berth_id, ld.jetty_id, ld.purpose_id, ld.cargo_type_id,
  ld.cargo_wharfage_id, ld.locate_id, ld.use_berth_id, ld.mooring_date, ld.departure_date,
  bb.name_alt AS berth_name, bb.name_th AS berth_name_th, j.name AS jetty_name, p.name AS purpose_name, pt.name_en AS purpose_type_name,
  pt.id AS purpose_type_id, ct.name AS cargo_type_name, cw.name AS cargo_wharfage_name, lo.name AS locate_name, ub.name AS use_berth_name,
  pn.name AS port_name_next, pl.name AS port_name_last, fl.file_name, fl.url AS file_url, fl.storage_key AS file_key`;

const LOG_BOOK_FROM = `
  FROM log_books lb
  LEFT JOIN documents d ON d.id = lb.document_id
  LEFT JOIN users u ON u.id = d.agency_user_id
  LEFT JOIN vessels v ON v.id = lb.vessel_id
  LEFT JOIN vessel_governments g ON g.id = lb.vessel_government_id
  LEFT JOIN vessel_types vt ON vt.id = v.vessel_type_id
  LEFT JOIN vessel_types gt ON gt.id = g.vessel_type_id
  LEFT JOIN vessel_flags vf ON vf.id = v.vessel_flag_id
  LEFT JOIN vessel_flags gf ON gf.id = g.vessel_flag_id
  LEFT JOIN LATERAL (SELECT * FROM log_book_details x WHERE x.log_book_id = lb.id ORDER BY x.id DESC LIMIT 1) ld ON TRUE
  LEFT JOIN berths bb ON bb.id = ld.berth_id
  LEFT JOIN jetties j ON j.id = ld.jetty_id
  LEFT JOIN purposes p ON p.id = ld.purpose_id
  LEFT JOIN purpose_types pt ON pt.id = p.purpose_type_id
  LEFT JOIN cargo_types ct ON ct.id = ld.cargo_type_id
  LEFT JOIN cargo_wharfages cw ON cw.id = ld.cargo_wharfage_id
  LEFT JOIN locates lo ON lo.id = ld.locate_id
  LEFT JOIN use_berths ub ON ub.id = ld.use_berth_id
  LEFT JOIN ports pn ON pn.id = lb.port_id_next
  LEFT JOIN ports pl ON pl.id = lb.port_id_last
  LEFT JOIN files fl ON fl.id = lb.file_id`;

// Sorting happens on the outer query, so these are the output column names of LOG_BOOK_SELECT
const LOG_BOOK_SORT: Record<string, string> = {
  id: 'id',
  status: 'status',
  create_date: 'created_at',
  created_at: 'created_at',
  updated_at: 'updated_at',
  updated_date: 'updated_at',
  berth_name: 'berth_name',
  document_number: 'document_number',
  name: 'vessel_name',
  vessel_name: 'vessel_name',
  vessel_type_name: 'vessel_type_name',
  gross_tonnage_depth: 'gross_tonnage',
  gross_tonnage: 'gross_tonnage',
  voyage: 'voyage',
  purpose_name: 'purpose_name',
  agency_name: 'agency_display_name',
  mooring_date: 'mooring_date',
  departure_date: 'departure_date',
};

export class VtmsRepository {
  async listLogBooks(filter: LogBookFilter, query: ListQuery, db: Queryable = pool): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where('lb.deleted_at IS NULL');
    const statuses = csvList(filter.status ?? filter.logType);
    if (statuses.length) b.in('lb.status', statuses);
    b.eq('ld.berth_id', filter.berthId && Number(filter.berthId) > 0 ? Number(filter.berthId) : null);
    const berthIds = csvIds(filter.berthIds);
    if (berthIds.length) b.in('ld.berth_id', berthIds);
    const purposeTypeIds = csvIds(filter.purposeTypeIds);
    if (purposeTypeIds.length) b.in('pt.id', purposeTypeIds);
    b.eq('lb.vessel_id', filter.vesselId && Number(filter.vesselId) > 0 ? Number(filter.vesselId) : null);
    b.eq('lb.document_id', filter.documentId);
    if (filter.hasDocument) b.where('lb.document_id IS NOT NULL');
    b.between('ld.mooring_date', filter.mooringBegin, filter.mooringEnd);
    b.between('ld.departure_date', filter.departureBegin, filter.departureEnd);
    b.like(['d.doc_number', 'v.name', 'g.name', 'v.imo_number', 'v.official_number', 'g.official_number', 'lb.voyage'], query.search);
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*)${LOG_BOOK_FROM}${where}`, b.params);
    const { rows } = await db.query(
      `SELECT * FROM (SELECT ${LOG_BOOK_SELECT}${LOG_BOOK_FROM}${where}) x${b.orderBy(query.order, LOG_BOOK_SORT, 'created_at DESC, id DESC')}${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, Number(countRows[0]?.count ?? 0), query);
  }

  async findLogBook(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(`SELECT ${LOG_BOOK_SELECT}${LOG_BOOK_FROM} WHERE lb.id = $1 AND lb.deleted_at IS NULL`, [id]);
    return rows[0] ?? null;
  }

  async latestLogBookOfDocument(documentId: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(
      `SELECT ${LOG_BOOK_SELECT}${LOG_BOOK_FROM} WHERE lb.document_id = $1 AND lb.deleted_at IS NULL ORDER BY lb.id DESC LIMIT 1`,
      [documentId],
    );
    return rows[0] ?? null;
  }

  async details(logBookId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(
      `SELECT ld.*, bb.name_alt AS berth_name, j.name AS jetty_name, p.name AS purpose_name, ct.name AS cargo_type_name, cw.name AS cargo_wharfage_name,
              lo.name AS locate_name, ub.name AS use_berth_name
       FROM log_book_details ld
       LEFT JOIN berths bb ON bb.id = ld.berth_id LEFT JOIN jetties j ON j.id = ld.jetty_id LEFT JOIN purposes p ON p.id = ld.purpose_id
       LEFT JOIN cargo_types ct ON ct.id = ld.cargo_type_id LEFT JOIN cargo_wharfages cw ON cw.id = ld.cargo_wharfage_id
       LEFT JOIN locates lo ON lo.id = ld.locate_id LEFT JOIN use_berths ub ON ub.id = ld.use_berth_id
       WHERE ld.log_book_id = $1 ORDER BY ld.id`,
      [logBookId],
    );
    return rows;
  }

  async tugs(logBookId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(
      'SELECT t.id, t.tug_id, t.status, t.status_code, m.name AS tug_name, m.type AS tug_type FROM log_book_tugs t LEFT JOIN tugs m ON m.id = t.tug_id WHERE t.log_book_id = $1 ORDER BY t.id',
      [logBookId],
    );
    return rows;
  }

  async pilots(logBookId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(
      'SELECT p.id, p.pilot_id, p.status, p.status_code, m.name AS pilot_name, m.number AS pilot_number, m.tel AS pilot_tel FROM log_book_pilots p LEFT JOIN pilots m ON m.id = p.pilot_id WHERE p.log_book_id = $1 ORDER BY p.id',
      [logBookId],
    );
    return rows;
  }

  async products(logBookId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(
      `SELECT p.*, pt.name AS product_type_name, pg.name AS product_group_name FROM log_book_products p
       LEFT JOIN product_types pt ON pt.id = p.product_type_id LEFT JOIN product_groups pg ON pg.id = p.product_group_id WHERE p.log_book_id = $1 ORDER BY p.id`,
      [logBookId],
    );
    return rows;
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
      `UPDATE ${table} SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...cols.map((c) => data[c])],
    );
    return rows[0] ?? null;
  }

  async deleteWhere(table: string, column: string, value: unknown, db: Queryable = pool): Promise<void> {
    await db.query(`DELETE FROM ${table} WHERE ${column} = $1`, [value]);
  }

  async deleteById(table: string, id: number, db: Queryable = pool): Promise<void> {
    await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  }

  async softDeleteLogBook(id: number, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE log_books SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
    return (rowCount ?? 0) > 0;
  }

  // Berths of a document with the state of their VTMS log: which actions are still open
  async documentBerthLog(documentId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(
      `SELECT b.id AS doc_berth_id, b.berth_id, bb.name_alt AS berth_name, b.jetty_id, j.name AS jetty_name, b.purpose_id, p.name AS purpose_name,
              b.estimated_arrival, b.estimated_departure, b.sequence,
              (SELECT ld.mooring_date FROM log_book_details ld JOIN log_books lb ON lb.id = ld.log_book_id
                WHERE lb.deleted_at IS NULL AND ld.document_berth_id = b.id AND ld.type_doc = 'Arrival' ORDER BY ld.id DESC LIMIT 1) AS mooring_date,
              (SELECT ld.departure_date FROM log_book_details ld JOIN log_books lb ON lb.id = ld.log_book_id
                WHERE lb.deleted_at IS NULL AND ld.document_berth_id = b.id AND ld.type_doc = 'Departure' ORDER BY ld.id DESC LIMIT 1) AS departure_date,
              (SELECT lb.id FROM log_book_details ld JOIN log_books lb ON lb.id = ld.log_book_id
                WHERE lb.deleted_at IS NULL AND ld.document_berth_id = b.id AND ld.type_doc = 'Arrival' ORDER BY ld.id DESC LIMIT 1) AS vessel_in_id
       FROM document_berths b
       LEFT JOIN berths bb ON bb.id = b.berth_id LEFT JOIN jetties j ON j.id = b.jetty_id LEFT JOIN purposes p ON p.id = b.purpose_id
       WHERE b.document_id = $1 ORDER BY b.sequence, b.id`,
      [documentId],
    );
    return rows;
  }

  // ---- anchors -------------------------------------------------------------------------------
  async listAnchors(filter: { status?: unknown; documentId?: number | null }, query: ListQuery, db: Queryable = pool): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where('a.deleted_at IS NULL');
    const statuses = csvList(filter.status);
    if (statuses.length) b.in('a.status', statuses);
    b.eq('a.document_id', filter.documentId);
    b.like(['v.name', 'v.imo_number', 'v.official_number', 'd.doc_number', 'a.voyage'], query.search);
    const from = ` FROM anchors a LEFT JOIN vessels v ON v.id = a.vessel_id LEFT JOIN vessel_types vt ON vt.id = v.vessel_type_id
      LEFT JOIN vessel_flags vf ON vf.id = v.vessel_flag_id LEFT JOIN berths bb ON bb.id = a.berth_id LEFT JOIN documents d ON d.id = a.document_id`;
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*)${from}${where}`, b.params);
    const sort: Record<string, string> = { id: 'a.id', status: 'a.status', anchor_date: 'a.anchor_date', pilot_date: 'a.pilot_date', aweigh_date: 'a.aweigh_date', berth_name: 'bb.name_alt', name: 'v.name', vessel_type_name: 'vt.name' };
    const { rows } = await db.query(
      `SELECT a.*, v.name AS vessel_name, v.imo_number AS vessel_imo_number, v.official_number AS vessel_official_number, v.vessel_type_id,
              vt.name AS vessel_type_name, vf.path AS vessel_flag_path, vf.name AS vessel_flag_name, bb.name_alt AS berth_name, d.doc_number AS document_number
       ${from}${where}${b.orderBy(query.order, sort, 'a.anchor_date DESC NULLS LAST, a.id DESC')}${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, Number(countRows[0]?.count ?? 0), query);
  }

  async findAnchor(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(
      `SELECT a.*, bb.name_alt AS berth_name, d.doc_number AS document_number, pn.name AS port_name_next, pl.name AS port_name_last
       FROM anchors a LEFT JOIN berths bb ON bb.id = a.berth_id LEFT JOIN documents d ON d.id = a.document_id
       LEFT JOIN ports pn ON pn.id = a.port_id_next LEFT JOIN ports pl ON pl.id = a.port_id_last WHERE a.id = $1 AND a.deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  async anchorsOfDocument(documentId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(
      'SELECT a.*, bb.name_alt AS berth_name FROM anchors a LEFT JOIN berths bb ON bb.id = a.berth_id WHERE a.document_id = $1 AND a.deleted_at IS NULL ORDER BY a.id',
      [documentId],
    );
    return rows;
  }

  async softDeleteAnchor(id: number, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE anchors SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
    return (rowCount ?? 0) > 0;
  }

  async summary(db: Queryable = pool): Promise<Row> {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM log_book_details ld JOIN log_books lb ON lb.id = ld.log_book_id WHERE lb.deleted_at IS NULL AND ld.type_doc = 'Arrival' AND ld.mooring_date >= NOW() - INTERVAL '30 days') AS vessel_in,
        (SELECT COUNT(*) FROM log_book_details ld JOIN log_books lb ON lb.id = ld.log_book_id WHERE lb.deleted_at IS NULL AND ld.type_doc = 'Departure' AND ld.departure_date >= NOW() - INTERVAL '30 days') AS vessel_out,
        (SELECT COUNT(*) FROM documents d WHERE d.deleted_at IS NULL AND d.vessel_status = 'Berth') AS vessel_dock,
        (SELECT COUNT(*) FROM anchors a WHERE a.deleted_at IS NULL AND a.aweigh_date IS NULL) AS anchor`);
    return rows[0] ?? { vessel_in: 0, vessel_out: 0, vessel_dock: 0, anchor: 0 };
  }
}
