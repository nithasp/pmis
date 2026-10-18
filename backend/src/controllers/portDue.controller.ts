import { Request, Response } from 'express';
import { noteSchema } from '../schemas/auth.schema';
import { portDueService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuery } from '../utils/paging';
import { currentUser, paramId } from '../utils/request';
import { sendData } from '../utils/response';
import { str } from '../utils/rows';
import { parse } from '../utils/validation';

const by = (req: Request): string => `user:${currentUser(req).userId}`;
const q = (req: Request): Record<string, string> => req.query as Record<string, string>;

export const pendingList = asyncHandler(async (req: Request, res: Response) => sendData(res, await portDueService.pendingList(q(req), listQuery(req))));
export const pendingDetail = asyncHandler(async (req: Request, res: Response) => sendData(res, await portDueService.pendingDetail(paramId(req))));
export const list = asyncHandler(async (req: Request, res: Response) => sendData(res, await portDueService.list(q(req), listQuery(req))));
export const detail = asyncHandler(async (req: Request, res: Response) => sendData(res, await portDueService.detail(paramId(req))));
export const create = asyncHandler(async (req: Request, res: Response) => sendData(res, await portDueService.create(req.body ?? {}, by(req))));
export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(noteSchema, req.body);
  sendData(res, await portDueService.cancel(paramId(req), str(input.note || input.rejectNote), by(req)));
});
