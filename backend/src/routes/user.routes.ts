import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import * as users from '../controllers/user.controller';
import { rejectDemoWrites, verifyAuthToken } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', authLimiter, auth.register);

router.use(verifyAuthToken, rejectDemoWrites);

router.post('/term', auth.acceptTerm);
router.post('/update', users.updateProfile);
router.post('/password', auth.verifyPassword);
router.post('/password/reset', auth.changePassword);
router.post('/verify/send_email', users.sendChangeEmailCode);
router.get('/address/list/:userId', users.addressList);
router.get('/address/:id', users.addressDetail);
router.post('/address/:userId', users.addressCreate);
router.put('/address/:userId', users.addressUpdate);
router.delete('/address/:addressId', users.addressDelete);
router.get('/:id', users.detail);

export default router;
