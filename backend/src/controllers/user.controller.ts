import { Request, Response } from 'express';
import { agencySchema, emailSchema, enabledSchema, officerSchema, updateProfileSchema, userAddressSchema } from '../schemas/auth.schema';
import { userAddressRepository, userService } from '../services';
import { AppError, notFound } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuery } from '../utils/paging';
import { currentUser, paramId } from '../utils/request';
import { sendData } from '../utils/response';
import { parse } from '../utils/validation';
import { idOrNull, str } from '../utils/rows';

const actor = (req: Request): string => `user:${currentUser(req).userId}`;

const assertOwnOrOfficer = (req: Request, userId: number): void => {
  const user = currentUser(req);
  if (user.type === 'Agency' && user.userId !== userId) {
    throw new AppError('ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ใช้งานนี้', 403, 'forbidden', 'forbidden');
  }
};

// ---- settings (own profile) -----------------------------------------------------------------
export const detail = asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req);
  assertOwnOrOfficer(req, id);
  sendData(res, await userService.detail(id));
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(updateProfileSchema, req.body);
  const user = currentUser(req);
  sendData(res, await userService.updateProfile(user.userId, input, actor(req)));
});

export const sendChangeEmailCode = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(emailSchema, req.body);
  const link = await userService.sendEmailChangeCode(currentUser(req).userId, input.email);
  sendData(res, { email: input.email, ...(link ? { hint: link } : {}) });
});

export const addressList = asyncHandler(async (req: Request, res: Response) => {
  const userId = paramId(req, 'userId');
  assertOwnOrOfficer(req, userId);
  sendData(res, await userAddressRepository.listByUser(userId));
});

export const addressDetail = asyncHandler(async (req: Request, res: Response) => {
  const address = await userAddressRepository.findById(paramId(req));
  if (!address) throw notFound('ที่อยู่', 'address not found');
  assertOwnOrOfficer(req, address.userId as number);
  sendData(res, address);
});

export const addressCreate = asyncHandler(async (req: Request, res: Response) => {
  const userId = paramId(req, 'userId');
  assertOwnOrOfficer(req, userId);
  const input = parse(userAddressSchema, req.body);
  const id = await userAddressRepository.create(userId, input);
  sendData(res, await userAddressRepository.findById(id));
});

export const addressUpdate = asyncHandler(async (req: Request, res: Response) => {
  const userId = paramId(req, 'userId');
  assertOwnOrOfficer(req, userId);
  const input = parse(userAddressSchema, req.body);
  const id = idOrNull(input.id);
  if (!id) throw new AppError('ไม่พบรหัสที่อยู่', 400, 'invalid_request', 'address id is required');
  const existing = await userAddressRepository.findById(id);
  if (!existing || existing.userId !== userId) throw notFound('ที่อยู่', 'address not found');
  await userAddressRepository.update(id, input);
  sendData(res, await userAddressRepository.findById(id));
});

export const addressDelete = asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req, 'addressId');
  const existing = await userAddressRepository.findById(id);
  if (!existing) throw notFound('ที่อยู่', 'address not found');
  assertOwnOrOfficer(req, existing.userId as number);
  await userAddressRepository.softDelete(id);
  sendData(res, { success: true });
});

// ---- admin: officers ------------------------------------------------------------------------
export const officerList = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  sendData(res, await userService.listOfficers({ enabled: str(q.enabled), roleId: idOrNull(q.roleId) ?? undefined }, listQuery(req)));
});

export const officerDetail = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await userService.detail(paramId(req)));
});

export const officerCreate = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await userService.createOfficer(parse(officerSchema, req.body), actor(req)));
});

export const officerUpdate = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await userService.updateOfficer(paramId(req), parse(officerSchema, req.body), actor(req)));
});

export const officerStatus = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(enabledSchema, req.body);
  sendData(res, await userService.setEnabled(paramId(req), input.enabled, actor(req)));
});

export const officerDelete = asyncHandler(async (req: Request, res: Response) => {
  await userService.remove(paramId(req), currentUser(req).userId, actor(req));
  sendData(res, { success: true });
});

// ---- admin: vessel agencies -----------------------------------------------------------------
export const agencyList = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  sendData(
    res,
    await userService.listAgencies(
      { status: str(q.status), personType: str(q.personType), begin: q.begin, end: q.end },
      listQuery(req),
    ),
  );
});

export const agencyDetail = asyncHandler(async (req: Request, res: Response) => {
  const id = paramId(req);
  assertOwnOrOfficer(req, id);
  sendData(res, await userService.detail(id));
});

export const agencyCreate = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await userService.createAgency(parse(agencySchema, req.body), actor(req)));
});

export const agencyUpdate = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await userService.updateAgency(paramId(req), parse(agencySchema, req.body), actor(req)));
});

export const agencyDelete = asyncHandler(async (req: Request, res: Response) => {
  await userService.remove(paramId(req), currentUser(req).userId, actor(req));
  sendData(res, { success: true });
});

export const agencyApprove = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await userService.approveAgency(paramId(req), actor(req)));
});
