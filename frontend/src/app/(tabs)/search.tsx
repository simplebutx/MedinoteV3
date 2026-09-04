import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
import { TopAlertBanner } from "@/components/navigation/top-alert-banner";
import { MedicineSearchResultCard } from "@/components/search/medicine-search-result-card";
import { SearchBar } from "@/components/search/search-bar";
import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import {
  BottomTabInset,
  Spacing,
  TopOverlayClearance,
} from "@/constants/theme";
import {
  fetchMedicineSearchResult,
  type MedicineSuggestion,
  type MedicineSearchResponse,
} from "@/services/medicine-api";

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [result, setResult] = useState<MedicineSearchResponse | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [resultError, setResultError] = useState("");

  const handleSearch = async (medicine: MedicineSuggestion) => {
    setSelectedKeyword(medicine.itemName);
    setIsLoadingResult(true);
    setResultError("");

    try {
      const nextResult = await fetchMedicineSearchResult(medicine.itemSeq);
      setResult(nextResult);
    } catch (error) {
      setResult(null);
      setResultError(
        error instanceof Error && error.message
          ? error.message
          : "Failed to load medicine details.",
      );
    } finally {
      setIsLoadingResult(false);
    }
  };

  const handleClearSearch = () => {
    setSelectedKeyword("");
    setResult(null);
    setResultError("");
    setIsLoadingResult(false);
  };

  return (
    <AppScreen showTopAlert={false} showChatbotFab>
      <ThemedView style={styles.screen}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + TopOverlayClearance,
              paddingBottom: BottomTabInset + 132,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <ThemedText type="small" themeColor="textSecondary">
                SEARCH
              </ThemedText>
              <ThemedText type="subtitle">약 검색</ThemedText>
            </View>
            <TopAlertBanner
              unreadCount={3}
              onPress={() => router.push("/notifications")}
            />
          </View>

          <SearchBar onSearch={handleSearch} onClear={handleClearSearch} />

          {isLoadingResult ? (
            <ThemedView type="backgroundElement" style={styles.feedbackCard}>
              <ActivityIndicator />
              <ThemedText themeColor="textSecondary">
                {selectedKeyword} 검색 결과를 불러오는 중이에요.
              </ThemedText>
            </ThemedView>
          ) : null}

          {!isLoadingResult && resultError ? (
            <ThemedView type="backgroundElement" style={styles.feedbackCard}>
              <ThemedText themeColor="textSecondary">{resultError}</ThemedText>
            </ThemedView>
          ) : null}

          {!isLoadingResult && result ? (
            <MedicineSearchResultCard result={result} />
          ) : null}
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
  feedbackCard: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
