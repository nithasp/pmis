import { Request, Response } from 'express';
import { aisService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuery } from '../utils/paging';
import { sendData } from '../utils/response';

export const activity = asyncHandler(async (req: Request, res: Response) => sendData(res, await aisService.activity(listQuery(req))));
export const map = asyncHandler(async (_req: Request, res: Response) => sendData(res, await aisService.map()));
export const logs = asyncHandler(async (req: Request, res: Response) => sendData(res, await aisService.logs(req.query as Record<string, string>, listQuery(req))));
