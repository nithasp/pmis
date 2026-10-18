import { Router } from 'express';
import * as vtms from '../../controllers/vtms.controller';
import { requireOfficer, requirePermission } from '../../middleware/auth';

const router = Router();
router.use(requireOfficer);

router.get('/', vtms.summary);
router.get('/documents', requirePermission('view_sailing', 'view_dashboard_sailing', 'view_document'), vtms.documents);

router.get('/log-book', requirePermission('view_sailing', 'view_ship_in_out_verify', 'view_ship_in_out_import'), vtms.logBookList);
router.post('/log-book', requirePermission('create_sailing'), vtms.logBookCreate);
router.get('/log-book/doc/:id/berth', vtms.documentBerthLog);
router.get('/log-book/doc/:documentId', vtms.logBookOfDocument);
router.get('/log-book/:id', vtms.logBookDetail);
router.put('/log-book/:id', requirePermission('edit_sailing'), vtms.logBookUpdate);
router.delete('/log-book/:id', requirePermission('delete_sailing'), vtms.logBookDelete);

router.get('/anchor', requirePermission('view_sailing'), vtms.anchorList);
router.post('/anchor', requirePermission('create_sailing'), vtms.anchorCreate);
router.get('/anchor/doc/:documentId', vtms.anchorsOfDocument);
router.get('/anchor/:id', vtms.anchorDetail);
router.put('/anchor/:id', requirePermission('edit_sailing'), vtms.anchorUpdate);
router.delete('/anchor/:id', requirePermission('delete_sailing'), vtms.anchorDelete);

export default router;
