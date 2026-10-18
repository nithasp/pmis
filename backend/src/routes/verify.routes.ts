import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/send_email', authLimiter, auth.sendRegisterEmail);
router.post('/email', authLimiter, auth.verifyRegisterEmail);

export default router;
