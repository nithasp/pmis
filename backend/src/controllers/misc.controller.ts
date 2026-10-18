import { Request, Response } from 'express';
import { config } from '../config';
import { templateService } from '../services/template.service';
import { asyncHandler } from '../utils/asyncHandler';
import { notFound } from '../utils/errors';
import { sendData } from '../utils/response';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const agentTemplate = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="agent-registration-manual.pdf"');
  res.end(await templateService.agentManual());
});

export const vesselTemplate = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', XLSX);
  res.setHeader('Content-Disposition', 'attachment; filename="vessel-template.xlsx"');
  res.end(await templateService.vesselTemplate());
});

export const vesselImportTemplate = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', XLSX);
  res.setHeader('Content-Disposition', 'attachment; filename="vessel-import-template.xlsx"');
  res.end(await templateService.vesselImportTemplate());
});

// GET /admin/template/:fileTemplate answers the download link the import page fetches
export const templateLink = asyncHandler(async (req: Request, res: Response) => {
  const name = String(req.params.fileTemplate ?? '');
  const known: Record<string, { path: string; fileName: string }> = {
    'vessel-import': { path: '/api/v1/downloads/vessel-import-template', fileName: 'vessel-import-template.xlsx' },
    vessel: { path: '/api/v1/downloads/vessel-template', fileName: 'vessel-template.xlsx' },
    agent: { path: '/api/v1/downloads/agent-template', fileName: 'agent-registration-manual.pdf' },
  };
  const found = known[name] ?? known[name.replace(/[-_]?template$/i, '')];
  if (!found) throw notFound(`เทมเพลต ${name}`, 'template not found');
  sendData(res, { filePath: `${config.publicUrl}${found.path}`, fileName: found.fileName });
});
