import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScreen } from "@/components/common/app-screen";
import { TopAlertBanner } from "@/components/navigation/top-alert-banner";
import { CalendarMarkedDate, Calender } from "@/components/schedule/calender";
import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import {
  BottomTabInset,
  Spacing,
  TopOverlayClearance,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  createMedicationIntakeLog,
  fetchDailyMedicationSchedule,
  fetchSchedules,
  updateMedicationIntakeLog,
  type DailyMedicationGroup,
  type DailyMedicationRecord,
  type ScheduleRecord,
} from "@/services/schedule-api";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdays[date.getDay()]}요일`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildMarkedDates(schedules: ScheduleRecord[]) {
  const countByDate = new Map<string, number>();

  for (const schedule of schedules) {
    const start = parseDateKey(schedule.startDate);

    for (const medicine of schedule.medicines) {
      const duration = Number(medicine.durationDays || "0");
      const activeDays = duration > 0 ? duration : 1;
      const timesPerDay = Math.max(medicine.times.length, 1);

      for (let offset = 0; offset < activeDays; offset += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + offset);
        const key = toDateKey(date);
        countByDate.set(key, (countByDate.get(key) || 0) + timesPerDay);
      }
    }
  }

  return [...countByDate.entries()].map<CalendarMarkedDate>(([dateKey, count]) => ({
    dateKey,
    count,
  }));
}

export default function ScheduleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [markedDates, setMarkedDates] = useState<CalendarMarkedDate[]>([]);
  const [dailyGroups, setDailyGroups] = useState<DailyMedicationGroup[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  const loadMarkedDates = useCallback(async () => {
    const schedules = await fetchSchedules();
    setMarkedDates(buildMarkedDates(schedules));
  }, []);

  const loadDailySchedule = useCallback(async (dateKey: string) => {
    const daily = await fetchDailyMedicationSchedule(dateKey);
    setDailyGroups(daily.groups);
  }, []);

  const loadAll = useCallback(async () => {
    setErrorMessage("");

    try {
      await loadMarkedDates();
      await loadDailySchedule(selectedDateKey);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "복약 일정을 불러오지 못했어요.",
      );
    }
  }, [loadDailySchedule, loadMarkedDates, selectedDateKey]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll]),
  );

  const handleSelectDate = useCallback(
    async (date: Date) => {
      setSelectedDate(date);
      setErrorMessage("");

      try {
        await loadDailySchedule(toDateKey(date));
      } catch (error) {
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "복약 일정을 불러오지 못했어요.",
        );
      }
    },
    [loadDailySchedule],
  );

  const handleToggleTaken = useCallback(
    async (medication: DailyMedicationRecord) => {
      const nextTaken = medication.intakeStatus !== "taken";
      const payload = {
        medicationScheduleId: medication.medicationScheduleId,
        medicationScheduleTimeId: medication.medicationScheduleTimeId,
        status: nextTaken ? "taken" : "pending",
        scheduledAt: medication.scheduledAt,
        takenAt: nextTaken ? new Date().toISOString() : null,
      };

      try {
        if (medication.medicationIntakeLogId) {
          await updateMedicationIntakeLog(medication.medicationIntakeLogId, payload);
        } else {
          await createMedicationIntakeLog(payload);
        }

        await loadDailySchedule(selectedDateKey);
      } catch (error) {
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "복용 기록을 저장하지 못했어요.",
        );
      }
    },
    [loadDailySchedule, selectedDateKey],
  );

  return (
    <AppScreen showTopAlert={false}>
      <ThemedView style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + TopOverlayClearance },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <ThemedText type="small" themeColor="textSecondary">
                SCHEDULE
              </ThemedText>
              <ThemedText type="subtitle">복약 일정</ThemedText>
            </View>

            <TopAlertBanner
              unreadCount={3}
              onPress={() => router.push("/notifications")}
            />
          </View>

          <Calender
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            markedDates={markedDates}
          />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderCopy}>
                <ThemedText type="smallBold">
                  {formatDateLabel(selectedDate)}
                </ThemedText>
                {errorMessage ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {errorMessage}
                  </ThemedText>
                ) : null}
              </View>
            </View>

            {dailyGroups.length > 0 ? (
              dailyGroups.map((group) => (
                <View key={`${selectedDateKey}-${group.takeTime}`} style={styles.groupBlock}>
                  <View style={styles.groupTimeHeader}>
                    <ThemedText style={styles.groupTime}>{group.takeTime}</ThemedText>
                  </View>

                  <ThemedView type="backgroundElement" style={styles.groupCard}>
                    {group.medications.map((medication, index) => {
                      const isChecked = medication.intakeStatus === "taken";
                      const doseLabel = medication.dosageAmount
                        ? `${medication.dosageAmount}${medication.dosageUnit}`
                        : medication.dosageUnit;

                      return (
                        <View key={`${medication.medicationScheduleTimeId}-${index}`} style={styles.medicineRow}>
                          <View style={styles.medicineCopy}>
                            <View style={styles.medicineTitleRow}>
                              <ThemedText style={styles.medicineName}>
                                {medication.customMedicineName}
                              </ThemedText>
                              <ThemedText themeColor="textSecondary" style={styles.medicineDose}>
                                {doseLabel}
                              </ThemedText>
                            </View>
                            <ThemedText themeColor="textSecondary" style={styles.medicineSubtext}>
                              {medication.hospitalName}
                            </ThemedText>
                          </View>

                          <Pressable
                            onPress={() => {
                              void handleToggleTaken(medication);
                            }}
                            style={[
                              styles.checkButton,
                              {
                                borderColor: isChecked
                                  ? theme.text
                                  : theme.backgroundSelected,
                                backgroundColor: isChecked ? theme.text : "transparent",
                              },
                            ]}
                          >
                            {isChecked ? (
                              <ThemedText style={styles.checkMark}>✓</ThemedText>
                            ) : null}
                          </Pressable>

                          {index < group.medications.length - 1 ? (
                            <View
                              style={[
                                styles.divider,
                                { backgroundColor: theme.backgroundSelected },
                              ]}
                            />
                          ) : null}
                        </View>
                      );
                    })}
                  </ThemedView>
                </View>
              ))
            ) : (
              <ThemedView type="backgroundElement" style={styles.emptyCard}>
                <ThemedText type="smallBold">복약 일정이 없어요.</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  처방전을 등록하고 복용 시간을 추가하면 여기에서 확인할 수 있어요.
                </ThemedText>
              </ThemedView>
            )}
          </View>
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
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  groupBlock: {
    gap: Spacing.one,
  },
  groupTimeHeader: {
    paddingHorizontal: Spacing.one,
  },
  groupTime: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  groupCard: {
    borderRadius: 20,
    paddingVertical: Spacing.one,
    overflow: "hidden",
  },
  medicineRow: {
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  medicineCopy: {
    flex: 1,
    gap: 2,
  },
  medicineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  medicineName: {
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
  medicineDose: {
    fontSize: 15,
    lineHeight: 20,
  },
  medicineSubtext: {
    fontSize: 13,
    lineHeight: 16,
  },
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#000000",
    fontSize: 14,
    lineHeight: 14,
    fontWeight: "700",
  },
  divider: {
    position: "absolute",
    left: Spacing.three,
    right: Spacing.three,
    bottom: 0,
    height: 1,
  },
  emptyCard: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
