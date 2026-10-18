import { Router } from 'express';
import * as reports from '../controllers/report.controller';
import { requireOfficer, verifyAuthToken } from '../middleware/auth';

// verifyAuthToken also accepts ?token= so the Office preview can open a workbook in a new tab
const router = Router();
router.use(verifyAuthToken, requireOfficer);
router.get('/:name/pdf', reports.pdfData);
router.get('/:name', reports.excel);

export default router;
