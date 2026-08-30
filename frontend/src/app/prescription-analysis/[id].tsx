import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { fetchScheduleById } from "@/services/schedule-api";

type AnalysisSeverity = "safe" | "caution" | "warning";

type AnalysisItem = {
  title: string;
  body: string;
  severity: AnalysisSeverity;
};

type MockAnalysis = {
  keyChecks: AnalysisItem[];
  personalChecks: AnalysisItem[];
  scheduleChecks: AnalysisItem[];
};

export default function PrescriptionAnalysisScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const [prescription, setPrescription] = useState<PrescriptionRecord | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const analysis = useMemo(
    () => (prescription ? buildMockAnalysis(prescription) : null),
    [prescription],
  );

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

    void loadPrescription();

    return () => {
      mounted = false;
    };
  }, [params.id]);

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
            <ThemedText type="subtitle">AI 복약 점검</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.titleSubtext}>
              처방전 정보와 개인 건강정보를 바탕으로 주의할 점을 정리합니다.
            </ThemedText>
          </View>

          {isLoading ? (
            <ThemedView type="backgroundElement" style={styles.loadingCard}>
              <ActivityIndicator />
              <ThemedText type="smallBold">처방전을 분석하는 중이에요.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                약 정보, 복용 시간, 개인 주의 항목을 함께 확인하고 있어요.
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

          {!isLoading && prescription && analysis ? (
            <>
              <ThemedView type="backgroundElement" style={styles.summaryCard}>
                <View style={styles.summaryTopRow}>
                  <View style={styles.riskBadge}>
                    <ThemedText style={styles.riskBadgeText}>주의</ThemedText>
                  </View>
                  <ThemedText themeColor="textSecondary" style={styles.mockLabel}>
                    MOCK RESULT
                  </ThemedText>
                </View>

                <ThemedText style={styles.summaryTitle}>
                  {prescription.medicines.length}개 약 기준으로 점검했어요.
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.summaryBody}>
                  현재 화면은 가짜 분석 결과입니다. 실제 AI 연결 후에는 일반
                  주의사항, 개인 기저질환, 건강상태, 주의 약/성분을 함께
                  반영합니다.
                </ThemedText>
              </ThemedView>

              <AnalysisSection title="꼭 확인할 점" items={analysis.keyChecks} />
              <AnalysisSection title="개인화 점검" items={analysis.personalChecks} />
              <AnalysisSection title="복용 방법 점검" items={analysis.scheduleChecks} />

              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>약별 분석</ThemedText>
                <View style={styles.medicineAnalysisList}>
                  {prescription.medicines.map((medicine) => (
                    <MedicineAnalysisCard
                      key={medicine.id}
                      medicine={medicine}
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

function AnalysisSection({
  title,
  items,
}: {
  title: string;
  items: AnalysisItem[];
}) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={styles.analysisList}>
        {items.map((item) => (
          <AnalysisItemCard key={`${title}-${item.title}`} item={item} />
        ))}
      </View>
    </View>
  );
}

function AnalysisItemCard({ item }: { item: AnalysisItem }) {
  const theme = useTheme();
  const meta = getSeverityMeta(item.severity);

  return (
    <ThemedView type="backgroundElement" style={styles.analysisItemCard}>
      <View style={styles.analysisItemTopRow}>
        <View style={[styles.severityIcon, { backgroundColor: meta.background }]}>
          <Ionicons name={meta.icon} size={17} color={meta.color} />
        </View>
        <ThemedText style={styles.analysisItemTitle}>{item.title}</ThemedText>
      </View>
      <ThemedText themeColor="textSecondary" style={styles.analysisItemBody}>
        {item.body}
      </ThemedText>
      <View
        style={[styles.softDivider, { backgroundColor: theme.backgroundSelected }]}
      />
    </ThemedView>
  );
}

function MedicineAnalysisCard({ medicine }: { medicine: PrescriptionMedicine }) {
  return (
    <ThemedView type="backgroundElement" style={styles.medicineCard}>
      <View style={styles.medicineTopRow}>
        <ThemedText style={styles.medicineName}>
          {medicine.customMedicineName || "약 이름 미입력"}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.medicineMeta}>
          {medicine.dosageAmount}
          {medicine.dosageUnit}
        </ThemedText>
      </View>
      <ThemedText themeColor="textSecondary" style={styles.medicineDescription}>
        하루 {medicine.timesPerDay || "1"}회, {medicine.durationDays || "1"}일
        복용으로 등록되어 있어요. 실제 분석에서는 이 약의 주의사항과 개인
        위험요인을 함께 보여줍니다.
      </ThemedText>
      <View style={styles.timeChipRow}>
        {medicine.times.map((time) => (
          <ThemedView key={time.id} type="background" style={styles.timeChip}>
            <ThemedText style={styles.timeChipText}>{time.takeTime}</ThemedText>
          </ThemedView>
        ))}
      </View>
    </ThemedView>
  );
}

function buildMockAnalysis(prescription: PrescriptionRecord): MockAnalysis {
  const medicineNames = prescription.medicines
    .map((medicine) => medicine.customMedicineName)
    .filter(Boolean);
  const firstMedicineName = medicineNames[0] ?? "등록된 약";

  return {
    keyChecks: [
      {
        title: "일반 주의사항 확인 필요",
        body: `${firstMedicineName}의 효능, 복용법, 주의사항, 이상반응 정보를 기준으로 핵심 항목을 요약할 예정입니다.`,
        severity: "caution" as const,
      },
      {
        title: "중복 성분 점검",
        body: "같은 성분 또는 비슷한 효능의 약이 함께 등록되어 있는지 확인합니다.",
        severity: prescription.medicines.length > 1 ? "caution" : "safe",
      },
    ],
    personalChecks: [
      {
        title: "기저질환과의 관련성",
        body: "사용자가 등록한 질환 정보를 함께 보내서 복용 전 확인할 주의 항목을 찾습니다.",
        severity: "caution" as const,
      },
      {
        title: "건강상태 기반 주의",
        body: "임신, 수유, 흡연, 음주, 소아, 고령 여부에 따라 추가 주의가 필요한지 분석합니다.",
        severity: "caution" as const,
      },
      {
        title: "주의 약/성분 매칭",
        body: "못 먹는 약이나 성분으로 등록한 항목과 처방전의 약 정보를 비교합니다.",
        severity: "warning" as const,
      },
    ],
    scheduleChecks: [
      {
        title: "복용 시간 간격",
        body: "복용 시간이 너무 가깝거나 하루 횟수와 맞지 않는 입력이 있는지 확인합니다.",
        severity: "safe" as const,
      },
      {
        title: "복용 기간",
        body: `${prescription.dispensedDate}부터 약별 복용 일수를 기준으로 일정이 생성됩니다.`,
        severity: "safe" as const,
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
    borderRadius: 22,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  riskBadge: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 190, 70, 0.24)",
  },
  riskBadgeText: {
    color: "#F3E4B0",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  mockLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  summaryTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  summaryBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
  },
  analysisList: {
    gap: Spacing.two,
  },
  analysisItemCard: {
    borderRadius: 18,
    padding: Spacing.three,
    gap: Spacing.two,
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
  softDivider: {
    height: 1,
    opacity: 0.7,
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
  medicineDescription: {
    fontSize: 14,
    lineHeight: 21,
  },
  timeChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  timeChip: {
    minHeight: 34,
    borderRadius: 13,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timeChipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
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
