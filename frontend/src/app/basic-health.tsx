import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreen } from '@/components/common/app-screen';
import { TopAlertBanner } from '@/components/navigation/top-alert-banner';
import { BasicHealthForm } from '@/components/mypage/basic-health-form';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing, TopOverlayClearance } from '@/constants/theme';

export default function BasicHealthScreen() {
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
              건강정보
            </ThemedText>
            <ThemedText style={styles.title}>기본 건강정보</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              복약 판단에 필요한 기본 상태를 먼저 정리해둘 수 있어요.
            </ThemedText>
          </View>
          <TopAlertBanner
            unreadCount={3}
            onPress={() => router.push('/notifications')}
          />
        </View>

        <BasicHealthForm />
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
