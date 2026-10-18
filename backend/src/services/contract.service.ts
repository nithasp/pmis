import pool, { withTransaction } from '../database';
import { Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { toDate } from '../utils/dates';
import { AppError, conflict, notFound } from '../utils/errors';
import { pagedResult } from '../utils/paging';
import { idOrNull, iso, num, str } from '../utils/rows';
import { SqlBuilder } from '../utils/sql';
import { money } from '../utils/text';
import { FileService } from './file.service';

export interface RateInput {
  start: unknown;
  end: unknown;
  initialRate: unknown;
  annualIncreaseRate: unknown;
  rateChangeCycle: unknown;
  rateChangeStartYear: unknown;
}

// Splits the contract into yearly periods; the rate rises by the annual percentage every
// `rateChangeCycle` years, starting from the year the contract says the first change applies.
export function computeRates(input: RateInput): Row[] {
  const start = toDate(input.start);
  const end = toDate(input.end);
  if (!start || !end) throw new AppError('กรุณาระบุวันเริ่มต้นและสิ้นสุดสัญญา', 400, 'invalid_request', 'start and end are required');
  if (end <= start) throw new AppError('วันสิ้นสุดสัญญาต้องหลังวันเริ่มต้น', 400, 'invalid_request', 'end must be after start');
  const initialRate = num(input.initialRate);
  const increase = num(input.annualIncreaseRate) / 100;
  const cycle = Math.max(1, Math.round(num(input.rateChangeCycle, 1)));
  const changeStartYear = Number(String(input.rateChangeStartYear ?? '').replace(/\D/g, '')) || start.getFullYear() + cycle;
  const firstChange = changeStartYear > 2400 ? changeStartYear - 543 : changeStartYear;
  const periods: Row[] = [];
  let periodStart = new Date(start);
  let rate = initialRate;
  let index = 0;
  while (periodStart < end && index < 100) {
    const periodEnd = new Date(periodStart);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    periodEnd.setDate(periodEnd.getDate() - 1);
    const last = periodEnd > end ? new Date(end) : periodEnd;
    const year = periodStart.getFullYear();
    if (index > 0 && year >= firstChange && (year - firstChange) % cycle === 0) rate = money(rate * (1 + increase));
    periods.push({ id: null, start: periodStart.toISOString(), end: last.toISOString(), rate: money(rate) });
    periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() + 1);
    index++;
  }
  return periods;
}

const FROM = ' FROM contracts c LEFT JOIN berths bb ON bb.id = c.berth_id';

