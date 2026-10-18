import { Router } from 'express';
import * as portDues from '../controllers/portDue.controller';
import { requireOfficer, verifyAuthToken } from '../middleware/auth';

const router = Router();
router.use(verifyAuthToken, requireOfficer);

router.get('/pending', portDues.pendingList);
router.get('/pending/:id', portDues.pendingDetail);
router.get('/', portDues.list);
router.post('/', portDues.create);
router.get('/:id', portDues.detail);
router.put('/:id/cancel', portDues.cancel);

export default router;
