import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fetchSchedules } from "@/services/schedule-api";

import {
  toPrescriptionRecord,
  type PrescriptionRecord,
} from "./prescription-types";

export function PrescriptionListSection() {
  const router = useRouter();
  const theme = useTheme();
  const [items, setItems] = useState<PrescriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const schedules = await fetchSchedules();
      setItems(schedules.map(toPrescriptionRecord));
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "처방전 목록을 불러오지 못했어요.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSchedules();
    }, [loadSchedules]),
  );

  if (isLoading) {
    return (
      <ThemedView type="backgroundElement" style={styles.statusCard}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (errorMessage) {
    return (
      <ThemedView type="backgroundElement" style={styles.statusCard}>
        <ThemedText type="smallBold">목록을 불러오지 못했어요.</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.statusText}>
          {errorMessage}
        </ThemedText>
        <Pressable
          onPress={() => {
            void loadSchedules();
          }}
          style={[
            styles.retryButton,
            { backgroundColor: theme.backgroundSelected },
          ]}
        >
          <ThemedText style={styles.retryLabel}>다시 시도</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (items.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.statusCard}>
        <ThemedText type="smallBold">등록된 처방전이 없어요.</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.statusText}>
          수동 입력이나 사진 분석으로 처방전을 먼저 등록해주세요.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.listCard}>
      {items.map((item, index) => (
        <Pressable
          key={item.id}
          onPress={() =>
            router.push({
              pathname: "/prescription-detail/[id]",
              params: { id: item.id },
            })
          }
          style={styles.item}
        >
          <View style={styles.itemTopRow}>
            <ThemedText style={styles.itemTitle}>{item.hospitalName}</ThemedText>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: item.isActive
                    ? theme.backgroundSelected
                    : "transparent",
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <ThemedText themeColor="textSecondary" style={styles.statusLabel}>
                {item.isActive ? "복용 중" : "복용 종료"}
              </ThemedText>
            </View>
          </View>

          <ThemedText themeColor="textSecondary" style={styles.itemSubtext}>
            {item.pharmacyName || "약국 정보 없음"}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.itemMeta}>
            조제일 {item.dispensedDate} · 약 {item.medicines.length}개
          </ThemedText>

          {index < items.length - 1 ? (
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.backgroundSelected },
              ]}
            />
          ) : null}
        </Pressable>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  listCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  statusCard: {
    borderRadius: 18,
    padding: 20,
    gap: 8,
    alignItems: "flex-start",
  },
  statusText: {
    fontSize: 14,
    lineHeight: 18,
  },
  retryButton: {
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  retryLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
  item: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 16,
    gap: Spacing.one,
    position: "relative",
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  itemTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  statusBadge: {
    minWidth: 70,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  statusLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  itemSubtext: {
    fontSize: 15,
    lineHeight: 20,
  },
  itemMeta: {
    fontSize: 14,
    lineHeight: 18,
  },
  divider: {
    position: "absolute",
    left: Spacing.three,
    right: 0,
    bottom: 0,
    height: 1,
  },
});
