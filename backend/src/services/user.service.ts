import { USER_STATUS_TH } from '../constants/statuses';
import { withTransaction } from '../database';
import { ProfileUser, RoleType, UploadFileRef, UserType } from '../types/auth.types';
import { Queryable, Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { UserServiceDeps } from '../types/user.types';
import { AppError, conflict, notFound } from '../utils/errors';
import { idOrNull, iso, str } from '../utils/rows';
import { mailService } from './mail.service';
import { hashPassword, randomToken } from './password.service';

export function toProfile(row: Row, uploadFiles: UploadFileRef[] = []): ProfileUser {
  return {
    id: row.id as number,
    email: str(row.email),
    name: str(row.full_name),
    fullName: str(row.full_name),
    type: row.type as UserType,
    roleId: (row.role_id as number | null) ?? null,
    roleName: str(row.role_name ?? (row.type === 'Agency' ? 'ตัวแทนเรือ' : row.type)),
    roleType: (row.role_type as RoleType) ?? (row.type === 'Agency' ? 'Agency' : (row.type as RoleType)),
    rightsType: str(row.rights_type),
    versionApp: str(row.version_app),
    personType: str(row.person_type),
    tax: str(row.tax),
    company: str(row.company),
    phone: str(row.phone),
    mobilePhone: str(row.mobile_phone),
    address: str(row.address),
    countryId: (row.country_id as number | null) ?? null,
    provinceId: (row.province_id as number | null) ?? null,
    districtId: (row.district_id as number | null) ?? null,
    subDistrictId: (row.sub_district_id as number | null) ?? null,
    stageProvince: str(row.stage_province),
    zipCode: str(row.zip_code),
    status: str(row.status),
    enabled: row.enabled as boolean,
    isAcceptedTerm: row.is_accepted_term as boolean,
    isFirstLogin: row.is_first_login as boolean,
    isDemo: (row.is_demo as boolean) ?? false,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    uploadFiles,
  };
}

// The shape of the user-management and vessel-agent lists (IUserSystem / IVesselAgentData)
export function toUserSystem(row: Row, uploadFiles: UploadFileRef[] = []): Row {
  return {
    ...toProfile(row, uploadFiles),
    statusDes: USER_STATUS_TH[str(row.status)] ?? str(row.status),
    createAt: iso(row.created_at),
    approvedAt: iso(row.approved_at),
    updatedName: str(row.updated_by),
  };
}

const addressColumns = (input: Row): Row => ({
  address: str(input.address),
  country_id: idOrNull(input.countryId),
  province_id: idOrNull(input.provinceId),
  district_id: idOrNull(input.districtId),
  sub_district_id: idOrNull(input.subDistrictId),
  stage_province: str(input.stageProvince),
  zip_code: str(input.zipCode),
});

export function createUserService({ users, roles, verifications, files, tokens }: UserServiceDeps) {
  async function profileOf(id: number, db?: Queryable): Promise<ProfileUser> {
    const row = await users.findById(id, db);
    if (!row) throw notFound('ผู้ใช้งาน', 'user not found');
    return toProfile(row, await files.refs('user', id, db));
  }

  async function withFiles(page: PagedResult<Row>): Promise<PagedResult<Row>> {
    const refs = await files.refsMany('user', page.data.map((r) => r.id as number));
    return { ...page, data: page.data.map((r) => toUserSystem(r, refs.get(r.id as number) ?? [])) };
  }

  async function sendPasswordSetup(user: Row, subject: string): Promise<string> {
    const token = randomToken();
    await verifications.create({
      kind: 'password_reset',
      email: str(user.email),
      userId: user.id as number,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const link = mailService.resetLink(token);
    await mailService.send({ to: str(user.email), subject, text: `ตั้งรหัสผ่านของคุณได้ที่ ${link}`, link });
    return link;
  }

  return {
    profileOf,
    toProfile,

    async detail(id: number): Promise<Row> {
      const row = await users.findById(id);
      if (!row) throw notFound('ผู้ใช้งาน', 'user not found');
      return toUserSystem(row, await files.refs('user', id));
    },

    listOfficers(filter: { enabled?: string; roleId?: number }, query: ListQuery): Promise<PagedResult<Row>> {
      return users.list({ type: ['User', 'Admin', 'SuperAdmin'], ...filter }, query).then(withFiles);
    },

    async createOfficer(input: Row, by: string): Promise<Row> {
      if (await users.findByEmail(str(input.email))) throw conflict('อีเมลนี้มีผู้ใช้งานแล้ว', 'email_already_exist');
      const roleId = idOrNull(input.roleId);
      const role = roleId ? await roles.findById(roleId) : null;
      if (roleId && !role) throw notFound('สิทธิ์ผู้ใช้งาน', 'role not found');
      const created = await users.create({
        email: str(input.email).toLowerCase(),
        password_hash: await hashPassword(randomToken(24)),
        type: role?.role_type === 'SuperAdmin' ? 'SuperAdmin' : role?.role_type === 'Admin' ? 'Admin' : 'User',
        role_id: roleId,
        full_name: str(input.fullName),
        phone: str(input.phone),
        mobile_phone: str(input.mobilePhone),
        status: 'Approved',
        is_first_login: true,
        is_accepted_term: true,
        created_by: by,
        updated_by: by,
      });
      await sendPasswordSetup(created, 'PMIS: ตั้งรหัสผ่านสำหรับบัญชีผู้ใช้งานใหม่');
      return this.detail(created.id as number);
    },

    async updateOfficer(id: number, input: Row, by: string): Promise<Row> {
      const existing = await users.findById(id);
      if (!existing) throw notFound('ผู้ใช้งาน', 'user not found');
      const other = await users.findByEmail(str(input.email));
      if (other && other.id !== id) throw conflict('อีเมลนี้มีผู้ใช้งานแล้ว', 'email_already_exist');
      const roleId = idOrNull(input.roleId);
      const role = roleId ? await roles.findById(roleId) : null;
      await users.update(id, {
        email: str(input.email).toLowerCase(),
        role_id: roleId ?? existing.role_id,
        type:
          existing.type === 'SuperAdmin'
            ? 'SuperAdmin'
            : role?.role_type === 'Admin'
              ? 'Admin'
              : role
                ? 'User'
                : existing.type,
        full_name: str(input.fullName),
        phone: str(input.phone),
        mobile_phone: str(input.mobilePhone),
        updated_by: by,
      });
      return this.detail(id);
    },

    async setEnabled(id: number, enabled: boolean, by: string): Promise<Row> {
      const updated = await users.update(id, { enabled, updated_by: by });
      if (!updated) throw notFound('ผู้ใช้งาน', 'user not found');
      if (!enabled) await tokens.revokeAllSessions(id);
      return this.detail(id);
    },

    async remove(id: number, actingUserId: number, by: string): Promise<void> {
      if (id === actingUserId) throw new AppError('ไม่สามารถลบบัญชีของตนเองได้', 400, 'bad_request', 'You cannot delete your own account');
      const target = await users.findById(id);
      if (!target) throw notFound('ผู้ใช้งาน', 'user not found');
      if (target.is_demo) throw new AppError('ไม่สามารถลบบัญชีสาธิตได้', 400, 'bad_request', 'The demo account cannot be deleted');
      await users.softDelete(id, by);
      await tokens.revokeAllSessions(id);
    },

    listAgencies(filter: { status?: string; personType?: string; begin?: unknown; end?: unknown }, query: ListQuery) {
      return users.list({ type: 'Agency', ...filter }, query).then(withFiles);
    },

    async createAgency(input: Row, by: string): Promise<Row> {
      if (await users.findByEmail(str(input.email))) throw conflict('อีเมลนี้มีผู้ใช้งานแล้ว', 'email_already_exist');
      const agencyRole = await roles.findByType('Agency');
      const created = await withTransaction(async (tx) => {
        const row = await users.create(
          {
            email: str(input.email).toLowerCase(),
            password_hash: await hashPassword(randomToken(24)),
            type: 'Agency',
            role_id: agencyRole?.id ?? null,
            person_type: str(input.personType, 'corporate'),
            tax: str(input.tax),
            company: str(input.company),
            full_name: str(input.fullName),
            phone: str(input.phone),
            mobile_phone: str(input.mobilePhone),
            ...addressColumns(input),
            status: 'Approved',
            approved_at: new Date(),
            is_first_login: true,
            is_accepted_term: false,
            created_by: by,
            updated_by: by,
          },
          tx,
        );
        await files.syncLinks('user', row.id as number, input.uploadFiles, tx);
        return row;
      });
      await sendPasswordSetup(created, 'PMIS: ตั้งรหัสผ่านสำหรับบัญชีตัวแทนเรือ');
      return this.detail(created.id as number);
    },

    async updateAgency(id: number, input: Row, by: string): Promise<Row> {
      const existing = await users.findById(id);
      if (!existing || existing.type !== 'Agency') throw notFound('ตัวแทนเรือ', 'vessel agency not found');
      const other = await users.findByEmail(str(input.email));
      if (other && other.id !== id) throw conflict('อีเมลนี้มีผู้ใช้งานแล้ว', 'email_already_exist');
      await withTransaction(async (tx) => {
        await users.update(
          id,
          {
            email: str(input.email).toLowerCase(),
            person_type: str(input.personType, 'corporate'),
            tax: str(input.tax),
            company: str(input.company),
            full_name: str(input.fullName),
            phone: str(input.phone),
            mobile_phone: str(input.mobilePhone),
            ...addressColumns(input),
            updated_by: by,
          },
          tx,
        );
        await files.syncLinks('user', id, input.uploadFiles, tx);
      });
      return this.detail(id);
    },

    async approveAgency(id: number, by: string): Promise<Row> {
      const existing = await users.findById(id);
      if (!existing || existing.type !== 'Agency') throw notFound('ตัวแทนเรือ', 'vessel agency not found');
      await users.update(id, { status: 'Approved', approved_at: new Date(), enabled: true, updated_by: by });
      await mailService.send({
        to: str(existing.email),
        subject: 'PMIS: บัญชีตัวแทนเรือของคุณได้รับการอนุมัติแล้ว',
        text: 'บัญชีของคุณได้รับการอนุมัติแล้ว สามารถเข้าสู่ระบบเพื่อยื่นใบคำร้องได้',
      });
      return this.detail(id);
    },

    async updateProfile(userId: number, input: Row, by: string): Promise<Row> {
      const existing = await users.findById(userId);
      if (!existing) throw notFound('ผู้ใช้งาน', 'user not found');

      const newEmail = input.email ? str(input.email).toLowerCase() : '';
      const emailChanged = !!newEmail && newEmail !== str(existing.email).toLowerCase();
      if (emailChanged) {
        const other = await users.findByEmail(newEmail);
        if (other && other.id !== userId) throw conflict('อีเมลนี้มีผู้ใช้งานแล้ว', 'duplicate');
        if (!input.code) {
          const link = await this.sendEmailChangeCode(userId, newEmail);
          return { isChangeEmail: true, email: newEmail, ...(link ? { verifyUrl: link } : {}) };
        }
        const pending = await verifications.findActiveByCode('email_change', userId, str(input.code));
        if (!pending || str(pending.email).toLowerCase() !== newEmail) {
          throw new AppError('รหัสยืนยันไม่ถูกต้องหรือหมดอายุ', 400, 'invalid_request', 'email_verification_failed');
        }
        await verifications.markUsed(pending.id as number);
      }

      const patch: Row = { updated_by: by };
      if (emailChanged) patch.email = newEmail;
      const text: [string, string][] = [
        ['personType', 'person_type'],
        ['tax', 'tax'],
        ['company', 'company'],
        ['fullName', 'full_name'],
        ['phone', 'phone'],
        ['mobilePhone', 'mobile_phone'],
        ['address', 'address'],
        ['stageProvince', 'stage_province'],
        ['zipCode', 'zip_code'],
        ['rightsType', 'rights_type'],
      ];
      for (const [from, to] of text) if (input[from] !== undefined && input[from] !== null) patch[to] = str(input[from]);
      const ids: [string, string][] = [
        ['countryId', 'country_id'],
        ['provinceId', 'province_id'],
        ['districtId', 'district_id'],
        ['subDistrictId', 'sub_district_id'],
      ];
      for (const [from, to] of ids) if (input[from] !== undefined) patch[to] = idOrNull(input[from]);

      await withTransaction(async (tx) => {
        await users.update(userId, patch, tx);
        if (Array.isArray(input.uploadFiles)) await files.syncLinks('user', userId, input.uploadFiles, tx);
      });
      return { ...(await this.detail(userId)), isChangeEmail: false };
    },

    async sendEmailChangeCode(userId: number, newEmail: string): Promise<string | undefined> {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      await verifications.create({
        kind: 'email_change',
        email: newEmail,
        userId,
        token: randomToken(),
        code,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      await mailService.send({ to: newEmail, subject: 'PMIS: รหัสยืนยันการเปลี่ยนอีเมล', text: `รหัสยืนยันของคุณคือ ${code}` });
      return `code:${code}`;
    },

    async acceptTerm(userId: number): Promise<ProfileUser> {
      await users.update(userId, { is_accepted_term: true });
      return profileOf(userId);
    },

    ownerOptions(search: string) {
      return users.ownerOptions(search);
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
