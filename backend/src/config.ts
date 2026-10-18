import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const MIN_SECRET_LENGTH = 32;
const DAY_MS = 24 * 60 * 60 * 1000;

// Published in the README for local use, so the production seed refuses it
export const DEV_ADMIN_PASSWORD = 'Admin@12345678';

const secret = z.string().min(MIN_SECRET_LENGTH, `must be at least ${MIN_SECRET_LENGTH} characters`);

// A value copied over from .env.example unchanged is treated as missing, so a placeholder key can
// never be sent to the storage provider as if it were real
const isPlaceholder = (value: string | undefined): boolean => !value || /^(your[_-]|<|changeme)/i.test(value);

const envSchema = z
  .object({
    ENV: z.enum(['dev', 'production']).default('dev'),
    NODE_ENV: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(4100),
    ALLOWED_ORIGIN: z.string().default('http://localhost:3000'),
    PUBLIC_URL: z.string().default('http://localhost:4100'),
    FRONTEND_URL: z.string().default('http://localhost:3000'),
    JSON_BODY_LIMIT: z.string().default('5mb'),
    UPLOAD_MAX_MB: z.coerce.number().positive().default(20),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

    API_RATE_LIMIT: z.coerce.number().int().positive().default(1000),
    AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(60),

    TOKEN_SECRET: secret,
    ACCESS_TOKEN_EXPIRY: z.string().default('1h'),
    REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().max(365).default(7),

    PASSWORD_PEPPER: secret,
    SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(10),

    ACTIVITY_LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(180),

    DATABASE_URL: z.string().optional(),
    POSTGRES_HOST: z.string().default('127.0.0.1'),
    POSTGRES_PORT: z.coerce.number().int().positive().default(5435),
    POSTGRES_DB: z.string().default('pmis_dev'),
    POSTGRES_USER: z.string().optional(),
    POSTGRES_PASSWORD: z.string().optional(),
    DATABASE_SSL: z.enum(['off', 'no-verify', 'verify']).optional(),
    DATABASE_SSL_CA: z.string().optional(),

    ADMIN_EMAIL: z.string().default('admin@pmis.local'),
    ADMIN_PASSWORD: z.string().default(DEV_ADMIN_PASSWORD),

    DEMO_LOGIN_ENABLED: z.stringbool().default(true),
    DEMO_EMAIL: z.string().default('demo@pmis.local'),
    DEMO_PASSWORD: z.string().default('Demo@12345678'),
    DEMO_READ_ONLY: z.stringbool().optional(),

    MAIL_DRIVER: z.enum(['log', 'smtp']).default('log'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().default('PMIS <no-reply@pmis.local>'),

    GRAPHQL_INTROSPECTION: z.stringbool().default(true),
    ALTAIR_ENABLED: z.stringbool().default(true),

    STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),
    R2_KEY_PREFIX: z.string().default('pmis'),
  })
  .refine((env) => env.DATABASE_URL || (env.POSTGRES_USER && env.POSTGRES_PASSWORD), {
    error: 'set DATABASE_URL, or POSTGRES_USER and POSTGRES_PASSWORD',
    path: ['DATABASE_URL'],
  })
  .refine(
    (env) =>
      env.STORAGE_DRIVER !== 'r2' ||
      ![env.R2_ACCOUNT_ID, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY, env.R2_BUCKET].some(isPlaceholder),
    {
      error: 'STORAGE_DRIVER=r2 needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET',
      path: ['STORAGE_DRIVER'],
    },
  );

function readEnv(): z.infer<typeof envSchema> {
  const present = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ''),
  );

  const parsed = envSchema.safeParse(present);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `  ${issue.path.join('.') || 'env'}: ${issue.message}`,
    );
    throw new Error(`[config] The environment is not usable:\n${problems.join('\n')}`);
  }
  return parsed.data;
}

const env = readEnv();

// NODE_ENV=production (set by the Docker image) wins over an ENV=dev copied from .env.example
const isProduction = env.ENV === 'production' || env.NODE_ENV === 'production';

const sslMode = env.DATABASE_SSL ?? (env.DATABASE_URL ? 'verify' : 'off');

export const config = {
  env: isProduction ? 'production' : 'dev',
  isProduction,
  port: env.PORT,
  publicUrl: env.PUBLIC_URL.replace(/\/+$/, ''),
  frontendUrl: env.FRONTEND_URL.replace(/\/+$/, ''),
  allowedOrigins: env.ALLOWED_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  jsonBodyLimit: env.JSON_BODY_LIMIT,
  uploadMaxBytes: Math.round(env.UPLOAD_MAX_MB * 1024 * 1024),
  trustProxy: env.TRUST_PROXY,
  logLevel: env.LOG_LEVEL ?? 'info',
  prettyLogs: !isProduction,

  apiRateLimit: env.API_RATE_LIMIT,
  authRateLimit: env.AUTH_RATE_LIMIT,

  tokenSecret: env.TOKEN_SECRET,
  accessTokenExpiry: env.ACCESS_TOKEN_EXPIRY,
  refreshTokenExpiryMs: env.REFRESH_TOKEN_EXPIRY_DAYS * DAY_MS,

  passwordPepper: env.PASSWORD_PEPPER,
  saltRounds: env.SALT_ROUNDS,

  activityLogRetentionDays: env.ACTIVITY_LOG_RETENTION_DAYS,

  database: {
    url: env.DATABASE_URL,
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    name: env.POSTGRES_DB,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    sslMode,
    sslCa: env.DATABASE_SSL_CA,
  },

  adminSeed: {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  },

  demo: {
    loginEnabled: env.DEMO_LOGIN_ENABLED,
    email: env.DEMO_EMAIL,
    password: env.DEMO_PASSWORD,
    readOnly: env.DEMO_READ_ONLY ?? isProduction,
  },

  mail: {
    driver: env.MAIL_DRIVER,
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.MAIL_FROM,
  },

  graphql: {
    introspection: env.GRAPHQL_INTROSPECTION,
    altairEnabled: env.ALTAIR_ENABLED,
  },

  storage: {
    driver: env.STORAGE_DRIVER,
    r2: {
      accountId: env.R2_ACCOUNT_ID ?? '',
      accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
      bucket: env.R2_BUCKET ?? '',
      publicUrl: (env.R2_PUBLIC_URL ?? '').replace(/\/+$/, ''),
      keyPrefix: env.R2_KEY_PREFIX.replace(/^\/+|\/+$/g, ''),
    },
  },
};
