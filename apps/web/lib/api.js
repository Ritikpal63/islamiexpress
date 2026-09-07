import { getApiUrl } from './api-config.mjs';

export async function apiFetch(path, options={}) {
  try {
    const res = await fetch(`${getApiUrl()}${path}`, { ...options, next: options.next ?? { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch (_) {
    return null;
  }
}

export async function clientApi(path, options={}) {
  // Existing sessions keep working during migration to an HttpOnly cookie.
  let token = null;
  try { token = window.localStorage.getItem('ie_token'); } catch {}
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token && !['null', 'undefined'].includes(token)) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`/api${path}`, {
    ...options,
    cache: 'no-store',
    credentials: 'same-origin',
    headers,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const error = new Error(data?.message || 'The service could not complete your request. Please try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}
