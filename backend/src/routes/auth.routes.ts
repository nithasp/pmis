import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { verifyAuthToken } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { tokenService } from '../services';
import { bearerToken } from '../utils/request';

const router = Router();

router.post('/login', authLimiter, auth.login);
router.post('/demo', authLimiter, auth.demo);
router.post('/refresh', authLimiter, auth.refresh);
// Logout is best effort: an expired or already revoked token still answers 200
router.post('/logout', async (req, _res, next) => {
  const token = bearerToken(req.headers.authorization);
  if (token) {
    try {
      req.user = (await tokenService.authenticate(token)) ?? undefined;
    } catch {
      req.user = undefined;
    }
  }
  next();
}, auth.logout);
router.get('/user', verifyAuthToken, auth.me);
router.post('/password/forgot', authLimiter, auth.forgotPassword);
router.post('/password/verify-token', authLimiter, auth.verifyResetToken);
router.post('/password/reset', authLimiter, auth.resetPassword);

export default router;
