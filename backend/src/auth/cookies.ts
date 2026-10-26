import type { Response } from 'express';
import type { AppConfig } from '../config.js';

export function setAuthCookies(
  res: Response,
  config: AppConfig,
  sessionToken: string,
  csrfToken: string,
  expiresAt: Date,
): void {
  const base = [
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))}`,
    `SameSite=${capitalize(config.cookieSameSite)}`,
    ...(config.cookieSecure ? ['Secure'] : []),
    ...(config.cookieDomain ? [`Domain=${config.cookieDomain}`] : []),
  ];
  res.append('Set-Cookie', `${config.sessionCookieName}=${sessionToken}; HttpOnly; ${base.join('; ')}`);
  res.append('Set-Cookie', `${config.csrfCookieName}=${csrfToken}; ${base.join('; ')}`);
}

export function clearAuthCookies(res: Response, config: AppConfig): void {
  const base = [
    'Path=/',
    'Max-Age=0',
    `SameSite=${capitalize(config.cookieSameSite)}`,
    ...(config.cookieSecure ? ['Secure'] : []),
    ...(config.cookieDomain ? [`Domain=${config.cookieDomain}`] : []),
  ];
  res.append('Set-Cookie', `${config.sessionCookieName}=; HttpOnly; ${base.join('; ')}`);
  res.append('Set-Cookie', `${config.csrfCookieName}=; ${base.join('; ')}`);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
