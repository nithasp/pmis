import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { config } from '../config';

// bcrypt reads only the first 72 bytes of its input, which would drop the pepper of a long
// password; folding both into a fixed-length HMAC first keeps the pepper in play
const peppered = (password: string): string =>
  crypto.createHmac('sha256', config.passwordPepper).update(password, 'utf8').digest('base64');

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(peppered(password), config.saltRounds);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(peppered(password), hash);
}

const DUMMY_HASH = bcrypt.hashSync(peppered('no-such-account'), config.saltRounds);

// An unknown e-mail costs the same as a real one, so response time does not reveal which
// accounts exist
export async function spendVerifyTime(): Promise<void> {
  await bcrypt.compare('no-such-account', DUMMY_HASH);
}

export const randomToken = (bytes = 32): string => crypto.randomBytes(bytes).toString('base64url');

export const randomCode = (digits = 4): string =>
  String(crypto.randomInt(0, 10 ** digits)).padStart(digits, '0');
