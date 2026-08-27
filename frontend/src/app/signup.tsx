import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signup } from '@/services/auth-api';

type GenderValue = 'MALE' | 'FEMALE';

const genderOptions: { label: string; value: GenderValue }[] = [
  { label: '남성', value: 'MALE' },
  { label: '여성', value: 'FEMALE' },
];

export default function SignUpScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthDateValue, setBirthDateValue] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<GenderValue>('MALE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBirthDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setBirthDateValue(selectedDate);
    setBirthDate(formatDate(selectedDate));
  };

  const handleSignUp = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();

      if (!trimmedName || !trimmedEmail || !password.trim()) {
        throw new Error('이름, 이메일, 비밀번호를 입력해 주세요.');
      }

      await signup({
        email: trimmedEmail,
        password,
        username: trimmedName,
        birth_date: birthDate.trim() || null,
        gender,
      });

      router.replace('/login');
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : '회원가입 중 오류가 발생했어요.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenShell
      eyebrow="MEDINOTE"
      title="회원가입"
      description="먼저 계정을 만들고 복약 관리 기능을 편하게 시작해보세요.">
      <View style={styles.form}>
        <AuthFormField
          label="이름"
          onChangeText={setName}
          placeholder="이름을 입력하세요"
          value={name}
        />
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

        <View style={styles.dateSection}>
          <ThemedText themeColor="textSecondary" style={styles.dateLabel}>
            생년월일
          </ThemedText>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[
              styles.dateButton,
              { backgroundColor: theme.background },
            ]}>
            <ThemedText
              style={[
                styles.dateButtonText,
                { color: birthDate ? theme.text : theme.textSecondary },
              ]}>
              {birthDate || '날짜를 선택하세요'}
            </ThemedText>
          </Pressable>

          {showDatePicker ? (
            <View style={styles.datePickerWrap}>
              <DateTimePicker
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                mode="date"
                onChange={handleBirthDateChange}
                value={birthDateValue}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.genderSection}>
          <ThemedText themeColor="textSecondary" style={styles.genderLabel}>
            성별
          </ThemedText>
          <View style={styles.genderRow}>
            {genderOptions.map((option) => {
              const selected = option.value === gender;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setGender(option.value)}
                  style={[
                    styles.genderButton,
                    {
                      backgroundColor: selected
                        ? theme.text
                        : theme.background,
                      borderColor: selected
                        ? theme.text
                        : theme.backgroundSelected,
                    },
                  ]}>
                  <ThemedText
                    style={[
                      styles.genderButtonLabel,
                      {
                        color: selected
                          ? theme.background
                          : theme.textSecondary,
                      },
                    ]}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {errorMessage ? (
        <ThemedText themeColor="textSecondary" style={styles.errorText}>
          {errorMessage}
        </ThemedText>
      ) : null}

      <Pressable
        disabled={isSubmitting}
        onPress={handleSignUp}
        style={[
          styles.primaryButton,
          { opacity: isSubmitting ? 0.7 : 1 },
        ]}>
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <ThemedText style={styles.primaryLabel}>회원가입</ThemedText>
        )}
      </Pressable>

      <View style={styles.footer}>
        <ThemedText themeColor="textSecondary" style={styles.footerText}>
          이미 계정이 있나요?
        </ThemedText>
        <Link href="/login">
          <ThemedText style={styles.linkText}>로그인</ThemedText>
        </Link>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  dateSection: {
    gap: Spacing.two,
  },
  dateLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  dateButton: {
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 15,
  },
  dateButtonText: {
    fontSize: 16,
    lineHeight: 20,
  },
  datePickerWrap: {
    alignItems: 'flex-start',
  },
  genderSection: {
    gap: Spacing.two,
  },
  genderLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  genderButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
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

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}
