export const DOCUMENT_STATUS = {
  Draft: 'Draft',
  PendingReview: 'PendingReview',
  PendingEdit: 'PendingEdit',
  PendingConfirmation: 'PendingConfirmation',
  PendingConfirmation1: 'PendingConfirmation1',
  PendingConfirmation2: 'PendingConfirmation2',
  PendingApproval: 'PendingApproval',
  Approved: 'Approved',
  Canceled: 'Canceled',
  AdminCanceled: 'AdminCanceled',
  Rejected: 'Rejected',
} as const;

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

export const DOCUMENT_STATUS_TH: Record<string, string> = {
  Draft: 'ฉบับร่าง',
  PendingReview: 'รอตรวจ',
  PendingEdit: 'รอแก้ไข',
  PendingConfirmation: 'รอยืนยันท่า',
  PendingConfirmation1: 'รอยืนยันท่า (1)',
  PendingConfirmation2: 'รอยืนยันท่า (2)',
  PendingApproval: 'รออนุมัติ',
  Approved: 'อนุมัติแล้ว',
  Canceled: 'ตัวแทนยกเลิก',
  AdminCanceled: 'เจ้าหน้าที่ยกเลิก',
  Rejected: 'ปฏิเสธ',
};

export const DOCUMENT_STATUS_EN: Record<string, string> = {
  Draft: 'Draft',
  PendingReview: 'Pending Review',
  PendingEdit: 'Pending Edit',
  PendingConfirmation: 'Pending Confirmation',
  PendingConfirmation1: 'Pending Confirmation (1)',
  PendingConfirmation2: 'Pending Confirmation (2)',
  PendingApproval: 'Pending Approval',
  Approved: 'Approved',
  Canceled: 'Canceled',
  AdminCanceled: 'Admin Canceled',
  Rejected: 'Rejected',
};

export const PENDING_CONFIRMATION_STATUSES = ['PendingConfirmation', 'PendingConfirmation1', 'PendingConfirmation2'];

export const VESSEL_STATUS_TH: Record<string, string> = { PendingBerth: 'รอเทียบท่า', Berth: 'เทียบท่า' };
export const VESSEL_STATUS_EN: Record<string, string> = { PendingBerth: 'Pending Berth', Berth: 'Berth' };

// Options the status dropdowns are built from. The request-form page keys on the position of
// "PendingConfirmation" (third entry), so the order matters.
export const DOCUMENT_STATUS_OPTIONS = [
  { ids: ['PendingReview'], name: 'รอตรวจ', nameEn: 'Pending Review' },
  { ids: ['PendingApproval'], name: 'รออนุมัติ', nameEn: 'Pending Approval' },
  { ids: PENDING_CONFIRMATION_STATUSES, name: 'รอยืนยันท่า', nameEn: 'Pending Confirmation' },
  { ids: ['PendingEdit'], name: 'รอแก้ไข', nameEn: 'Pending Edit' },
  { ids: ['Approved'], name: 'อนุมัติแล้ว', nameEn: 'Approved' },
  { ids: ['Canceled'], name: 'ตัวแทนยกเลิก', nameEn: 'Canceled' },
  { ids: ['AdminCanceled'], name: 'เจ้าหน้าที่ยกเลิก', nameEn: 'Admin Canceled' },
];

export const AGENCY_DOCUMENT_STATUS_OPTIONS = [
  { ids: ['PendingReview', 'PendingApproval', ...PENDING_CONFIRMATION_STATUSES], name: 'รออนุมัติ', nameEn: 'Pending Approval' },
  { ids: ['PendingEdit'], name: 'รอแก้ไข', nameEn: 'Pending Edit' },
  { ids: ['Approved'], name: 'อนุมัติแล้ว', nameEn: 'Approved' },
  { ids: ['Canceled', 'AdminCanceled'], name: 'ยกเลิก', nameEn: 'Canceled' },
];

export const VESSEL_IMPORT_STATUS_TH: Record<string, string> = {
  PendingSend: 'รอส่ง',
  PendingEdit: 'รอท่าแก้ไข',
  Send: 'ส่งแล้ว',
  PendingCheck: 'รอตรวจ',
  RequestEdit: 'ท่าขอแก้ไข',
  PendingApproval: 'รออนุมัติ',
  Approved: 'อนุมัติแล้ว',
};

export const VESSEL_IMPORT_STATUS_OPTIONS = [
  { ids: ['Send', 'PendingCheck'], name: 'ตรวจรายงานและเอกสารแนบ', nameEn: 'Pending Check' },
  { ids: ['PendingApproval'], name: 'ตรวจรายงานเรือเข้า-ออก', nameEn: 'Pending Approval' },
  { ids: ['Approved'], name: 'ตรวจแล้ว', nameEn: 'Approved' },
  { ids: ['PendingEdit'], name: 'รอแก้ไข', nameEn: 'Pending Edit' },
  { ids: ['RequestEdit'], name: 'ขอแก้ไข', nameEn: 'Request Edit' },
];

export const USER_STATUS_TH: Record<string, string> = {
  WaitingReview: 'รอตรวจ',
  WaitingApproved: 'รออนุมัติ',
  Approved: 'เปิดใช้งาน',
};

export const BERTH_TYPES = [
  { code: 'MIT', name: 'MIT' },
  { code: 'TCT', name: 'TCT' },
  { code: 'Spacial', name: 'ท่าเรือพิเศษ (Spacial)' },
  { code: 'Other', name: 'ท่าเรืออื่น ๆ' },
];

export const PORT_DUE_VAT_RATE = 0.07;
