import { Redirect } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';

export default function IndexScreen() {
  const { isAuthenticated, isHydrating } = useAuth();

  if (isHydrating) {
    return null;
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/login'} />;
}
