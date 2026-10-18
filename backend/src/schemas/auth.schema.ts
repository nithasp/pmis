import { z } from 'zod';
import { email, numberish, optionalId, optionalText, password, requiredText, uploadFiles } from './common.schema';

export const loginSchema = z.object({
  email,
  password: z.string('จำเป็นต้องกรอก').min(1, 'จำเป็นต้องกรอก'),
});

export const refreshSchema = z.object({
  refresh_token: z.string('จำเป็นต้องกรอก').min(1, 'จำเป็นต้องกรอก'),
});

export const emailSchema = z.object({ email });

export const verifyEmailSchema = z.object({ token: requiredText(200) });

export const verifyResetTokenSchema = z.object({ password_reset_token: requiredText(200) });

export const resetWithTokenSchema = z.object({
  password_reset_token: requiredText(200),
  new_password: password,
});

export const verifyPasswordSchema = z.object({ old_password: z.string('จำเป็นต้องกรอก').min(1) });

export const changePasswordSchema = z
  .object({ password, confirm_password: z.string('จำเป็นต้องกรอก') })
  .refine((d) => d.password === d.confirm_password, { message: 'รหัสผ่านไม่ตรงกัน', path: ['confirm_password'] });

export const addressFields = {
  address: optionalText(1000),
  countryId: optionalId.optional(),
  provinceId: optionalId.optional(),
  districtId: optionalId.optional(),
  subDistrictId: optionalId.optional(),
  stageProvince: optionalText(150),
  zipCode: optionalText(10),
};

export const registerSchema = z.looseObject({
  token: requiredText(200),
  email,
  password,
  confirmPassword: z.string().optional(),
  company: optionalText(255),
  fullName: requiredText(255),
  mobilePhone: optionalText(30),
  personType: optionalText(20),
  phone: optionalText(30),
  tax: optionalText(20),
  ...addressFields,
  uploadFiles,
});

export const agencySchema = z.looseObject({
  email,
  company: optionalText(255),
  fullName: requiredText(255),
  mobilePhone: optionalText(30),
  personType: optionalText(20),
  phone: optionalText(30),
  tax: optionalText(20),
  ...addressFields,
  uploadFiles,
});

export const updateProfileSchema = z.looseObject({
  email: email.optional(),
  code: optionalText(10),
  rightsType: optionalText(50),
  personType: optionalText(20),
  tax: optionalText(20),
  company: optionalText(255),
  fullName: optionalText(255),
  phone: optionalText(30),
  mobilePhone: optionalText(30),
  ...addressFields,
  uploadFiles,
});

export const userAddressSchema = z.looseObject({
  id: optionalId.optional(),
  tax: optionalText(20),
  company: optionalText(255),
  fullName: optionalText(255),
  paymentMethodId: optionalId.optional(),
  paymentTermId: optionalId.optional(),
  ...addressFields,
});

export const officerSchema = z.looseObject({
  email,
  roleId: optionalId,
  fullName: requiredText(255),
  phone: optionalText(30),
  mobilePhone: optionalText(30),
});

export const roleSchema = z.looseObject({
  name: requiredText(150),
  activated: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
  roleType: optionalText(50),
});

export const enabledSchema = z.object({ enabled: z.boolean() });

export const noteSchema = z.looseObject({ note: optionalText(2000), rejectNote: optionalText(2000) });

export const amountSchema = z.looseObject({ grossTonnage: numberish.optional() });
