import pool, { withTransaction } from '../database';
import { DocumentRepository } from '../repositories/document.repository';
import { VesselRepository } from '../repositories/vessel.repository';
import { VtmsRepository } from '../repositories/vtms.repository';
import { AuthUser } from '../types/auth.types';
import { Queryable, Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { formatDuration, toDate } from '../utils/dates';
import { AppError, notFound } from '../utils/errors';
import { idOrNull, iso, num, str } from '../utils/rows';
import { toDocumentListItem } from './document.service';
import { FileService } from './file.service';
import { toVesselSnake } from './vessel.service';

const detailRow = (d: Row | null | undefined): Row => ({
  id: d?.id ?? 0,
  type_doc: str(d?.type_doc, 'Arrival'),
  document_berth_id: d?.document_berth_id ?? 0,
  berth_id: d?.berth_id ?? 0,
  berth_name: str(d?.berth_name),
  jetty_id: d?.jetty_id ?? 0,
  jetty_name: str(d?.jetty_name),
  purpose_id: d?.purpose_id ?? 0,
  purpose_name: str(d?.purpose_name),
  cargo_type_id: d?.cargo_type_id ?? 0,
  cargo_type_name: str(d?.cargo_type_name),
  cargo_wharfage_id: d?.cargo_wharfage_id ?? 0,
  cargo_wharfage_name: str(d?.cargo_wharfage_name),
  locate_id: d?.locate_id ?? 0,
  locate_name: str(d?.locate_name),
  use_berth_id: d?.use_berth_id ?? 0,
  use_berth_name: str(d?.use_berth_name),
  mooring_date: iso(d?.mooring_date),
  departure_date: iso(d?.departure_date),
});

const tugRow = (t: Row): Row => ({ id: t.id, tug_id: t.tug_id ?? 0, tug_name: str(t.tug_name), tug_type: str(t.tug_type), name: str(t.tug_name), type: str(t.tug_type), status: str(t.status), status_code: str(t.status_code) });
const pilotRow = (p: Row): Row => ({ id: p.id, pilot_id: p.pilot_id ?? 0, pilot_name: str(p.pilot_name), pilot_number: str(p.pilot_number), pilot_tel: str(p.pilot_tel), name: str(p.pilot_name), number: str(p.pilot_number), tel: str(p.pilot_tel), status: str(p.status), status_code: str(p.status_code) });
const productRow = (p: Row): Row => ({
  id: p.id,
  product_type_id: p.product_type_id ?? 0,
  product_type_name: str(p.product_type_name),
  product_group_id: p.product_group_id ?? 0,
  product_group_name: str(p.product_group_name),
  productTypeId: p.product_type_id ?? 0,
  productTypeName: str(p.product_type_name),
  productGroupId: p.product_group_id ?? 0,
  productGroupName: str(p.product_group_name),
  mTonQty: num(p.m_ton_qty),
  rTonQty: num(p.r_ton_qty),
  status: str(p.status),
});

export function createVtmsService(vtms: VtmsRepository, documents: DocumentRepository, vessels: VesselRepository, files: FileService) {
  async function vesselOf(row: Row, db?: Queryable): Promise<Row> {
    if (row.vessel_id) return toVesselSnake(await vessels.findById(row.vessel_id as number, db));
    if (row.vessel_government_id) {
      const g = await vessels.findGovernment(row.vessel_government_id as number, db);
      return toVesselSnake(g ? { ...g, length_overall: g.length_overall, breadth_extreme: g.breadth } : null);
    }
    return toVesselSnake(null);
  }

  async function logBookBase(row: Row, db?: Queryable): Promise<Row> {
    const [tugs, pilots, products, vessel] = await Promise.all([vtms.tugs(row.id as number, db), vtms.pilots(row.id as number, db), vtms.products(row.id as number, db), vesselOf(row, db)]);
    let file: Row | null = null;
    if (row.file_id) {
      const stored = await files.find(row.file_id as number);
      if (stored) {
        const ref = await files.toRef(stored);
        file = { fileName: ref.fileName, filePath: ref.filePath, fileId: ref.id };
      }
    }
    return {
      id: row.id,
      status: str(row.status),
      voyage: str(row.voyage),
      gross_tonnage: num(row.gross_tonnage),
      depth: num(row.depth),
      port_id_next: row.port_id_next ?? 0,
      port_name_next: str(row.port_name_next),
      port_id_last: row.port_id_last ?? 0,
      port_name_last: str(row.port_name_last),
      document_id: row.document_id ?? 0,
      document_berth_id: row.document_berth_id ?? row.detail_document_berth_id ?? 0,
      document_number: str(row.document_number),
      vessel_id: row.vessel_id ?? 0,
      vessel_government_id: row.vessel_government_id ?? 0,
      vessel_kind: str(row.vessel_kind, 'vessel'),
      vesselType: row.vessel_government_id ? 'government' : 'vessel',
      purpose_type: str(row.purpose_type),
      vessel,
      create_date: iso(row.created_at),
      updated_at: iso(row.updated_at),
      tugs: tugs.map(tugRow),
      pilots: pilots.map(pilotRow),
      products: products.map(productRow),
      agency_name: str(row.agency_display_name, 'VTMS'),
      ...(file ?? {}),
    };
  }

  const listRow = (row: Row): Row => ({
    id: row.id,
    status: str(row.status),
    create_date: iso(row.created_at),
    updated_at: iso(row.updated_at),
    updated_date: iso(row.updated_at),
    berth_id: row.berth_id ?? 0,
    berth_name: str(row.berth_name),
    jetty_id: row.jetty_id ?? 0,
    jetty_name: str(row.jetty_name),
    document_id: row.document_id ?? 0,
    document_berth_id: row.document_berth_id ?? row.detail_document_berth_id ?? 0,
    document_number: str(row.document_number),
    vessel_id: row.vessel_id ?? 0,
    vessel_flag: str(row.vessel_flag_path),
    vessel_flag_name: str(row.vessel_flag_name),
    vessel_name: str(row.vessel_name),
    vessel_imo_number: str(row.vessel_imo_number),
    vessel_official_number: str(row.vessel_official_number),
    vessel_type_id: row.vessel_type_id ?? 0,
    vessel_type_name: str(row.vessel_type_name),
    voyage: str(row.voyage),
    gross_tonnage: num(row.gross_tonnage),
    depth: num(row.depth),
    purpose_id: row.purpose_id ?? 0,
    purpose_name: str(row.purpose_name),
    purpose_type_id: row.purpose_type_id ?? 0,
    purpose_type_name: str(row.purpose_type_name),
    mooring_date: iso(row.mooring_date),
    departure_date: iso(row.departure_date),
    type_doc: str(row.type_doc),
    agency_name: str(row.agency_display_name, 'VTMS'),
  });

  // The log book keeps the request's vessel status in step: an Arrival berths it, a Departure releases it
  async function syncDocumentStatus(documentId: number | null, db: Queryable): Promise<void> {
    if (!documentId) return;
    const { rows } = await db.query(
      `SELECT MIN(ld.mooring_date) FILTER (WHERE ld.type_doc = 'Arrival') AS first_in,
              MAX(ld.departure_date) FILTER (WHERE ld.type_doc = 'Departure') AS last_out,
              COUNT(*) FILTER (WHERE ld.type_doc = 'Arrival') AS arrivals,
              COUNT(*) FILTER (WHERE ld.type_doc = 'Departure' AND ld.departure_date IS NOT NULL) AS departures
       FROM log_book_details ld JOIN log_books lb ON lb.id = ld.log_book_id WHERE lb.deleted_at IS NULL AND lb.document_id = $1`,
      [documentId],
    );
    const s = rows[0] ?? {};
    const berthed = Number(s.arrivals ?? 0) > Number(s.departures ?? 0);
    await db.query('UPDATE documents SET vessel_status = $2, port_at = $3, departured_at = $4, updated_at = NOW() WHERE id = $1', [
      documentId,
      berthed ? 'Berth' : 'PendingBerth',
      s.first_in ?? null,
      !berthed && Number(s.departures ?? 0) > 0 ? s.last_out : null,
    ]);
  }

  async function saveChildren(logBookId: number, input: Row, statusCode: string, db: Queryable): Promise<void> {
    const statusLabel = statusCode === 'Departure' ? 'Vessel Out' : 'Vessel In';
    for (const t of Array.isArray(input.tugs) ? input.tugs : []) {
      const id = idOrNull(t.id);
      if (t.is_delete || t.isDelete) {
        if (id) await vtms.deleteById('log_book_tugs', id, db);
        continue;
      }
      const data = { tug_id: idOrNull(t.tug_id ?? t.id), status: str(t.status, statusLabel), status_code: statusCode };
      if (id && (await vtms.update('log_book_tugs', id, data, db))) continue;
      await vtms.insert('log_book_tugs', { log_book_id: logBookId, ...data }, db);
    }
    for (const p of Array.isArray(input.pilots) ? input.pilots : []) {
      const id = idOrNull(p.id);
      if (p.is_delete || p.isDelete) {
        if (id) await vtms.deleteById('log_book_pilots', id, db);
        continue;
      }
      const data = { pilot_id: idOrNull(p.pilot_id ?? p.id), status: str(p.status, statusLabel), status_code: statusCode };
      if (id && (await vtms.update('log_book_pilots', id, data, db))) continue;
      await vtms.insert('log_book_pilots', { log_book_id: logBookId, ...data }, db);
    }
    for (const p of Array.isArray(input.products) ? input.products : []) {
      const id = idOrNull(p.id);
      if (p.is_delete || p.isDelete) {
        if (id) await vtms.deleteById('log_book_products', id, db);
        continue;
      }
      const data = {
        product_type_id: idOrNull(p.product_type_id ?? p.productTypeId),
        product_group_id: idOrNull(p.product_group_id ?? p.productGroupId),
        m_ton_qty: num(p.mTonQty ?? p.m_ton_qty),
        r_ton_qty: num(p.rTonQty ?? p.r_ton_qty),
        status: str(p.status, statusLabel),
      };
      if (id && (await vtms.update('log_book_products', id, data, db))) continue;
      await vtms.insert('log_book_products', { log_book_id: logBookId, ...data }, db);
    }
  }

  const detailColumns = (d: Row, fallbackType: string): Row => ({
    type_doc: str(d.type_doc, fallbackType),
    document_berth_id: idOrNull(d.document_berth_id),
    berth_id: idOrNull(d.berth_id),
    jetty_id: idOrNull(d.jetty_id),
    purpose_id: idOrNull(d.purpose_id),
    cargo_type_id: idOrNull(d.cargo_type_id),
    cargo_wharfage_id: idOrNull(d.cargo_wharfage_id),
    locate_id: idOrNull(d.locate_id),
    use_berth_id: idOrNull(d.use_berth_id),
    mooring_date: toDate(d.mooring_date),
    departure_date: toDate(d.departure_date),
  });

  return {
    summary(): Promise<Row> {
      return vtms.summary().then((r) => ({ vessel_in: num(r.vessel_in), vessel_out: num(r.vessel_out), vessel_dock: num(r.vessel_dock), anchor: num(r.anchor) }));
    },

    // The VTMS request list: every request that is past review, with the vessel status the pilots care about
    async documents(filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      const page = await documents.list(
        {
          status: filter.status || 'Approved,PendingConfirmation,PendingConfirmation1,PendingConfirmation2,PendingApproval,PendingEdit,Canceled,AdminCanceled',
          berthId: filter.berthId,
          etaBegin: filter.etaBegin,
          etaEnd: filter.etaEnd,
          keyword: filter.keyword,
        },
        query,
      );
      return { ...page, data: page.data.map(toDocumentListItem) };
    },

    // ---- log books ---------------------------------------------------------------------------
    async listLogBooks(filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      const page = await vtms.listLogBooks(
        {
          status: filter.status,
          logType: filter.log_type,
          berthId: filter.berth_id ?? filter.berthId,
          berthIds: filter.berth_ids,
          purposeTypeIds: filter.purpose_type_ids,
          vesselId: filter.vesselId,
          mooringBegin: filter.mooringDateBegin || filter.mooring_date,
          mooringEnd: filter.mooringDateEnd,
          departureBegin: filter.unmooringDateBegin || filter.departure_date,
          departureEnd: filter.unmooringDateEnd,
        },
        query,
      );
      return { ...page, data: page.data.map(listRow) };
    },

    // Edit pages read `details` as an array
    async logBookDetail(id: number): Promise<Row> {
      const row = await vtms.findLogBook(id);
      if (!row) throw notFound('บันทึกการเดินเรือ', 'log book not found');
      const details = await vtms.details(id);
      return { ...(await logBookBase(row)), details: (details.length ? details : [null]).map(detailRow) };
    },

    // The sailing-log tab reads `details` as the latest entry object
    async logBookOfDocument(documentId: number): Promise<Row> {
      const row = await vtms.latestLogBookOfDocument(documentId);
      if (!row) {
        const doc = await documents.findById(documentId);
        if (!doc) throw notFound('ใบคำร้อง', 'document not found');
        const vessel = doc.vessel_id ? toVesselSnake(await vessels.findById(doc.vessel_id as number)) : toVesselSnake({ ...doc, name: doc.vessel_name, id: 0, owner: doc.vessel_owner, imo_number: doc.vessel_imo_number, official_number: doc.vessel_official_number, gross_tonnage: doc.vessel_gross_tonnage, depth: doc.vessel_depth, call_sign: doc.vessel_call_sign, mmsi_number: doc.vessel_mmsi_number });
        return {
          id: 0,
          status: '',
          voyage: '',
          gross_tonnage: num(doc.vessel_gross_tonnage),
          depth: num(doc.vessel_depth),
          port_id_next: 0,
          port_name_next: '',
          port_id_last: 0,
          port_name_last: '',
          document_id: documentId,
          document_berth_id: 0,
          document_number: str(doc.doc_number),
          vessel,
          details: detailRow(null),
          create_date: null,
          tugs: [],
          pilots: [],
          products: [],
          agency_name: str(doc.agency_name),
        };
      }
      const details = await vtms.details(row.id as number);
      return { ...(await logBookBase(row)), details: detailRow(details[details.length - 1]) };
    },

    async documentBerthLog(documentId: number): Promise<Row[]> {
      const rows = await vtms.documentBerthLog(documentId);
      return rows.map((r) => {
        const arrived = !!r.mooring_date;
        const departed = !!r.departure_date;
        return {
          doc_berth_id: r.doc_berth_id,
          berth_id: r.berth_id ?? 0,
          berth_name: str(r.berth_name),
          jetty_id: r.jetty_id ?? 0,
          jetty_name: str(r.jetty_name),
          purpose_id: r.purpose_id ?? 0,
          purpose_name: str(r.purpose_name),
          estimated_arrival: iso(r.estimated_arrival),
          estimated_departure: iso(r.estimated_departure),
          mooring_date: iso(r.mooring_date),
          departure_date: iso(r.departure_date),
          vessel_in_id: r.vessel_in_id ?? 0,
          is_vessel_in: !arrived,
          is_vessel_out: arrived && !departed,
          is_vessel_shift: arrived && !departed && rows.length > 1,
        };
      });
    },

    async saveLogBook(id: number | null, user: AuthUser, input: Row, by: string): Promise<Row> {
      const isGovernment = /gov/i.test(str(input.vesselType)) || str(input.vessel_kind) === 'government';
      const vesselId = idOrNull(input.vessel_id ?? input.vesselId);
      if (!vesselId) throw new AppError('กรุณาเลือกเรือ', 400, 'invalid_request', 'vessel_id is required');
      if (isGovernment ? !(await vessels.findGovernment(vesselId)) : !(await vessels.findById(vesselId))) throw notFound('ข้อมูลเรือ', 'vessel not found');
      const rawDetails: Row[] = Array.isArray(input.details) ? input.details : [];
      const details = rawDetails.filter((d) => d && (idOrNull(d.berth_id) || toDate(d.mooring_date) || toDate(d.departure_date)));
      for (const d of details) {
        const mooring = toDate(d.mooring_date);
        const departure = toDate(d.departure_date);
        if (mooring && departure && departure < mooring) {
          throw new AppError('วันออกจากท่าต้องไม่ก่อนวันเทียบท่า', 400, 'invalid_request', 'departure_date must not be before mooring_date');
        }
      }
      const primaryType = str(details[details.length - 1]?.type_doc, details.some((d) => toDate(d.departure_date)) ? 'Departure' : 'Arrival');
      const documentBerthId = idOrNull(input.document_berth_id ?? input.documentBerthId) ?? idOrNull(details[0]?.document_berth_id);
      let documentId = idOrNull(input.document_id ?? input.documentId);
      if (!documentId && documentBerthId) {
        const berth = await documents.berthById(documentBerthId);
        documentId = berth ? (berth.document_id as number) : null;
      }
      const data: Row = {
        status: primaryType,
        document_id: documentId,
        document_berth_id: documentBerthId,
        vessel_id: isGovernment ? null : vesselId,
        vessel_government_id: isGovernment ? vesselId : null,
        vessel_kind: isGovernment ? 'government' : 'vessel',
        gross_tonnage: num(input.gross_tonnage ?? input.grossTonnage),
        depth: num(input.depth),
        voyage: str(input.voyage),
        port_id_next: idOrNull(input.port_id_next ?? input.portIdNext),
        port_id_last: idOrNull(input.port_id_last ?? input.portIdLast),
        purpose_type: str(input.purpose_type),
        updated_by: by,
      };
      const fileId = await files.resolveId({ id: input.file_id ?? input.fileId, filePath: input.filePath });
      if (fileId) data.file_id = fileId;
      const logBookId = await withTransaction(async (tx) => {
        let targetId = id;
        if (targetId === null) {
          const created = await vtms.insert('log_books', { ...data, agency_name: isGovernment ? 'VTMS' : 'Agency', created_by: by }, tx);
          targetId = created.id as number;
        } else {
          const existing = await vtms.findLogBook(targetId, tx);
          if (!existing) throw notFound('บันทึกการเดินเรือ', 'log book not found');
          await vtms.update('log_books', targetId, { ...data, updated_at: new Date() }, tx);
          await vtms.deleteWhere('log_book_details', 'log_book_id', targetId, tx);
        }
        for (const d of details) {
          const columns = detailColumns(d, primaryType);
          if (!columns.document_berth_id) columns.document_berth_id = documentBerthId;
          await vtms.insert('log_book_details', { log_book_id: targetId, ...columns }, tx);
        }
        await saveChildren(targetId, input, primaryType, tx);
        await syncDocumentStatus(documentId, tx);
        return targetId;
      });
      return this.logBookDetail(logBookId);
    },

    async deleteLogBook(id: number): Promise<void> {
      const existing = await vtms.findLogBook(id);
      if (!existing) throw notFound('บันทึกการเดินเรือ', 'log book not found');
      await withTransaction(async (tx) => {
        await vtms.softDeleteLogBook(id, tx);
        await syncDocumentStatus(existing.document_id as number | null, tx);
      });
    },

    // ---- anchors -----------------------------------------------------------------------------
    async listAnchors(filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      const page = await vtms.listAnchors({ status: filter.status }, query);
      return {
        ...page,
        data: page.data.map((a) => ({
          id: a.id,
          status: str(a.status),
          berth_id: a.berth_id ?? 0,
          berth_name: str(a.berth_name),
          document_id: a.document_id ?? 0,
          document_number: str(a.document_number),
          vessel_id: a.vessel_id ?? 0,
          vessel_flag: str(a.vessel_flag_path),
          vessel_flag_name: str(a.vessel_flag_name),
          vessel_name: str(a.vessel_name),
          vessel_imo_number: str(a.vessel_imo_number),
          vessel_official_number: str(a.vessel_official_number),
          vessel_type_id: a.vessel_type_id ?? 0,
          vessel_type_name: str(a.vessel_type_name),
          voyage: str(a.voyage),
          gross_tonnage: num(a.gross_tonnage),
          depth: num(a.depth),
          pilot_date: iso(a.pilot_date),
          anchor_date: iso(a.anchor_date),
          aweigh_date: iso(a.aweigh_date),
          latitude: str(a.latitude),
          longitude: str(a.longitude),
          remark: str(a.remark),
          duration: formatDuration(a.anchor_date, a.aweigh_date ?? new Date()),
          created_at: iso(a.created_at),
        })),
      };
    },

    async anchorDetail(id: number): Promise<Row> {
      const a = await vtms.findAnchor(id);
      if (!a) throw notFound('บันทึกการทิ้งสมอ', 'anchor record not found');
      const vessel = toVesselSnake(a.vessel_id ? await vessels.findById(a.vessel_id as number) : null);
      return {
        id: a.id,
        status: str(a.status),
        voyage: str(a.voyage),
        gross_tonnage: num(a.gross_tonnage),
        depth: num(a.depth),
        port_id_next: a.port_id_next ?? 0,
        port_name_next: str(a.port_name_next),
        port_id_last: a.port_id_last ?? 0,
        port_name_last: str(a.port_name_last),
        document_id: a.document_id ?? 0,
        document_berth_id: a.document_berth_id ?? 0,
        document_number: str(a.document_number),
        pilot_date: iso(a.pilot_date),
        anchor_date: iso(a.anchor_date),
        aweigh_date: iso(a.aweigh_date),
        latitude: str(a.latitude),
        longitude: str(a.longitude),
        remark: str(a.remark),
        vessel,
        anchors: {
          id: a.id,
          berth_id: a.berth_id ?? 0,
          berth_name: str(a.berth_name),
          pilot_date: iso(a.pilot_date),
          anchor_date: iso(a.anchor_date),
          aweigh_date: iso(a.aweigh_date),
          latitude: str(a.latitude),
          longitude: str(a.longitude),
          remark: str(a.remark),
        },
      };
    },

    async anchorsOfDocument(documentId: number): Promise<Row> {
      const rows = await vtms.anchorsOfDocument(documentId);
      const first = rows[0];
      const doc = await documents.findById(documentId);
      if (!doc) throw notFound('ใบคำร้อง', 'document not found');
      return {
        document_id: documentId,
        vessel_id: doc.vessel_id ?? 0,
        gross_tonnage: num(first?.gross_tonnage ?? doc.vessel_gross_tonnage),
        depth: num(first?.depth ?? doc.vessel_depth),
        port_id_last: first?.port_id_last ?? 0,
        port_id_next: first?.port_id_next ?? 0,
        voyage: str(first?.voyage),
        anchors: rows.map((a) => ({
          id: a.id,
          berth_id: a.berth_id ?? 0,
          berth_name: str(a.berth_name),
          pilot_date: iso(a.pilot_date),
          anchor_date: iso(a.anchor_date),
          aweigh_date: iso(a.aweigh_date),
          latitude: str(a.latitude),
          longitude: str(a.longitude),
          remark: str(a.remark),
          status: str(a.status),
        })),
      };
    },

    // One request may hold several anchor drops: the POST upserts every item of `anchors`
    async saveAnchors(id: number | null, user: AuthUser, input: Row, by: string): Promise<Row> {
      const vesselId = idOrNull(input.vessel_id ?? input.vesselId) ?? idOrNull(input.vessel?.id);
      if (!vesselId || !(await vessels.findById(vesselId))) throw notFound('ข้อมูลเรือ', 'vessel not found');
      const documentId = idOrNull(input.document_id ?? input.documentId);
      const base: Row = {
        document_id: documentId,
        document_berth_id: idOrNull(input.document_berth_id),
        vessel_id: vesselId,
        gross_tonnage: num(input.gross_tonnage ?? input.grossTonnage),
        depth: num(input.depth),
        voyage: str(input.voyage),
        port_id_next: idOrNull(input.port_id_next),
        port_id_last: idOrNull(input.port_id_last),
        updated_by: by,
      };
      const items: Row[] = Array.isArray(input.anchors) ? input.anchors : [];
      if (!items.length) throw new AppError('กรุณาระบุข้อมูลการทิ้งสมอ', 400, 'invalid_request', 'anchors is required');
      const ids = await withTransaction(async (tx) => {
        const saved: number[] = [];
        const keep = new Set<number>();
        for (const item of items) {
          const anchorDate = toDate(item.anchor_date);
          if (!anchorDate) throw new AppError('กรุณาระบุวันเวลาทิ้งสมอ', 400, 'invalid_request', 'anchor_date is required');
          const aweigh = toDate(item.aweigh_date);
          if (aweigh && aweigh < anchorDate) throw new AppError('วันถอนสมอต้องไม่ก่อนวันทิ้งสมอ', 400, 'invalid_request', 'aweigh_date must not be before anchor_date');
          const data: Row = {
            ...base,
            berth_id: idOrNull(item.berth_id),
            pilot_date: toDate(item.pilot_date),
            anchor_date: anchorDate,
            aweigh_date: aweigh,
            latitude: str(item.latitude),
            longitude: str(item.longitude),
            remark: str(item.remark),
            status: aweigh ? 'Aweigh' : 'Anchor',
            updated_at: new Date(),
          };
          const itemId = id ?? idOrNull(item.id);
          if (itemId && (await vtms.update('anchors', itemId, data, tx))) {
            saved.push(itemId);
            keep.add(itemId);
          } else {
            const created = await vtms.insert('anchors', { ...data, created_by: by }, tx);
            saved.push(created.id as number);
            keep.add(created.id as number);
          }
        }
        // Items removed from the request's anchor table are dropped with it
        if (documentId && id === null) {
          const existing = await vtms.anchorsOfDocument(documentId, tx);
          for (const e of existing) if (!keep.has(e.id as number)) await vtms.softDeleteAnchor(e.id as number, tx);
        }
        return saved;
      });
      return documentId && id === null ? this.anchorsOfDocument(documentId) : this.anchorDetail(ids[0]!);
    },

    async deleteAnchor(id: number): Promise<void> {
      if (!(await vtms.softDeleteAnchor(id))) throw notFound('บันทึกการทิ้งสมอ', 'anchor record not found');
    },

    async countPending(): Promise<number> {
      const { rows } = await pool.query("SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL AND status = 'Approved' AND vessel_status = 'PendingBerth'");
      return Number(rows[0]?.count ?? 0);
    },
  };
}

export type VtmsService = ReturnType<typeof createVtmsService>;
