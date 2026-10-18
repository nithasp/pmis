import { Request, Response } from 'express';
import { reportService } from '../services';
import { asyncHandler } from '../utils/asyncHandler';
import { notFound } from '../utils/errors';
import { sendData } from '../utils/response';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const reportName = (req: Request): string => {
  const name = String(req.params.name ?? '');
  if (!reportService.isReport(name)) throw notFound(`รายงาน ${name}`, 'report not found');
  return name;
};

export const pdfData = asyncHandler(async (req: Request, res: Response) => {
  sendData(res, await reportService.data(reportName(req) as never, req.query as Record<string, string>));
});

export const excel = asyncHandler(async (req: Request, res: Response) => {
  const name = reportName(req);
  const buffer = await reportService.workbook(name as never, req.query as Record<string, string>);
  res.setHeader('Content-Type', XLSX);
  res.setHeader('Content-Disposition', `attachment; filename="${name}.xlsx"`);
  res.end(buffer);
});
