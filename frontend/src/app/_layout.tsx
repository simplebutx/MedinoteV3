// 화면들을 감싸는 공용 틀
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/providers/auth-provider';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
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
