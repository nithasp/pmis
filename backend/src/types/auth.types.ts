export const USER_TYPES = ['SuperAdmin', 'Admin', 'User', 'Agency'] as const;
export type UserType = (typeof USER_TYPES)[number];

export const ROLE_TYPES = [
  'SuperAdmin',
  'Admin',
  'Agency',
  'DocumentReviewer',
  'DocumentApprove',
  'DocumentBerthOfficer',
  'DocumentBerthOfficerMIT',
  'DocumentBerthOfficerTCT',
  'DocumentBerthOfficerSpacial',
  'StatOfficer',
  'StatApprove',
  'VTMS',
] as const;
export type RoleType = (typeof ROLE_TYPES)[number];

export interface AuthUser {
  userId: number;
  sessionId: string;
  type: UserType;
  roleType: RoleType;
  roleId: number | null;
  isDemo: boolean;
}

export interface AccessTokenPayload {
  userId: number;
  sid: string;
  type: UserType;
  roleType: RoleType;
  roleId: number | null;
  demo?: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface UploadFileRef {
  id: number;
  fileName: string;
  filePath: string;
  preview: string;
  extension: string;
  size: number;
  fileType: string;
  document_file_type: string;
}

export interface ProfileUser {
  id: number;
  email: string;
  name: string;
  fullName: string;
  type: UserType;
  roleId: number | null;
  roleName: string;
  roleType: RoleType;
  rightsType: string;
  versionApp: string;
  personType: string;
  tax: string;
  company: string;
  phone: string;
  mobilePhone: string;
  address: string;
  countryId: number | null;
  provinceId: number | null;
  districtId: number | null;
  subDistrictId: number | null;
  stageProvince: string;
  zipCode: string;
  status: string;
  enabled: boolean;
  isAcceptedTerm: boolean;
  isFirstLogin: boolean;
  isDemo: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  uploadFiles: UploadFileRef[];
}

export interface LoginResult {
  token: TokenPair;
  user: ProfileUser;
}

export interface SessionSource {
  ipAddress?: string | null;
  userAgent?: string | null;
}
