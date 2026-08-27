import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { login } from '@/services/auth-api';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const trimmedEmail = email.trim();

      if (!trimmedEmail || !password.trim()) {
        throw new Error('이메일과 비밀번호를 입력해 주세요.');
      }

      const loginResult = await login({
        email: trimmedEmail,
        password,
      });

      await signIn({
        email: loginResult.email,
        name: loginResult.username ?? loginResult.email.split('@')[0] ?? '사용자',
        role: loginResult.role,
        accessToken: loginResult.access_token,
      });

      router.replace('/(tabs)');
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : '로그인 중 오류가 발생했어요.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenShell
      eyebrow="MEDINOTE"
      title="로그인"
      description="복약 일정과 건강 정보를 앱에서 바로 관리해보세요.">
      <View style={styles.form}>
        <AuthFormField
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          label="이메일"
          onChangeText={setEmail}
          placeholder="이메일을 입력하세요"
          value={email}
        />
        <AuthFormField
          label="비밀번호"
          onChangeText={setPassword}
          placeholder="비밀번호를 입력하세요"
          secureTextEntry
          value={password}
        />
      </View>

      {errorMessage ? (
        <ThemedText themeColor="textSecondary" style={styles.errorText}>
          {errorMessage}
        </ThemedText>
      ) : null}

      <Pressable
        disabled={isSubmitting}
        onPress={handleLogin}
        style={[styles.primaryButton, { opacity: isSubmitting ? 0.7 : 1 }]}>
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <ThemedText style={styles.primaryLabel}>로그인</ThemedText>
        )}
      </Pressable>

      <View style={styles.footer}>
        <ThemedText themeColor="textSecondary" style={styles.footerText}>
          아직 계정이 없나요?
        </ThemedText>
        <Link href="/signup">
          <ThemedText style={styles.linkText}>회원가입</ThemedText>
        </Link>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6482',
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 18,
  },
  linkText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#ff6482',
  },
});
