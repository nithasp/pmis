import { Request, Response } from 'express';
import {
  approveSchema,
  berthEtdSchema,
  documentBerthSchema,
  documentInvoiceSchema,
  documentProductSchema,
  documentVesselSchema,
  rejectSchema,
  vesselInEtdSchema,
} from '../schemas/document.schema';
import { documentService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { listQuery } from '../utils/paging';
import { currentUser, paramId } from '../utils/request';
import { sendData } from '../utils/response';
import { str } from '../utils/rows';
import { parse } from '../utils/validation';

const by = (req: Request): string => `user:${currentUser(req).userId}`;
const q = (req: Request): Record<string, string> => req.query as Record<string, string>;

export const list = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await documentService.list(currentUser(req), q(req), listQuery(req)));
});

export const vesselDocuments = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await documentService.vesselDocuments(currentUser(req), paramId(req, 'vesselId'), q(req), listQuery(req)));
});

export const draft = asyncHandler(async (req: Request, res: Response) => sendData(res, await documentService.draft(currentUser(req))));

export const detail = asyncHandler(async (req: Request, res: Response) => sendData(res, await documentService.detail(paramId(req), currentUser(req))));

export const createDraft = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.saveVessel(null, currentUser(req), parse(documentVesselSchema, req.body), by(req))),
);

export const update = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.saveVessel(paramId(req), currentUser(req), parse(documentVesselSchema, req.body), by(req))),
);

export const submitForReview = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.submitForReview(paramId(req), currentUser(req), by(req))),
);

export const cancel = asyncHandler(async (req: Request, res: Response) => sendData(res, await documentService.cancel(paramId(req), currentUser(req), by(req), false)));
export const adminCancel = asyncHandler(async (req: Request, res: Response) => sendData(res, await documentService.cancel(paramId(req), currentUser(req), by(req), true)));

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(rejectSchema, req.body);
  sendData(res, await documentService.reject(paramId(req), currentUser(req), str(input.rejectNote || input.note), by(req)));
});

export const requestEdit = asyncHandler(async (req: Request, res: Response) => {
  const input = parse(rejectSchema, req.body);
  sendData(res, await documentService.requestEdit(paramId(req), currentUser(req), str(input.rejectNote || input.note), by(req)));
});

export const approve = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.approve(paramId(req), currentUser(req), parse(approveSchema, req.body ?? {}), by(req))),
);

export const recall = asyncHandler(async (req: Request, res: Response) => sendData(res, await documentService.recall(paramId(req), currentUser(req), by(req))));

export const reviews = asyncHandler(async (req: Request, res: Response) => sendData(res, await documentService.history(paramId(req), currentUser(req))));

export const berthDetail = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.berthDetail(paramId(req), paramId(req, 'berthId'), currentUser(req))),
);
export const berthCreate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.saveBerth(paramId(req), null, currentUser(req), parse(documentBerthSchema, req.body), by(req))),
);
export const berthUpdate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.saveBerth(paramId(req), paramId(req, 'berthId'), currentUser(req), parse(documentBerthSchema, req.body), by(req))),
);
export const berthDelete = asyncHandler(async (req: Request, res: Response) => {
  await documentService.deleteBerth(paramId(req), paramId(req, 'berthId'), currentUser(req), by(req));
  sendData(res, { success: true });
});

export const productDetail = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.productDetail(paramId(req), paramId(req, 'berthId'), paramId(req, 'productId'), currentUser(req))),
);
export const productCreate = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.saveProduct(paramId(req), paramId(req, 'berthId'), null, currentUser(req), parse(documentProductSchema, req.body), by(req))),
);
export const productUpdate = asyncHandler(async (req: Request, res: Response) =>
  sendData(
    res,
    await documentService.saveProduct(paramId(req), paramId(req, 'berthId'), paramId(req, 'productId'), currentUser(req), parse(documentProductSchema, req.body), by(req)),
  ),
);
export const productDelete = asyncHandler(async (req: Request, res: Response) => {
  await documentService.deleteProduct(paramId(req), paramId(req, 'berthId'), paramId(req, 'productId'), currentUser(req));
  sendData(res, { success: true });
});

export const invoice = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.saveInvoice(paramId(req), currentUser(req), parse(documentInvoiceSchema, req.body), by(req))),
);

export const berthQueue = asyncHandler(async (req: Request, res: Response) => sendData(res, await documentService.berthQueue(String(req.params.berthAlt), listQuery(req))));
export const berthEtd = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.updateBerthEtd(paramId(req, 'documentBerthId'), parse(berthEtdSchema, req.body), by(req))),
);
export const vesselsIn = asyncHandler(async (req: Request, res: Response) => sendData(res, await documentService.vesselsIn(String(req.params.berthAlt), listQuery(req))));
export const vesselInEtd = asyncHandler(async (req: Request, res: Response) =>
  sendData(res, await documentService.updateVesselInEtd(paramId(req, 'logBookId'), parse(vesselInEtdSchema, req.body), by(req))),
);

export const exportPdf = asyncHandler(async (req: Request, res: Response) => {
  const buffer = await documentService.exportPdf(paramId(req), currentUser(req));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="document-${req.params.id}.pdf"`);
  res.end(buffer);
});
