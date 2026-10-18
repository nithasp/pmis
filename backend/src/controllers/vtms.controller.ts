import { Request, Response } from 'express';
import { vtmsService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuery } from '../utils/paging';
import { currentUser, paramId } from '../utils/request';
import { sendData } from '../utils/response';

const by = (req: Request): string => `user:${currentUser(req).userId}`;
const q = (req: Request): Record<string, string> => req.query as Record<string, string>;

export const summary = asyncHandler(async (_req: Request, res: Response) => sendData(res, await vtmsService.summary()));
export const documents = asyncHandler(async (req: Request, res: Response) => sendData(res, await vtmsService.documents(q(req), listQuery(req))));

export const logBookList = asyncHandler(async (req: Request, res: Response) => sendData(res, await vtmsService.listLogBooks(q(req), listQuery(req))));
export const logBookDetail = asyncHandler(async (req: Request, res: Response) => sendData(res, await vtmsService.logBookDetail(paramId(req))));
export const logBookOfDocument = asyncHandler(async (req: Request, res: Response) => sendData(res, await vtmsService.logBookOfDocument(paramId(req, 'documentId'))));
export const documentBerthLog = asyncHandler(async (req: Request, res: Response) => sendData(res, await vtmsService.documentBerthLog(paramId(req))));
export const logBookCreate = asyncHandler(async (req: Request, res: Response) => sendData(res, await vtmsService.saveLogBook(null, currentUser(req), req.body ?? {}, by(req))));
export const logBookUpdate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await vtmsService.saveLogBook(paramId(req), currentUser(req), req.body ?? {}, by(req))),
);
export const logBookDelete = asyncHandler(async (req: Request, res: Response) => {
  await vtmsService.deleteLogBook(paramId(req));
  sendData(res, { success: true });
});

export const anchorList = asyncHandler(async (req: Request, res: Response) => sendData(res, await vtmsService.listAnchors(q(req), listQuery(req))));
export const anchorDetail = asyncHandler(async (req: Request, res: Response) => sendData(res, await vtmsService.anchorDetail(paramId(req))));
export const anchorsOfDocument = asyncHandler(async (req: Request, res: Response) => sendData(res, await vtmsService.anchorsOfDocument(paramId(req, 'documentId'))));
export const anchorCreate = asyncHandler(async (req: Request, res: Response) => sendData(res, await vtmsService.saveAnchors(null, currentUser(req), req.body ?? {}, by(req))));
export const anchorUpdate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await vtmsService.saveAnchors(paramId(req), currentUser(req), req.body ?? {}, by(req))),
);
export const anchorDelete = asyncHandler(async (req: Request, res: Response) => {
  await vtmsService.deleteAnchor(paramId(req));
  sendData(res, { success: true });
});
