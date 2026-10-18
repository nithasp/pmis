import { Router } from 'express';
import * as imports from '../../controllers/vesselImport.controller';
import { requireOfficer, requirePermission } from '../../middleware/auth';

const router = Router();

router.get('/list', requirePermission('view_ship_in_out_import', 'view_dashboard_ship_in_out'), imports.list);
router.get('/list/send', requireOfficer, requirePermission('view_ship_in_out_verify', 'view_dashboard_ship_in_out', 'view_ship_in_out_import'), imports.listSend);
router.get('/map/:id', requireOfficer, imports.mapDetail);
router.put('/map/:id/:logBookId', requireOfficer, requirePermission('edit_ship_in_out_verify'), imports.map);
router.put('/approve/edit/:id/:type', requireOfficer, requirePermission('edit_ship_in_out_verify'), imports.approveEdit);
router.put('/approve/:id', requireOfficer, requirePermission('edit_ship_in_out_verify'), imports.approve);
router.put('/return/:id', requireOfficer, requirePermission('edit_ship_in_out_verify'), imports.sendBack);
router.put('/edit/:id', imports.requestEdit);
router.post('/', requirePermission('create_ship_in_out_import'), imports.create);
router.get('/:id', imports.detail);
router.put('/:id', requirePermission('edit_ship_in_out_import'), imports.update);
router.post('/:id', requirePermission('create_ship_in_out_import'), imports.sendFile);
router.delete('/:id', requirePermission('delete_ship_in_out_import', 'delete_ship_in_out_verify'), imports.remove);

export default router;
