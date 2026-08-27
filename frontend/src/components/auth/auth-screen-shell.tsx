import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';

type AuthScreenShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>;

export function AuthScreenShell({
  eyebrow,
  title,
  description,
  children,
}: AuthScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 36,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <ThemedText themeColor="textSecondary" style={styles.eyebrow}>
            {eyebrow}
          </ThemedText>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            {description}
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.card}>
          {children}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  hero: {
    gap: Spacing.one,
  },
  eyebrow: {
    fontSize: 14,
    lineHeight: 18,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
