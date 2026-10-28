import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { AppConfig } from '../config.js';
import { AppError } from '../errors.js';
import { clearAuthCookies, setAuthCookies } from '../auth/cookies.js';
import { loginAdmin, revokeSession, authenticateSession } from '../auth/service.js';
import { loginSchema } from '../auth/schemas.js';
import { sessionRepository, userRepository } from '../auth/repositories.js';
import { parseCookies, requireAdmin, requireCsrf } from '../auth/request.js';
import { validateBody } from '../validation.js';
import { AuditLogModel } from '../audit/model.js';
import { recordAudit } from '../audit/service.js';

export function createAdminRouter(config: AppConfig): Router {
  const router = Router();
  const adminLoginRateLimit = rateLimit({
    windowMs: config.authRateLimitWindowMs,
    limit: config.authRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: { code: 'AUTH_RATE_LIMITED', message: 'Too many login attempts. Please wait and try again.' } }),
  });

  // Login is the only intentionally public admin route; it creates the protected session.
  router.post('/auth/login', adminLoginRateLimit, validateBody(loginSchema), async (req, res, next) => {
    try {
      const result = await loginAdmin(req.body, userRepository, sessionRepository, config.sessionTtlDays);
      await recordAudit({
        actorUserId: result.user.id,
        action: 'admin.login',
        entityType: 'User',
        entityId: result.user.id,
        requestId: String(req.id),
      });
      setAuthCookies(res, config, result.sessionToken, result.csrfToken, result.expiresAt);
      res.json({ data: { user: result.user } });
    } catch (error) {
      next(error);
    }
  });

  router.use(requireAdmin(config));

  router.get('/auth/me', async (req, res, next) => {
    try {
      const token = parseCookies(req.header('cookie'))[config.sessionCookieName];
      if (!token) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      const { user } = await authenticateSession(token, userRepository, sessionRepository, 'admin');
      res.json({ data: { user } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/logout', requireCsrf, async (req, res, next) => {
    try {
      await revokeSession(req.auth!.sessionToken, sessionRepository);
      await recordAudit({
        actorUserId: req.auth!.userId,
        action: 'admin.logout',
        entityType: 'User',
        entityId: req.auth!.userId,
        requestId: String(req.id),
      });
      clearAuthCookies(res, config);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get('/audit-logs', async (req, res, next) => {
    try {
      const requestedLimit = Number(req.query.limit ?? 50);
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
      const logs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(limit).lean();
      res.json({ data: { auditLogs: logs.map((log) => ({
        id: String(log._id),
        actorUserId: String(log.actorUserId),
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        requestId: log.requestId,
        ...(log.changes ? { changes: log.changes } : {}),
        createdAt: log.createdAt,
      })) } });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
