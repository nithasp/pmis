import ExcelJS from 'exceljs';
import pool from '../database';
import { Row } from '../types/database.types';
import { endOfDay, hoursBetween, toDate } from '../utils/dates';
import { AppError } from '../utils/errors';
import { idOrNull, iso, num, str } from '../utils/rows';
import { money } from '../utils/text';

export interface ReportParams {
  startDate?: unknown;
  endDate?: unknown;
  year?: unknown;
  berthId?: unknown;
  productTypeId?: unknown;
}

interface Range {
  from: Date;
  to: Date;
  berthId: number | null;
  productTypeId: number | null;
  era: 'buddhist' | 'christian';
}

const LATE_HOURS = 24;
const THAI_FLAG_ID = 218;

export const REPORT_NAMES = [
  'sum-submit-late-order',
  'sum-submit-late-list',
  'user-document-count',
  'document-count',
  'approved-agency',
  'sum-vessel-agency',
  'sum-port-due-agency',
  'sum-cargo-value-port-agency',
  'sum-foreigner-agency',
  'sum-foreigner-port-due-agency',
  'sum-foreigner-cargo-value-port-agency',
] as const;

export type ReportName = (typeof REPORT_NAMES)[number];

function range(params: ReportParams): Range {
  const from = toDate(params.startDate) ?? new Date(new Date().getFullYear(), 0, 1);
  const to = endOfDay(params.endDate) ?? new Date();
  if (to < from) throw new AppError('ช่วงวันที่ไม่ถูกต้อง', 400, 'invalid_request', 'endDate must not be before startDate');
  return { from, to, berthId: idOrNull(params.berthId), productTypeId: idOrNull(params.productTypeId), era: String(params.year) === 'buddhist' ? 'buddhist' : 'christian' };
}

