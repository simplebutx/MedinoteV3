import { AppIcon as Ionicons } from "@/components/ui/app-icon";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
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
  fetchLatestPrescriptionAnalysis,
  fetchPrescriptionAnalysisById,
  type PrescriptionAnalysisMedicine,
  type PrescriptionAnalysisResult,
} from "@/services/analysis-api";
import { fetchScheduleById } from "@/services/schedule-api";

type AnalysisSeverity = "safe" | "caution" | "warning";

type AnalysisItem = {
  title: string;
  body: string;
  severity: AnalysisSeverity;
};

type MedicineReport = {
  scheduleMedicineId: number | null;
  medicineName: string;
  dosageAmount: string | null;
  dosageUnit: string | null;
  personalChecks: AnalysisItem[];
};

export default function PrescriptionAnalysisScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; analysisId?: string }>();
  const [prescription, setPrescription] = useState<PrescriptionRecord | null>(
    null,
  );
  const [analysisResult, setAnalysisResult] =
    useState<PrescriptionAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPrescription() {
      if (!params.id) {
        setErrorMessage("처방전을 찾을 수 없어요.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");
      setAnalysisResult(null);

      try {
        const schedule = await fetchScheduleById(Number(params.id));
        const prescriptionRecord = toPrescriptionRecord(schedule);
        const existingAnalysis = params.analysisId
          ? await fetchPrescriptionAnalysisById(Number(params.analysisId))
          : await fetchLatestPrescriptionAnalysis(schedule.id);
        const analysis =
          existingAnalysis ?? (await createPrescriptionAnalysis(schedule.id));

        if (mounted) {
          setPrescription(prescriptionRecord);
          setAnalysisResult(analysis.resultJson);
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

    void loadPrescription();

    return () => {
      mounted = false;
    };
  }, [params.analysisId, params.id]);

  return (
    <AppScreen showChatbotFab={false} showTopAlert={false}>
      <ThemedView style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + TopOverlayClearance,
              paddingBottom: insets.bottom + 48,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={[
                styles.iconButton,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={theme.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.titleBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              AI CHECK
            </ThemedText>
            <ThemedText type="subtitle">AI 처방전 분석</ThemedText>
          </View>

          {isLoading ? (
            <ThemedView type="backgroundElement" style={styles.loadingCard}>
              <ActivityIndicator />
              <ThemedText type="smallBold">처방전을 분석하는 중이에요.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                약 정보와 개인 주의 항목을 함께 확인하고 있어요.
              </ThemedText>
            </ThemedView>
          ) : null}

          {!isLoading && errorMessage ? (
            <ThemedView type="backgroundElement" style={styles.stateCard}>
              <ThemedText type="smallBold">분석을 시작하지 못했어요.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {errorMessage}
              </ThemedText>
            </ThemedView>
          ) : null}

          {!isLoading && prescription && analysisResult ? (
            <>
              <AnalysisSummaryCard
                prescription={prescription}
                analysisResult={analysisResult}
              />

              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>약별 분석</ThemedText>
                <View style={styles.medicineAnalysisList}>
                  {getMedicineReports(analysisResult, prescription).map((report) => (
                    <MedicineAnalysisCard
                      key={`${report.scheduleMedicineId ?? "medicine"}-${report.medicineName}`}
                      report={report}
                    />
                  ))}
                </View>
              </View>

              <ThemedView type="backgroundElement" style={styles.noticeCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={theme.textSecondary}
                />
                <ThemedText themeColor="textSecondary" style={styles.noticeText}>
                  이 분석은 참고용이며, 복용 변경이나 중단은 의사 또는 약사와
                  상담하세요.
                </ThemedText>
              </ThemedView>
            </>
          ) : null}
        </ScrollView>
      </ThemedView>
    </AppScreen>
  );
}

function AnalysisSummaryCard({
  prescription,
  analysisResult,
}: {
  prescription: PrescriptionRecord;
  analysisResult: PrescriptionAnalysisResult;
}) {
  const theme = useTheme();
  const medicineCount = prescription.medicines.length;
  const summaryMessage =
    analysisResult.summary.message ||
    `${medicineCount}개 약을 개인 정보 기준으로 점검했어요. 아래 약별 분석에서 표시된 주의 항목을 먼저 살펴보세요.`;

  return (
    <ThemedView type="backgroundElement" style={styles.summaryCard}>
      <View style={styles.summaryTopRow}>
        <View style={styles.summaryIcon}>
          <Ionicons
            name="sparkles-outline"
            size={18}
            color={theme.textSecondary}
          />
        </View>
        <ThemedText style={styles.summaryEyebrow}>총정리</ThemedText>
      </View>
      <ThemedText style={styles.summaryTitle}>
        {analysisResult.summary.title || "총정리"}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.summaryBody}>
        {summaryMessage}
      </ThemedText>
    </ThemedView>
  );
}

function MedicineAnalysisCard({
  report,
}: {
  report: MedicineReport;
}) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.medicineCard}>
      <View style={styles.medicineTopRow}>
        <ThemedText style={styles.medicineName}>
          {report.medicineName || "약 이름 미입력"}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.medicineMeta}>
          {report.dosageAmount}
          {report.dosageUnit}
        </ThemedText>
      </View>
      <View style={styles.medicineCheckList}>
        {report.personalChecks.map((item) => {
          const checkMeta = getSeverityMeta(item.severity);

          return (
            <View
              key={`${report.medicineName}-${item.title}`}
              style={[
                styles.medicineReportGroup,
                { borderTopColor: theme.backgroundSelected },
              ]}
            >
              <View style={styles.analysisItemTopRow}>
                <View
                  style={[
                    styles.severityIcon,
                    { backgroundColor: checkMeta.background },
                  ]}
                >
                  <Ionicons
                    name={checkMeta.icon}
                    size={17}
                    color={checkMeta.color}
                  />
                </View>
                <ThemedText style={styles.analysisItemTitle}>
                  {item.title}
                </ThemedText>
              </View>
              <ThemedText themeColor="textSecondary" style={styles.analysisItemBody}>
                {item.body}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
}

function getMedicineReports(
  analysisResult: PrescriptionAnalysisResult,
  prescription: PrescriptionRecord,
): MedicineReport[] {
  if (analysisResult.medicines.length > 0) {
    return analysisResult.medicines.map(toMedicineReport);
  }

  return prescription.medicines.map(buildFallbackMedicineReport);
}

function toMedicineReport(medicine: PrescriptionAnalysisMedicine): MedicineReport {
  return {
    scheduleMedicineId: medicine.scheduleMedicineId,
    medicineName: medicine.medicineName,
    dosageAmount: medicine.dosageAmount,
    dosageUnit: medicine.dosageUnit,
    personalChecks: medicine.checks.map((check) => ({
      title: check.title,
      body: check.message,
      severity: check.severity,
    })),
  };
}

function buildFallbackMedicineReport(medicine: PrescriptionMedicine): MedicineReport {
  const medicineName = medicine.customMedicineName || "이 약";

  return {
    scheduleMedicineId: Number(medicine.id),
    medicineName,
    dosageAmount: medicine.dosageAmount || null,
    dosageUnit: medicine.dosageUnit || null,
    personalChecks: [
      {
        title: "기저질환과의 관련성",
        body: `${medicineName}이 사용자가 등록한 질환과 관련해 복용 전 확인이 필요한 약인지 점검합니다.`,
        severity: "caution" as const,
      },
      {
        title: "건강상태 기반 주의",
        body: "임신, 수유, 흡연, 음주, 소아, 고령 여부에 따라 이 약에 추가 주의가 필요한지 확인합니다.",
        severity: "caution" as const,
      },
      {
        title: "주의 약/성분 매칭",
        body: `${medicineName} 또는 포함 성분이 사용자의 주의 약/성분 목록과 일치하는지 비교합니다.`,
        severity: "warning" as const,
      },
    ],
  };
}

function getSeverityMeta(severity: AnalysisSeverity): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
} {
  if (severity === "warning") {
    return {
      icon: "warning-outline",
      color: "#FFB4B4",
      background: "rgba(255, 92, 92, 0.2)",
    };
  }

  if (severity === "caution") {
    return {
      icon: "alert-circle-outline",
      color: "#F3E4B0",
      background: "rgba(245, 190, 70, 0.22)",
    };
  }

  return {
    icon: "checkmark-circle-outline",
    color: "#BFEBD2",
    background: "rgba(40, 190, 120, 0.2)",
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    gap: Spacing.one,
  },
  titleSubtext: {
    fontSize: 15,
    lineHeight: 21,
  },
  loadingCard: {
    minHeight: 180,
    borderRadius: 22,
    padding: Spacing.four,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  stateCard: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summaryCard: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(60, 135, 247, 0.14)",
  },
  summaryEyebrow: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },
  summaryTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
  },
  analysisItemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  severityIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  analysisItemTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  analysisItemBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  medicineAnalysisList: {
    gap: Spacing.two,
  },
  medicineCard: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  medicineTopRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  medicineName: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  medicineMeta: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  medicineReportGroup: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    gap: Spacing.one,
  },
  medicineCheckList: {
    gap: Spacing.two,
  },
  noticeCard: {
    borderRadius: 18,
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
