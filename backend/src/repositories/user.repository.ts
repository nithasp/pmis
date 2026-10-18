import pool from '../database';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { Queryable, Row } from '../types/database.types';
import { pagedResult } from '../utils/paging';
import { requireRow } from '../utils/rows';
import { SqlBuilder } from '../utils/sql';

export const USER_SELECT = `
  u.*, r.name AS role_name, r.role_type AS role_role_type, r.permissions AS role_permissions,
  CASE WHEN u.type = 'Agency' THEN 'Agency' ELSE COALESCE(r.role_type, u.type) END AS role_type`;

const FROM = ' FROM users u LEFT JOIN roles r ON r.id = u.role_id';
const LIVE = 'u.deleted_at IS NULL';

export interface UserFilter {
  type?: string | string[];
  status?: string;
  personType?: string;
  enabled?: string;
  roleId?: number;
  begin?: unknown;
  end?: unknown;
}

const SORTABLE: Record<string, string> = {
  id: 'u.id',
  email: 'u.email',
  company: 'u.company',
  fullName: 'u.full_name',
  personType: 'u.person_type',
  tax: 'u.tax',
  phone: 'u.phone',
  status: 'u.status',
  enabled: 'u.enabled',
  roleName: 'r.name',
  createdAt: 'u.created_at',
  createAt: 'u.created_at',
  updatedAt: 'u.updated_at',
};

export class UserRepository {
  async findById(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(`SELECT ${USER_SELECT}${FROM} WHERE u.id = $1 AND ${LIVE}`, [id]);
    return rows[0] ?? null;
  }

  async findByEmail(email: string, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(`SELECT ${USER_SELECT}${FROM} WHERE LOWER(u.email) = LOWER($1) AND ${LIVE}`, [
      email,
    ]);
    return rows[0] ?? null;
  }

  async findAuthById(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(
      `SELECT ${USER_SELECT}${FROM} WHERE u.id = $1 AND ${LIVE} AND u.enabled = TRUE`,
      [id],
    );
    return rows[0] ?? null;
  }

  async list(filter: UserFilter, query: ListQuery, db: Queryable = pool): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where(LIVE);
    if (Array.isArray(filter.type)) b.in('u.type', filter.type);
    else b.eq('u.type', filter.type);
    b.eq('u.status', filter.status);
    b.eq('u.person_type', filter.personType);
    b.eq('u.role_id', filter.roleId);
    b.bool('u.enabled', filter.enabled);
    b.between('u.created_at', filter.begin, filter.end);
    b.like(['u.email', 'u.full_name', 'u.company', 'u.tax', 'u.phone', 'r.name'], query.search);
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*)${FROM}${where}`, b.params);
    const total = Number(countRows[0]?.count ?? 0);
    const { rows } = await db.query(
      `SELECT ${USER_SELECT}${FROM}${where}${b.orderBy(query.order, SORTABLE, 'u.created_at DESC')}${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, total, query);
  }

  async countByRole(db: Queryable = pool): Promise<Map<number, number>> {
    const { rows } = await db.query(
      `SELECT role_id, COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL AND role_id IS NOT NULL GROUP BY role_id`,
    );
    return new Map(rows.map((r) => [r.role_id as number, r.count as number]));
  }

  async create(data: Row, db: Queryable = pool): Promise<Row> {
    const cols = Object.keys(data);
    const { rows } = await db.query(
      `INSERT INTO users (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      cols.map((c) => data[c]),
    );
    return requireRow(rows, 'INSERT INTO users');
  }

  async update(id: number, data: Row, db: Queryable = pool): Promise<Row | null> {
    const cols = Object.keys(data);
    if (!cols.length) return this.findById(id, db);
    const sets = cols.map((c, i) => `${c} = $${i + 2}`);
    const { rows } = await db.query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...cols.map((c) => data[c])],
    );
    return rows[0] ?? null;
  }

  async softDelete(id: number, by: string, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query(
      `UPDATE users SET deleted_at = NOW(), enabled = FALSE, updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`,
      [id, by],
    );
    return (rowCount ?? 0) > 0;
  }

  async reassignRole(fromRoleId: number, toRoleId: number | null, db: Queryable = pool): Promise<void> {
    await db.query('UPDATE users SET role_id = $2 WHERE role_id = $1', [fromRoleId, toRoleId]);
  }

  async ownerOptions(search: string, db: Queryable = pool): Promise<{ id: number; name: string }[]> {
    const { rows } = await db.query(
      `SELECT id, COALESCE(NULLIF(company, ''), full_name) AS name FROM users
       WHERE deleted_at IS NULL AND type = 'Agency' AND ($1 = '' OR company ILIKE $2 OR full_name ILIKE $2)
       ORDER BY name LIMIT 50`,
      [search, `%${search}%`],
    );
    return rows.map((r) => ({ id: r.id as number, name: r.name as string }));
  }
}
