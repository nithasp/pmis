import { PORT_DUE_VAT_RATE } from '../constants/statuses';
import pool, { withTransaction } from '../database';
import { DocumentRepository } from '../repositories/document.repository';
import { Queryable, Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { addDays, toDate } from '../utils/dates';
import { AppError, notFound } from '../utils/errors';
import { pagedResult } from '../utils/paging';
import { idOrNull, iso, num, str } from '../utils/rows';
import { SqlBuilder } from '../utils/sql';
import { money } from '../utils/text';
import { toDocumentVessel } from './document.service';
import { FileService } from './file.service';

const STATUS_TH: Record<string, string> = { created: 'ออกใบแจ้งหนี้แล้ว', canceled: 'ยกเลิก', pending: 'รอออกใบแจ้งหนี้' };

const PENDING_FROM = `
  FROM documents d
  JOIN document_vessels dv ON dv.document_id = d.id
  LEFT JOIN users u ON u.id = d.agency_user_id
  LEFT JOIN document_invoices i ON i.document_id = d.id
  LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id
  LEFT JOIN customers cu ON cu.id = i.customer_id
  LEFT JOIN vessel_flags f ON f.id = dv.vessel_flag_id
  LEFT JOIN vessel_types t ON t.id = dv.vessel_type_id
  LEFT JOIN LATERAL (SELECT b.berth_id, bb.name_alt, bb.port_due_rate, b.etb, b.etd FROM document_berths b JOIN berths bb ON bb.id = b.berth_id
                     WHERE b.document_id = d.id ORDER BY b.sequence, b.id LIMIT 1) fb ON TRUE`;

const DUE_FROM = `
  FROM port_dues p
  JOIN documents d ON d.id = p.document_id
  JOIN document_vessels dv ON dv.document_id = d.id
  LEFT JOIN users u ON u.id = d.agency_user_id
  LEFT JOIN berths bb ON bb.id = p.berth_id
  LEFT JOIN vessel_flags f ON f.id = dv.vessel_flag_id
  LEFT JOIN vessel_types t ON t.id = dv.vessel_type_id`;

export function createPortDueService(documents: DocumentRepository, files: FileService) {
  const vesselOf = (row: Row): Row => ({ ...toDocumentVessel(row), id: row.document_vessel_id ?? 0, vesselUploadFiles: [] });

  async function invoiceOf(documentId: number, db: Queryable = pool): Promise<Row> {
    const inv = await documents.invoice(documentId, db);
    return {
      id: inv?.id ?? 0,
      customerId: inv?.customer_id ?? 0,
      customerCode: str(inv?.customer_code),
      customerReference: str(inv?.customer_code),
      documentId,
      name: str(inv?.name),
      taxId: str(inv?.tax_id),
      contactName: str(inv?.contact_name),
      paymentMethodId: inv?.payment_method_id ?? 0,
      paymentMethodName: str(inv?.payment_method_name),
      paymentTermId: inv?.payment_term_id ?? 0,
      paymentTermName: str(inv?.payment_term_name),
      countryId: inv?.country_id ?? 0,
      countryName: str(inv?.country_name),
      subDistrictId: inv?.sub_district_id ?? 0,
      subDistrictName: str(inv?.sub_district_name),
      districtId: inv?.district_id ?? 0,
      districtName: str(inv?.district_name),
      provinceId: inv?.province_id ?? 0,
      provinceName: str(inv?.province_name),
      postCode: str(inv?.post_code),
      stageProvince: str(inv?.stage_province),
      address: str(inv?.address),
      phoneNumber: str(inv?.phone_number),
      secondaryPhoneNumber: str(inv?.secondary_phone_number),
      paymentPeriodDay: num(inv?.payment_period_day, 30),
    };
  }

  // The rate per GRT comes from the berth's contract that covers the berthing date, else the berth's default rate
  async function rateFor(berthId: number | null, at: Date, db: Queryable = pool): Promise<number> {
    if (!berthId) return 0;
    const { rows } = await db.query(
      `SELECT cr.rate FROM contract_rates cr JOIN contracts c ON c.id = cr.contract_id
       WHERE c.deleted_at IS NULL AND c.berth_id = $1 AND (c.terminated_date IS NULL OR c.terminated_date > $2) AND cr.start_date <= $2 AND cr.end_date >= $2
       ORDER BY cr.start_date DESC LIMIT 1`,
      [berthId, at],
    );
    if (rows[0]) return num(rows[0].rate);
    const { rows: berth } = await db.query('SELECT port_due_rate FROM berths WHERE id = $1', [berthId]);
    return num(berth[0]?.port_due_rate, 8.56);
  }

  async function refDocuments(documentId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query('SELECT * FROM port_dues WHERE document_id = $1 ORDER BY id', [documentId]);
    return rows.map((r) => ({
      id: r.id,
      portDueNumber: str(r.port_due_number),
      portDueRefId: str(r.port_due_number),
      docType: str(r.doc_type),
      total: num(r.total),
      createdAt: iso(r.created_at),
      dueDate: iso(r.due_date),
      paidDate: iso(r.paid_date),
      status: r.canceled_at ? 'canceled' : 'created',
    }));
  }

  const pendingRow = (row: Row): Row => ({
    id: row.id,
    documentId: row.id,
    docNumber: str(row.doc_number),
    requestDate: iso(row.request_date),
    status: STATUS_TH.pending,
    statusKey: 'pending',
    grossTonnage: num(row.vessel_gross_tonnage),
    berthId: row.berth_id ?? 0,
    berthName: str(row.berth_name),
    ports: str(row.berth_name),
    berthAt: iso(row.port_at ?? row.etb),
    departuredAt: iso(row.departured_at ?? row.etd),
    createdAt: iso(row.created_at),
    agencyName: str(row.agency_name),
    vessel: vesselOf(row),
    invoice: {
      customerCode: str(row.customer_code),
      name: str(row.invoice_name),
      paymentMethodName: str(row.payment_method_name),
      total: money(num(row.vessel_gross_tonnage) * num(row.port_due_rate) * (1 + PORT_DUE_VAT_RATE)),
    },
  });

  async function nextNumber(db: Queryable): Promise<string> {
    const year = new Date().getFullYear() + 543;
    const prefix = `INV-${year}-`;
    const { rows } = await db.query('SELECT port_due_number FROM port_dues WHERE port_due_number LIKE $1 ORDER BY port_due_number DESC LIMIT 1', [`${prefix}%`]);
    const last = rows[0] ? Number(String(rows[0].port_due_number).slice(prefix.length)) : 0;
    return `${prefix}${String(last + 1).padStart(5, '0')}`;
  }

  const dueRow = (r: Row): Row => {
    const invoice = (r.invoice ?? {}) as Row;
    const statusKey = r.canceled_at ? 'canceled' : 'created';
    return {
      id: r.id,
      documentId: r.document_id,
      docNumber: str(r.doc_number),
      requestDate: iso(r.request_date),
      status: STATUS_TH[statusKey],
      statusKey,
      docType: str(r.doc_type),
      portDueNumber: str(r.port_due_number),
      invoiceNo: str(r.port_due_number),
      grossTonnage: num(r.gross_tonnage),
      berthId: r.berth_id ?? 0,
      berthName: str(r.berth_name),
      ports: str(r.berth_name),
      berthAt: iso(r.berth_at),
      departuredAt: iso(r.departured_at),
      eta: iso(r.berth_at),
      etd: iso(r.departured_at),
      createdAt: iso(r.created_at),
      paidDate: iso(r.paid_date),
      canceledAt: iso(r.canceled_at),
      cancelNote: str(r.cancel_note),
      paymentMethod: str(invoice.paymentMethodName),
      agencyName: str(r.agency_name),
      vessel: vesselOf(r),
      invoice: {
        ...invoice,
        rate: num(r.rate),
        fee: num(r.fee),
        vat: num(r.vat),
        vatTotal: num(r.vat_total),
        total: num(r.total),
        paymentPeriod: num(r.payment_period),
        dueDate: iso(r.due_date),
        paidDate: iso(r.paid_date),
      },
    };
  };

  return {
    async pendingList(filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      const b = new SqlBuilder();
      b.where('d.deleted_at IS NULL');
      b.where("d.status = 'Approved'");
      b.where("(d.vessel_status = 'Berth' OR d.departured_at IS NOT NULL OR d.port_at IS NOT NULL)");
      b.where('NOT EXISTS (SELECT 1 FROM port_dues p WHERE p.document_id = d.id AND p.canceled_at IS NULL)');
      b.eq('fb.berth_id', idOrNull(filter.berthId));
      b.between('d.port_at', filter.begin, filter.end);
      if (filter.customerName) b.like(['i.name', 'cu.code'], str(filter.customerName));
      b.like(['d.doc_number', 'dv.vessel_name', 'dv.vessel_imo_number', 'dv.vessel_official_number', 'i.name'], query.search);
      const where = b.whereClause();
      const { rows: countRows } = await pool.query(`SELECT COUNT(*)${PENDING_FROM}${where}`, b.params);
      const sort: Record<string, string> = { docNumber: 'd.doc_number', name: 'dv.vessel_name', grt_portdues: 'dv.vessel_gross_tonnage', berthName: 'fb.name_alt', mooring_date: 'd.port_at', departure_date: 'd.departured_at', clientIdName: 'i.name', paymentMethod: 'pm.name', id: 'd.id' };
      const { rows } = await pool.query(
        `SELECT d.*, dv.*, dv.id AS document_vessel_id, d.id AS id, f.name AS vessel_flag_name, f.path AS vessel_flag_path, t.name AS vessel_type_name,
                COALESCE(NULLIF(u.company, ''), u.full_name) AS agency_name, i.name AS invoice_name, cu.code AS customer_code, pm.name AS payment_method_name,
                fb.berth_id, fb.name_alt AS berth_name, fb.port_due_rate, fb.etb, fb.etd
         ${PENDING_FROM}${where}${b.orderBy(query.order, sort, 'd.port_at DESC NULLS LAST, d.id DESC')}${b.limit(query)}`,
        b.params,
      );
      return pagedResult(rows.map(pendingRow), Number(countRows[0]?.count ?? 0), query);
    },

    // The invoice preview for one request: rate, fee and VAT worked out from the berth and GRT
    async pendingDetail(documentId: number): Promise<Row> {
      const doc = await documents.findById(documentId);
      if (!doc) throw notFound('ใบคำร้อง', 'document not found');
      const berths = await documents.berths(documentId);
      const first = berths[0];
      const berthAt = toDate(doc.port_at) ?? toDate(first?.etb) ?? toDate(first?.estimated_arrival) ?? new Date();
      const invoice = await invoiceOf(documentId);
      const rate = await rateFor((first?.berth_id as number | null) ?? null, berthAt);
      const grt = num(doc.vessel_gross_tonnage);
      const fee = money(grt * rate);
      const vatTotal = money(fee * PORT_DUE_VAT_RATE);
      const paymentPeriod = invoice.paymentPeriodDay;
      return {
        id: 0,
        documentId,
        docNumber: str(doc.doc_number),
        requestDate: iso(doc.request_date),
        status: STATUS_TH.pending,
        statusKey: 'pending',
        docType: 'Invoice',
        portDueNumber: '',
        grossTonnage: grt,
        berthAt: berthAt.toISOString(),
        berthId: str(first?.berth_id ?? ''),
        berthName: str(first?.berth_name_alt),
        eta: iso(first?.estimated_arrival),
        etd: iso(doc.departured_at ?? first?.etd ?? first?.estimated_departure),
        createdAt: new Date().toISOString(),
        invoice: {
          ...invoice,
          rate,
          fee,
          vat: Math.round(PORT_DUE_VAT_RATE * 100),
          vatTotal,
          total: money(fee + vatTotal),
          paymentPeriod,
          dueDate: addDays(berthAt, Math.max(paymentPeriod - 1, 0)).toISOString(),
          paidDate: null,
        },
        vessel: vesselOf(doc),
        refDocuments: await refDocuments(documentId),
      };
    },

    async create(input: Row, by: string): Promise<Row> {
      const documentId = idOrNull(input.documentId);
      if (!documentId) throw new AppError('ไม่พบรหัสใบคำร้อง', 400, 'invalid_request', 'documentId is required');
      const preview = await this.pendingDetail(documentId);
      const inv = { ...(preview.invoice as Row), ...((input.invoice as Row) ?? {}) };
      const { rows: pm } = inv.paymentMethodId ? await pool.query('SELECT name, payment_period_day FROM payment_methods WHERE id = $1', [inv.paymentMethodId]) : { rows: [] as Row[] };
      if (pm[0]) {
        inv.paymentMethodName = str(pm[0].name);
        inv.paymentPeriod = num(inv.paymentPeriod) || num(pm[0].payment_period_day, 30);
      }
      const berthAt = toDate(input.berthAt) ?? toDate(preview.berthAt) ?? new Date();
      const rate = num(inv.rate, num(preview.invoice.rate));
      const grt = num(input.grossTonnage, preview.grossTonnage);
      const fee = money(grt * rate);
      const vatTotal = money(fee * PORT_DUE_VAT_RATE);
      const total = money(fee + vatTotal);
      const paymentPeriod = num(inv.paymentPeriod, 30);
      const dueDate = toDate(inv.dueDate) ?? addDays(berthAt, Math.max(paymentPeriod - 1, 0));
      const id = await withTransaction(async (tx) => {
        const { rows } = await tx.query(
          `INSERT INTO port_dues (document_id, port_due_number, doc_type, status, gross_tonnage, berth_id, berth_at, departured_at, invoice, rate, fee, vat, vat_total, total,
             payment_period, due_date, created_by)
           VALUES ($1, $2, 'Invoice', 'created', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
          [documentId, await nextNumber(tx), grt, idOrNull(input.berthId) ?? idOrNull(preview.berthId), berthAt, toDate(input.etd ?? input.departuredAt), JSON.stringify({ ...inv, rate, fee, vat: Math.round(PORT_DUE_VAT_RATE * 100), vatTotal, total, paymentPeriod, dueDate: dueDate.toISOString() }), rate, fee, Math.round(PORT_DUE_VAT_RATE * 100), vatTotal, total, paymentPeriod, dueDate, by],
        );
        return rows[0].id as number;
      });
      return this.detail(id);
    },

    async list(filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      const b = new SqlBuilder();
      b.where('d.deleted_at IS NULL');
      b.eq('p.berth_id', idOrNull(filter.berthId));
      b.between('p.created_at', filter.begin, filter.end);
      if (filter.status === 'created') b.where('p.canceled_at IS NULL');
      if (filter.status === 'canceled') b.where('p.canceled_at IS NOT NULL');
      if (filter.customerName) b.where(`(p.invoice->>'name' ILIKE ${b.add(`%${str(filter.customerName)}%`)} OR p.invoice->>'customerCode' ILIKE ${b.add(`%${str(filter.customerName)}%`)})`);
      b.like(['p.port_due_number', 'd.doc_number', 'dv.vessel_name', 'dv.vessel_imo_number', "p.invoice->>'name'"], query.search);
      const where = b.whereClause();
      const { rows: countRows } = await pool.query(`SELECT COUNT(*)${DUE_FROM}${where}`, b.params);
      const sort: Record<string, string> = { id: 'p.id', status: 'p.canceled_at', invoiceNo: 'p.port_due_number', clientIdName: "p.invoice->>'name'", name: 'dv.vessel_name', grt_portdues: 'p.gross_tonnage', ports: 'bb.name_alt', mooring_date: 'p.berth_at', invoice_issuer_date: 'p.created_at', payment_duedate: 'p.due_date', payment_date: 'p.paid_date' };
      const { rows } = await pool.query(
        `SELECT p.*, d.doc_number, d.request_date, dv.*, dv.id AS document_vessel_id, p.id AS id, bb.name_alt AS berth_name,
                f.name AS vessel_flag_name, f.path AS vessel_flag_path, t.name AS vessel_type_name, COALESCE(NULLIF(u.company, ''), u.full_name) AS agency_name
         ${DUE_FROM}${where}${b.orderBy(query.order, sort, 'p.created_at DESC, p.id DESC')}${b.limit(query)}`,
        b.params,
      );
      const data = await Promise.all(rows.map(async (r) => ({ ...dueRow(r), refDocuments: (await refDocuments(r.document_id as number)).filter((x) => x.id !== r.id) })));
      return pagedResult(data, Number(countRows[0]?.count ?? 0), query);
    },

    async detail(id: number): Promise<Row> {
      const { rows } = await pool.query(
        `SELECT p.*, d.doc_number, d.request_date, dv.*, dv.id AS document_vessel_id, p.id AS id, bb.name_alt AS berth_name,
                f.name AS vessel_flag_name, f.path AS vessel_flag_path, t.name AS vessel_type_name, COALESCE(NULLIF(u.company, ''), u.full_name) AS agency_name
         ${DUE_FROM} WHERE p.id = $1`,
        [id],
      );
      if (!rows[0]) throw notFound('ใบแจ้งหนี้ค่าภาระเรือ', 'port due not found');
      return { ...dueRow(rows[0]), refDocuments: (await refDocuments(rows[0].document_id as number)).filter((x) => x.id !== id) };
    },

    async cancel(id: number, note: string, by: string): Promise<Row> {
      const { rowCount } = await pool.query("UPDATE port_dues SET canceled_at = NOW(), cancel_note = $2, status = 'canceled' WHERE id = $1 AND canceled_at IS NULL", [id, `${note}${by ? '' : ''}`]);
      if (!rowCount) throw new AppError('ใบแจ้งหนี้นี้ถูกยกเลิกแล้วหรือไม่พบ', 400, 'bad_request', 'The invoice is already canceled or missing');
      return this.detail(id);
    },

    filesOf: files,
  };
}

export type PortDueService = ReturnType<typeof createPortDueService>;
