import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getDefaultApiHost() {
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  if (Platform.OS === 'ios') {
    return '127.0.0.1';
  }

  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const host = hostUri.split(':')[0];

  return host || 'localhost';
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${getDefaultApiHost()}:8000`;

function normalizeApiPath(path: string) {
  if (path === '/health' || path.startsWith('/api/')) {
    return path;
  }

  return path.startsWith('/api') ? path : `/api${path}`;
}

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}${normalizeApiPath(path)}`;
}
