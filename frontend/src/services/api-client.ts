import { buildApiUrl } from '@/constants/api';

import { readStoredAccessToken } from './auth-storage';

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await readStoredAccessToken();
  const headers = new Headers(init.headers);
  const hasFormDataBody =
    typeof FormData !== 'undefined' && init.body instanceof FormData;

  if (!headers.has('Content-Type') && init.body && !hasFormDataBody) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers,
  });
}
