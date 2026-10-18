import { Request, Response } from 'express';
import { amountSchema, noteSchema } from '../schemas/auth.schema';
import { vesselImportService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuery } from '../utils/paging';
import { currentUser, paramId } from '../utils/request';
import { sendData } from '../utils/response';
import { str } from '../utils/rows';
import { parse } from '../utils/validation';

const by = (req: Request): string => `user:${currentUser(req).userId}`;
const q = (req: Request): Record<string, string> => req.query as Record<string, string>;

export const list = asyncHandler(async (req: Request, res: Response) => sendData(res, await vesselImportService.list(currentUser(req), q(req), listQuery(req))));
export const listSend = asyncHandler(async (req: Request, res: Response) => sendData(res, await vesselImportService.listSend(q(req), listQuery(req))));
export const detail = asyncHandler(async (req: Request, res: Response) => sendData(res, await vesselImportService.detail(paramId(req), currentUser(req))));
export const mapDetail = asyncHandler(async (req: Request, res: Response) => sendData(res, await vesselImportService.mapDetail(paramId(req))));
export const create = asyncHandler(async (req: Request, res: Response) => sendData(res, await vesselImportService.save(null, currentUser(req), req.body ?? {}, by(req))));
export const update = asyncHandler(async (req: Request, res: Response) => sendData(res, await vesselImportService.save(paramId(req), currentUser(req), req.body ?? {}, by(req))));
export const sendFile = asyncHandler(async (req: Request, res: Response) => sendData(res, await vesselImportService.sendFromFile(paramId(req), currentUser(req), by(req))));
export const requestEdit = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(noteSchema, req.body);
  sendData(res, await vesselImportService.requestEdit(paramId(req), currentUser(req), str(input.note || input.rejectNote), by(req)));
});
export const sendBack = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(noteSchema, req.body);
  sendData(res, await vesselImportService.sendBack(paramId(req), str(input.note || input.rejectNote), by(req)));
});
export const map = asyncHandler(async (req: Request, res: Response) => sendData(res, await vesselImportService.map(paramId(req), paramId(req, 'logBookId'), by(req))));
export const approve = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(amountSchema, req.body ?? {});
  sendData(res, await vesselImportService.approve(paramId(req), currentUser(req), input.grossTonnage, by(req)));
});
export const approveEdit = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(amountSchema, req.body ?? {});
  sendData(res, await vesselImportService.approveEdit(paramId(req), String(req.params.type) === 'true', input.grossTonnage, by(req)));
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await vesselImportService.remove(paramId(req), currentUser(req));
  sendData(res, { success: true });
});
