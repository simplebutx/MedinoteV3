import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
import { TopAlertBanner } from "@/components/navigation/top-alert-banner";
import { PrescriptionListSection } from "@/components/prescription/prescription-list-section";
import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import {
  BottomTabInset,
  Spacing,
  TopOverlayClearance,
} from "@/constants/theme";

export default function PrescriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <AppScreen showTopAlert={false}>
      <ThemedView style={styles.screen}>
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + TopOverlayClearance,
              paddingBottom: BottomTabInset + 132,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <ThemedText type="small" themeColor="textSecondary">
                PRESCRIPTIONS
              </ThemedText>
              <ThemedText type="subtitle">내 처방전</ThemedText>
            </View>
            <TopAlertBanner
              unreadCount={3}
              onPress={() => router.push("/notifications")}
            />
          </View>

          <PrescriptionListSection />
        </View>
      </ThemedView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flex: 1,
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
});
