import { Request, Response } from 'express';
import { z } from 'zod';
import { numberish, optionalId, optionalText, requiredText, uploadFiles } from '../schemas/common.schema';
import { vesselService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuery } from '../utils/paging';
import { currentUser, paramId } from '../utils/request';
import { sendData } from '../utils/response';
import { str } from '../utils/rows';
import { parse } from '../utils/validation';

const by = (req: Request): string => `user:${currentUser(req).userId}`;
const q = (req: Request): Record<string, string> => req.query as Record<string, string>;

const vesselSchema = z.looseObject({
  name: requiredText(200),
  callSign: optionalText(20),
  imoNumber: optionalText(20),
  owner: optionalText(255),
  ownerId: optionalId.optional(),
  breadthExtreme: numberish.optional(),
  depth: numberish.optional(),
  grossTonnage: numberish.optional(),
  lengthOverall: numberish.optional(),
  loadWeight: numberish.optional(),
  mainEngine: optionalText(150),
  bandAndModel: optionalText(150),
  mmsiNumber: optionalText(20),
  dsvNumber: optionalText(30),
  netTonnage: numberish.optional(),
  officialNumber: optionalText(30),
  vesselFlagId: optionalId.optional(),
  vesselTypeId: optionalId.optional(),
  vesselLicenseExpiredDate: z.any().optional(),
  uploadFiles,
});

const governmentSchema = z.looseObject({
  name: requiredText(200),
  breadthExtreme: numberish.optional(),
  breadth: numberish.optional(),
  depth: numberish.optional(),
  draft: numberish.optional(),
  displacement: numberish.optional(),
  displaceent: numberish.optional(),
  lengthOverall: numberish.optional(),
  loa: numberish.optional(),
  officialNumber: optionalText(30),
  vesselFlagId: optionalId.optional(),
  vesselTypeId: optionalId.optional(),
  authority_id: optionalId.optional(),
  authorityId: optionalId.optional(),
  fileId: z.any().optional(),
  uploadFiles,
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await vesselService.list(currentUser(req), { flag: q(req).flag, type: q(req).type, owner: str(q(req).owner), showAll: q(req).showAll }, listQuery(req)));
});

export const detail = asyncHandler(async (req: Request, res: Response) => sendData(res, await vesselService.detail(paramId(req))));

export const create = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await vesselService.create(currentUser(req), parse(vesselSchema, req.body), by(req))),
);

export const update = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await vesselService.update(currentUser(req), paramId(req), parse(vesselSchema, req.body), by(req))),
);

export const history = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await vesselService.history(paramId(req), { begin: q(req).approvedDateBegin, end: q(req).approvedDateEnd }, listQuery(req))),
);

export const governmentList = asyncHandler(async (req: Request, res: Response) => sendData(res, await vesselService.listGovernment(listQuery(req))));
export const governmentDetail = asyncHandler(async (req: Request, res: Response) => sendData(res, await vesselService.governmentDetail(paramId(req))));
export const governmentCreate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await vesselService.saveGovernment(null, parse(governmentSchema, req.body), by(req))),
);
export const governmentUpdate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await vesselService.saveGovernment(paramId(req), parse(governmentSchema, req.body), by(req))),
);
export const governmentDelete = asyncHandler(async (req: Request, res: Response) => {
  await vesselService.removeGovernment(paramId(req));
  sendData(res, { success: true });
});
