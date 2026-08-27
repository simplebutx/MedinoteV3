import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from '../ui/themed-text';
import { ThemedView } from '../ui/themed-view';

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

export function BackendConnectionCard() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthResponse | null>(null);

  const handleTestConnection = async () => {
    setLoading(true);

    setTimeout(() => {
      setResult({
        status: 'mock',
        service: 'API disabled',
        timestamp: new Date().toISOString(),
      });
      setLoading(false);
    }, 250);
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>백엔드 연결 테스트</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.meta}>
          API 연결은 임시로 꺼둔 상태입니다.
        </ThemedText>
      </View>

      <Pressable
        onPress={handleTestConnection}
        style={[styles.button, { backgroundColor: theme.text }]}>
        <ThemedText style={[styles.buttonLabel, { color: theme.background }]}>
          {loading ? '테스트중...' : '연결 테스트'}
        </ThemedText>
      </Pressable>

      {result ? (
        <View style={styles.resultBlock}>
          <ThemedText style={styles.successText}>연결 성공</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.resultText}>
            status: {result.status}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.resultText}>
            service: {result.service}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.resultText}>
            time: {result.timestamp}
          </ThemedText>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
  },
  resultBlock: {
    gap: 4,
  },
  successText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
  },
  resultText: {
    fontSize: 14,
    lineHeight: 18,
  },
});
