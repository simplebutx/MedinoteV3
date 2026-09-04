import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
import { TopAlertBanner } from "@/components/navigation/top-alert-banner";
import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import { PrescriptionUploadActions } from "@/components/upload/prescription-upload-actions";
import {
  BottomTabInset,
  Spacing,
  TopOverlayClearance,
} from "@/constants/theme";

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <AppScreen showTopAlert={false} showChatbotFab>
      <ThemedView style={styles.screen}>
        <View
          style={[
            styles.content,
            { paddingTop: insets.top + TopOverlayClearance },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <ThemedText type="small" themeColor="textSecondary">
                UPLOAD
              </ThemedText>
              <ThemedText type="subtitle">처방전 업로드</ThemedText>
            </View>
            <TopAlertBanner
              unreadCount={3}
              onPress={() => router.push("/notifications")}
            />
          </View>

          <PrescriptionUploadActions />
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
    paddingBottom: BottomTabInset + 132,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
});
