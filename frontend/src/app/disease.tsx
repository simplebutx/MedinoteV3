import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreen } from '@/components/common/app-screen';
import { TopAlertBanner } from '@/components/navigation/top-alert-banner';
import { DiseaseListSection } from '@/components/mypage/disease-list-section';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing, TopOverlayClearance } from '@/constants/theme';

export default function DiseaseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <AppScreen showTopAlert={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + TopOverlayClearance + 28,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <ThemedText themeColor="textSecondary" style={styles.eyebrow}>
              건강정보
            </ThemedText>
            <ThemedText style={styles.title}>기저질환</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              현재 관리 중인 질환을 검색해서 내 목록으로 정리할 수 있어요.
            </ThemedText>
          </View>
          <TopAlertBanner
            unreadCount={3}
            onPress={() => router.push('/notifications')}
          />
        </View>

        <DiseaseListSection />
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
