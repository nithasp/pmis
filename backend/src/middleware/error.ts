import { NextFunction, Request, Response } from 'express';
import { PostgresError } from '../types/database.types';
import { ErrorCode, HandledError } from '../types/error.types';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

function fromPostgres(err: PostgresError): HandledError | null {
  switch (err.code) {
    case '23505':
      return {
        statusCode: 409,
        code: 'conflict',
        message: err.constraint?.includes('email')
          ? 'อีเมลนี้มีผู้ใช้งานแล้ว'
          : err.constraint?.includes('contract_no')
            ? 'เลขที่สัญญานี้มีแล้วในระบบ'
            : 'ข้อมูลนี้มีอยู่ในระบบแล้ว',
        translation: err.constraint?.includes('email') ? 'email_already_exist' : 'duplicate',
      };
    case '23503':
      if (err.detail?.includes('is still referenced')) {
        return {
          statusCode: 409,
          code: 'conflict',
          message: 'ข้อมูลนี้ถูกใช้งานอยู่ ไม่สามารถลบได้',
          translation: 'This record is used elsewhere and cannot be deleted',
        };
      }
      return {
        statusCode: 400,
        code: 'invalid_request',
        message: 'อ้างอิงข้อมูลที่ไม่มีอยู่ในระบบ',
        translation: 'A referenced record does not exist',
      };
    case '23514':
      return { statusCode: 400, code: 'invalid_request', message: 'ค่าที่ส่งมาไม่ถูกต้อง', translation: 'A value is not allowed here' };
    case '22001':
      return { statusCode: 400, code: 'invalid_request', message: 'ข้อมูลยาวเกินกำหนด', translation: 'A value is too long' };
    case '22003':
      return { statusCode: 400, code: 'invalid_request', message: 'ตัวเลขอยู่นอกช่วงที่กำหนด', translation: 'A number is out of range' };
    case '22P02':
    case '22007':
    case '22008':
      return { statusCode: 400, code: 'invalid_request', message: 'รูปแบบข้อมูลไม่ถูกต้อง', translation: 'A value has an invalid format' };
    case '40001':
    case '40P01':
      return { statusCode: 409, code: 'conflict', message: 'เกิดการชนกันของข้อมูล กรุณาลองใหม่อีกครั้ง', translation: 'The request collided with another one, please try again' };
    default:
      return null;
  }
}

export const notFoundMiddleware = (req: Request, res: Response): void => {
  sendError(res, 404, `ไม่พบเส้นทาง ${req.method} ${req.path}`, `Route ${req.method} ${req.path} not found`, 'not_found');
};

export const errorMiddleware = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const known = err as AppError & { status?: number; type?: string; code?: unknown };
  const db = fromPostgres(err as PostgresError);
  const statusCode = db?.statusCode ?? (err instanceof AppError ? err.statusCode : known.status) ?? 500;

  if ((known.code as unknown) === 'LIMIT_FILE_SIZE') {
    sendError(res, 413, 'ไฟล์มีขนาดใหญ่เกินกำหนด', 'The file is too large', 'invalid_request');
    return;
  }

  if (statusCode >= 500) {
    req.log?.error({ err }, 'request failed');
    sendError(res, statusCode, 'เกิดข้อผิดพลาดภายในระบบ', 'Internal Server Error', 'internal_error');
    return;
  }

  if (db) {
    sendError(res, db.statusCode, db.message, db.translation, db.code);
    return;
  }

  const bodyParserMessage =
    known.type === 'entity.parse.failed'
      ? ['รูปแบบ JSON ไม่ถูกต้อง', 'Request body must be valid JSON']
      : known.type === 'entity.too.large'
        ? ['ข้อมูลที่ส่งมามีขนาดใหญ่เกินกำหนด', 'Request body is too large']
        : null;

  const code: ErrorCode = bodyParserMessage ? 'invalid_request' : err instanceof AppError ? err.code : 'bad_request';

  sendError(
    res,
    statusCode,
    bodyParserMessage?.[0] ?? (err.message || 'คำขอไม่ถูกต้อง'),
    bodyParserMessage?.[1] ?? (err instanceof AppError ? err.translation || err.message : err.message || 'Request failed'),
    code,
  );
};
