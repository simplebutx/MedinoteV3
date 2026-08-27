import * as SecureStore from 'expo-secure-store';

import type { AuthUser } from '@/providers/auth-provider';

const SESSION_STORAGE_KEY = 'medinote.auth.session';

async function isStorageAvailable() {
  return SecureStore.isAvailableAsync();
}

export async function storeSession(user: AuthUser) {
  if (!(await isStorageAvailable())) {
    return;
  }

  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(user));
}

export async function readStoredSession() {
  if (!(await isStorageAvailable())) {
    return null;
  }

  const value = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function clearStoredSession() {
  if (!(await isStorageAvailable())) {
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}

export async function readStoredAccessToken() {
  const session = await readStoredSession();

  return session?.accessToken ?? null;
}
