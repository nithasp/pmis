import { RoleRepository } from '../repositories/role.repository';
import { UserRepository } from '../repositories/user.repository';
import { VerificationRepository } from '../repositories/verification.repository';
import { FileService } from '../services/file.service';
import { TokenService } from '../services/token.service';

export interface UserFilter {
  type?: string | string[];
  status?: string;
  personType?: string;
  enabled?: string;
  roleId?: number;
  begin?: unknown;
  end?: unknown;
}

export interface UserServiceDeps {
  users: UserRepository;
  roles: RoleRepository;
  verifications: VerificationRepository;
  files: FileService;
  tokens: TokenService;
}