const fmtDate = (value: unknown, era: Range['era']): string => {
  const d = toDate(value);
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${era === 'buddhist' ? d.getFullYear() + 543 : d.getFullYear()}`;
};

// Approved requests in the period with their agency, vessel and first berth
async function approvedDocuments(r: Range, foreignOnly = false): Promise<Row[]> {
  const params: unknown[] = [r.from, r.to];
  let where = "d.deleted_at IS NULL AND d.status = 'Approved' AND COALESCE(d.approved_at, d.request_date) BETWEEN $1 AND $2";
  if (r.berthId) {
    params.push(r.berthId);
    where += ` AND EXISTS (SELECT 1 FROM document_berths b WHERE b.document_id = d.id AND b.berth_id = $${params.length})`;
  }
  if (foreignOnly) where += ` AND COALESCE(dv.vessel_flag_id, 0) <> ${THAI_FLAG_ID}`;
  const { rows } = await pool.query(
    `SELECT d.*, dv.vessel_name, dv.vessel_gross_tonnage, dv.vessel_flag_id, u.id AS user_id, COALESCE(NULLIF(u.company, ''), u.full_name) AS company_name,
            u.full_name AS contact_name, u.email, u.phone, u.mobile_phone,
            (SELECT MIN(b.estimated_arrival) FROM document_berths b WHERE b.document_id = d.id) AS eta,
            (SELECT COALESCE(SUM(p.m_ton_qty), 0) FROM document_berth_products p JOIN document_berths b ON b.id = p.document_berth_id WHERE b.document_id = d.id) AS m_ton,
            (SELECT COALESCE(SUM(p.r_ton_qty), 0) FROM document_berth_products p JOIN document_berths b ON b.id = p.document_berth_id WHERE b.document_id = d.id) AS r_ton,
            (SELECT COALESCE(SUM(pd.fee), 0) FROM port_dues pd WHERE pd.document_id = d.id AND pd.canceled_at IS NULL) AS port_fee,
            (SELECT COALESCE(SUM(pd.vat_total), 0) FROM port_dues pd WHERE pd.document_id = d.id AND pd.canceled_at IS NULL) AS port_vat,
            (SELECT COALESCE(SUM(pd.total), 0) FROM port_dues pd WHERE pd.document_id = d.id AND pd.canceled_at IS NULL) AS port_total
     FROM documents d JOIN document_vessels dv ON dv.document_id = d.id JOIN users u ON u.id = d.agency_user_id
     WHERE ${where} ORDER BY company_name, d.approved_at`,
    params,
  );
  return rows;
}

// Submitted requests in the period (whatever happened to them afterwards)
async function submittedDocuments(r: Range): Promise<Row[]> {
  const { rows } = await pool.query(
    `SELECT d.*, dv.vessel_name, dv.vessel_gross_tonnage, u.id AS user_id, COALESCE(NULLIF(u.company, ''), u.full_name) AS company_name, u.full_name AS contact_name,
            u.email, u.phone, u.mobile_phone, (SELECT MIN(b.estimated_arrival) FROM document_berths b WHERE b.document_id = d.id) AS eta
     FROM documents d JOIN document_vessels dv ON dv.document_id = d.id JOIN users u ON u.id = d.agency_user_id
     WHERE d.deleted_at IS NULL AND d.status <> 'Draft' AND COALESCE(d.submitted_at, d.request_date) BETWEEN $1 AND $2
     ORDER BY company_name, d.request_date`,
    [r.from, r.to],
  );
  return rows;
}

const isLate = (doc: Row): boolean => {
  const submitted = toDate(doc.submitted_at ?? doc.request_date);
  const eta = toDate(doc.eta);
  return !!submitted && !!eta && hoursBetween(submitted, eta) < LATE_HOURS;
};

export function createReportService() {
  const builders: Record<ReportName, (r: Range) => Promise<Row | Row[]>> = {
    // 1. share of late submissions per agency
    async 'sum-submit-late-order'(r) {
      const docs = await submittedDocuments(r);
      const total = docs.length;
      const totalLate = docs.filter(isLate).length;
      const byAgency = new Map<string, Row>();
      for (const d of docs) {
        const key = str(d.company_name);
        const item = byAgency.get(key) ?? { userId: d.user_id, companyName: key, allDoc: 0, hourDoc: 0 };
        item.allDoc += 1;
        if (isLate(d)) item.hourDoc += 1;
        byAgency.set(key, item);
      }
      return [...byAgency.values()]
        .map((i): Row => ({ ...i, percentageAllDoc: total ? money((i.allDoc / total) * 100) : 0, percentageHourDoc: totalLate ? money((i.hourDoc / totalLate) * 100) : 0 }))
        .sort((a, b) => num(b.hourDoc) - num(a.hourDoc) || num(b.allDoc) - num(a.allDoc));
    },

    // 2. every late submission
    async 'sum-submit-late-list'(r) {
      const docs = await submittedDocuments(r);
      return docs.filter(isLate).map((d) => {
        const submitted = toDate(d.submitted_at ?? d.request_date)!;
        const eta = toDate(d.eta)!;
        return {
          companyName: str(d.company_name),
          docNumber: str(d.doc_number),
          name: str(d.vessel_name),
          requestDate: iso(submitted),
          mooringDate: iso(eta),
          dateDiff: money(hoursBetween(submitted, eta)),
          phone: str(d.phone) || str(d.mobile_phone),
        };
      });
    },

    // 3. requests per agency
    async 'user-document-count'(r) {
      const docs = await submittedDocuments(r);
      const byAgency = new Map<string, Row>();
      for (const d of docs) {
        const key = str(d.company_name);
        const item = byAgency.get(key) ?? { userId: d.user_id, companyName: key, document_count: 0 };
        item.document_count += 1;
        byAgency.set(key, item);
      }
      return [...byAgency.values()].sort((a, b) => b.document_count - a.document_count);
    },

    // 6. per approval day: GRT bands, cancellations and vessels that never berthed
    async 'document-count'(r) {
      const params: unknown[] = [r.from, r.to];
      let berthFilter = '';
      if (r.berthId) {
        params.push(r.berthId);
        berthFilter = ` AND EXISTS (SELECT 1 FROM document_berths b WHERE b.document_id = d.id AND b.berth_id = $${params.length})`;
      }
      const { rows } = await pool.query(
        `SELECT d.status, d.approved_at, d.request_date, d.port_at, dv.vessel_gross_tonnage FROM documents d JOIN document_vessels dv ON dv.document_id = d.id
         WHERE d.deleted_at IS NULL AND d.status IN ('Approved', 'Canceled', 'AdminCanceled') AND COALESCE(d.approved_at, d.updated_at) BETWEEN $1 AND $2${berthFilter}
         ORDER BY COALESCE(d.approved_at, d.updated_at)`,
        params,
      );
      const empty = () => ({ grtLessThan700: 0, grt700To2000: 0, grtGatherThan2000: 0, total: 0, GrtLessThan700NoBerthAt: 0, grt700To2000NoBerthAt: 0, grtGatherThan2000NoBerthAt: 0, userCancel: 0, adminCancel: 0, noBerthAt: 0 });
      const byDay = new Map<string, Row>();
      const total: Row = { approvedDate: null, ...empty() };
      const add = (target: Row, d: Row) => {
        if (d.status === 'Canceled') target.userCancel += 1;
        else if (d.status === 'AdminCanceled') target.adminCancel += 1;
        else {
          const grt = num(d.vessel_gross_tonnage);
          const band = grt < 700 ? 'grtLessThan700' : grt <= 2000 ? 'grt700To2000' : 'grtGatherThan2000';
          target[band] += 1;
          target.total += 1;
          if (!d.port_at) {
            target.noBerthAt += 1;
            target[band === 'grtLessThan700' ? 'GrtLessThan700NoBerthAt' : `${band}NoBerthAt`] += 1;
          }
        }
      };
      for (const d of rows) {
        const day = (toDate(d.approved_at ?? d.request_date) ?? new Date()).toISOString().slice(0, 10);
        const item = byDay.get(day) ?? { approvedDate: day, ...empty() };
        add(item, d);
        add(total, d);
        byDay.set(day, item);
      }
      return { items: [...byDay.values()], total };
    },

    // 7. agencies approved in the period
    async 'approved-agency'(r) {
      const { rows } = await pool.query(
        `SELECT id, approved_at, COALESCE(NULLIF(company, ''), full_name) AS company_name, full_name, phone, mobile_phone, email FROM users
         WHERE deleted_at IS NULL AND type = 'Agency' AND status = 'Approved' AND COALESCE(approved_at, created_at) BETWEEN $1 AND $2 ORDER BY approved_at`,
        [r.from, r.to],
      );
      return rows.map((u) => ({ userId: u.id, approvedDate: iso(u.approved_at), companyName: str(u.company_name), contactName: str(u.full_name), phone: str(u.phone), mobilePhone: str(u.mobile_phone), email: str(u.email) }));
    },

    // 4-1 / 5-1: vessels, port dues and cargo per agency
    async 'sum-vessel-agency'(r) {
      return perAgencyVessels(await approvedDocuments(r));
    },
    async 'sum-foreigner-agency'(r) {
      return perAgencyVessels(await approvedDocuments(r, true));
    },

    // 4-2 / 5-2: port dues per vessel
    async 'sum-port-due-agency'(r) {
      return (await approvedDocuments(r)).map(portDueRow);
    },
    async 'sum-foreigner-port-due-agency'(r) {
      return (await approvedDocuments(r, true)).map(portDueRow);
    },

    // 4-3 / 5-3: cargo value through the berth per agency
    async 'sum-cargo-value-port-agency'(r) {
      return (await approvedDocuments(r)).map(cargoRow);
    },
    async 'sum-foreigner-cargo-value-port-agency'(r) {
      return (await approvedDocuments(r, true)).map(cargoRow);
    },
  };

  function perAgencyVessels(docs: Row[]): Row[] {
    const byVessel = new Map<string, Row>();
    for (const d of docs) {
      const key = `${d.user_id}:${str(d.vessel_name)}`;
      const item = byVessel.get(key) ?? {
        userId: d.user_id,
        companyName: str(d.company_name),
        contactName: str(d.contact_name),
        email: str(d.email),
        phone: str(d.phone),
        mobilePhone: str(d.mobile_phone),
        vesselName: str(d.vessel_name),
        countVessels: 0,
        portDueTotal: 0,
        mTonTotal: 0,
        rTonTotal: 0,
      };
      item.countVessels += 1;
      item.portDueTotal = money(item.portDueTotal + num(d.port_total));
      item.mTonTotal = money(item.mTonTotal + num(d.m_ton));
      item.rTonTotal = money(item.rTonTotal + num(d.r_ton));
      byVessel.set(key, item);
    }
    return [...byVessel.values()];
  }

  const portDueRow = (d: Row): Row => ({
    userId: d.user_id,
    companyName: str(d.company_name),
    contactName: str(d.contact_name),
    vesselName: str(d.vessel_name),
    docNumber: str(d.doc_number),
    grossTonnage: num(d.vessel_gross_tonnage),
    fee: num(d.port_fee),
    vat: num(d.port_vat),
    total: num(d.port_total),
  });

  const cargoRow = (d: Row): Row => ({
    userId: d.user_id,
    fullName: str(d.company_name),
    contactName: str(d.contact_name),
    vesselName: str(d.vessel_name),
    docNumber: str(d.doc_number),
    mTon: num(d.m_ton),
    rTon: num(d.r_ton),
    portCharges: num(d.port_fee),
    portChargesVat: num(d.port_vat),
    portChargesNet: num(d.port_total),
  });

  const SHEETS: Record<ReportName, { title: string; columns: { header: string; key: string; width?: number; date?: boolean }[] }> = {
    'sum-submit-late-order': { title: 'สรุปลำดับการยื่นคำร้องล่าช้า', columns: [{ header: 'บริษัท', key: 'companyName', width: 40 }, { header: 'คำร้องทั้งหมด', key: 'allDoc' }, { header: 'ยื่นล่าช้า (<24 ชม.)', key: 'hourDoc' }, { header: '% ของคำร้องทั้งหมด', key: 'percentageAllDoc' }, { header: '% ของคำร้องล่าช้า', key: 'percentageHourDoc' }] },
    'sum-submit-late-list': { title: 'รายการคำร้องที่ยื่นล่าช้า', columns: [{ header: 'บริษัท', key: 'companyName', width: 40 }, { header: 'เลขที่คำร้อง', key: 'docNumber', width: 18 }, { header: 'ชื่อเรือ', key: 'name', width: 28 }, { header: 'วันที่ยื่น', key: 'requestDate', width: 16, date: true }, { header: 'กำหนดเทียบท่า', key: 'mooringDate', width: 16, date: true }, { header: 'ล่วงหน้า (ชม.)', key: 'dateDiff' }, { header: 'โทรศัพท์', key: 'phone', width: 16 }] },
    'user-document-count': { title: 'จำนวนคำร้องต่อตัวแทนเรือ', columns: [{ header: 'บริษัท', key: 'companyName', width: 40 }, { header: 'จำนวนคำร้อง', key: 'document_count' }] },
    'document-count': { title: 'สรุปจำนวนเรือตามขนาด GRT', columns: [{ header: 'วันที่อนุมัติ', key: 'approvedDate', width: 14 }, { header: 'GRT < 700', key: 'grtLessThan700' }, { header: 'GRT 700-2000', key: 'grt700To2000' }, { header: 'GRT > 2000', key: 'grtGatherThan2000' }, { header: 'รวม', key: 'total' }, { header: 'ตัวแทนยกเลิก', key: 'userCancel' }, { header: 'เจ้าหน้าที่ยกเลิก', key: 'adminCancel' }, { header: 'ไม่เข้าเทียบท่า', key: 'noBerthAt' }] },
    'approved-agency': { title: 'ตัวแทนเรือที่ได้รับอนุมัติ', columns: [{ header: 'วันที่อนุมัติ', key: 'approvedDate', width: 16, date: true }, { header: 'บริษัท', key: 'companyName', width: 40 }, { header: 'ผู้ติดต่อ', key: 'contactName', width: 28 }, { header: 'โทรศัพท์', key: 'phone', width: 16 }, { header: 'โทรศัพท์สำรอง', key: 'mobilePhone', width: 16 }, { header: 'E-mail', key: 'email', width: 30 }] },
    'sum-vessel-agency': { title: 'สรุปเรือและค่าภาระตามตัวแทนเรือ', columns: [{ header: 'บริษัท', key: 'companyName', width: 40 }, { header: 'ผู้ติดต่อ', key: 'contactName', width: 24 }, { header: 'ชื่อเรือ', key: 'vesselName', width: 28 }, { header: 'จำนวนเที่ยว', key: 'countVessels' }, { header: 'ค่าภาระเรือ (บาท)', key: 'portDueTotal', width: 18 }, { header: 'M/Ton', key: 'mTonTotal' }, { header: 'R/Ton', key: 'rTonTotal' }] },
    'sum-foreigner-agency': { title: 'สรุปเรือต่างชาติตามตัวแทนเรือ', columns: [{ header: 'บริษัท', key: 'companyName', width: 40 }, { header: 'ผู้ติดต่อ', key: 'contactName', width: 24 }, { header: 'ชื่อเรือ', key: 'vesselName', width: 28 }, { header: 'จำนวนเที่ยว', key: 'countVessels' }, { header: 'ค่าภาระเรือ (บาท)', key: 'portDueTotal', width: 18 }, { header: 'M/Ton', key: 'mTonTotal' }, { header: 'R/Ton', key: 'rTonTotal' }] },
    'sum-port-due-agency': { title: 'สรุปค่าภาระเรือตามตัวแทนเรือ', columns: [{ header: 'บริษัท', key: 'companyName', width: 40 }, { header: 'เลขที่คำร้อง', key: 'docNumber', width: 18 }, { header: 'ชื่อเรือ', key: 'vesselName', width: 28 }, { header: 'GRT', key: 'grossTonnage' }, { header: 'ค่าภาระ', key: 'fee', width: 16 }, { header: 'VAT', key: 'vat', width: 14 }, { header: 'รวม', key: 'total', width: 16 }] },
    'sum-foreigner-port-due-agency': { title: 'สรุปค่าภาระเรือต่างชาติ', columns: [{ header: 'บริษัท', key: 'companyName', width: 40 }, { header: 'เลขที่คำร้อง', key: 'docNumber', width: 18 }, { header: 'ชื่อเรือ', key: 'vesselName', width: 28 }, { header: 'GRT', key: 'grossTonnage' }, { header: 'ค่าภาระ', key: 'fee', width: 16 }, { header: 'VAT', key: 'vat', width: 14 }, { header: 'รวม', key: 'total', width: 16 }] },
    'sum-cargo-value-port-agency': { title: 'สรุปสินค้าผ่านท่าตามตัวแทนเรือ', columns: [{ header: 'บริษัท', key: 'fullName', width: 40 }, { header: 'เลขที่คำร้อง', key: 'docNumber', width: 18 }, { header: 'ชื่อเรือ', key: 'vesselName', width: 28 }, { header: 'M/Ton', key: 'mTon' }, { header: 'R/Ton', key: 'rTon' }, { header: 'ค่าภาระ', key: 'portCharges', width: 16 }, { header: 'VAT', key: 'portChargesVat', width: 14 }, { header: 'สุทธิ', key: 'portChargesNet', width: 16 }] },
    'sum-foreigner-cargo-value-port-agency': { title: 'สรุปสินค้าผ่านท่าเรือต่างชาติ', columns: [{ header: 'บริษัท', key: 'fullName', width: 40 }, { header: 'เลขที่คำร้อง', key: 'docNumber', width: 18 }, { header: 'ชื่อเรือ', key: 'vesselName', width: 28 }, { header: 'M/Ton', key: 'mTon' }, { header: 'R/Ton', key: 'rTon' }, { header: 'ค่าภาระ', key: 'portCharges', width: 16 }, { header: 'VAT', key: 'portChargesVat', width: 14 }, { header: 'สุทธิ', key: 'portChargesNet', width: 16 }] },
  };

  return {
    isReport(name: string): name is ReportName {
      return (REPORT_NAMES as readonly string[]).includes(name);
    },

    async data(name: ReportName, params: ReportParams): Promise<Row | Row[]> {
      return builders[name](range(params));
    },

    async workbook(name: ReportName, params: ReportParams): Promise<Buffer> {
      const r = range(params);
      const result = await builders[name](r);
      const spec = SHEETS[name];
      const wb = new ExcelJS.Workbook();
      wb.creator = 'PMIS';
      const ws = wb.addWorksheet(spec.title.slice(0, 30));
      ws.mergeCells(1, 1, 1, spec.columns.length);
      ws.getCell(1, 1).value = `สำนักงานท่าเรืออุตสาหกรรมมาบตาพุด - ${spec.title}`;
      ws.getCell(1, 1).font = { bold: true, size: 14 };
      ws.mergeCells(2, 1, 2, spec.columns.length);
      ws.getCell(2, 1).value = `ประจำวันที่ ${fmtDate(r.from, r.era)} - ${fmtDate(r.to, r.era)}`;
      ws.getRow(4).values = spec.columns.map((c) => c.header);
      ws.getRow(4).font = { bold: true };
      ws.columns = spec.columns.map((c) => ({ key: c.key, width: c.width ?? 14 }));
      const rows: Row[] = Array.isArray(result) ? result : [...((result.items as Row[]) ?? []), { ...(result.total as Row), approvedDate: 'รวม' }];
      for (const row of rows) {
        ws.addRow(spec.columns.map((c) => (c.date ? fmtDate(row[c.key], r.era) : (row[c.key] ?? ''))));
      }
      if (!rows.length) ws.addRow(['ไม่พบข้อมูลในช่วงวันที่ที่เลือก']);
      return Buffer.from(await wb.xlsx.writeBuffer());
    },
  };
}

export type ReportService = ReturnType<typeof createReportService>;
