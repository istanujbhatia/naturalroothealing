const configuredApiHost = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:4000`;
export const API_BASE = `${configuredApiHost.replace(/\/+$/, '')}/api/v1`;

let csrfToken = '';

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const cookieToken = decodeURIComponent(document.cookie.split('; ').find((item) => item.startsWith('nrh_csrf='))?.split('=').slice(1).join('=') || '');
  if (cookieToken) { csrfToken = cookieToken; return csrfToken; }
  const response = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
  const payload = await response.json().catch(() => ({}));
  if (response.ok) csrfToken = payload?.data?.csrfToken || '';
  return csrfToken;
}

export async function apiFetch(input, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const url = String(input);
  const publicMutation = /\/auth\/(login|register)$|\/newsletter$/.test(url);
  const headers = new Headers(options.headers || {});
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && !publicMutation && !headers.get('x-csrf-token')) {
    headers.set('x-csrf-token', await getCsrfToken());
  }
  return fetch(input, { ...options, credentials: options.credentials || 'include', headers });
}
