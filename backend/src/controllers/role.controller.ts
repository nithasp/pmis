import { Request, Response } from 'express';
import { enabledSchema, roleSchema } from '../schemas/auth.schema';
import { roleService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuery } from '../utils/paging';
import { currentUser, paramId } from '../utils/request';
import { sendData } from '../utils/response';
import { parse } from '../utils/validation';

const actor = (req: Request): string => `user:${currentUser(req).userId}`;

export const list = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await roleService.list(listQuery(req)));
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await roleService.detail(paramId(req)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await roleService.create(parse(roleSchema, req.body), actor(req)));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await roleService.update(paramId(req), parse(roleSchema, req.body), actor(req)));
});

export const status = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(enabledSchema, req.body);
  sendData(res, await roleService.setEnabled(paramId(req), input.enabled, actor(req)));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const newRoleId = req.params.newRoleId ? paramId(req, 'newRoleId') : null;
  await roleService.remove(paramId(req), newRoleId);
  sendData(res, { success: true });
});
