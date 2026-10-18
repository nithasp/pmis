import crypto from 'crypto';
import pool from '../database';
import { SessionSource } from '../types/auth.types';
import { Queryable } from '../types/database.types';
import { clip } from '../utils/text';

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export interface StoredRefreshToken {
  id: number;
  userId: number;
  familyId: string;
  isDemo: boolean;
  expiresAt: Date;
  usedAt: Date | null;
}

export class RefreshTokenRepository {
  async create(
    userId: number,
    expiresInMs: number,
    familyId: string,
    isDemo: boolean,
    source: SessionSource,
    db: Queryable = pool,
  ): Promise<string> {
    const token = crypto.randomBytes(40).toString('hex');
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, is_demo, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        hashToken(token),
        familyId,
        isDemo,
        clip(source.ipAddress, 45),
        clip(source.userAgent, 255),
        new Date(Date.now() + expiresInMs),
      ],
    );
    return token;
  }

  // One conditional UPDATE, so when two requests race with the same token only one gets the row
  async consume(token: string, db: Queryable = pool): Promise<StoredRefreshToken | null> {
    const { rows } = await db.query(
      `UPDATE refresh_tokens SET used_at = NOW()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING *`,
      [hashToken(token)],
    );
    return rows[0] ? toRefreshToken(rows[0]) : null;
  }

  async findUsed(token: string, db: Queryable = pool): Promise<StoredRefreshToken | null> {
    const { rows } = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND used_at IS NOT NULL',
      [hashToken(token)],
    );
    return rows[0] ? toRefreshToken(rows[0]) : null;
  }

  async familyAlive(familyId: string, db: Queryable = pool): Promise<boolean> {
    const { rows } = await db.query(
      'SELECT 1 FROM refresh_tokens WHERE family_id = $1 AND expires_at > NOW() LIMIT 1',
      [familyId],
    );
    return rows.length > 0;
  }

  async deleteFamily(familyId: string, db: Queryable = pool): Promise<void> {
    await db.query('DELETE FROM refresh_tokens WHERE family_id = $1', [familyId]);
  }

  async deleteAllForUser(userId: number, db: Queryable = pool): Promise<void> {
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  }

  async deleteExpired(db: Queryable = pool): Promise<number> {
    const { rowCount } = await db.query('DELETE FROM refresh_tokens WHERE expires_at <= NOW()');
    return rowCount ?? 0;
  }
}

function toRefreshToken(row: Record<string, unknown>): StoredRefreshToken {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    familyId: row.family_id as string,
    isDemo: row.is_demo as boolean,
    expiresAt: row.expires_at as Date,
    usedAt: (row.used_at as Date | null) ?? null,
  };
}
