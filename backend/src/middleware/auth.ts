import { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { roleService, tokenService } from '../services';
import { UserType } from '../types/auth.types';
import { bearerToken } from '../utils/request';
import { sendError } from '../utils/response';

const NO_TOKEN = ['กรุณาเข้าสู่ระบบ', 'Access denied. No token provided.'] as const;
const EXPIRED = ['หมดอายุการใช้งาน กรุณาเข้าสู่ระบบใหม่', 'Access token has expired.'] as const;
const INVALID = ['โทเค็นไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่', 'Invalid token.'] as const;

// The access token normally travels in the Authorization header; report downloads opened in a new
// tab (Office preview) carry it as ?token= instead.
export const verifyAuthToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = bearerToken(req.headers.authorization) ?? (typeof req.query.token === 'string' ? req.query.token : null);
  if (!token) {
    sendError(res, 401, NO_TOKEN[0], NO_TOKEN[1], 'no_token');
    return;
  }

  try {
    const user = await tokenService.authenticate(token);
    if (!user) {
      sendError(res, 401, INVALID[0], INVALID[1], 'token_invalid');
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    const name = (err as { name?: string }).name;
    if (name === 'TokenExpiredError') {
      sendError(res, 401, EXPIRED[0], EXPIRED[1], 'token_expired');
    } else if (name === 'JsonWebTokenError' || name === 'NotBeforeError') {
      sendError(res, 401, INVALID[0], INVALID[1], 'token_invalid');
    } else {
      next(err);
    }
  }
};

export const requireTypes =
  (...types: UserType[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, NO_TOKEN[0], NO_TOKEN[1], 'no_token');
      return;
    }
    if (!types.includes(req.user.type)) {
      sendError(res, 403, 'ไม่มีสิทธิ์เข้าถึงเมนูนี้', 'forbidden', 'forbidden');
      return;
    }
    next();
  };

export const requireOfficer = requireTypes('SuperAdmin', 'Admin', 'User');

// Permissions are read from the database on every request, so a role change takes effect at once.
// Only `User` accounts are limited by their role; Admin, SuperAdmin and Agency pass.
export const requirePermission =
  (...codes: string[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, 401, NO_TOKEN[0], NO_TOKEN[1], 'no_token');
        return;
      }
      if (req.user.type === 'User' && codes.length) {
        const granted = await roleService.permissionsOf(req.user.roleId);
        if (!codes.some((code) => granted.has(code))) {
          sendError(res, 403, 'ไม่มีสิทธิ์ดำเนินการนี้', 'forbidden', 'forbidden');
          return;
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };

export const rejectDemoWrites = (req: Request, res: Response, next: NextFunction): void => {
  if (config.demo.readOnly && req.user?.isDemo && req.method !== 'GET' && req.method !== 'HEAD') {
    sendError(res, 403, 'บัญชีสาธิตไม่สามารถแก้ไขข้อมูลได้', 'The demo account is read-only', 'read_only');
    return;
  }
  next();
};
