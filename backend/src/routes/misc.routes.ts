import { Router } from 'express';
import * as misc from '../controllers/misc.controller';
import * as options from '../controllers/options.controller';
import * as uploads from '../controllers/upload.controller';
import { verifyAuthToken } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { upload } from '../middleware/upload';

// Terms are shown on the public registration page
export const contentsRouter = Router();
contentsRouter.get('/terms', options.terms);

export const downloadsRouter = Router();
downloadsRouter.get('/agent-template', misc.agentTemplate);
downloadsRouter.get('/vessel-template', misc.vesselTemplate);
downloadsRouter.get('/vessel-import-template', misc.vesselImportTemplate);

// Registration documents are uploaded before an account exists
export const uploadRouter = Router();
uploadRouter.post('/register', authLimiter, upload.single('file'), uploads.register);

export const customersRouter = Router();
customersRouter.get('/search', verifyAuthToken, options.customersSearch);
