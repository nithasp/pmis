import { Router } from 'express';
import { rejectDemoWrites, verifyAuthToken } from '../middleware/auth';
import { roleRouter, userRouter, vesselAgencyRouter } from './admin/accounts.routes';
import aisRouter from './admin/ais.routes';
import { adminDocumentRouter, documentRouter } from './admin/documents.routes';
import masterRouter from './admin/master.routes';
import vesselImportRouter from './admin/vesselImport.routes';
import { vesselGovernmentRouter, vesselRouter } from './admin/vessels.routes';
import vtmsRouter from './admin/vtms.routes';
import authRouter from './auth.routes';
import contractsRouter from './contracts.routes';
import { contentsRouter, customersRouter, downloadsRouter, uploadRouter } from './misc.routes';
import { optionsRouter, publicOptionsRouter } from './options.routes';
import portDuesRouter from './portDues.routes';
import reportsRouter from './reports.routes';
import { adminSurveyRouter, publicSurveyRouter } from './survey.routes';
import userRouter_ from './user.routes';
import verifyRouter from './verify.routes';
import * as misc from '../controllers/misc.controller';

const api = Router();

// Public
api.use('/auth', authRouter);
api.use('/verify', verifyRouter);
api.use('/options', publicOptionsRouter);
api.use('/contents', contentsRouter);
api.use('/downloads', downloadsRouter);
api.use('/upload', uploadRouter);
api.use('/survey', publicSurveyRouter);
api.use('/user', userRouter_);

// Signed in
api.use('/options', optionsRouter);
api.use('/customers', customersRouter);
api.use('/contracts', contractsRouter);
api.use('/port-dues', portDuesRouter);
api.use('/reports', reportsRouter);

const admin = Router();
admin.use(verifyAuthToken, rejectDemoWrites);
admin.use('/roles', roleRouter);
admin.use('/users', userRouter);
admin.use('/vessel-agencies', vesselAgencyRouter);
admin.use('/vessels', vesselRouter);
admin.use('/vessel-government', vesselGovernmentRouter);
admin.use('/master-data', masterRouter);
admin.use('/documents', documentRouter);
admin.use('/admin-documents', adminDocumentRouter);
admin.use('/vessel-import', vesselImportRouter);
admin.use('/vtms', vtmsRouter);
admin.use('/survey', adminSurveyRouter);
admin.use('/ais', aisRouter);
admin.get('/template/:fileTemplate', misc.templateLink);
api.use('/admin', admin);

export default api;
