import { NextFunction, Request, Response } from 'express';
import pool from '../database';
import { logger } from '../logger';
import { requestSource } from '../utils/request';
import { clip } from '../utils/text';

const ACTIONS: Record<string, string> = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };

export const recordActivity = (req: Request, res: Response, next: NextFunction): void => {
  res.on('finish', () => {
    const action = ACTIONS[req.method];
    if (!action || !req.user) return;
    const source = requestSource(req);
    pool
      .query(
        `INSERT INTO activity_logs (user_id, action, method, path, status_code, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.userId, action, req.method, clip(req.originalUrl.split('?')[0], 500), res.statusCode, clip(source.ipAddress, 45), clip(source.userAgent, 255)],
      )
      .catch((err: unknown) => logger.warn({ err }, 'could not record activity'));
  });
  next();
};

export async function purgeActivityLogs(retentionDays: number): Promise<number> {
  const { rowCount } = await pool.query(`DELETE FROM activity_logs WHERE created_at < NOW() - ($1 || ' days')::interval`, [
    String(retentionDays),
  ]);
  return rowCount ?? 0;
}
