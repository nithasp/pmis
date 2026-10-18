import { Request, Response } from 'express';
import {
  changePasswordSchema,
  emailSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetWithTokenSchema,
  verifyEmailSchema,
  verifyPasswordSchema,
  verifyResetTokenSchema,
} from '../schemas/auth.schema';
import { authService, userService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { currentUser, requestSource } from '../utils/request';
import { sendData } from '../utils/response';
import { parse } from '../utils/validation';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(loginSchema, req.body);
  sendData(res, await authService.login(input.email, input.password, requestSource(req)));
});

export const demo = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await authService.demoLogin(requestSource(req)));
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(refreshSchema, req.body);
  sendData(res, await authService.refresh(input.refresh_token, requestSource(req)));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) await authService.logout(req.user.sessionId);
  sendData(res, { success: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await userService.profileOf(currentUser(req).userId));
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(emailSchema, req.body);
  sendData(res, await authService.forgotPassword(input.email));
});

export const verifyResetToken = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(verifyResetTokenSchema, req.body);
  sendData(res, await authService.verifyResetToken(input.password_reset_token));
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(resetWithTokenSchema, req.body);
  await authService.resetPasswordWithToken(input.password_reset_token, input.new_password);
  sendData(res, { success: true });
});

export const sendRegisterEmail = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(emailSchema, req.body);
  sendData(res, await authService.sendRegisterEmail(input.email));
});

export const verifyRegisterEmail = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(verifyEmailSchema, req.body);
  sendData(res, await authService.verifyRegisterToken(input.token));
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(registerSchema, req.body);
  sendData(res, await authService.register(input));
});

export const acceptTerm = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await userService.acceptTerm(currentUser(req).userId));
});

export const verifyPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(verifyPasswordSchema, req.body);
  await authService.verifyCurrentPassword(currentUser(req).userId, input.old_password);
  sendData(res, { valid: true });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(changePasswordSchema, req.body);
  await authService.changePassword(currentUser(req).userId, input.password);
  sendData(res, { success: true });
});
