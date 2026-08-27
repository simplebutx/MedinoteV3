import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
import { TopAlertBanner } from "@/components/navigation/top-alert-banner";
import { MyPageLogoutButton } from "@/components/mypage/mypage-logout-button";
import { MyPageMenuList } from "@/components/mypage/mypage-menu-list";
import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import { BottomTabInset, Spacing, TopOverlayClearance } from "@/constants/theme";

export default function MyPageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <AppScreen showTopAlert={false}>
      <ThemedView style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + TopOverlayClearance },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerBlock}>
              <ThemedText themeColor="textSecondary" style={styles.eyebrow}>
                MY PAGE
              </ThemedText>
              <ThemedText style={styles.title}>내 정보</ThemedText>
            </View>
            <TopAlertBanner
              unreadCount={3}
              onPress={() => router.push("/notifications")}
            />
          </View>

          <View style={styles.section}>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.sectionLabel}
            >
              건강 정보
            </ThemedText>
            <MyPageMenuList itemKeys={["basic-health", "disease", "warning"]} />
          </View>

          <View style={styles.section}>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.sectionLabel}
            >
              계정
            </ThemedText>
            <MyPageMenuList itemKeys={["account-info", "settings"]} />
            <MyPageLogoutButton />
          </View>
        </ScrollView>
      </ThemedView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + 132,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  headerBlock: {
    flex: 1,
    gap: Spacing.one,
    paddingRight: 72,
  },
  eyebrow: {
    fontSize: 14,
    lineHeight: 18,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.one,
  },
});
