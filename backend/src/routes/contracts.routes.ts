import { Router } from 'express';
import * as contracts from '../controllers/contract.controller';
import * as uploads from '../controllers/upload.controller';
import { requireOfficer, verifyAuthToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();
router.use(verifyAuthToken, requireOfficer);

router.post('/upload', upload.single('file'), uploads.contract);
router.get('/rates', contracts.rates);
router.get('/', contracts.list);
router.post('/', contracts.create);
router.get('/:id', contracts.detail);
router.put('/:id', contracts.update);
router.delete('/:id', contracts.remove);

export default router;
