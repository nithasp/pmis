import { Router } from 'express';
import * as roles from '../../controllers/role.controller';
import * as users from '../../controllers/user.controller';
import { requireOfficer } from '../../middleware/auth';

export const roleRouter = Router();
roleRouter.use(requireOfficer);
roleRouter.get('/', roles.list);
roleRouter.post('/', roles.create);
roleRouter.get('/:id', roles.detail);
roleRouter.put('/:id', roles.update);
roleRouter.put('/:id/status', roles.status);
roleRouter.delete('/:id/:newRoleId', roles.remove);
roleRouter.delete('/:id', roles.remove);

export const userRouter = Router();
userRouter.use(requireOfficer);
userRouter.get('/', users.officerList);
userRouter.post('/', users.officerCreate);
userRouter.get('/:id', users.officerDetail);
userRouter.put('/:id', users.officerUpdate);
userRouter.put('/:id/status', users.officerStatus);
userRouter.delete('/:id', users.officerDelete);

export const vesselAgencyRouter = Router();
vesselAgencyRouter.get('/', requireOfficer, users.agencyList);
vesselAgencyRouter.post('/', requireOfficer, users.agencyCreate);
vesselAgencyRouter.get('/:id', users.agencyDetail);
vesselAgencyRouter.put('/:id', requireOfficer, users.agencyUpdate);
vesselAgencyRouter.put('/:id/approve', requireOfficer, users.agencyApprove);
vesselAgencyRouter.delete('/:id', requireOfficer, users.agencyDelete);
