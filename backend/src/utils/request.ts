import { Request } from 'express';
import { AuthUser, SessionSource } from '../types/auth.types';
import { AppError } from './errors';

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new AppError('กรุณาเข้าสู่ระบบ', 401, 'no_token', 'Access denied. No token provided.');
  return req.user;
}

export function currentUserId(req: Request): number {
  return currentUser(req).userId;
}

export function requestSource(req: Request): SessionSource {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

export function bearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export const paramId = (req: Request, key = 'id'): number => {
  const value = Number(req.params[key]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError(`รหัส ${key} ไม่ถูกต้อง`, 400, 'invalid_request', `${key} must be a positive integer`);
  }
  return value;
};
