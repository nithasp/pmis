import { Router } from 'express';
import * as docs from '../../controllers/document.controller';
import * as uploads from '../../controllers/upload.controller';
import { requireOfficer, requirePermission } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

export const documentRouter = Router();

documentRouter.post('/uploads', upload.single('file'), uploads.document);
documentRouter.get('/draft', docs.draft);
documentRouter.get('/berths/:berthAlt', requireOfficer, docs.berthQueue);
documentRouter.put('/berths/etd/:documentBerthId', requireOfficer, docs.berthEtd);
documentRouter.get('/vessel-in/:berthAlt', requireOfficer, docs.vesselsIn);
documentRouter.put('/vessel-in/:logBookId', requireOfficer, docs.vesselInEtd);
documentRouter.get('/vessel/:vesselId', docs.vesselDocuments);

documentRouter.get('/', requirePermission('view_document', 'view_dashboard_document'), docs.list);
documentRouter.post('/', requirePermission('create_document'), docs.createDraft);
documentRouter.get('/:id', requirePermission('view_document'), docs.detail);
documentRouter.get('/:id/admin', requireOfficer, docs.detail);
documentRouter.put('/:id', requirePermission('edit_document'), docs.update);
documentRouter.get('/:id/reviews', requireOfficer, docs.reviews);
documentRouter.get('/:id/export-pdf', docs.exportPdf);
documentRouter.put('/:id/submit-for-review', requirePermission('create_document', 'edit_document'), docs.submitForReview);
documentRouter.put('/:id/cancel', docs.cancel);
documentRouter.put('/:id/admin-cancel', requireOfficer, requirePermission('delete_document'), docs.adminCancel);
documentRouter.put('/:id/reject', requireOfficer, requirePermission('verify_document', 'approve_document'), docs.reject);
documentRouter.put('/:id/approve', requireOfficer, requirePermission('verify_document', 'approve_document'), docs.approve);
documentRouter.put('/:id/recall', requireOfficer, requirePermission('verify_document', 'approve_document'), docs.recall);
documentRouter.put('/:id/request-edit', requireOfficer, docs.requestEdit);

documentRouter.post('/:id/berths', requirePermission('create_document', 'edit_document'), docs.berthCreate);
documentRouter.get('/:id/berths/:berthId', docs.berthDetail);
documentRouter.put('/:id/berths/:berthId', requirePermission('create_document', 'edit_document'), docs.berthUpdate);
documentRouter.delete('/:id/berths/:berthId', requirePermission('create_document', 'edit_document'), docs.berthDelete);
documentRouter.post('/:id/berths/:berthId/uploads', upload.single('file'), uploads.documentBerth);
documentRouter.delete('/:id/berths/:berthId/files/:fileId', uploads.deleteDocumentBerthFile);
documentRouter.post('/:id/berths/:berthId/products', requirePermission('create_document', 'edit_document'), docs.productCreate);
documentRouter.get('/:id/berths/:berthId/products/:productId', docs.productDetail);
documentRouter.put('/:id/berths/:berthId/products/:productId', requirePermission('create_document', 'edit_document'), docs.productUpdate);
documentRouter.delete('/:id/berths/:berthId/products/:productId', requirePermission('create_document', 'edit_document'), docs.productDelete);
documentRouter.post('/:id/customers', requirePermission('create_document', 'edit_document'), docs.invoice);

export const adminDocumentRouter = Router();
adminDocumentRouter.get('/', requireOfficer, docs.list);
