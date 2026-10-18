import { Router } from 'express';
import * as ais from '../../controllers/ais.controller';
import { requireOfficer } from '../../middleware/auth';

const router = Router();
router.use(requireOfficer);
router.get('/activity/map', ais.map);
router.get('/activity', ais.activity);
router.get('/logs', ais.logs);

export default router;
