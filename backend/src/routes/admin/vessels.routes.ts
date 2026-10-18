import { Router } from 'express';
import * as uploads from '../../controllers/upload.controller';
import * as vessels from '../../controllers/vessel.controller';
import { requireOfficer, requirePermission } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

export const vesselRouter = Router();
vesselRouter.post('/uploads', upload.single('file'), uploads.vessel);
vesselRouter.get('/', requirePermission('view_vessel_data'), vessels.list);
vesselRouter.post('/', requirePermission('create_vessel_data'), vessels.create);
vesselRouter.get('/:id/history', requirePermission('view_vessel_data'), vessels.history);
vesselRouter.get('/:id', requirePermission('view_vessel_data'), vessels.detail);
vesselRouter.put('/:id', requirePermission('edit_vessel_data'), vessels.update);

export const vesselGovernmentRouter = Router();
vesselGovernmentRouter.get('/', vessels.governmentList);
vesselGovernmentRouter.post('/', requireOfficer, vessels.governmentCreate);
vesselGovernmentRouter.get('/:id', vessels.governmentDetail);
vesselGovernmentRouter.put('/:id', requireOfficer, vessels.governmentUpdate);
vesselGovernmentRouter.delete('/:id', requireOfficer, vessels.governmentDelete);
