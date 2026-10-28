import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().trim().min(1, 'MONGODB_URI is required'),
  FRONTEND_ORIGINS: z.string().trim().min(1, 'FRONTEND_ORIGINS is required'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  JSON_BODY_LIMIT: z.string().trim().min(1).default('100kb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(400),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  SESSION_COOKIE_NAME: z.string().regex(/^[a-zA-Z0-9_-]+$/).default('nrh_session'),
  CSRF_COOKIE_NAME: z.string().regex(/^[a-zA-Z0-9_-]+$/).default('nrh_csrf'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().trim().optional(),
  ASSET_UPLOAD_DIR: z.string().trim().min(1).default('../frontend/public/assets'),
  RAZORPAY_KEY_ID: z.string().trim().optional(),
  RAZORPAY_KEY_SECRET: z.string().trim().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().trim().optional(),
  RAZORPAY_MODE: z.literal('test').default('test'),
  PAYMENT_RESERVATION_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  mongodbUri: string;
  frontendOrigins: string[];
  logLevel: string;
  jsonBodyLimit: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  authRateLimitWindowMs: number;
  authRateLimitMax: number;
  sessionTtlDays: number;
  sessionCookieName: string;
  csrfCookieName: string;
  cookieSecure: boolean;
  cookieSameSite: 'lax' | 'strict' | 'none';
  cookieDomain?: string;
  assetUploadDir?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  razorpayMode: 'test';
  paymentReservationTtlMinutes: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = environmentSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid server configuration: ${details}`);
  }

  const frontendOrigins = parsed.data.FRONTEND_ORIGINS
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (frontendOrigins.length === 0) {
    throw new Error('Invalid server configuration: FRONTEND_ORIGINS must contain at least one origin');
  }
  if (parsed.data.NODE_ENV === 'production' && frontendOrigins.includes('*')) {
    throw new Error('Invalid server configuration: wildcard FRONTEND_ORIGINS is not allowed in production');
  }
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.COOKIE_SECURE) {
    throw new Error('Invalid server configuration: COOKIE_SECURE must be true in production');
  }
  if (parsed.data.COOKIE_SAME_SITE === 'none' && !parsed.data.COOKIE_SECURE) {
    throw new Error('Invalid server configuration: COOKIE_SECURE must be true when COOKIE_SAME_SITE is none');
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    mongodbUri: parsed.data.MONGODB_URI,
    frontendOrigins,
    logLevel: parsed.data.LOG_LEVEL,
    jsonBodyLimit: parsed.data.JSON_BODY_LIMIT,
    rateLimitWindowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: parsed.data.RATE_LIMIT_MAX,
    authRateLimitWindowMs: parsed.data.AUTH_RATE_LIMIT_WINDOW_MS,
    authRateLimitMax: parsed.data.AUTH_RATE_LIMIT_MAX,
    sessionTtlDays: parsed.data.SESSION_TTL_DAYS,
    sessionCookieName: parsed.data.SESSION_COOKIE_NAME,
    csrfCookieName: parsed.data.CSRF_COOKIE_NAME,
    cookieSecure: parsed.data.COOKIE_SECURE,
    cookieSameSite: parsed.data.COOKIE_SAME_SITE,
    ...(parsed.data.COOKIE_DOMAIN ? { cookieDomain: parsed.data.COOKIE_DOMAIN } : {}),
    assetUploadDir: parsed.data.ASSET_UPLOAD_DIR,
    ...(parsed.data.RAZORPAY_KEY_ID ? { razorpayKeyId: parsed.data.RAZORPAY_KEY_ID } : {}),
    ...(parsed.data.RAZORPAY_KEY_SECRET ? { razorpayKeySecret: parsed.data.RAZORPAY_KEY_SECRET } : {}),
    ...(parsed.data.RAZORPAY_WEBHOOK_SECRET ? { razorpayWebhookSecret: parsed.data.RAZORPAY_WEBHOOK_SECRET } : {}),
    razorpayMode: parsed.data.RAZORPAY_MODE,
    paymentReservationTtlMinutes: parsed.data.PAYMENT_RESERVATION_TTL_MINUTES,
  };
}
