import { Request, Response } from 'express';
import { contractService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuery } from '../utils/paging';
import { currentUser, paramId } from '../utils/request';
import { sendData } from '../utils/response';

const by = (req: Request): string => `user:${currentUser(req).userId}`;
const q = (req: Request): Record<string, string> => req.query as Record<string, string>;

export const list = asyncHandler(async (req: Request, res: Response) => sendData(res, await contractService.list(q(req), listQuery(req))));
export const detail = asyncHandler(async (req: Request, res: Response) => sendData(res, await contractService.detail(paramId(req))));
export const create = asyncHandler(async (req: Request, res: Response) => sendData(res, await contractService.save(null, req.body ?? {}, by(req))));
export const update = asyncHandler(async (req: Request, res: Response) => sendData(res, await contractService.save(paramId(req), req.body ?? {}, by(req))));
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await contractService.remove(paramId(req));
  sendData(res, { success: true });
});
export const rates = asyncHandler(async (req: Request, res: Response) => {
  const query = q(req);
  sendData(res, contractService.rates({ start: query.start, end: query.end, initialRate: query.initialRate, annualIncreaseRate: query.annualIncreaseRate, rateChangeCycle: query.rateChangeCycle, rateChangeStartYear: query.rateChangeStartYear }));
});
