import ExcelJS from 'exceljs';
import { VESSEL_IMPORT_STATUS_TH } from '../constants/statuses';
import pool, { withTransaction } from '../database';
import { DocumentRepository } from '../repositories/document.repository';
import { VesselImportRepository } from '../repositories/vesselImport.repository';
import { VesselRepository } from '../repositories/vessel.repository';
import { VtmsRepository } from '../repositories/vtms.repository';
import { AuthUser, UploadFileRef } from '../types/auth.types';
import { Queryable, Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { toDate } from '../utils/dates';
import { AppError, forbidden, notFound } from '../utils/errors';
import { idOrNull, iso, num, str } from '../utils/rows';
import { FileService } from './file.service';
import { VESSEL_IMPORT_COLUMNS } from './template.service';

const NAMED_FILES: [string, string][] = [
  ['statementFile', 'statement_file_id'],
  ['shipFile', 'ship_file_id'],
  ['cargoManifestFile', 'cargo_manifest_file_id'],
  ['surveyorFile', 'surveyor_file_id'],
  ['certificateQuantityFile', 'certificate_quantity_file_id'],
  ['berthBookingRequestFile', 'berth_booking_request_file_id'],
  ['otherFile', 'other_file_id'],
];
const SPECIAL_GROUPS = ['Passenger', 'Spare Part', 'Other'];
const OFFICER_SEND_STATUSES = ['Send', 'PendingCheck', 'PendingApproval', 'Approved', 'PendingEdit', 'RequestEdit'];
const STAT_APPROVE_ROLES = ['StatApprove', 'Admin', 'SuperAdmin'];

const statusDes = (status: string): string => VESSEL_IMPORT_STATUS_TH[status] ?? status;

const productItem = (p: Row): Row => ({
  id: p.id,
  purposeTypeId: p.purpose_type_id ?? 0,
  purposeTypeName: str(p.purpose_type_name),
  cargoTypeId: p.cargo_type_id ?? 0,
  cargoTypeName: str(p.cargo_type_name),
  cargoWharfageId: p.cargo_wharfage_id ?? 0,
  cargoWharfageName: str(p.cargo_wharfage_name),
  productId: p.product_id ?? 0,
  productName: str(p.product_name) || str(p.product_master_name),
  productGroupId: p.product_group_id ?? 0,
  productGroupName: str(p.product_group_name),
  productTypeId: p.product_type_id ?? 0,
  productTypeName: str(p.product_type_name),
  mTonQty: num(p.m_ton_qty),
  rTonQty: num(p.r_ton_qty),
  blProduct: str(p.bl_product),
  cargoOwnerId: p.cargo_owner_id ?? 0,
  cargoOwnerName: str(p.cargo_owner_name) || str(p.cargo_owner_master_name),
  countryId: p.country_id ?? 0,
  countryName: str(p.country_name),
  passengers: num(p.passengers),
  detail: str(p.detail),
});

// The edit/view pages read passengers, spare parts and "other" as groups with `details`
const groupProducts = (items: Row[]): Row[] => {
  const groups = new Map<string, Row>();
  for (const item of items) {
    const key = SPECIAL_GROUPS.includes(item.purposeTypeName) ? item.purposeTypeName : (item.purposeTypeName as string) || 'Loading';
    const group = groups.get(key) ?? { purposeTypeId: item.purposeTypeId, purposeTypeName: key, details: [] as Row[] };
    group.details.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
};

export function createVesselImportService(
  imports: VesselImportRepository,
  vessels: VesselRepository,
  documents: DocumentRepository,
  vtms: VtmsRepository,
  files: FileService,
) {
  const isAgency = (user: AuthUser): boolean => user.type === 'Agency';

  async function load(id: number, db?: Queryable): Promise<Row> {
    const row = await imports.findById(id, db);
    if (!row) throw notFound('รายงานเรือเข้า-ออก', 'vessel import not found');
    return row;
  }

  function assertOwner(user: AuthUser, row: Row): void {
    if (isAgency(user) && row.created_by_id !== user.userId) throw forbidden('ไม่มีสิทธิ์เข้าถึงรายงานนี้', 'forbidden');
  }

  async function namedFile(id: number | null): Promise<Row> {
    if (!id) return { id: 0, fileName: '', filePath: '', preview: '', size: 0, extension: '' };
    const stored = await files.find(id);
    return stored ? await files.toRef(stored) : { id: 0, fileName: '', filePath: '', preview: '', size: 0, extension: '' };
  }

  async function extraFiles(importId: number): Promise<UploadFileRef[]> {
    const rows = await imports.files(importId);
    const out: UploadFileRef[] = [];
    for (const r of rows) {
      const stored = await files.find(r.id as number);
      if (stored) out.push({ ...(await files.toRef(stored)), fileName: str(r.name) || stored.fileName });
    }
    return out;
  }

  const baseRow = (r: Row): Row => ({
    id: r.id,
    status: str(r.status),
    statusDes: statusDes(str(r.status)),
    vesselId: r.vessel_id ?? 0,
    vesselName: str(r.vessel_name),
    imoNumber: str(r.imo_number),
    officialNumber: str(r.official_number),
    vesselFlagId: r.vessel_flag_id ?? 0,
    vesselFlagName: str(r.vessel_flag_name),
    vesselFlagImage: str(r.vessel_flag_path),
    vesselTypeId: r.vessel_type_id ?? 0,
    vesselTypeName: str(r.vessel_type_name),
    grt: num(r.gross_tonnage),
    grossTonnage: num(r.gross_tonnage),
    mooringDate: iso(r.mooring_date),
    unmooringDate: iso(r.unmooring_date),
    berthId: r.berth_id ?? 0,
    berthName: str(r.berth_name),
    jettyId: r.jetty_id ?? 0,
    jettyName: str(r.jetty_name),
    note: str(r.note),
    notes: Array.isArray(r.notes) ? r.notes : [],
    documentId: r.document_id ?? 0,
    documentNumber: str(r.document_number),
    logBookId: r.log_book_id ?? 0,
    isMap: !!r.log_book_id || !!r.document_id,
    agencyName: str(r.agency_name),
    createdAt: iso(r.created_at),
    sentAt: iso(r.sent_at),
    approvedAt: iso(r.approved_at),
  });

  const sendRow = (r: Row, products: Row[]): Row => ({
    ...baseRow(r),
    grtVS: num(r.gross_tonnage),
    grtVT: num(r.log_book_gross_tonnage),
    grtAgency: num(r.document_gross_tonnage),
    mooringDateVS: iso(r.mooring_date),
    unmooringDateVS: iso(r.unmooring_date),
    mooringDateVT: iso(r.vt_mooring_date),
    unmooringDateVT: iso(r.vt_unmooring_date),
    products,
  });

  const productColumns = (p: Row): Row => ({
    purpose_type_id: idOrNull(p.purposeTypeId),
    cargo_type_id: idOrNull(p.cargoTypeId),
    cargo_wharfage_id: idOrNull(p.cargoWharfageId),
    product_type_id: idOrNull(p.productTypeId),
    product_group_id: idOrNull(p.productGroupId),
    product_id: idOrNull(p.productId),
    product_name: str(p.productName),
    cargo_owner_id: idOrNull(p.cargoOwnerId),
    cargo_owner_name: str(p.cargoOwnerName),
    m_ton_qty: num(p.mTonQty),
    r_ton_qty: num(p.rTonQty),
    bl_product: str(p.blProduct),
    country_id: idOrNull(p.countryId),
    passengers: Math.round(num(p.passengers)),
    detail: str(p.detail),
  });

  async function fileColumns(input: Row, existing: Row | null): Promise<Row> {
    const out: Row = {};
    for (const [key, column] of NAMED_FILES) {
      const item = input[key];
      if (!item || typeof item !== 'object') continue;
      if (item.isDelete || item.is_delete) {
        out[column] = null;
        continue;
      }
      const fileId = await files.resolveId({ id: item.fileId ?? item.id, filePath: item.filePath });
      if (fileId) out[column] = fileId;
      else if (!existing) out[column] = null;
    }
    return out;
  }

  async function detailOf(row: Row): Promise<Row> {
    const products = (await imports.products([row.id as number])).get(row.id as number) ?? [];
    const named: Row = {};
    for (const [key, column] of NAMED_FILES) named[key] = await namedFile(row[column] as number | null);
    const logBook = row.log_book_id ? await vtms.findLogBook(row.log_book_id as number) : null;
    return {
      ...baseRow(row),
      files: await extraFiles(row.id as number),
      products: groupProducts(products.map(productItem)),
      ...named,
      logBook: logBook
        ? {
            id: logBook.id,
            status: str(logBook.status),
            voyage: str(logBook.voyage),
            gross_tonnage: num(logBook.gross_tonnage),
            depth: num(logBook.depth),
            document_number: str(logBook.document_number),
            mooring_date: iso(logBook.mooring_date),
            departure_date: iso(logBook.departure_date),
            berth_name: str(logBook.berth_name),
            jetty_name: str(logBook.jetty_name),
            agency_name: str(logBook.agency_display_name),
          }
        : null,
    };
  }

  return {
    async list(user: AuthUser, filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      const page = await imports.list(
        {
          createdById: isAgency(user) ? user.userId : null,
          status: filter.status,
          vesselFlagId: filter.vesselFlagId,
          vesselTypeId: filter.vesselTypeId,
          berthId: filter.berthId,
          jettyId: filter.jettyId,
          created: filter.created,
          mooringBegin: filter.mooringDateBegin,
          mooringEnd: filter.mooringDateEnd,
          unmooringBegin: filter.unmooringDateBegin,
          unmooringEnd: filter.unmooringDateEnd,
        },
        query,
      );
      const products = await imports.products(page.data.map((r) => r.id as number));
      return { ...page, data: page.data.map((r) => ({ ...baseRow(r), products: (products.get(r.id as number) ?? []).map(productItem) })) };
    },

    async listSend(filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      const page = await imports.list(
        {
          status: filter.status,
          onlyStatuses: OFFICER_SEND_STATUSES,
          berthId: filter.berthId,
          jettyId: filter.jettyId,
          vesselFlagId: filter.vesselFlagId,
          vesselTypeId: filter.vesselTypeId,
          purposeTypeId: filter.purposeTypeId,
          productName: str(filter.productName),
          mooringBegin: filter.mooringDateVSBegin || filter.mooringDateBegin,
          mooringEnd: filter.mooringDateVSEnd || filter.mooringDateEnd,
          unmooringBegin: filter.unmooringDateVSBegin || filter.unmooringDateBegin,
          unmooringEnd: filter.unmooringDateVSEnd || filter.unmooringDateEnd,
          vtMooringBegin: filter.mooringDateVTBegin,
          vtMooringEnd: filter.mooringDateVTEnd,
          vtUnmooringBegin: filter.unmooringDateVTBegin,
          vtUnmooringEnd: filter.unmooringDateVTEnd,
        },
        query,
      );
      const products = await imports.products(page.data.map((r) => r.id as number));
      return { ...page, data: page.data.map((r) => sendRow(r, (products.get(r.id as number) ?? []).map(productItem))) };
    },

    async detail(id: number, user: AuthUser): Promise<Row> {
      const row = await load(id);
      assertOwner(user, row);
      return detailOf(row);
    },

    async mapDetail(id: number): Promise<Row> {
      const row = await load(id);
      const detail = await detailOf(row);
      const docFiles = row.document_id ? await files.refs('document', row.document_id as number) : [];
      const approved = row.gross_tonnage_approved === null || row.gross_tonnage_approved === undefined ? null : num(row.gross_tonnage_approved);
      const agencyGrt = num(row.document_gross_tonnage);
      const vsGrt = num(row.gross_tonnage);
      const vtGrt = num(row.log_book_gross_tonnage);
      return {
        ...detail,
        documentDate: iso(row.document_date),
        filesAgency: docFiles,
        filesVS: [...NAMED_FILES.map(([key]) => detail[key]).filter((f: Row) => f && f.id), ...(detail.files as Row[])],
        grossTonnageAgency: agencyGrt,
        grossTonnageVS: vsGrt,
        grossTonnageVT: vtGrt,
        vsMooringDate: iso(row.mooring_date),
        vsUnmooringDate: iso(row.unmooring_date),
        vtMooringDate: iso(row.vt_mooring_date),
        vtUnmooringDate: iso(row.vt_unmooring_date),
        isSelectGrossTonnageAgency: approved !== null && approved === agencyGrt,
        isSelectGrossTonnageVS: approved !== null && approved === vsGrt && approved !== agencyGrt,
        isSelectGrossTonnageVT: approved !== null && approved === vtGrt && approved !== agencyGrt && approved !== vsGrt,
        grossTonnageApproved: approved,
      };
    },

    async save(id: number | null, user: AuthUser, input: Row, by: string): Promise<Row> {
      const existing = id === null ? null : await load(id);
      if (existing) {
        assertOwner(user, existing);
        if (isAgency(user) && !['PendingSend', 'PendingEdit', 'Send', 'RequestEdit'].includes(str(existing.status))) {
          throw new AppError('รายงานนี้ไม่สามารถแก้ไขได้ในสถานะปัจจุบัน', 400, 'bad_request', 'The report cannot be edited in its current status');
        }
      }
      const vesselId = idOrNull(input.vesselId) ?? (existing?.vessel_id as number | null);
      if (!vesselId || !(await vessels.findById(vesselId))) throw notFound('ข้อมูลเรือ', 'vessel not found');
      const mooring = toDate(input.mooringDate);
      const unmooring = toDate(input.unmooringDate);
      if (mooring && unmooring && unmooring < mooring) throw new AppError('วันออกจากท่าต้องไม่ก่อนวันเทียบท่า', 400, 'invalid_request', 'unmooringDate must not be before mooringDate');
      const data: Row = {
        vessel_id: vesselId,
        berth_id: idOrNull(input.berthId),
        jetty_id: idOrNull(input.jettyId),
        gross_tonnage: num(input.grossTonnage),
        mooring_date: mooring,
        unmooring_date: unmooring,
        note: str(input.note),
        updated_by: by,
        ...(await fileColumns(input, existing)),
      };
      const products: Row[] = (Array.isArray(input.products) ? input.products : []).filter((p: Row) => p && !p.is_delete && !p.isDelete);
      const savedId = await withTransaction(async (tx) => {
        let targetId = id;
        if (targetId === null) {
          const created = await imports.create({ ...data, status: 'Send', sent_at: new Date(), created_by: by, created_by_id: user.userId }, tx);
          targetId = created.id as number;
        } else {
          const patch: Row = { ...data };
          if (['PendingEdit', 'PendingSend'].includes(str(existing!.status))) Object.assign(patch, { status: 'Send', sent_at: new Date() });
          await imports.update(targetId, patch, tx);
        }
        await imports.replaceProducts(targetId, products.map(productColumns), tx);
        return targetId;
      });
      return detailOf(await load(savedId));
    },

    async sendFromFile(fileId: number, user: AuthUser, by: string): Promise<Row[]> {
      const { buffer, file } = await files.contents(fileId);
      if (!/sheet|excel|csv/i.test(str(file.mimeType)) && !/\.(xlsx|xls|csv)$/i.test(file.fileName)) {
        throw new AppError('กรุณาอัปโหลดไฟล์ Excel (.xlsx)', 400, 'invalid_request', 'An .xlsx file is required');
      }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new AppError('ไฟล์ไม่มีข้อมูล', 400, 'invalid_request', 'The workbook has no sheet');
      const headers = new Map<string, number>();
      sheet.getRow(1).eachCell((cell, col) => headers.set(String(cell.value ?? '').trim().toLowerCase(), col));
      const col = (key: string): number => headers.get(VESSEL_IMPORT_COLUMNS.find((c) => c.key === key)!.header.toLowerCase()) ?? 0;
      const text = (row: ExcelJS.Row, key: string): string => {
        const c = col(key);
        if (!c) return '';
        const v = row.getCell(c).value;
        if (v === null || v === undefined) return '';
        if (v instanceof Date) return v.toISOString();
        if (typeof v === 'object' && 'result' in v) return str((v as { result: unknown }).result);
        if (typeof v === 'object' && 'text' in v) return str((v as { text: unknown }).text);
        return String(v).trim();
      };
      const errors: Row[] = [];
      const { rows: berthRows } = await pool.query('SELECT id, name_alt, name_en, name_th FROM berths WHERE deleted_at IS NULL');
      const { rows: jettyRows } = await pool.query('SELECT id, berth_id, name FROM jetties WHERE status = TRUE');
      for (let rowNo = 2; rowNo <= sheet.rowCount; rowNo++) {
        const row = sheet.getRow(rowNo);
        const vesselName = text(row, 'vesselName');
        if (!vesselName && !text(row, 'imoNumber')) continue;
        const imo = text(row, 'imoNumber');
        const official = text(row, 'officialNumber');
        const { rows: found } = await pool.query(
          `SELECT id FROM vessels WHERE deleted_at IS NULL AND (($1 <> '' AND imo_number = $1) OR ($2 <> '' AND official_number = $2) OR LOWER(name) = LOWER($3)) ORDER BY id LIMIT 1`,
          [imo, official, vesselName],
        );
        if (!found[0]) {
          errors.push({ rowNo, vesselName, note: 'ไม่พบข้อมูลเรือในระบบ (vessel not found)' });
          continue;
        }
        const berthName = text(row, 'berth').toLowerCase();
        const berth = berthRows.find((b) => [b.name_alt, b.name_en, b.name_th].some((n) => str(n).toLowerCase() === berthName));
        if (berthName && !berth) {
          errors.push({ rowNo, vesselName, note: `ไม่พบท่าเทียบเรือ "${text(row, 'berth')}" (berth not found)` });
          continue;
        }
        const jettyName = text(row, 'jetty').toLowerCase();
        const jetty = berth ? jettyRows.find((j) => j.berth_id === berth.id && str(j.name).toLowerCase() === jettyName) : null;
        const mooring = toDate(text(row, 'mooringDate').replace(' ', 'T'));
        const unmooring = toDate(text(row, 'unmooringDate').replace(' ', 'T'));
        if (!mooring) {
          errors.push({ rowNo, vesselName, note: 'รูปแบบวันที่เรือเข้าไม่ถูกต้อง (invalid mooring date)' });
          continue;
        }
        if (unmooring && unmooring < mooring) {
          errors.push({ rowNo, vesselName, note: 'วันออกจากท่าต้องไม่ก่อนวันเทียบท่า (unmooring before mooring)' });
          continue;
        }
        await imports.create({
          vessel_id: found[0].id,
          status: 'Send',
          sent_at: new Date(),
          gross_tonnage: num(text(row, 'grossTonnage')),
          mooring_date: mooring,
          unmooring_date: unmooring,
          berth_id: berth?.id ?? null,
          jetty_id: jetty?.id ?? null,
          note: text(row, 'note'),
          created_by: by,
          created_by_id: user.userId,
          updated_by: by,
        });
      }
      return errors;
    },

    async requestEdit(id: number, user: AuthUser, note: string, by: string): Promise<Row> {
      const row = await load(id);
      assertOwner(user, row);
      if (!['Send', 'PendingCheck', 'PendingApproval', 'Approved'].includes(str(row.status))) {
        throw new AppError('รายงานนี้ไม่อยู่ในสถานะที่ขอแก้ไขได้', 400, 'bad_request', 'The report cannot be sent for editing in its current status');
      }
      const notes = Array.isArray(row.notes) ? row.notes : [];
      await imports.update(id, { status: 'RequestEdit', note, notes: JSON.stringify([...notes, { date: new Date().toISOString(), message: note, by: 'agency' }]), updated_by: by });
      return detailOf(await load(id));
    },

    async sendBack(id: number, note: string, by: string): Promise<Row> {
      const row = await load(id);
      const notes = Array.isArray(row.notes) ? row.notes : [];
      await imports.update(id, { status: 'PendingEdit', note, notes: JSON.stringify([...notes, { date: new Date().toISOString(), message: note, by: 'officer' }]), updated_by: by });
      return detailOf(await load(id));
    },

    async map(id: number, logBookId: number, by: string): Promise<Row> {
      const row = await load(id);
      const logBook = await vtms.findLogBook(logBookId);
      if (!logBook) throw notFound('บันทึกการเดินเรือ', 'log book not found');
      await imports.update(id, {
        log_book_id: logBookId,
        document_id: logBook.document_id ?? null,
        status: str(row.status) === 'Send' ? 'PendingCheck' : row.status,
        updated_by: by,
      });
      return this.mapDetail(id);
    },

    async approve(id: number, user: AuthUser, grossTonnage: unknown, by: string): Promise<Row> {
      const row = await load(id);
      const status = str(row.status);
      const grt = num(grossTonnage, num(row.gross_tonnage));
      if (['Send', 'PendingCheck'].includes(status)) {
        await imports.update(id, { status: STAT_APPROVE_ROLES.includes(user.roleType) ? 'Approved' : 'PendingApproval', gross_tonnage_approved: grt, updated_by: by, ...(STAT_APPROVE_ROLES.includes(user.roleType) ? { approved_at: new Date() } : {}) });
      } else if (status === 'PendingApproval') {
        if (!STAT_APPROVE_ROLES.includes(user.roleType)) throw forbidden('เฉพาะหัวหน้างานสถิติเท่านั้นที่อนุมัติได้', 'forbidden');
        await imports.update(id, { status: 'Approved', gross_tonnage_approved: grt, approved_at: new Date(), updated_by: by });
      } else {
        throw new AppError('รายงานนี้ไม่อยู่ในสถานะที่อนุมัติได้', 400, 'bad_request', 'The report cannot be approved in its current status');
      }
      return this.mapDetail(id);
    },

    async approveEdit(id: number, allow: boolean, grossTonnage: unknown, by: string): Promise<Row> {
      const row = await load(id);
      if (str(row.status) !== 'RequestEdit') throw new AppError('รายงานนี้ไม่ได้ขอแก้ไข', 400, 'bad_request', 'The report has no pending edit request');
      await imports.update(id, { status: allow ? 'PendingEdit' : 'Send', gross_tonnage_approved: allow ? row.gross_tonnage_approved : num(grossTonnage, num(row.gross_tonnage)), updated_by: by });
      return this.mapDetail(id);
    },

    async remove(id: number, user: AuthUser): Promise<void> {
      const row = await load(id);
      assertOwner(user, row);
      await imports.softDelete(id);
    },

    async countByStatus(statuses: string[]): Promise<number> {
      const page = await imports.list({ status: statuses.join(',') }, { page: 1, limit: 1, offset: 0, search: '', order: [] });
      return page.totalItems;
    },
  };
}

export type VesselImportService = ReturnType<typeof createVesselImportService>;
