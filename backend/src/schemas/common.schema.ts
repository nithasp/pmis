import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;

export const asNumber = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() !== '' ? Number(value.replace(/,/g, '')) : value;

export const positiveInt = z.preprocess(
  asNumber,
  z.number('ต้องเป็นตัวเลข').int('ต้องเป็นจำนวนเต็ม').positive('ต้องมากกว่า 0'),
);

export const optionalId = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || v === 0 || v === '0' ? null : asNumber(v)),
  z.number().int().positive().nullable(),
);

export const numberish = z.preprocess((v) => (v === '' || v === null || v === undefined ? 0 : asNumber(v)), z.number());

export const idParams = z.object({ id: positiveInt });

export const requiredText = (max: number) =>
  z.string('จำเป็นต้องกรอก').trim().min(1, 'จำเป็นต้องกรอก').max(max, `ต้องไม่เกิน ${max} ตัวอักษร`);

export const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max, `ต้องไม่เกิน ${max} ตัวอักษร`), z.null(), z.number()])
    .optional()
    .transform((value) => (value === null || value === undefined ? '' : String(value)));

export const email = z.string('จำเป็นต้องกรอก').trim().toLowerCase().email('รูปแบบอีเมลไม่ถูกต้อง').max(150);

export const password = z
  .string('จำเป็นต้องกรอก')
  .min(MIN_PASSWORD_LENGTH, `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`)
  .max(128, 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร');

export const boolish = z.preprocess(
  (value) => value === true || value === 'true' || value === 1 || value === '1',
  z.boolean(),
);

export const dateish = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? 'invalid' : d;
}, z.date('รูปแบบวันที่ไม่ถูกต้อง').nullable());

export const uploadFileItem = z.looseObject({
  id: optionalId.optional(),
  fileId: optionalId.optional(),
  file_id: optionalId.optional(),
  fileName: optionalText(255),
  filePath: optionalText(1000),
  preview: optionalText(1000),
  extension: optionalText(100),
  size: numberish.optional(),
  fileType: optionalText(80),
  document_file_type: optionalText(80),
  isError: z.boolean().optional(),
});

export const uploadFiles = z.array(uploadFileItem).optional();
