import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
import { TopAlertBanner } from "@/components/navigation/top-alert-banner";
import { ManualPrescriptionForm } from "@/components/prescription/manual-prescription-form";
import {
  type PrescriptionMedicine,
  toPrescriptionRecord,
  type PrescriptionRecord,
  type PrescriptionSchedule,
} from "@/components/prescription/prescription-types";
import { ThemedText } from "@/components/ui/themed-text";
import { Spacing, TopOverlayClearance } from "@/constants/theme";
import { fetchScheduleById } from "@/services/schedule-api";

const placeholderMedicineNames = new Set([
  "",
  "약",
  "약명",
  "약물명",
  "약 이름",
  "약제명",
  "의약품명",
  "약품명",
]);

export default function PrescriptionManualScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; ocrResult?: string }>();
  const ocrResultParam = Array.isArray(params.ocrResult)
    ? params.ocrResult[0]
    : params.ocrResult;
  const ocrSchedule = parseOcrSchedule(ocrResultParam);
  const [prescription, setPrescription] = useState<PrescriptionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(params.id));
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSchedule() {
      if (!params.id) {
        setPrescription(null);
        setIsLoading(false);
        setErrorMessage("");
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

  const isEditMode = Boolean(params.id);

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
              처방전 등록
            </ThemedText>
            <ThemedText type="subtitle">
              {isEditMode ? "처방전 수정" : "수동 입력"}
            </ThemedText>
          </View>
          <TopAlertBanner
            unreadCount={3}
            onPress={() => router.push("/notifications")}
          />
        </View>

        {isLoading ? (
          <View style={styles.statusWrap}>
            <ActivityIndicator />
          </View>
        ) : errorMessage ? (
          <View style={styles.statusWrap}>
            <ThemedText type="smallBold">불러오기에 실패했어요.</ThemedText>
            <ThemedText themeColor="textSecondary">{errorMessage}</ThemedText>
          </View>
        ) : (
          <ManualPrescriptionForm
            initialPrescription={prescription ?? undefined}
            initialSchedule={!isEditMode ? ocrSchedule : undefined}
          />
        )}
      </ScrollView>
    </AppScreen>
  );
}

function parseOcrSchedule(value?: string): PrescriptionSchedule | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PrescriptionSchedule>;
    const medicines = Array.isArray(parsed.medicines)
      ? parsed.medicines
          .map(normalizeOcrMedicine)
          .filter((medicine) => !placeholderMedicineNames.has(medicine.customMedicineName.trim()))
      : [];

    return {
      hospitalName: typeof parsed.hospitalName === "string" ? parsed.hospitalName : "",
      pharmacyName: typeof parsed.pharmacyName === "string" ? parsed.pharmacyName : "",
      dispensedDate: typeof parsed.dispensedDate === "string" ? parsed.dispensedDate : "",
      medicines: medicines.length > 0 ? medicines : [normalizeOcrMedicine({})],
    };
  } catch {
    return undefined;
  }
}

function normalizeOcrMedicine(
  medicine: Partial<PrescriptionMedicine>,
  index = 0,
): PrescriptionMedicine {
  const matchedMedicineName =
    "matchedMedicineName" in medicine &&
    typeof medicine.matchedMedicineName === "string"
      ? medicine.matchedMedicineName
      : "";
  const extractedMedicineName =
    typeof medicine.customMedicineName === "string"
      ? medicine.customMedicineName
      : "";
  const displayMedicineName = matchedMedicineName || extractedMedicineName;

  return {
    id: medicine.id || `medicine-${index + 1}`,
    itemSeq: typeof medicine.itemSeq === "number" ? medicine.itemSeq : null,
    customMedicineName: displayMedicineName,
    dosageAmount:
      typeof medicine.dosageAmount === "string" && medicine.dosageAmount
        ? medicine.dosageAmount
        : "1",
    dosageUnit:
      typeof medicine.dosageUnit === "string" && medicine.dosageUnit
        ? medicine.dosageUnit
        : "정",
    timesPerDay:
      typeof medicine.timesPerDay === "string" && medicine.timesPerDay
        ? medicine.timesPerDay
        : "1",
    durationDays:
      typeof medicine.durationDays === "string" && medicine.durationDays
        ? medicine.durationDays
        : "1",
    times: [],
  };
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
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
  statusWrap: {
    paddingVertical: 32,
    gap: 8,
    alignItems: "flex-start",
  },
});
