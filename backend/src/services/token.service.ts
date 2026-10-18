import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { withTransaction } from '../database';
import { logger } from '../logger';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository';
import { UserRepository } from '../repositories/user.repository';
import { AccessTokenPayload, AuthUser, RoleType, SessionSource, TokenPair, UserType } from '../types/auth.types';
import { Row } from '../types/database.types';
import { AppError } from '../utils/errors';

// Pinned when signing and when verifying, so a token can't pick the algorithm it is checked with
const JWT_ALGORITHM: jwt.Algorithm = 'HS256';
const INVALID_REFRESH = 'รหัสรีเฟรชไม่ถูกต้องหรือหมดอายุ';
const REUSE_GRACE_MS = 10_000;

export function signAccessToken(user: Row, sid: string, isDemo: boolean): string {
  const payload: AccessTokenPayload = {
    userId: user.id as number,
    sid,
    type: user.type as UserType,
    roleType: user.role_type as RoleType,
    roleId: (user.role_id as number | null) ?? null,
    ...(isDemo ? { demo: true } : {}),
  };
  return jwt.sign(payload, config.tokenSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: config.accessTokenExpiry as NonNullable<jwt.SignOptions['expiresIn']>,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, config.tokenSecret, { algorithms: [JWT_ALGORITHM] }) as AccessTokenPayload;
  if (typeof decoded.userId !== 'number' || typeof decoded.sid !== 'string') {
    throw new jwt.JsonWebTokenError('token has no session');
  }
  return decoded;
}

export function createTokenService(refreshTokens: RefreshTokenRepository, users: UserRepository) {
  return {
    async issueSession(user: Row, isDemo: boolean, source: SessionSource): Promise<TokenPair> {
      const familyId = crypto.randomUUID();
      const refresh_token = await refreshTokens.create(user.id as number, config.refreshTokenExpiryMs, familyId, isDemo, source);
      refreshTokens.deleteExpired().catch((err: unknown) => logger.warn({ err }, 'could not clear expired tokens'));
      return { access_token: signAccessToken(user, familyId, isDemo), refresh_token };
    },

    // Refresh tokens rotate on every use; a retired token presented again outside the grace window
    // is treated as stolen and the whole family is revoked
    async rotate(token: string, source: SessionSource): Promise<{ user: Row; tokens: TokenPair; isDemo: boolean }> {
      const rotated = await withTransaction(async (tx) => {
        const consumed = await refreshTokens.consume(token, tx);
        if (!consumed) return null;
        const user = await users.findAuthById(consumed.userId, tx);
        if (!user) throw new AppError(INVALID_REFRESH, 401, 'token_invalid', 'Invalid or expired refresh token');
        const refresh_token = await refreshTokens.create(user.id as number, config.refreshTokenExpiryMs, consumed.familyId, consumed.isDemo, source, tx);
        return { user, isDemo: consumed.isDemo, tokens: { access_token: signAccessToken(user, consumed.familyId, consumed.isDemo), refresh_token } };
      });
      if (rotated) return rotated;

      const reused = await refreshTokens.findUsed(token);
      if (!reused) throw new AppError(INVALID_REFRESH, 401, 'token_invalid', 'Invalid or expired refresh token');

      const now = Date.now();
      if (reused.usedAt && now - reused.usedAt.getTime() <= REUSE_GRACE_MS && reused.expiresAt.getTime() > now) {
        const user = await users.findAuthById(reused.userId);
        if (user) {
          const refresh_token = await refreshTokens.create(user.id as number, config.refreshTokenExpiryMs, reused.familyId, reused.isDemo, source);
          return { user, isDemo: reused.isDemo, tokens: { access_token: signAccessToken(user, reused.familyId, reused.isDemo), refresh_token } };
        }
      }

      await refreshTokens.deleteFamily(reused.familyId);
      logger.warn({ userId: reused.userId }, 'refresh token reuse detected');
      throw new AppError(INVALID_REFRESH, 401, 'token_invalid', 'Invalid or expired refresh token');
    },

    // A valid signature is not enough: the session family must still exist, so logout and a
    // disabled account cut access before the access token expires
    async authenticate(token: string): Promise<AuthUser | null> {
      const payload = verifyAccessToken(token);
      const [user, alive] = await Promise.all([users.findAuthById(payload.userId), refreshTokens.familyAlive(payload.sid)]);
      if (!user || !alive) return null;
      return {
        userId: user.id as number,
        sessionId: payload.sid,
        type: user.type as UserType,
        roleType: user.role_type as RoleType,
        roleId: (user.role_id as number | null) ?? null,
        isDemo: payload.demo === true || (user.is_demo as boolean),
      };
    },

    revokeSession(sessionId: string): Promise<void> {
      return refreshTokens.deleteFamily(sessionId);
    },

    revokeAllSessions(userId: number): Promise<void> {
      return refreshTokens.deleteAllForUser(userId);
    },
  };
}

export type TokenService = ReturnType<typeof createTokenService>;
