import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
import { TopAlertBanner } from "@/components/navigation/top-alert-banner";
import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import { Spacing, TopOverlayClearance } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  analyzeOcrImage,
  createOcrUploadUrl,
  uploadImageToPresignedUrl,
} from "@/services/ocr-api";

function logOcrDebug(message: string, value?: unknown) {
  const formattedValue =
    value === undefined ? "" : ` ${JSON.stringify(value, null, 2)}`;

  console.log(`[OCR] ${message}${formattedValue}`);
  console.warn(`[OCR] ${message}${formattedValue}`);
}

export default function PrescriptionPhotoPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const params = useLocalSearchParams<{ imageUri?: string; source?: string }>();
  const imageUri = Array.isArray(params.imageUri) ? params.imageUri[0] : params.imageUri;
  const source = Array.isArray(params.source) ? params.source[0] : params.source;

  async function handleAnalyzePress() {
    if (!imageUri || isAnalyzing) {
      return;
    }

    try {
      setIsAnalyzing(true);
      logOcrDebug("upload-url request started");
      const { object_key, upload_url } = await createOcrUploadUrl();
      logOcrDebug("upload-url response received", { object_key });

      logOcrDebug("S3 upload started");
      await uploadImageToPresignedUrl(upload_url, imageUri);
      logOcrDebug("S3 upload finished");

      logOcrDebug("analyze request started", { object_key });
      const result = await analyzeOcrImage(object_key);
      logOcrDebug("analyze response received", result);

      if (!result.resultJson) {
        throw new Error(result.errorMessage ?? "OCR 분석 결과가 비어 있어요.");
      }

      const ocrResultParam = JSON.stringify(result.resultJson);

      router.replace({
        pathname: "/prescription-manual",
        params: {
          ocrResult: ocrResultParam,
        },
      });
    } catch (error) {
      console.error("[OCR] analyze flow failed", error);
      Alert.alert(
        "OCR 분석 실패",
        error instanceof Error ? error.message : "처방전 분석 중 문제가 발생했어요.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

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
          disabled={!imageUri || isAnalyzing}
          onPress={handleAnalyzePress}
          style={[
            styles.primaryButton,
            {
              backgroundColor: theme.text,
              opacity: !imageUri || isAnalyzing ? 0.55 : 1,
            },
          ]}
        >
          {isAnalyzing ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <ThemedText
              style={[styles.primaryButtonLabel, { color: theme.background }]}
            >
              분석하기
            </ThemedText>
          )}
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
