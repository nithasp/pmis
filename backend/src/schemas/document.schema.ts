import { z } from 'zod';
import { numberish, optionalId, optionalText, requiredText, uploadFiles } from './common.schema';

export const documentVesselSchema = z.looseObject({
  documentVesselId: optionalId.optional(),
  vesselFlagId: optionalId.optional(),
  vesselTypeId: optionalId.optional(),
  vesselId: optionalId.optional(),
  vesselOwner: optionalText(255),
  vesselName: requiredText(200),
  vesselImoNumber: optionalText(20),
  vesselMMSiNumber: optionalText(20),
  vesselDSVNumber: optionalText(30),
  vesselOfficialNumber: optionalText(30),
  vesselCallSign: optionalText(20),
  vesselNationality: optionalText(100),
  vesselCountry: optionalText(100),
  vesselLoadWeight: numberish.optional(),
  vesselGrossTonnage: numberish.optional(),
  vesselNetTonnage: numberish.optional(),
  vesselLengthOverall: numberish.optional(),
  vesselBreadthExtreme: numberish.optional(),
  vesselDepth: numberish.optional(),
  vesselMainEngine: optionalText(150),
  vesselBandAndModel: optionalText(150),
  vesselLicenseExpiredDate: z.any().optional(),
  vesselUploadFiles: uploadFiles,
});

export const documentBerthSchema = z.looseObject({
  berthId: optionalId,
  berthType: optionalText(20),
  purposeTypeId: optionalId.optional(),
  purposeId: optionalId.optional(),
  cargoTypeId: optionalId.optional(),
  passengers: numberish.optional(),
  estimatedArrival: z.any().optional(),
  estimatedDeparture: z.any().optional(),
  note: optionalText(2000),
  sequence: numberish.optional(),
});

export const documentProductSchema = z.looseObject({
  purposeId: optionalId.optional(),
  productTypeId: optionalId.optional(),
  productGroupId: optionalId.optional(),
  cargoWharfageId: optionalId.optional(),
  mTonQty: numberish.optional(),
  rTonQty: numberish.optional(),
  packageAmount: numberish.optional(),
  receiver: optionalText(255),
  cargoOwnerId: optionalId.optional(),
  berthType: optionalText(20),
});

export const documentInvoiceSchema = z.looseObject({
  customerId: optionalId.optional(),
  name: requiredText(255),
  taxId: optionalText(20),
  contactName: optionalText(255),
  paymentMethodId: optionalId.optional(),
  paymentTermId: optionalId.optional(),
  countryId: optionalId.optional(),
  subDistrictId: optionalId.optional(),
  districtId: optionalId.optional(),
  provinceId: optionalId.optional(),
  postCode: optionalText(10),
  stageProvince: optionalText(150),
  address: optionalText(1000),
  phoneNumber: optionalText(30),
  secondaryPhoneNumber: optionalText(30),
});

export const rejectSchema = z.looseObject({ rejectNote: optionalText(2000), note: optionalText(2000) });

export const approveSchema = z.looseObject({
  spacialBerths: z.array(z.looseObject({ berthId: optionalId.optional(), jettyId: optionalId.optional() })).optional(),
});

export const berthEtdSchema = z.looseObject({ jettyId: optionalId.optional(), etb: z.any().optional(), etd: z.any().optional() });

export const vesselInEtdSchema = z.looseObject({ etd: z.any() });
