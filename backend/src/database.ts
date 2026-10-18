import { Pool, types } from 'pg';
import { config } from './config';
import { logger } from './logger';
import { Tx } from './types/database.types';

const OID_INT8 = 20;
const OID_NUMERIC = 1700;
const OID_DATE = 1082;

// DATE columns come back as 'YYYY-MM-DD' strings so a calendar date never shifts with the time
// zone; counts and money come back as numbers instead of strings.
types.setTypeParser(OID_DATE, (value) => value);
types.setTypeParser(OID_INT8, (value) => Number(value));
types.setTypeParser(OID_NUMERIC, (value) => Number(value));

const { url, host, port, name, user, password, sslMode, sslCa } = config.database;

const ssl =
  sslMode === 'off'
    ? false
    : sslMode === 'no-verify'
      ? { rejectUnauthorized: false }
      : { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) };

const pool = new Pool(
  url ? { connectionString: url, ssl } : { host, port, database: name, user, password, ssl },
);

pool.on('error', (err) => logger.error({ err }, 'idle database client error'));

export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN');
    const result = await fn(tx);
    await tx.query('COMMIT');
    return result;
  } catch (err) {
    await tx
      .query('ROLLBACK')
      .catch((rollbackErr: unknown) => logger.error({ err: rollbackErr }, 'rollback failed'));
    throw err;
  } finally {
    tx.release();
  }
}

export async function checkDatabase(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    logger.error({ err }, 'database health check failed');
    return false;
  }
}

export default pool;
