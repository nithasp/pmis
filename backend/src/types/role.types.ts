import { PermissionCode } from '../constants/permissions';
import { RoleType } from './auth.types';

export interface RolePreset {
  name: string;
  roleType: RoleType;
  permissions: PermissionCode[];
}
