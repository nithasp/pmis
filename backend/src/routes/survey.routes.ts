import { Router } from 'express';
import * as survey from '../controllers/survey.controller';
import { requireOfficer } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

// Answering a survey needs only the e-mailed token, never an account
export const publicSurveyRouter = Router();
publicSurveyRouter.get('/:token', authLimiter, survey.byToken);
publicSurveyRouter.post('/', authLimiter, survey.submit);

export const adminSurveyRouter = Router();
adminSurveyRouter.use(requireOfficer);
adminSurveyRouter.get('/list', survey.list);
adminSurveyRouter.post('/', survey.create);
adminSurveyRouter.post('/send/:id', survey.send);
adminSurveyRouter.get('/:id/result', survey.result);
adminSurveyRouter.get('/:id', survey.detail);
adminSurveyRouter.put('/:id', survey.update);
adminSurveyRouter.delete('/:id', survey.remove);
