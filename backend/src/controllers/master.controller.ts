import { Request, Response } from 'express';
import { z } from 'zod';
import { masterService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuery } from '../utils/paging';
import { currentUser, paramId } from '../utils/request';
import { sendData } from '../utils/response';
import { parse } from '../utils/validation';
import { optionalId, optionalText, requiredText } from '../schemas/common.schema';

const by = (req: Request): string => `user:${currentUser(req).userId}`;
const q = (req: Request): Record<string, string> => req.query as Record<string, string>;

const statusField = z.boolean().optional();

const simpleSchema = z.looseObject({ name: requiredText(150), status: statusField, activated: z.boolean().optional() });
const portSchema = z.looseObject({ name: requiredText(150), locode: optionalText(10), country_id: optionalId.optional(), status: statusField });
const berthSchema = z.looseObject({
  name_th: requiredText(200),
  name_en: requiredText(200),
  name_alt: requiredText(50),
  berth_type: optionalText(20),
  vessel_type_id: optionalId.optional(),
  jettys: z.array(z.looseObject({ name: optionalText(100) })).optional(),
  status: statusField,
});
const purposeSchema = z.looseObject({
  purpose_name: optionalText(200),
  name: optionalText(200),
  purpose_type_id: optionalId.optional(),
  purpose_type_name: optionalText(100),
  status: statusField,
});
const productSchema = z.looseObject({ name: requiredText(150), product_type_id: optionalId.optional(), product_group_id: optionalId.optional(), status: statusField });
const productTypeSchema = z.looseObject({
  product_type_name: optionalText(150),
  name: optionalText(150),
  product_group_id: optionalId.optional(),
  product_group_name: optionalText(150),
  status: statusField,
});
const flagSchema = z.looseObject({ name: requiredText(150), file_id: z.any().optional(), fileId: z.any().optional(), filePath: optionalText(1000), status: statusField });

export const simpleList = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await masterService.listSimple(String(req.params.key), listQuery(req), q(req).status));
});
export const simpleDetail = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await masterService.simpleDetail(String(req.params.key), paramId(req)));
});
export const simpleCreate = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await masterService.createSimple(String(req.params.key), parse(simpleSchema, req.body), by(req)));
});
export const simpleUpdate = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await masterService.updateSimple(String(req.params.key), paramId(req), parse(simpleSchema, req.body), by(req)));
});

export const portList = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await masterService.listPorts(listQuery(req), { country_id: q(req).country_id, status: q(req).status }));
});
export const portDetail = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.portDetail(paramId(req))));
export const portCreate = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.savePort(null, parse(portSchema, req.body), by(req))));
export const portUpdate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await masterService.savePort(paramId(req), parse(portSchema, req.body), by(req))),
);

export const berthList = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await masterService.listBerths(listQuery(req), { vessel_type_id: q(req).vessel_type_id, status: q(req).status, berth_type: q(req).berth_type }));
});
export const berthDetail = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.berthDetail(paramId(req))));
export const berthCreate = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.saveBerth(null, parse(berthSchema, req.body), by(req))));
export const berthUpdate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await masterService.saveBerth(paramId(req), parse(berthSchema, req.body), by(req))),
);

export const purposeList = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await masterService.listPurposes(listQuery(req), { status: q(req).status, purpose_type: q(req).purpose_type, purpose_type_id: q(req).purpose_type_id }));
});
export const purposeDetail = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.purposeDetail(paramId(req))));
export const purposeCreate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await masterService.savePurpose(null, parse(purposeSchema, req.body), by(req))),
);
export const purposeUpdate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await masterService.savePurpose(paramId(req), parse(purposeSchema, req.body), by(req))),
);
export const purposeTypes = asyncHandler(async (_req: Request, res: Response) => sendData(res, await masterService.purposeTypes()));

export const productList = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.listProducts(listQuery(req), q(req).status)));
export const productDetail = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.productDetail(paramId(req))));
export const productCreate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await masterService.saveProduct(null, parse(productSchema, req.body), by(req))),
);
export const productUpdate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await masterService.saveProduct(paramId(req), parse(productSchema, req.body), by(req))),
);
export const productTypeList = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.listProductTypes(listQuery(req), q(req).status)));
export const productTypeOptions = asyncHandler(async (_req: Request, res: Response) => sendData(res, await masterService.productTypeOptions()));
export const productTypeDetail = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.productTypeDetail(paramId(req))));
export const productTypesOfGroup = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.productTypesOfGroup(paramId(req))));
export const productTypeCreate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await masterService.saveProductType(null, parse(productTypeSchema, req.body), by(req))),
);
export const productTypeUpdate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await masterService.saveProductType(paramId(req), parse(productTypeSchema, req.body), by(req))),
);
export const productGroupOptions = asyncHandler(async (_req: Request, res: Response) => sendData(res, await masterService.productGroupOptions()));

export const flagList = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.listFlags(listQuery(req), q(req).status)));
export const flagDetail = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.flagDetail(paramId(req))));
export const flagCreate = asyncHandler(async (req: Request, res: Response) => sendData(res, await masterService.saveFlag(null, parse(flagSchema, req.body), by(req))));
export const flagUpdate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await masterService.saveFlag(paramId(req), parse(flagSchema, req.body), by(req))),
);

export const pilots = asyncHandler(async (_req: Request, res: Response) => sendData(res, await masterService.pilots()));
export const tugs = asyncHandler(async (_req: Request, res: Response) => sendData(res, await masterService.tugs()));
