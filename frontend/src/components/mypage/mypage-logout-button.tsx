import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

import { ThemedText } from '../ui/themed-text';
import { ThemedView } from '../ui/themed-view';

export function MyPageLogoutButton() {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <ThemedView type="backgroundElement" style={styles.wrap}>
      <Pressable
        onPress={async () => {
          await signOut();
          router.replace('/login');
        }}
        style={styles.button}>
        <ThemedText style={styles.label}>로그아웃</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  button: {
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  label: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
});