export function createContractService(files: FileService) {
  const toRow = (r: Row): Row => ({
    id: r.id,
    contractNo: str(r.contract_no),
    berthId: r.berth_id ?? 0,
    berthName: str(r.berth_name),
    start: iso(r.start_date),
    end: iso(r.end_date),
    initialRate: num(r.initial_rate),
    annualIncreaseRate: num(r.annual_increase_rate),
    rateChangeCycle: num(r.rate_change_cycle),
    rateChangeStartYear: str(r.rate_change_start_year),
    terminatedDate: iso(r.terminated_date),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    updatedName: str(r.updated_by),
  });

  async function detailOf(id: number): Promise<Row> {
    const { rows } = await pool.query(`SELECT c.*, bb.name_alt AS berth_name${FROM} WHERE c.id = $1 AND c.deleted_at IS NULL`, [id]);
    if (!rows[0]) throw notFound('สัญญา', 'contract not found');
    const { rows: rates } = await pool.query('SELECT * FROM contract_rates WHERE contract_id = $1 ORDER BY start_date', [id]);
    return {
      ...toRow(rows[0]),
      annualRates: rates.map((r) => ({ id: r.id, start: iso(r.start_date), end: iso(r.end_date), rate: num(r.rate) })),
      uploadFiles: await files.refs('contract', id),
    };
  }

  return {
    rates: computeRates,

    async list(filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      const b = new SqlBuilder();
      b.where('c.deleted_at IS NULL');
      b.eq('c.berth_id', idOrNull(filter.berthId));
      if (filter.contractNumber) b.like(['c.contract_no'], str(filter.contractNumber));
      b.like(['c.contract_no', 'bb.name_alt', 'bb.name_th', 'bb.name_en'], query.search);
      const where = b.whereClause();
      const { rows: countRows } = await pool.query(`SELECT COUNT(*)${FROM}${where}`, b.params);
      const sort: Record<string, string> = { id: 'c.id', contractNo: 'c.contract_no', berthName: 'bb.name_alt', start: 'c.start_date', end: 'c.end_date', updatedAt: 'c.updated_at' };
      const { rows } = await pool.query(`SELECT c.*, bb.name_alt AS berth_name${FROM}${where}${b.orderBy(query.order, sort, 'c.start_date DESC')}${b.limit(query)}`, b.params);
      return pagedResult(rows.map(toRow), Number(countRows[0]?.count ?? 0), query);
    },

    detail: detailOf,

    async save(id: number | null, input: Row, by: string): Promise<Row> {
      const contractNo = str(input.contractNo).trim();
      if (!contractNo) throw new AppError('กรุณาระบุเลขที่สัญญา', 400, 'invalid_request', 'contractNo is required');
      const { rows: dup } = await pool.query('SELECT id FROM contracts WHERE deleted_at IS NULL AND LOWER(contract_no) = LOWER($1)', [contractNo]);
      if (dup[0] && dup[0].id !== id) throw conflict('เลขที่สัญญานี้มีแล้วในระบบ', 'duplicate');
      const start = toDate(input.start);
      const end = toDate(input.end);
      if (!start || !end || end <= start) throw new AppError('ช่วงวันที่ของสัญญาไม่ถูกต้อง', 400, 'invalid_request', 'The contract dates are invalid');
      const rates: Row[] = Array.isArray(input.annualRates) && input.annualRates.length ? input.annualRates : computeRates(input as RateInput);
      const savedId = await withTransaction(async (tx) => {
        const values = [contractNo, idOrNull(input.berthId), start, end, num(input.initialRate), num(input.annualIncreaseRate), Math.max(1, Math.round(num(input.rateChangeCycle, 1))), str(input.rateChangeStartYear), toDate(input.terminatedDate), by];
        let targetId = id;
        if (targetId === null) {
          const { rows } = await tx.query(
            `INSERT INTO contracts (contract_no, berth_id, start_date, end_date, initial_rate, annual_increase_rate, rate_change_cycle, rate_change_start_year, terminated_date, updated_by, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10) RETURNING id`,
            values,
          );
          targetId = rows[0].id as number;
        } else {
          const { rowCount } = await tx.query(
            `UPDATE contracts SET contract_no = $2, berth_id = $3, start_date = $4, end_date = $5, initial_rate = $6, annual_increase_rate = $7, rate_change_cycle = $8,
               rate_change_start_year = $9, terminated_date = $10, updated_by = $11, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
            [targetId, ...values],
          );
          if (!rowCount) throw notFound('สัญญา', 'contract not found');
          await tx.query('DELETE FROM contract_rates WHERE contract_id = $1', [targetId]);
        }
        for (const r of rates) {
          const s = toDate(r.start);
          const e = toDate(r.end);
          if (!s || !e) continue;
          await tx.query('INSERT INTO contract_rates (contract_id, start_date, end_date, rate) VALUES ($1, $2, $3, $4)', [targetId, s, e, num(r.rate)]);
        }
        if (Array.isArray(input.uploadFiles)) await files.syncLinks('contract', targetId, input.uploadFiles, tx);
        return targetId;
      });
      return detailOf(savedId);
    },

    async remove(id: number): Promise<void> {
      const { rowCount } = await pool.query('UPDATE contracts SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (!rowCount) throw notFound('สัญญา', 'contract not found');
    },
  };
}

export type ContractService = ReturnType<typeof createContractService>;
