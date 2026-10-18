import { Response } from 'express';
import { ErrorCode } from '../types/error.types';

// The frontend reads every success body as `{ data }` and every failure as
// `{ error: { message, translation } }` (see frontend/utils/function.js).
export function sendData<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ data });
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  translation: string,
  code: ErrorCode,
): void {
  res.status(statusCode).json({ error: { message, translation, code } });
}
