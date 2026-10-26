import type { RequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '../config.js';
import { AppError } from '../errors.js';
import { hashOpaqueToken } from './crypto.js';
import { authenticateSession } from './service.js';
import { sessionRepository, userRepository } from './repositories.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionToken: string;
        csrfTokenHash: string;
      };
    }
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(header.split(';').map((part) => {
    const [key, ...value] = part.trim().split('=');
    return [key, decodeURIComponent(value.join('='))];
  }).filter(([key]) => Boolean(key)));
}

export function requireAuth(config: AppConfig): RequestHandler {
  return async (req, _res, next) => {
    try {
      const token = parseCookies(req.header('cookie'))[config.sessionCookieName];
      if (!token) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      const { user, session } = await authenticateSession(token, userRepository, sessionRepository);
      req.auth = {
        userId: user.id,
        sessionToken: token,
        csrfTokenHash: session.csrfTokenHash,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireCsrf: RequestHandler = (req, _res, next) => {
  const provided = req.header('x-csrf-token');
  if (!req.auth || !provided) {
    next(new AppError(403, 'CSRF_TOKEN_REQUIRED', 'CSRF token required'));
    return;
  }
  const expected = Buffer.from(req.auth.csrfTokenHash);
  const actual = Buffer.from(hashOpaqueToken(provided));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    next(new AppError(403, 'CSRF_TOKEN_INVALID', 'CSRF token invalid'));
    return;
  }
  next();
};
