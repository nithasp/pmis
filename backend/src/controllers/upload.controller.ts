import { Request, Response } from 'express';
import { ALLOWED_UPLOAD_TYPES, UploadInput } from '../services/file.service';
import { documentService, fileService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { paramId } from '../utils/request';
import { sendData } from '../utils/response';
import { str } from '../utils/rows';

function readUpload(req: Request, folder: string): UploadInput {
  if (!req.file) throw new AppError('กรุณาเลือกไฟล์', 400, 'invalid_request', 'file is required');
  if (!ALLOWED_UPLOAD_TYPES.has(req.file.mimetype)) {
    throw new AppError('รองรับเฉพาะไฟล์ .pdf, .docx, .xlsx และรูปภาพ', 400, 'invalid_request', 'unsupported file type');
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  return {
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user?.userId ?? null,
    folder,
    fileType: str(body.type ?? body.fileType),
  };
}

const uploader = (folder: string) =>
  asyncHandler(async (req: Request, res: Response) => {
    const ref = await fileService.upload(readUpload(req, folder));
    sendData(res, { ...ref, file_id: ref.id, fileId: ref.id });
  });

export const register = uploader('register');
export const contract = uploader('contracts');
export const masterData = uploader('master-data');
export const vessel = uploader('vessels');
export const document = uploader('documents');

export const documentBerth = asyncHandler(async (req: Request, res: Response) => {
  const documentId = paramId(req);
  const berthId = paramId(req, 'berthId');
  const input = readUpload(req, 'documents');
  const ref = await documentService.uploadBerthFile(documentId, berthId, input, req.user!);
  sendData(res, { ...ref, file_id: ref.id, fileId: ref.id });
});

export const deleteDocumentBerthFile = asyncHandler(async (req: Request, res: Response) => {
  await documentService.deleteBerthFile(paramId(req), paramId(req, 'berthId'), paramId(req, 'fileId'), req.user!);
  sendData(res, { success: true });
});
