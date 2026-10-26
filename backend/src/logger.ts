import pino from 'pino';

export function createLogger(level: string) {
  return pino({
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'password',
        'passwordHash',
        'token',
        'accessToken',
        'refreshToken',
        'mongodbUri',
      ],
      censor: '[REDACTED]',
    },
  });
}
