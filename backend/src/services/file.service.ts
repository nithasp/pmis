import crypto from 'crypto';
import path from 'path';
import { logger } from '../logger';
import { FileLink, FileRepository } from '../repositories/file.repository';
import { storage } from '../storage';
import { UploadFileRef } from '../types/auth.types';
import { Queryable, Row } from '../types/database.types';
import { StoredFile } from '../types/file.types';
import { AppError } from '../utils/errors';
import { idOrNull, num, str } from '../utils/rows';

const SAFE_NAME = /[^a-zA-Z0-9._฀-๿-]+/g;

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: number | null;
  folder?: string;
  fileType?: string;
}

export const ALLOWED_UPLOAD_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'application/xml',
  'text/xml',
]);

export function createFileService(files: FileRepository) {
  async function urlOf(file: StoredFile): Promise<string> {
    try {
      return await storage.publicUrl(file.storageKey, file.url);
    } catch (err) {
      logger.warn({ err, fileId: file.id }, 'could not resolve file url');
      return file.url ?? '';
    }
  }

  // The shape every frontend upload component reads (IUploadFile / IFileUpload)
  async function toRef(file: StoredFile, fileType?: string | null): Promise<UploadFileRef> {
    const url = await urlOf(file);
    const type = fileType ?? file.fileType ?? '';
    return {
      id: file.id,
      fileName: file.fileName,
      filePath: url,
      preview: url,
      extension: file.mimeType ?? path.extname(file.fileName).replace('.', ''),
      size: file.sizeBytes ?? 0,
      fileType: type,
      document_file_type: type,
    };
  }

  return {
    urlOf,
    toRef,

    async upload(input: UploadInput): Promise<UploadFileRef> {
      const ext = path.extname(input.originalName).toLowerCase().slice(0, 10);
      const base =
        path.basename(input.originalName, path.extname(input.originalName)).replace(SAFE_NAME, '-').slice(0, 60) || 'file';
      const key = `${input.folder ?? 'files'}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${base}${ext}`;
      const uploaded = await storage.upload(key, input.buffer, input.mimeType);
      const stored = await files.create({
        fileName: input.originalName,
        storageKey: uploaded.key,
        storageDriver: storage.name,
        url: uploaded.url,
        mimeType: input.mimeType,
        sizeBytes: input.size,
        fileType: input.fileType ?? null,
        uploadedBy: input.uploadedBy,
      });
      return toRef(stored, input.fileType);
    },

    find(id: number): Promise<StoredFile | null> {
      return files.findById(id);
    },

    async refs(link: FileLink, entityId: number, db?: Queryable): Promise<UploadFileRef[]> {
      const list = await files.listLinked(link, entityId, db);
      return Promise.all(list.map((f) => toRef(f, f.linkType || f.fileType)));
    },

    async refsMany(link: FileLink, entityIds: number[], db?: Queryable): Promise<Map<number, UploadFileRef[]>> {
      const map = await files.listLinkedMany(link, entityIds, db);
      const out = new Map<number, UploadFileRef[]>();
      for (const [id, list] of map) out.set(id, await Promise.all(list.map((f) => toRef(f, f.linkType || f.fileType))));
      return out;
    },

    // Resolves the file a frontend payload refers to, whichever of its shapes it uses:
    // { id } / { fileId } / { file_id } / { filePath } (the URL returned by the upload call).
    async resolveId(item: Row | null | undefined, db?: Queryable): Promise<number | null> {
      if (!item || typeof item !== 'object') return null;
      const direct = idOrNull(item.id) ?? idOrNull(item.fileId) ?? idOrNull(item.file_id);
      if (direct && (await files.findById(direct, db))) return direct;
      const url = str(item.filePath ?? item.preview ?? item.url);
      if (url) {
        const found = await files.findByUrl(url, db);
        if (found) return found.id;
      }
      return null;
    },

    // Replaces the links of a record with the given upload list (ids or paths), keeping the order
    async syncLinks(link: FileLink, entityId: number, items: Row[] | undefined, db?: Queryable): Promise<void> {
      if (!Array.isArray(items)) return;
      await files.unlinkAll(link, entityId, db);
      for (const item of items) {
        if (item?.is_delete || item?.isDelete) continue;
        const fileId = await this.resolveId(item, db);
        if (!fileId) continue;
        await files.link(link, entityId, fileId, str(item.fileType ?? item.document_file_type ?? item.type ?? ''), db);
      }
    },

    async addLink(link: FileLink, entityId: number, fileId: number, fileType: string, db?: Queryable): Promise<void> {
      await files.link(link, entityId, fileId, fileType, db);
    },

    async removeLink(link: FileLink, entityId: number, fileId: number, db?: Queryable): Promise<void> {
      if (!(await files.unlinkFile(link, entityId, fileId, db))) throw new AppError('ไม่พบไฟล์', 404, 'not_found', 'file not found');
    },

    async contents(id: number): Promise<{ file: StoredFile; buffer: Buffer }> {
      const file = await files.findById(id);
      if (!file) throw new AppError('ไม่พบไฟล์ที่อัปโหลด', 404, 'not_found', 'file not found');
      return { file, buffer: await storage.download(file.storageKey) };
    },

    sizeOf(item: Row): number {
      return num(item.size);
    },
  };
}

export type FileService = ReturnType<typeof createFileService>;
