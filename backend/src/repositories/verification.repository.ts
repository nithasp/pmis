import pool from '../database';
import { Queryable, Row } from '../types/database.types';
import { requireRow } from '../utils/rows';

export type VerificationKind = 'register' | 'password_reset' | 'email_change';

export class VerificationRepository {
  async create(
    data: { kind: VerificationKind; email: string; userId?: number | null; token: string; code?: string | null; payload?: Row; expiresAt: Date },
    db: Queryable = pool,
  ): Promise<Row> {
    const { rows } = await db.query(
      `INSERT INTO verification_tokens (kind, email, user_id, token, code, payload, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.kind, data.email, data.userId ?? null, data.token, data.code ?? null, JSON.stringify(data.payload ?? {}), data.expiresAt],
    );
    return requireRow(rows, 'INSERT INTO verification_tokens');
  }

  async findActive(kind: VerificationKind, token: string, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(
      `SELECT * FROM verification_tokens WHERE kind = $1 AND token = $2 AND used_at IS NULL AND expires_at > NOW()`,
      [kind, token],
    );
    return rows[0] ?? null;
  }

  async findActiveByCode(kind: VerificationKind, userId: number, code: string, db: Queryable = pool): Promise<Row | null> {
    const { rows } = await db.query(
      `SELECT * FROM verification_tokens WHERE kind = $1 AND user_id = $2 AND code = $3 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [kind, userId, code],
    );
    return rows[0] ?? null;
  }

  async markUsed(id: number, db: Queryable = pool): Promise<void> {
    await db.query('UPDATE verification_tokens SET used_at = NOW() WHERE id = $1', [id]);
  }

  async invalidate(kind: VerificationKind, email: string, db: Queryable = pool): Promise<void> {
    await db.query(
      `UPDATE verification_tokens SET used_at = NOW() WHERE kind = $1 AND LOWER(email) = LOWER($2) AND used_at IS NULL`,
      [kind, email],
    );
  }
}
