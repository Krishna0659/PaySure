/**
 * Centralized API helper with Clerk auth token injection.
 * Wraps fetch() with automatic authorization headers.
 */

const API_BASE = import.meta.env.VITE_API_URL;

export async function apiFetch(path, { getToken, method = 'GET', body = null, headers = {} } = {}) {
  const token = await getToken();
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}/api/v1${path}`, config);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.detail || json.message || `API error ${res.status}`);
  }

  return json.data;
}
