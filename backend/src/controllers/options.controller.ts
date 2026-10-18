import { Request, Response } from 'express';
import { optionsService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { paramId } from '../utils/request';
import { sendData } from '../utils/response';
import { idOrNull, str } from '../utils/rows';

const q = (req: Request): Record<string, string> => req.query as Record<string, string>;

export const countries = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.countries()));
export const provinces = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.provinces()));
export const districts = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, idOrNull(q(req).province_id) ? await optionsService.districts(idOrNull(q(req).province_id)!) : []),
);
export const subDistricts = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, idOrNull(q(req).district_id) ? await optionsService.subDistricts(idOrNull(q(req).district_id)!) : []),
);
export const roles = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.roles()));
export const authority = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.authorities()));
export const vesselFlags = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.vesselFlags()));
export const vesselTypes = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.vesselTypes()));
export const vesselOwners = asyncHandler(async (req: Request, res: Response) => sendData(res, await optionsService.vesselOwners(str(q(req).q ?? q(req).search))));
export const vesselStatus = asyncHandler(async (_req, res: Response) => sendData(res, optionsService.vesselStatus()));
export const vesselImportStatus = asyncHandler(async (_req, res: Response) => sendData(res, optionsService.vesselImportStatus()));
export const documentStatus = asyncHandler(async (_req, res: Response) => sendData(res, optionsService.documentStatus()));
export const agencyDocumentStatus = asyncHandler(async (_req, res: Response) => sendData(res, optionsService.agencyDocumentStatus()));
export const berths = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.berths()));
export const berthTypes = asyncHandler(async (_req, res: Response) => sendData(res, optionsService.berthTypes()));
export const jetties = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.jetties()));
export const berthJetties = asyncHandler(async (req: Request, res: Response) => sendData(res, await optionsService.jetties(paramId(req, 'berthId'))));
export const purposes = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.purposes()));
export const purposeTypes = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.purposeTypes()));
export const locations = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.locations()));
export const products = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.products()));
export const productGroups = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.productGroups()));
export const productTypes = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.productTypes()));
export const cargoTypes = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.cargoTypes()));
export const cargoWharfage = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.cargoWharfage()));
export const paymentMethods = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.paymentMethods()));
export const paymentTerms = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.paymentTerms()));
export const cargoOwners = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.cargoOwners()));
export const terms = asyncHandler(async (_req, res: Response) => sendData(res, await optionsService.terms()));
export const customersSearch = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await optionsService.customersSearch(str(q(req).search), str(q(req).field, 'name'))),
);
