// 화면들을 감싸는 공용 틀
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/providers/auth-provider';
import { useAuth } from '@/providers/auth-provider';
import {
  addMedicationNotificationResponseListener,
  syncMedicationNotifications,
} from '@/services/medication-notification-service';
import { fetchSchedules } from '@/services/schedule-api';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <MedicationNotificationBootstrap />
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="basic-health" />
          <Stack.Screen name="account-info" />
          <Stack.Screen name="disease" />
          <Stack.Screen name="prescription-detail/[id]" />
          <Stack.Screen name="prescription-analysis/[id]" />
          <Stack.Screen name="prescription-manual" />
          <Stack.Screen name="prescription-photo-preview" />
          <Stack.Screen name="warning" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="chatbot" />
          <Stack.Screen name="notifications" />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}

function MedicationNotificationBootstrap() {
  const { isAuthenticated, isHydrating } = useAuth();

  useEffect(() => {
    const subscription = addMedicationNotificationResponseListener();
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isHydrating || !isAuthenticated) {
      return;
    }

    async function syncSchedules() {
      const schedules = await fetchSchedules();
      await syncMedicationNotifications(schedules);
    }

    void syncSchedules().catch(() => undefined);
  }, [isAuthenticated, isHydrating]);

  return null;
}
