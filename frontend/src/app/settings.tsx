import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreen } from '@/components/common/app-screen';
import { BackendConnectionCard } from '@/components/dev/backend-connection-card';
import { TopAlertBanner } from '@/components/navigation/top-alert-banner';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing, TopOverlayClearance } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <AppScreen showTopAlert={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + TopOverlayClearance,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <ThemedText themeColor="textSecondary" style={styles.eyebrow}>
              SETTINGS
            </ThemedText>
            <ThemedText style={styles.title}>환경설정</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              개발용 백엔드 연결 상태와 테스트용 항목을 여기에서 확인할 수 있어요.
            </ThemedText>
          </View>
          <TopAlertBanner
            unreadCount={3}
            onPress={() => router.push('/notifications')}
          />
        </View>

        <BackendConnectionCard />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  eyebrow: {
    fontSize: 14,
    lineHeight: 18,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
});
