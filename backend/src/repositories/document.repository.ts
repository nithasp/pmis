import pool from '../database';
import { Queryable, Row } from '../types/database.types';
import { DocumentFilter } from '../types/document.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { pagedResult } from '../utils/paging';
import { requireRow } from '../utils/rows';
import { SqlBuilder, csvList } from '../utils/sql';

// One row per document with its vessel snapshot, agency and the aggregates the list pages show
export const DOCUMENT_SELECT = `
  d.*, dv.id AS document_vessel_id, dv.vessel_id, dv.vessel_flag_id, dv.vessel_type_id, dv.vessel_owner, dv.vessel_owner_id,
  dv.vessel_name, dv.vessel_imo_number, dv.vessel_mmsi_number, dv.vessel_dsv_number, dv.vessel_official_number, dv.vessel_call_sign,
  dv.vessel_nationality, dv.vessel_country, dv.vessel_load_weight, dv.vessel_gross_tonnage, dv.vessel_net_tonnage,
  dv.vessel_length_overall, dv.vessel_breadth_extreme, dv.vessel_depth, dv.vessel_main_engine, dv.vessel_band_and_model,
  dv.vessel_license_expired_date,
  f.name AS vessel_flag_name, f.path AS vessel_flag_path, t.name AS vessel_type_name,
  COALESCE(NULLIF(u.company, ''), u.full_name) AS agency_name, u.full_name AS agency_contact, u.email AS agency_email,
  u.phone AS agency_phone, u.mobile_phone AS agency_mobile_phone,
  (SELECT MIN(b.estimated_arrival) FROM document_berths b WHERE b.document_id = d.id) AS eta,
  (SELECT MAX(b.estimated_departure) FROM document_berths b WHERE b.document_id = d.id) AS etd,
  (SELECT STRING_AGG(bb.name_alt, ', ' ORDER BY b.sequence, b.id) FROM document_berths b JOIN berths bb ON bb.id = b.berth_id WHERE b.document_id = d.id) AS berth_names,
  (SELECT STRING_AGG(DISTINCT pt.name_en, ', ') FROM document_berths b JOIN purpose_types pt ON pt.id = b.purpose_type_id WHERE b.document_id = d.id) AS purpose_names,
  (SELECT COALESCE(SUM(p.total), 0) FROM port_dues p WHERE p.document_id = d.id AND p.canceled_at IS NULL) AS port_dues`;

export const DOCUMENT_FROM = `
  FROM documents d
  LEFT JOIN document_vessels dv ON dv.document_id = d.id
  LEFT JOIN vessel_flags f ON f.id = dv.vessel_flag_id
  LEFT JOIN vessel_types t ON t.id = dv.vessel_type_id
  LEFT JOIN users u ON u.id = d.agency_user_id`;

// The list is sorted on the outer query, so these are the unprefixed column names of DOCUMENT_SELECT
const SORTABLE: Record<string, string> = {
  id: 'id',
  createAt: 'request_date',
  requestDate: 'request_date',
  status: 'status',
  statusDes: 'status',
  docNumber: 'doc_number',
  vesselName: 'vessel_name',
  name: 'vessel_name',
  imoNumber: 'vessel_imo_number',
  grt: 'vessel_gross_tonnage',
  eta: 'eta',
  berthNames: 'berth_names',
  vesselStatus: 'vessel_status',
  vesselStatusDesEn: 'vessel_status',
  agencyName: 'agency_name',
  vesselTypeName: 'vessel_type_name',
  approvedAt: 'approved_at',
  updatedAt: 'updated_at',
};

