import { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { sendError } from '../utils/response';

const WINDOW_MS = 15 * 60 * 1000;

const limiter = (limit: number, message: string, translation: string): RequestHandler =>
  rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => sendError(res, 429, message, translation, 'rate_limited'),
  });

export const authLimiter = limiter(
  config.authRateLimit,
  'พยายามมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
  'Too many attempts. Please wait a moment and try again.',
);

export const apiLimiter = limiter(
  config.apiRateLimit,
  'คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
  'Too many requests. Please wait a moment and try again.',
);
