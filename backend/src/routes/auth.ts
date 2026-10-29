import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { AppConfig } from '../config.js';
import { AppError } from '../errors.js';
import { validateBody } from '../validation.js';
import { clearAuthCookies, setAuthCookies } from '../auth/cookies.js';
import { loginSchema, registerSchema } from '../auth/schemas.js';
import { sessionRepository, userRepository } from '../auth/repositories.js';
import { authenticateSession, loginCustomer, registerCustomer, revokeSession } from '../auth/service.js';
import { parseCookies, requireAuth, requireCsrf } from '../auth/request.js';

export function createAuthRouter(config: AppConfig): Router {
  const router = Router();
  const authRateLimit = rateLimit({
    windowMs: config.authRateLimitWindowMs,
    limit: config.authRateLimitMax,
    skip: () => config.nodeEnv === 'development',
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'AUTH_RATE_LIMITED',
          message: 'Too many login or registration attempts. Please wait and try again.',
        },
      });
    },
  });

  router.post('/register', authRateLimit, validateBody(registerSchema), async (req, res, next) => {
    try {
      const result = await registerCustomer(req.body, userRepository, sessionRepository, config.sessionTtlDays);
      setAuthCookies(res, config, result.sessionToken, result.csrfToken, result.expiresAt);
      res.status(201).json({ data: { user: result.user } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', authRateLimit, validateBody(loginSchema), async (req, res, next) => {
    try {
      const result = await loginCustomer(req.body, userRepository, sessionRepository, config.sessionTtlDays);
      setAuthCookies(res, config, result.sessionToken, result.csrfToken, result.expiresAt);
      res.status(200).json({ data: { user: result.user } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', requireAuth(config), async (req, res, next) => {
    try {
      const token = parseCookies(req.header('cookie'))[config.sessionCookieName];
      if (!token) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      const { user } = await authenticateSession(token, userRepository, sessionRepository);
      res.json({ data: { user } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/csrf', requireAuth(config), async (req, res, next) => {
    try {
      const token = parseCookies(req.header('cookie'))[config.csrfCookieName];
      if (!token) throw new AppError(403, 'CSRF_TOKEN_REQUIRED', 'CSRF token required');
      res.json({ data: { csrfToken: token } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', requireAuth(config), requireCsrf, async (req, res, next) => {
    try {
      await revokeSession(req.auth!.sessionToken, sessionRepository);
      clearAuthCookies(res, config);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
