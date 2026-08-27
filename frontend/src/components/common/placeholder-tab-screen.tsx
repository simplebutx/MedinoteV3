import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, TopOverlayClearance } from '@/constants/theme';

import { AppScreen } from './app-screen';
import { ThemedText } from '../ui/themed-text';
import { ThemedView } from '../ui/themed-view';

type PlaceholderTabScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  showChatbotFab?: boolean;
};

export function PlaceholderTabScreen({
  eyebrow,
  title,
  description,
  showChatbotFab = true,
}: PlaceholderTabScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <AppScreen showChatbotFab={showChatbotFab}>
      <ThemedView style={styles.screen}>
        <View style={[styles.content, { marginTop: insets.top + TopOverlayClearance }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {eyebrow}
          </ThemedText>
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText>{description}</ThemedText>
        </View>
      </ThemedView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: Spacing.three,
  },
  content: {
    gap: Spacing.two,
  },
});
