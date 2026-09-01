import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
import { TopAlertBanner } from "@/components/navigation/top-alert-banner";
import {
  toPrescriptionRecord,
  type PrescriptionMedicine,
  type PrescriptionRecord,
} from "@/components/prescription/prescription-types";
import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import { Spacing, TopOverlayClearance } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  createPrescriptionAnalysis,
} from "@/services/analysis-api";
import { cancelMedicationNotifications } from "@/services/medication-notification-service";
import { deleteSchedule, fetchScheduleById } from "@/services/schedule-api";

export default function PrescriptionDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const [prescription, setPrescription] = useState<PrescriptionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSchedule() {
      if (!params.id) {
        if (mounted) {
          setErrorMessage("처방전을 찾을 수 없어요.");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const schedule = await fetchScheduleById(Number(params.id));
        if (mounted) {
          setPrescription(toPrescriptionRecord(schedule));
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : "처방전을 불러오지 못했어요.",
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSchedule();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  const handleDelete = () => {
    if (!prescription) {
      return;
    }

    Alert.alert("처방전 삭제", "이 처방전을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSchedule(Number(prescription.id));
            await cancelMedicationNotifications(Number(prescription.id));
            router.replace("/(tabs)/prescription");
          } catch (error) {
            Alert.alert(
              "처방전",
              error instanceof Error && error.message
                ? error.message
                : "처방전을 삭제하지 못했어요.",
            );
          }
        },
      },
    ]);
  };

  const handleAnalysisPress = async () => {
    if (!prescription || isAnalysisLoading) {
      return;
    }

    setIsAnalysisLoading(true);

    try {
      const scheduleId = Number(prescription.id);
      const analysis = await createPrescriptionAnalysis(scheduleId);

      router.push({
        pathname: "/prescription-analysis/[id]",
        params: { id: prescription.id, analysisId: String(analysis.id) },
      });
    } catch (error) {
      Alert.alert(
        "AI 복약 점검",
        error instanceof Error && error.message
          ? error.message
          : "처방전 분석을 시작하지 못했어요.",
      );
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AppScreen showTopAlert={false}>
        <View style={styles.emptyWrap}>
          <ActivityIndicator />
        </View>
      </AppScreen>
    );
  }

  if (!prescription) {
    return (
      <AppScreen showTopAlert={false}>
        <View style={styles.emptyWrap}>
          <ThemedText type="subtitle">
            {errorMessage || "처방전을 찾을 수 없어요."}
          </ThemedText>
        </View>
      </AppScreen>
    );
  }

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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <ThemedText type="small" themeColor="textSecondary">
              PRESCRIPTION
            </ThemedText>
            <ThemedText type="subtitle">처방전 상세</ThemedText>
          </View>
          <TopAlertBanner
            unreadCount={3}
            onPress={() => router.push("/notifications")}
          />
        </View>

        <ThemedView type="backgroundElement" style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryCopy}>
              <ThemedText style={styles.summaryTitle}>
                {prescription.hospitalName}
              </ThemedText>
              <ThemedText
                themeColor="textSecondary"
                style={styles.summarySubtext}
              >
                {prescription.pharmacyName || "약국 정보 없음"}
              </ThemedText>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: prescription.isActive
                    ? theme.backgroundSelected
                    : "transparent",
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <ThemedText themeColor="textSecondary" style={styles.statusLabel}>
                {prescription.isActive ? "복용 중" : "복용 종료"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.metaRow}>
            <MetaItem label="조제일" value={prescription.dispensedDate} />
            <MetaItem label="약 개수" value={`${prescription.medicines.length}개`} />
          </View>
        </ThemedView>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>약 목록</ThemedText>
          <View style={styles.medicineList}>
            {prescription.medicines.map((medicine, index) => (
              <ThemedView
                key={medicine.id}
                type="backgroundElement"
                style={styles.medicineCard}
              >
                <View style={styles.medicineHeader}>
                  <ThemedText style={styles.medicineName}>
                    {medicine.customMedicineName}
                  </ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    style={styles.medicineBadge}
                  >
                    약 {index + 1}
                  </ThemedText>
                </View>

                <ThemedText
                  themeColor="textSecondary"
                  style={styles.medicineSummary}
                >
                  {buildMedicineSummary(medicine)}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        </View>

        <Pressable
          disabled={isAnalysisLoading}
          onPress={handleAnalysisPress}
          style={[
            styles.aiAnalysisButton,
            isAnalysisLoading && styles.aiAnalysisButtonDisabled,
          ]}
        >
          <View style={styles.aiButtonIcon}>
            {isAnalysisLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.aiButtonIconText}>AI</ThemedText>
            )}
          </View>
          <View style={styles.aiButtonCopy}>
            <ThemedText style={styles.aiButtonTitle}>
              {isAnalysisLoading ? "분석 중이에요" : "AI 복약 점검"}
            </ThemedText>
            <ThemedText style={styles.aiButtonSubtext}>
              {isAnalysisLoading
                ? "약 정보와 개인 주의 항목을 확인하고 있어요."
                : "처방전 주의사항과 개인 건강정보를 함께 확인해요."}
            </ThemedText>
          </View>
        </Pressable>

        <View style={styles.actionRow}>
          <Pressable
            style={[
              styles.secondaryAction,
              { backgroundColor: theme.backgroundElement },
            ]}
            onPress={() =>
              router.push({
                pathname: "/prescription-manual",
                params: { id: prescription.id },
              })
            }
          >
            <ThemedText style={styles.secondaryActionLabel}>수정</ThemedText>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={[
              styles.secondaryAction,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <ThemedText style={styles.secondaryActionLabel}>삭제</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <ThemedText themeColor="textSecondary" style={styles.metaLabel}>
        {label}
      </ThemedText>
      <ThemedText style={styles.metaValue}>{value}</ThemedText>
    </View>
  );
}

function buildMedicineSummary(medicine: PrescriptionMedicine) {
  const dosage = medicine.dosageAmount
    ? `${medicine.dosageAmount}${medicine.dosageUnit || ""}`
    : medicine.dosageUnit;
  const frequency = medicine.timesPerDay
    ? `하루 ${medicine.timesPerDay}회`
    : "";
  const duration = medicine.durationDays ? `${medicine.durationDays}일` : "";
  const times = medicine.times.map((time) => time.takeTime).join(", ");

  return [dosage, frequency, duration, times].filter(Boolean).join(" · ");
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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
  summaryCard: {
    borderRadius: 22,
    padding: 18,
    gap: Spacing.three,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  summaryCopy: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
  },
  summarySubtext: {
    fontSize: 15,
    lineHeight: 20,
  },
  statusBadge: {
    minWidth: 70,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  statusLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  metaItem: {
    flex: 1,
    gap: 4,
  },
  metaLabel: {
    fontSize: 13,
    lineHeight: 16,
  },
  metaValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
  },
  medicineList: {
    gap: Spacing.two,
  },
  medicineCard: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  medicineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  medicineName: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
  },
  medicineBadge: {
    fontSize: 12,
    lineHeight: 16,
  },
  medicineSummary: {
    fontSize: 15,
    lineHeight: 20,
  },
  aiAnalysisButton: {
    minHeight: 82,
    borderRadius: 20,
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    backgroundColor: "#208AEF",
  },
  aiAnalysisButtonDisabled: {
    opacity: 0.72,
  },
  aiButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  aiButtonIconText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
  },
  aiButtonCopy: {
    flex: 1,
    gap: 3,
  },
  aiButtonTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
  },
  aiButtonSubtext: {
    color: "rgba(255, 255, 255, 0.78)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  secondaryAction: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
  },
});
