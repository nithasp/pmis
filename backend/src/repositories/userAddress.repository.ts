import pool from '../database';
import { Queryable, Row } from '../types/database.types';
import { idOrNull, str } from '../utils/rows';

const SELECT = `
  a.*, pm.name AS payment_method_des, pt.name AS payment_term_des,
  c.name_th AS country_des, p.name_th AS province_des, d.name_th AS district_des, s.name_th AS sub_district_des`;

const FROM = `
  FROM user_addresses a
  LEFT JOIN payment_methods pm ON pm.id = a.payment_method_id
  LEFT JOIN payment_terms pt ON pt.id = a.payment_term_id
  LEFT JOIN countries c ON c.id = a.country_id
  LEFT JOIN provinces p ON p.id = a.province_id
  LEFT JOIN districts d ON d.id = a.district_id
  LEFT JOIN sub_districts s ON s.id = a.sub_district_id`;

export const toAddress = (row: Row): Row => ({
  id: row.id,
  userId: row.user_id,
  tax: str(row.tax),
  company: str(row.company),
  fullName: str(row.full_name),
  paymentMethodId: row.payment_method_id ?? 0,
  paymentMethodDes: str(row.payment_method_des),
  paymentTermId: row.payment_term_id ?? 0,
  paymentTermDes: str(row.payment_term_des),
  address: str(row.address),
  countryId: row.country_id ?? 0,
  countryDes: str(row.country_des),
  subDistrictId: row.sub_district_id ?? 0,
  subDistrictDes: str(row.sub_district_des),
  districtId: row.district_id ?? 0,
  districtDes: str(row.district_des),
  provinceId: row.province_id ?? 0,
  provinceDes: str(row.province_des),
  stageProvince: str(row.stage_province),
  zipCode: str(row.zip_code),
});

const columns = (input: Row): unknown[] => [
  str(input.tax),
  str(input.company),
  str(input.fullName),
  idOrNull(input.paymentMethodId),
  idOrNull(input.paymentTermId),
  str(input.address),
  idOrNull(input.countryId),
  idOrNull(input.subDistrictId),
  idOrNull(input.districtId),
  idOrNull(input.provinceId),
  str(input.stageProvince),
  str(input.zipCode),
];

export class UserAddressRepository {
  async listByUser(userId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(`SELECT ${SELECT}${FROM} WHERE a.user_id = $1 AND a.deleted_at IS NULL ORDER BY a.id`, [userId]);
    return rows.map(toAddress);
  }

  async findById(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(`SELECT ${SELECT}${FROM} WHERE a.id = $1 AND a.deleted_at IS NULL`, [id]);
    return rows[0] ? toAddress(rows[0]) : null;
  }

  async create(userId: number, input: Row, db: Queryable = pool): Promise<number> {
    const { rows } = await db.query(
      `INSERT INTO user_addresses (user_id, tax, company, full_name, payment_method_id, payment_term_id, address, country_id,
         sub_district_id, district_id, province_id, stage_province, zip_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [userId, ...columns(input)],
    );
    return rows[0]?.id as number;
  }

  async update(id: number, input: Row, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query(
      `UPDATE user_addresses SET tax = $2, company = $3, full_name = $4, payment_method_id = $5, payment_term_id = $6, address = $7,
         country_id = $8, sub_district_id = $9, district_id = $10, province_id = $11, stage_province = $12, zip_code = $13, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id, ...columns(input)],
    );
    return (rowCount ?? 0) > 0;
  }

  async softDelete(id: number, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE user_addresses SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
    return (rowCount ?? 0) > 0;
  }
}
