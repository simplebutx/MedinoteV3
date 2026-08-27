import { Redirect } from 'expo-router';

import AppTabs from '@/components/navigation/app-tabs';
import { useAuth } from '@/providers/auth-provider';

export default function TabsLayout() {
  const { isAuthenticated, isHydrating } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <AppTabs />;
}
