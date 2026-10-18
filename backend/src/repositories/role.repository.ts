import pool from '../database';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { Queryable, Row } from '../types/database.types';
import { pagedResult } from '../utils/paging';
import { requireRow } from '../utils/rows';
import { SqlBuilder } from '../utils/sql';

const LIVE = 'deleted_at IS NULL';

const SORTABLE: Record<string, string> = {
  id: 'id',
  name: 'name',
  activated: 'activated',
  updatedAt: 'updated_at',
  updatedName: 'updated_by',
  createdAt: 'created_at',
};

export class RoleRepository {
  async list(query: ListQuery, db: Queryable = pool): Promise<PagedResult<Row>> {
    const b = new SqlBuilder();
    b.where(LIVE).like(['name', 'role_type'], query.search);
    const where = b.whereClause();
    const { rows: countRows } = await db.query(`SELECT COUNT(*) FROM roles${where}`, b.params);
    const { rows } = await db.query(
      `SELECT * FROM roles${where}${b.orderBy(query.order, SORTABLE, 'id ASC')}${b.limit(query)}`,
      b.params,
    );
    return pagedResult(rows, Number(countRows[0]?.count ?? 0), query);
  }

  async all(db: Queryable = pool): Promise<Row[]> {
    const { rows } = await db.query(`SELECT * FROM roles WHERE ${LIVE} ORDER BY id`);
    return rows;
  }

  async findById(id: number, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(`SELECT * FROM roles WHERE id = $1 AND ${LIVE}`, [id]);
    return rows[0] ?? null;
  }

  async findByType(roleType: string, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(`SELECT * FROM roles WHERE role_type = $1 AND ${LIVE} ORDER BY id LIMIT 1`, [
      roleType,
    ]);
    return rows[0] ?? null;
  }

  async create(data: Row, db: Queryable = pool): Promise<Row> {
    const { rows } = await db.query(
      `INSERT INTO roles (name, role_type, activated, is_system, permissions, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
      [data.name, data.role_type ?? 'Admin', data.activated ?? true, data.is_system ?? false, data.permissions ?? [], data.by ?? 'system'],
    );
    return requireRow(rows, 'INSERT INTO roles');
  }

  async update(id: number, data: Row, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(
      `UPDATE roles SET
         name = COALESCE($2, name),
         activated = COALESCE($3, activated),
         permissions = COALESCE($4, permissions),
         role_type = COALESCE($5, role_type),
         updated_by = COALESCE($6, updated_by),
         updated_at = NOW()
       WHERE id = $1 AND ${LIVE} RETURNING *`,
      [id, data.name ?? null, data.activated ?? null, data.permissions ?? null, data.role_type ?? null, data.by ?? null],
    );
    return rows[0] ?? null;
  }

  async softDelete(id: number, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query(`UPDATE roles SET deleted_at = NOW() WHERE id = $1 AND ${LIVE}`, [id]);
    return (rowCount ?? 0) > 0;
  }
}
