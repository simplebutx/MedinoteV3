import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export function MyPageProfileSummary() {
  const { user } = useAuth();

  return (
    <View style={styles.header}>
      <ThemedText type="subtitle" style={styles.name}>
        {user?.name ?? '사용자 이름'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
  },
  name: {
    lineHeight: 38,
  },
});