export class DocumentRepository {
  async list(filter: DocumentFilter, query: ListQuery, db: Queryable = pool): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where('d.deleted_at IS NULL');
    b.eq('d.agency_user_id', filter.agencyUserId);
    const statuses = csvList(filter.status);
    if (statuses.length) b.in('d.status', statuses);
    else if (filter.excludeDraft) b.where("d.status <> 'Draft'");
    b.eq('dv.vessel_id', filter.vesselId);
    b.eq('d.vessel_status', filter.vesselStatus);
    b.eq('dv.vessel_flag_id', filter.vesselFlagId && Number(filter.vesselFlagId) > 0 ? Number(filter.vesselFlagId) : null);
    b.between('d.request_date', filter.begin, filter.end);
    b.between('d.approved_at', filter.approvedBegin, filter.approvedEnd);
    const berthId = Number(filter.berthId);
    if (berthId > 0) b.where(`EXISTS (SELECT 1 FROM document_berths b WHERE b.document_id = d.id AND b.berth_id = ${b.add(berthId)})`);
    if (filter.berthType) b.where(`EXISTS (SELECT 1 FROM document_berths b WHERE b.document_id = d.id AND b.berth_type = ${b.add(filter.berthType)})`);
    const purposeId = Number(filter.purposeId);
    if (purposeId > 0) b.where(`EXISTS (SELECT 1 FROM document_berths b WHERE b.document_id = d.id AND b.purpose_id = ${b.add(purposeId)})`);
    if (filter.etaBegin) b.where(`EXISTS (SELECT 1 FROM document_berths b WHERE b.document_id = d.id AND b.estimated_arrival >= ${b.add(filter.etaBegin)})`);
    if (filter.etaEnd) b.where(`EXISTS (SELECT 1 FROM document_berths b WHERE b.document_id = d.id AND b.estimated_arrival <= ${b.add(filter.etaEnd)})`);
    b.like(
      ['d.doc_number', 'dv.vessel_name', 'dv.vessel_imo_number', 'dv.vessel_official_number', 'u.company', 'u.full_name'],
      filter.keyword || query.search,
    );
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*)${DOCUMENT_FROM}${where}`, b.params);
    const { rows } = await db.query(
      `SELECT * FROM (SELECT ${DOCUMENT_SELECT}${DOCUMENT_FROM}${where}) x${b.orderBy(query.order, SORTABLE, 'request_date DESC NULLS LAST, id DESC')}${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, Number(countRows[0]?.count ?? 0), query);
  }

  async findById(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(`SELECT ${DOCUMENT_SELECT}${DOCUMENT_FROM} WHERE d.id = $1 AND d.deleted_at IS NULL`, [id]);
    return rows[0] ?? null;
  }

  async findDraft(agencyUserId: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(
      `SELECT ${DOCUMENT_SELECT}${DOCUMENT_FROM} WHERE d.agency_user_id = $1 AND d.status = 'Draft' AND d.deleted_at IS NULL ORDER BY d.id DESC LIMIT 1`,
      [agencyUserId],
    );
    return rows[0] ?? null;
  }

  async create(data: Row, db: Queryable = pool): Promise<Row> {
    const cols = Object.keys(data);
    const { rows } = await db.query(
      `INSERT INTO documents (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      cols.map((c) => data[c]),
    );
    return requireRow(rows, 'INSERT INTO documents');
  }

  async update(id: number, data: Row, db: Queryable = pool): Promise<Row | null> {
    const cols = Object.keys(data);
    if (!cols.length) return null;
    const { rows } = await db.query(
      `UPDATE documents SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...cols.map((c) => data[c])],
    );
    return rows[0] ?? null;
  }

  async upsertVessel(documentId: number, data: Row, db: Queryable = pool): Promise<void> {
    const cols = Object.keys(data);
    await db.query(
      `INSERT INTO document_vessels (document_id, ${cols.join(', ')}) VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(', ')})
       ON CONFLICT (document_id) DO UPDATE SET ${cols.map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`,
      [documentId, ...cols.map((c) => data[c])],
    );
  }

  async nextDocNumber(db: Queryable = pool): Promise<string> {
    const year = new Date().getFullYear() + 543;
    const prefix = `PMIS-${year}-`;
    const { rows } = await db.query(`SELECT doc_number FROM documents WHERE doc_number LIKE $1 ORDER BY doc_number DESC LIMIT 1`, [`${prefix}%`]);
    const last = rows[0] ? Number(String(rows[0].doc_number).slice(prefix.length)) : 0;
    return `${prefix}${String(last + 1).padStart(5, '0')}`;
  }

  // ---- berths -------------------------------------------------------------------------------
  async berths(documentId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(
      `SELECT b.*, bb.name_th AS berth_name_th, bb.name_en AS berth_name_en, bb.name_alt AS berth_name_alt, bb.berth_type AS berth_berth_type,
              bb.port_due_rate, j.name AS jetty_name, pt.code AS purpose_type_code, pt.name_en AS purpose_type_name, p.name AS purpose_name,
              ct.name AS cargo_type_name
       FROM document_berths b
       LEFT JOIN berths bb ON bb.id = b.berth_id
       LEFT JOIN jetties j ON j.id = b.jetty_id
       LEFT JOIN purpose_types pt ON pt.id = b.purpose_type_id
       LEFT JOIN purposes p ON p.id = b.purpose_id
       LEFT JOIN cargo_types ct ON ct.id = b.cargo_type_id
       WHERE b.document_id = $1 ORDER BY b.sequence, b.id`,
      [documentId],
    );
    return rows;
  }

  async berthById(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(
      `SELECT b.*, bb.name_th AS berth_name_th, bb.name_en AS berth_name_en, bb.name_alt AS berth_name_alt, bb.berth_type AS berth_berth_type,
              bb.port_due_rate, j.name AS jetty_name, pt.code AS purpose_type_code, pt.name_en AS purpose_type_name, p.name AS purpose_name,
              ct.name AS cargo_type_name
       FROM document_berths b
       LEFT JOIN berths bb ON bb.id = b.berth_id
       LEFT JOIN jetties j ON j.id = b.jetty_id
       LEFT JOIN purpose_types pt ON pt.id = b.purpose_type_id
       LEFT JOIN purposes p ON p.id = b.purpose_id
       LEFT JOIN cargo_types ct ON ct.id = b.cargo_type_id
       WHERE b.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async insertBerth(data: Row, db: Queryable = pool): Promise<Row> {
    const cols = Object.keys(data);
    const { rows } = await db.query(
      `INSERT INTO document_berths (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      cols.map((c) => data[c]),
    );
    return requireRow(rows, 'INSERT INTO document_berths');
  }

  async updateBerth(id: number, data: Row, db: Queryable = pool): Promise<Row | null> {
    const cols = Object.keys(data);
    if (!cols.length) return this.berthById(id, db);
    const { rows } = await db.query(
      `UPDATE document_berths SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...cols.map((c) => data[c])],
    );
    return rows[0] ?? null;
  }

  async deleteBerth(id: number, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query('DELETE FROM document_berths WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  // ---- berth products -----------------------------------------------------------------------
  async products(berthIds: number[], db: Queryable = pool): Promise<Map<number, Row[]>> {
    const out = new Map<number, Row[]>();
    if (!berthIds.length) return out;
    const { rows } = await db.query(
      `SELECT p.*, pt.name AS product_type_name, pg.name AS product_group_name, cw.name AS cargo_wharfage_name, pu.name AS purpose_name,
              co.name AS cargo_owner_name
       FROM document_berth_products p
       LEFT JOIN product_types pt ON pt.id = p.product_type_id
       LEFT JOIN product_groups pg ON pg.id = p.product_group_id
       LEFT JOIN cargo_wharfages cw ON cw.id = p.cargo_wharfage_id
       LEFT JOIN purposes pu ON pu.id = p.purpose_id
       LEFT JOIN cargo_owners co ON co.id = p.cargo_owner_id
       WHERE p.document_berth_id = ANY($1) ORDER BY p.id`,
      [berthIds],
    );
    for (const r of rows) {
      const list = out.get(r.document_berth_id as number) ?? [];
      list.push(r);
      out.set(r.document_berth_id as number, list);
    }
    return out;
  }

  async productById(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(
      `SELECT p.*, pt.name AS product_type_name, pg.name AS product_group_name, cw.name AS cargo_wharfage_name, pu.name AS purpose_name,
              co.name AS cargo_owner_name
       FROM document_berth_products p
       LEFT JOIN product_types pt ON pt.id = p.product_type_id
       LEFT JOIN product_groups pg ON pg.id = p.product_group_id
       LEFT JOIN cargo_wharfages cw ON cw.id = p.cargo_wharfage_id
       LEFT JOIN purposes pu ON pu.id = p.purpose_id
       LEFT JOIN cargo_owners co ON co.id = p.cargo_owner_id
       WHERE p.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async insertProduct(data: Row, db: Queryable = pool): Promise<Row> {
    const cols = Object.keys(data);
    const { rows } = await db.query(
      `INSERT INTO document_berth_products (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      cols.map((c) => data[c]),
    );
    return requireRow(rows, 'INSERT INTO document_berth_products');
  }

  async updateProduct(id: number, data: Row, db: Queryable = pool): Promise<Row | null> {
    const cols = Object.keys(data);
    const { rows } = await db.query(
      `UPDATE document_berth_products SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...cols.map((c) => data[c])],
    );
    return rows[0] ?? null;
  }

  async deleteProduct(id: number, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query('DELETE FROM document_berth_products WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  // ---- invoice ------------------------------------------------------------------------------
  async invoice(documentId: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(
      `SELECT i.*, pm.name AS payment_method_name, pm.payment_period_day, pt.name AS payment_term_name, c.name_th AS country_name,
              pr.name_th AS province_name, di.name_th AS district_name, sd.name_th AS sub_district_name, cu.code AS customer_code
       FROM document_invoices i
       LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id
       LEFT JOIN payment_terms pt ON pt.id = i.payment_term_id
       LEFT JOIN countries c ON c.id = i.country_id
       LEFT JOIN provinces pr ON pr.id = i.province_id
       LEFT JOIN districts di ON di.id = i.district_id
       LEFT JOIN sub_districts sd ON sd.id = i.sub_district_id
       LEFT JOIN customers cu ON cu.id = i.customer_id
       WHERE i.document_id = $1`,
      [documentId],
    );
    return rows[0] ?? null;
  }

  async upsertInvoice(documentId: number, data: Row, db: Queryable = pool): Promise<void> {
    const cols = Object.keys(data);
    await db.query(
      `INSERT INTO document_invoices (document_id, ${cols.join(', ')}) VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(', ')})
       ON CONFLICT (document_id) DO UPDATE SET ${cols.map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`,
      [documentId, ...cols.map((c) => data[c])],
    );
  }

  // ---- special berths (jetty chosen at confirmation) -----------------------------------------
  async spacialBerths(documentId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(
      `SELECT s.*, bb.name_alt AS berth_name, bb.berth_type, j.name AS jetty_name FROM document_spacial_berths s
       LEFT JOIN berths bb ON bb.id = s.berth_id LEFT JOIN jetties j ON j.id = s.jetty_id WHERE s.document_id = $1 ORDER BY s.id`,
      [documentId],
    );
    return rows;
  }

  async replaceSpacialBerths(documentId: number, items: Row[], db: Queryable = pool): Promise<void> {
    await db.query('DELETE FROM document_spacial_berths WHERE document_id = $1', [documentId]);
    for (const item of items) {
      await db.query(
        'INSERT INTO document_spacial_berths (document_id, berth_id, jetty_id, eta, etb, etd) VALUES ($1, $2, $3, $4, $5, $6)',
        [documentId, item.berth_id, item.jetty_id ?? null, item.eta ?? null, item.etb ?? null, item.etd ?? null],
      );
    }
  }

  // ---- history ------------------------------------------------------------------------------
  async addHistory(documentId: number, status: string, snapshot: Row, db: Queryable = pool): Promise<void> {
    await db.query('INSERT INTO document_histories (document_id, status, snapshot) VALUES ($1, $2, $3)', [documentId, status, JSON.stringify(snapshot)]);
  }

  async latestHistory(documentId: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query('SELECT * FROM document_histories WHERE document_id = $1 ORDER BY id DESC LIMIT 1', [documentId]);
    return rows[0] ?? null;
  }

  // ---- ship table (MIT / TCT) ---------------------------------------------------------------
  // Approved request berths of one berth type that still wait for a jetty / ETB / ETD
  async berthQueue(berthType: string, query: ListQuery, db: Queryable = pool): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where('d.deleted_at IS NULL');
    b.where("d.status = 'Approved'");
    b.where(`b.berth_type = ${b.add(berthType)}`);
    b.where('NOT EXISTS (SELECT 1 FROM log_book_details ld WHERE ld.document_berth_id = b.id)');
    b.like(['d.doc_number', 'dv.vessel_name', 'dv.vessel_imo_number', 'dv.vessel_official_number'], query.search);
    const from = ` FROM document_berths b JOIN documents d ON d.id = b.document_id ${DOCUMENT_FROM.replace('FROM documents d', '')} LEFT JOIN berths bb ON bb.id = b.berth_id LEFT JOIN jetties j ON j.id = b.jetty_id`;
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*)${from}${where}`, b.params);
    const { rows } = await db.query(
      `SELECT b.id AS document_berth_id, b.berth_id, b.jetty_id, b.etb, b.etd, b.berth_save_date, b.cargo_work_time, b.estimated_arrival, b.estimated_departure,
              bb.name_alt AS berth_name_alt, j.name AS jetty_name, ${DOCUMENT_SELECT}${from}${where}
       ORDER BY COALESCE(b.etb, b.estimated_arrival) ASC NULLS LAST, b.id${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, Number(countRows[0]?.count ?? 0), query);
  }

  // Vessels that arrived at one berth type (an Arrival log entry) and have not departed yet
  async vesselsIn(berthType: string, query: ListQuery, db: Queryable = pool): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where('d.deleted_at IS NULL');
    b.where(`bb.berth_type = ${b.add(berthType)}`);
    b.where("ld.type_doc = 'Arrival'");
    b.where('lb.deleted_at IS NULL');
    b.where(
      "NOT EXISTS (SELECT 1 FROM log_book_details ld2 JOIN log_books lb2 ON lb2.id = ld2.log_book_id WHERE lb2.deleted_at IS NULL AND ld2.type_doc = 'Departure' AND ld2.departure_date IS NOT NULL AND COALESCE(ld2.document_berth_id, 0) = COALESCE(ld.document_berth_id, 0) AND lb2.document_id = lb.document_id)",
    );
    b.like(['d.doc_number', 'dv.vessel_name', 'dv.vessel_imo_number', 'dv.vessel_official_number'], query.search);
    const from = ` FROM log_book_details ld JOIN log_books lb ON lb.id = ld.log_book_id JOIN documents d ON d.id = lb.document_id ${DOCUMENT_FROM.replace('FROM documents d', '')} LEFT JOIN berths bb ON bb.id = ld.berth_id LEFT JOIN jetties j ON j.id = ld.jetty_id LEFT JOIN document_berths b ON b.id = ld.document_berth_id`;
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*)${from}${where}`, b.params);
    const { rows } = await db.query(
      `SELECT lb.id AS log_book_id, ld.id AS log_book_detail_id, ld.berth_id, ld.jetty_id, ld.mooring_date, ld.departure_date, b.id AS document_berth_id,
              b.etb, b.etd, b.berth_save_date, b.cargo_work_time, bb.name_alt AS berth_name_alt, j.name AS jetty_name,
              ${DOCUMENT_SELECT}${from}${where} ORDER BY ld.mooring_date DESC NULLS LAST${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, Number(countRows[0]?.count ?? 0), query);
  }
}
