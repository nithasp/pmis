import pool from '../database';
import { Queryable, Row } from '../types/database.types';
import { StoredFile } from '../types/file.types';
import { requireRow } from '../utils/rows';

export interface NewFileRow {
  fileName: string;
  storageKey: string;
  storageDriver: string;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  fileType: string | null;
  uploadedBy: number | null;
}

// Join tables that link a stored file to a record: (table, foreign key column, has file_type)
export const FILE_LINKS = {
  user: { table: 'user_files', fk: 'user_id', typed: true },
  vessel: { table: 'vessel_files', fk: 'vessel_id', typed: true },
  document: { table: 'document_files', fk: 'document_id', typed: true },
  documentBerth: { table: 'document_berth_files', fk: 'document_berth_id', typed: true },
  contract: { table: 'contract_files', fk: 'contract_id', typed: false },
  vesselImport: { table: 'vessel_import_files', fk: 'vessel_import_id', typed: false },
} as const;

export type FileLink = keyof typeof FILE_LINKS;

export class FileRepository {
  async create(data: NewFileRow, db: Queryable = pool): Promise<StoredFile> {
    const { rows } = await db.query(
      `INSERT INTO files (file_name, storage_key, storage_driver, url, mime_type, size_bytes, file_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [data.fileName, data.storageKey, data.storageDriver, data.url, data.mimeType, data.sizeBytes, data.fileType, data.uploadedBy],
    );
    return toFile(requireRow(rows, 'INSERT INTO files'));
  }

  async findById(id: number, db: Queryable = pool): Promise<StoredFile | null> {
    const { rows } = await db.query('SELECT * FROM files WHERE id = $1', [id]);
    return rows[0] ? toFile(rows[0]) : null;
  }

  async findMany(ids: number[], db: Queryable = pool): Promise<StoredFile[]> {
    if (!ids.length) return [];
    const { rows } = await db.query('SELECT * FROM files WHERE id = ANY($1)', [ids]);
    return rows.map(toFile);
  }

  async findByUrl(url: string, db: Queryable = pool): Promise<StoredFile | null> {
    const { rows } = await db.query('SELECT * FROM files WHERE url = $1 OR storage_key = $1 ORDER BY id DESC LIMIT 1', [url]);
    return rows[0] ? toFile(rows[0]) : null;
  }

  async listLinked(link: FileLink, entityId: number, db: Queryable = pool): Promise<(StoredFile & { linkId: number; linkType: string })[]> {
    const { table, fk, typed } = FILE_LINKS[link];
    const { rows } = await db.query(
      `SELECT f.*, l.id AS link_id, ${typed ? 'l.file_type AS link_type' : `'' AS link_type`} FROM ${table} l JOIN files f ON f.id = l.file_id
       WHERE l.${fk} = $1 ORDER BY l.id`,
      [entityId],
    );
    return rows.map((r) => ({ ...toFile(r), linkId: r.link_id as number, linkType: (r.link_type as string) ?? '' }));
  }

  async listLinkedMany(link: FileLink, entityIds: number[], db: Queryable = pool): Promise<Map<number, (StoredFile & { linkType: string })[]>> {
    const out = new Map<number, (StoredFile & { linkType: string })[]>();
    if (!entityIds.length) return out;
    const { table, fk, typed } = FILE_LINKS[link];
    const { rows } = await db.query(
      `SELECT f.*, l.${fk} AS entity_id, ${typed ? 'l.file_type AS link_type' : `'' AS link_type`} FROM ${table} l JOIN files f ON f.id = l.file_id
       WHERE l.${fk} = ANY($1) ORDER BY l.id`,
      [entityIds],
    );
    for (const r of rows) {
      const list = out.get(r.entity_id as number) ?? [];
      list.push({ ...toFile(r), linkType: (r.link_type as string) ?? '' });
      out.set(r.entity_id as number, list);
    }
    return out;
  }

  async link(link: FileLink, entityId: number, fileId: number, fileType: string, db: Queryable = pool): Promise<number> {
    const { table, fk, typed } = FILE_LINKS[link];
    const { rows } = await db.query(
      typed
        ? `INSERT INTO ${table} (${fk}, file_id, file_type) VALUES ($1, $2, $3) RETURNING id`
        : `INSERT INTO ${table} (${fk}, file_id) VALUES ($1, $2) RETURNING id`,
      typed ? [entityId, fileId, fileType] : [entityId, fileId],
    );
    return rows[0]?.id as number;
  }

  async unlinkAll(link: FileLink, entityId: number, db: Queryable = pool): Promise<void> {
    const { table, fk } = FILE_LINKS[link];
    await db.query(`DELETE FROM ${table} WHERE ${fk} = $1`, [entityId]);
  }

  async unlinkFile(link: FileLink, entityId: number, fileId: number, db: Queryable = pool): Promise<boolean> {
    const { table, fk } = FILE_LINKS[link];
    const { rowCount } = await db.query(`DELETE FROM ${table} WHERE ${fk} = $1 AND (file_id = $2 OR id = $2)`, [entityId, fileId]);
    return (rowCount ?? 0) > 0;
  }
}

export function toFile(row: Row): StoredFile {
  return {
    id: row.id as number,
    fileName: row.file_name as string,
    storageKey: row.storage_key as string,
    storageDriver: row.storage_driver as string,
    url: (row.url as string | null) ?? null,
    mimeType: (row.mime_type as string | null) ?? null,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    fileType: (row.file_type as string | null) ?? null,
    uploadedBy: (row.uploaded_by as number | null) ?? null,
    createdAt: row.created_at as Date,
  };
}
