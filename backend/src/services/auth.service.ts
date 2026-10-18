import { config } from '../config';
import { withTransaction } from '../database';
import { AuthServiceDeps, LoginResult, SessionSource } from '../types/auth.types';
import { Row } from '../types/database.types';
import { AppError, conflict, notFound } from '../utils/errors';
import { idOrNull, str } from '../utils/rows';
import { mailService } from './mail.service';
import { hashPassword, randomToken, spendVerifyTime, verifyPassword } from './password.service';

const INVALID_LOGIN = ['อีเมลหรือรหัสผ่านของคุณไม่ถูกต้อง', 'email_password_not_correct'] as const;
const REGISTER_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function createAuthService({ users, roles, verifications, files, tokens, userService }: AuthServiceDeps) {
  async function startSession(user: Row, isDemo: boolean, source: SessionSource): Promise<LoginResult> {
    const token = await tokens.issueSession(user, isDemo, source);
    return { token, user: await userService.profileOf(user.id as number) };
  }

  // Links are only handed back outside production, so a tester without a mail server can follow them
  const linkIf = (link: string): Record<string, string> => (config.isProduction ? {} : { verifyUrl: link });

  return {
    async login(email: string, password: string, source: SessionSource): Promise<LoginResult> {
      const user = await users.findByEmail(email);
      if (!user) {
        await spendVerifyTime();
        throw new AppError(INVALID_LOGIN[0], 401, 'invalid_credentials', INVALID_LOGIN[1]);
      }
      if (!(await verifyPassword(password, str(user.password_hash)))) {
        throw new AppError(INVALID_LOGIN[0], 401, 'invalid_credentials', INVALID_LOGIN[1]);
      }
      if (!user.enabled) throw new AppError('บัญชีนี้ถูกปิดการใช้งาน', 403, 'forbidden', 'This account has been disabled');
      return startSession(user, user.is_demo === true, source);
    },

    async demoLogin(source: SessionSource): Promise<LoginResult> {
      const user = config.demo.loginEnabled ? await users.findByEmail(config.demo.email) : null;
      if (!user || !user.enabled || !user.is_demo) {
        throw new AppError('ระบบสาธิตไม่พร้อมใช้งาน', 404, 'not_found', 'Demo access is not available');
      }
      return startSession(user, true, source);
    },

    async refresh(refreshToken: string, source: SessionSource): Promise<LoginResult> {
      const { user, tokens: pair } = await tokens.rotate(refreshToken, source);
      return { token: pair, user: await userService.profileOf(user.id as number) };
    },

    async logout(sessionId: string): Promise<void> {
      await tokens.revokeSession(sessionId);
    },

    async sendRegisterEmail(email: string): Promise<Row> {
      if (await users.findByEmail(email)) throw conflict('อีเมลนี้มีผู้ใช้งานแล้ว', 'email_already_exist');
      await verifications.invalidate('register', email);
      const token = randomToken();
      await verifications.create({ kind: 'register', email, token, expiresAt: new Date(Date.now() + REGISTER_TOKEN_TTL_MS) });
      const link = mailService.registerLink(token);
      await mailService.send({ to: email, subject: 'PMIS: ยืนยันอีเมลเพื่อลงทะเบียนตัวแทนเรือ', text: `กรุณายืนยันอีเมลของท่านที่ ${link}`, link });
      return { email, ...linkIf(link) };
    },

    async verifyRegisterToken(token: string): Promise<Row> {
      const row = await verifications.findActive('register', token);
      if (!row) throw new AppError('ยืนยันไม่สำเร็จ เนื่องจากรหัสไม่ถูกต้อง', 400, 'invalid_request', 'email_verification_failed');
      return { userId: null, email: row.email, token };
    },

    async register(input: Row): Promise<Row> {
      const pending = await verifications.findActive('register', str(input.token));
      if (!pending || str(pending.email).toLowerCase() !== str(input.email).toLowerCase()) {
        throw new AppError('ยืนยันไม่สำเร็จ เนื่องจากรหัสไม่ถูกต้อง', 400, 'invalid_request', 'email_verification_failed');
      }
      if (await users.findByEmail(str(input.email))) throw conflict('อีเมลนี้มีผู้ใช้งานแล้ว', 'email_already_exist');
      const agencyRole = await roles.findByType('Agency');
      const created = await withTransaction(async (tx) => {
        const row = await users.create(
          {
            email: str(input.email).toLowerCase(),
            password_hash: await hashPassword(str(input.password)),
            type: 'Agency',
            role_id: agencyRole?.id ?? null,
            person_type: str(input.personType, 'corporate'),
            tax: str(input.tax),
            company: str(input.company),
            full_name: str(input.fullName),
            phone: str(input.phone),
            mobile_phone: str(input.mobilePhone),
            address: str(input.address),
            country_id: idOrNull(input.countryId),
            province_id: idOrNull(input.provinceId),
            district_id: idOrNull(input.districtId),
            sub_district_id: idOrNull(input.subDistrictId),
            stage_province: str(input.stageProvince),
            zip_code: str(input.zipCode),
            status: 'WaitingApproved',
            is_first_login: false,
            is_accepted_term: false,
            created_by: str(input.fullName),
            updated_by: str(input.fullName),
          },
          tx,
        );
        await files.syncLinks('user', row.id as number, input.uploadFiles, tx);
        await verifications.markUsed(pending.id as number, tx);
        return row;
      });
      return userService.profileOf(created.id as number);
    },

    async forgotPassword(email: string): Promise<Row> {
      const user = await users.findByEmail(email);
      if (!user) throw new AppError('อีเมลนี้ไม่มีในระบบ', 404, 'not_found', 'auth_email_not_found');
      await verifications.invalidate('password_reset', email);
      const token = randomToken();
      await verifications.create({
        kind: 'password_reset',
        email,
        userId: user.id as number,
        token,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });
      const link = mailService.resetLink(token);
      await mailService.send({ to: email, subject: 'PMIS: ตั้งรหัสผ่านใหม่', text: `ตั้งรหัสผ่านใหม่ได้ที่ ${link}`, link });
      return { email, ...linkIf(link) };
    },

    async verifyResetToken(token: string): Promise<Row> {
      const row = await verifications.findActive('password_reset', token);
      if (!row) throw new AppError('ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุ', 400, 'invalid_request', 'The reset link is invalid or has expired');
      return { email: row.email };
    },

    async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
      const row = await verifications.findActive('password_reset', token);
      if (!row) throw new AppError('ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุ', 400, 'invalid_request', 'The reset link is invalid or has expired');
      const user = row.user_id ? await users.findById(row.user_id as number) : await users.findByEmail(str(row.email));
      if (!user) throw notFound('ผู้ใช้งาน', 'user not found');
      await withTransaction(async (tx) => {
        await users.update(user.id as number, { password_hash: await hashPassword(newPassword), is_first_login: false }, tx);
        await verifications.markUsed(row.id as number, tx);
      });
      await tokens.revokeAllSessions(user.id as number);
    },

    async verifyCurrentPassword(userId: number, password: string): Promise<void> {
      const user = await users.findById(userId);
      if (!user || !(await verifyPassword(password, str(user.password_hash)))) {
        throw new AppError('รหัสผ่านไม่ถูกต้อง', 401, 'invalid_credentials', 'password_not_correct');
      }
    },

    async changePassword(userId: number, password: string): Promise<void> {
      const updated = await users.update(userId, { password_hash: await hashPassword(password), is_first_login: false });
      if (!updated) throw notFound('ผู้ใช้งาน', 'user not found');
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
