import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
import { TopAlertBanner } from "@/components/navigation/top-alert-banner";
import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import { Spacing, TopOverlayClearance } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function PrescriptionPhotoPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const params = useLocalSearchParams<{ imageUri?: string; source?: string }>();
  const imageUri = Array.isArray(params.imageUri) ? params.imageUri[0] : params.imageUri;
  const source = Array.isArray(params.source) ? params.source[0] : params.source;

  return (
    <AppScreen showTopAlert={false} showChatbotFab={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + TopOverlayClearance,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <ThemedText type="small" themeColor="textSecondary">
              PREVIEW
            </ThemedText>
            <ThemedText type="subtitle">처방전 미리보기</ThemedText>
          </View>
          <TopAlertBanner
            unreadCount={3}
            onPress={() => router.push("/notifications")}
          />
        </View>

        <ThemedView type="backgroundElement" style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <ThemedText themeColor="textSecondary" style={styles.previewLabel}>
              {source === "camera" ? "촬영한 처방전" : "선택한 처방전"}
            </ThemedText>
          </View>

          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              contentFit="cover"
              style={styles.previewImage}
            />
          ) : (
            <View style={styles.emptyState}>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                불러온 이미지가 없어요.
              </ThemedText>
            </View>
          )}
        </ThemedView>

        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.text }]}
        >
          <ThemedText
            style={[styles.primaryButtonLabel, { color: theme.background }]}
          >
            분석하기
          </ThemedText>
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  previewCard: {
    borderRadius: 24,
    padding: 18,
    gap: Spacing.two,
  },
  previewHeader: {
    gap: 4,
  },
  previewLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 20,
  },
  emptyState: {
    borderRadius: 20,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 20,
  },
  primaryButton: {
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
});
