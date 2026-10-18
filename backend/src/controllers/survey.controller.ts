import { Request, Response } from 'express';
import { surveyService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuery } from '../utils/paging';
import { currentUser, paramId } from '../utils/request';
import { sendData } from '../utils/response';

const by = (req: Request): string => `user:${currentUser(req).userId}`;
const q = (req: Request): Record<string, string> => req.query as Record<string, string>;

export const list = asyncHandler(async (req: Request, res: Response) => sendData(res, await surveyService.list(q(req), listQuery(req))));
export const detail = asyncHandler(async (req: Request, res: Response) => sendData(res, await surveyService.detail(paramId(req))));
export const result = asyncHandler(async (req: Request, res: Response) => sendData(res, await surveyService.result(paramId(req))));
export const create = asyncHandler(async (req: Request, res: Response) => sendData(res, await surveyService.save(null, req.body ?? {}, by(req))));
export const update = asyncHandler(async (req: Request, res: Response) => sendData(res, await surveyService.save(paramId(req), req.body ?? {}, by(req))));
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await surveyService.remove(paramId(req));
  sendData(res, { success: true });
});
export const send = asyncHandler(async (req: Request, res: Response) => {
  const emails = Array.isArray(req.body?.emails) ? (req.body.emails as string[]) : [];
  sendData(res, await surveyService.send(paramId(req), emails));
});
export const byToken = asyncHandler(async (req: Request, res: Response) => sendData(res, await surveyService.byToken(String(req.params.token))));
export const submit = asyncHandler(async (req: Request, res: Response) => sendData(res, await surveyService.submit(req.body ?? {})));
