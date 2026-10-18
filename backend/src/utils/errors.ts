import { ErrorCode } from '../types/error.types';

// `message` is shown to Thai users, `translation` to English users (or used as an i18n key by the
// frontend, e.g. "email_already_exist", "duplicate").
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: ErrorCode = 'bad_request',
    public translation: string = '',
  ) {
    super(message);
  }
}

export const notFound = (what = 'ข้อมูล', translation = 'not found'): AppError =>
  new AppError(`ไม่พบ${what}`, 404, 'not_found', translation);

export const forbidden = (message = 'ไม่มีสิทธิ์ดำเนินการนี้', translation = 'forbidden'): AppError =>
  new AppError(message, 403, 'forbidden', translation);

export const badRequest = (message: string, translation = 'invalid request'): AppError =>
  new AppError(message, 400, 'invalid_request', translation);

export const conflict = (message: string, translation = 'duplicate'): AppError =>
  new AppError(message, 409, 'conflict', translation);
