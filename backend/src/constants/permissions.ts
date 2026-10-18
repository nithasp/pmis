import { RoleType } from '../types/auth.types';

// The checkbox tree of frontend/pages/permission-management/[mode].vue. A `User`-type account only
// sees the actions its role grants; every other account type passes `allowPermission()` as true.
export const PERMISSION_CODES = [
  'view_dashboard_document',
  'create_document',
  'view_document',
  'edit_document',
  'delete_document',
  'verify_document',
  'approve_document',
  'view_dashboard_sailing',
  'create_sailing',
  'view_sailing',
  'edit_sailing',
  'delete_sailing',
  'verify_sailing',
  'approve_sailing',
  'view_dashboard_ship_in_out',
  'create_ship_in_out_import',
  'view_ship_in_out_import',
  'edit_ship_in_out_import',
  'delete_ship_in_out_import',
  'create_ship_in_out_verify',
  'view_ship_in_out_verify',
  'edit_ship_in_out_verify',
  'delete_ship_in_out_verify',
  'view_dashboard_account',
  'create_account',
  'view_account',
  'edit_account',
  'delete_account',
  'verify_account',
  'approve_account',
  'create_vessel_data',
  'view_vessel_data',
  'edit_vessel_data',
  'delete_vessel_data',
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

export interface RolePreset {
  name: string;
  roleType: RoleType;
  permissions: PermissionCode[];
}

const all = [...PERMISSION_CODES];
const pick = (...prefixes: string[]): PermissionCode[] =>
  PERMISSION_CODES.filter((code) => prefixes.some((p) => code.includes(p)));

export const ROLE_PRESETS: RolePreset[] = [
  { name: 'ผู้ดูแลระบบสูงสุด (Super Admin)', roleType: 'SuperAdmin', permissions: all },
  { name: 'ผู้ดูแลระบบ (Admin)', roleType: 'Admin', permissions: all },
  { name: 'เจ้าหน้าที่ตรวจคำร้อง', roleType: 'DocumentReviewer', permissions: pick('document', 'vessel_data') },
  { name: 'เจ้าหน้าที่อนุมัติคำร้อง', roleType: 'DocumentApprove', permissions: pick('document', 'vessel_data') },
  { name: 'เจ้าหน้าที่ท่าเรือ MIT', roleType: 'DocumentBerthOfficerMIT', permissions: pick('document', 'sailing', 'ship_in_out', 'account', 'vessel_data') },
  { name: 'เจ้าหน้าที่ท่าเรือ TCT', roleType: 'DocumentBerthOfficerTCT', permissions: pick('document', 'sailing', 'ship_in_out', 'account', 'vessel_data') },
  { name: 'เจ้าหน้าที่ท่าเรือพิเศษ', roleType: 'DocumentBerthOfficerSpacial', permissions: pick('document', 'sailing', 'ship_in_out', 'account', 'vessel_data') },
  { name: 'เจ้าหน้าที่สถิติ', roleType: 'StatOfficer', permissions: pick('ship_in_out', 'vessel_data') },
  { name: 'หัวหน้างานสถิติ', roleType: 'StatApprove', permissions: pick('document', 'ship_in_out', 'vessel_data') },
  { name: 'เจ้าหน้าที่ VTMS', roleType: 'VTMS', permissions: pick('sailing', 'vessel_data') },
  { name: 'ตัวแทนเรือ (Agency)', roleType: 'Agency', permissions: pick('document', 'vessel_data') },
];
