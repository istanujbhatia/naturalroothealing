const configuredApiHost = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:4000`;
export const API_BASE = `${configuredApiHost.replace(/\/+$/, '')}/api/v1`;

const csrfTokens = { customer: '', admin: '' };

async function getCsrfToken(scope) {
  if (csrfTokens[scope]) return csrfTokens[scope];
  const cookieToken = decodeURIComponent(document.cookie.split('; ').find((item) => item.startsWith('nrh_csrf='))?.split('=').slice(1).join('=') || '');
  if (cookieToken) { csrfTokens[scope] = cookieToken; return cookieToken; }
  const response = await fetch(`${API_BASE}/${scope === 'admin' ? 'admin/' : ''}auth/csrf`, { credentials: 'include' });
  const payload = await response.json().catch(() => ({}));
  if (response.ok) csrfTokens[scope] = payload?.data?.csrfToken || '';
  return csrfTokens[scope];
}

export async function apiFetch(input, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const url = String(input);
  const scope = url.includes('/admin/') ? 'admin' : 'customer';
  const publicMutation = /\/auth\/(login|register)$|\/newsletter$/.test(url);
  const headers = new Headers(options.headers || {});
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && !publicMutation && !headers.get('x-csrf-token')) {
    headers.set('x-csrf-token', await getCsrfToken(scope));
  }
  return fetch(input, { ...options, credentials: options.credentials || 'include', headers });
}
