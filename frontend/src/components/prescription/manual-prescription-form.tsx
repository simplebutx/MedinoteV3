import { AppIcon as Ionicons } from "@/components/ui/app-icon";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import type {
  PrescriptionMedicine,
  PrescriptionRecord,
  PrescriptionSchedule,
  PrescriptionTime,
} from "@/components/prescription/prescription-types";
import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  createSchedule,
  updateSchedule,
  type ScheduleSavePayload,
} from "@/services/schedule-api";
import { rescheduleMedicationNotifications } from "@/services/medication-notification-service";

type ActiveDatePicker = {
  field: "dispensedDate";
} | null;

type ManualPrescriptionFormProps = {
  initialPrescription?: PrescriptionRecord;
  initialSchedule?: PrescriptionSchedule;
};

const defaultTimes = ["08:00", "12:00", "20:00", "22:00", "23:00"];
const dosageUnitOptions = [
  "정",
  "캡슐",
  "포",
  "ml",
  "mg",
  "g",
  "mcg",
  "정량펌프",
  "스푼",
  "방울",
  "앰플",
  "바이알",
];

function createTime(id: number): PrescriptionTime {
  return {
    id: `time-${id}`,
    takeTime: defaultTimes[id - 1] ?? "08:00",
  };
}

function createMedicine(id: number): PrescriptionMedicine {
  return {
    id: `medicine-${id}`,
    itemSeq: null,
    customMedicineName: "",
    dosageAmount: "1",
    dosageUnit: "정",
    timesPerDay: "1",
    durationDays: "1",
    times: [createTime(1)],
  };
}

function createEmptySchedule(): PrescriptionSchedule {
  return {
    hospitalName: "",
    pharmacyName: "",
    dispensedDate: "",
    medicines: [createMedicine(1)],
  };
}

function syncTimesWithCount(
  times: PrescriptionTime[],
  targetCount: number,
): PrescriptionTime[] {
  const safeCount = Math.max(1, targetCount);

  return Array.from({ length: safeCount }, (_, index) => {
    const existingTime = times[index];
    return (
      existingTime ?? {
        id: `time-${index + 1}`,
        takeTime: defaultTimes[index] ?? "08:00",
      }
    );
  });
}

function createScheduleFromPrescription(
  prescription: PrescriptionRecord,
): PrescriptionSchedule {
  return {
    hospitalName: prescription.hospitalName,
    pharmacyName: prescription.pharmacyName,
    dispensedDate: prescription.dispensedDate,
    medicines: prescription.medicines.map((medicine, index) => {
      const normalizedTimesPerDay = medicine.timesPerDay || "1";
      const syncedTimes = syncTimesWithCount(
        medicine.times.length > 0
          ? medicine.times.map((time, timeIndex) => ({
              ...time,
              id: time.id || `time-${timeIndex + 1}`,
            }))
          : [createTime(1)],
        Number(normalizedTimesPerDay) || 1,
      );

      return {
        ...medicine,
        dosageAmount: medicine.dosageAmount || "1",
        dosageUnit: medicine.dosageUnit || "정",
        timesPerDay: normalizedTimesPerDay,
        durationDays: medicine.durationDays || "1",
        id: medicine.id || `medicine-${index + 1}`,
        times: syncedTimes,
      };
    }),
  };
}

function createScheduleFromInitialSchedule(
  schedule: PrescriptionSchedule,
): PrescriptionSchedule {
  return {
    hospitalName: schedule.hospitalName,
    pharmacyName: schedule.pharmacyName,
    dispensedDate: schedule.dispensedDate,
    medicines: schedule.medicines.map((medicine, index) => {
      const normalizedTimesPerDay = medicine.timesPerDay || "1";

      return {
        ...medicine,
        dosageAmount: medicine.dosageAmount || "1",
        dosageUnit: medicine.dosageUnit || "정",
        timesPerDay: normalizedTimesPerDay,
        durationDays: medicine.durationDays || "1",
        id: medicine.id || `medicine-${index + 1}`,
        times: syncTimesWithCount([], Number(normalizedTimesPerDay) || 1),
      };
    }),
  };
}

export function ManualPrescriptionForm({
  initialPrescription,
  initialSchedule: initialScheduleFromProps,
}: ManualPrescriptionFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const initialSchedule = useMemo(
    () =>
      initialPrescription
        ? createScheduleFromPrescription(initialPrescription)
        : initialScheduleFromProps
          ? createScheduleFromInitialSchedule(initialScheduleFromProps)
        : createEmptySchedule(),
    [initialPrescription, initialScheduleFromProps],
  );
  const [schedule, setSchedule] =
    useState<PrescriptionSchedule>(initialSchedule);
  const [expandedMedicineIds, setExpandedMedicineIds] = useState<string[]>(
    initialSchedule.medicines.map((medicine) => medicine.id),
  );
  const [activeTimePicker, setActiveTimePicker] = useState<{
    medicineId: string;
    timeId: string;
  } | null>(null);
  const [activeDatePicker, setActiveDatePicker] =
    useState<ActiveDatePicker>(null);
  const [pendingPickerDate, setPendingPickerDate] = useState<Date | null>(null);
  const [activeUnitMedicineId, setActiveUnitMedicineId] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const isEditMode = Boolean(initialPrescription);

  useEffect(() => {
    setSchedule(initialSchedule);
    setExpandedMedicineIds(
      initialSchedule.medicines.map((medicine) => medicine.id),
    );
    setFeedbackMessage("");
  }, [initialSchedule]);

  const updateScheduleField = <K extends keyof PrescriptionSchedule>(
    key: K,
    value: PrescriptionSchedule[K],
  ) => {
    setSchedule((prev) => ({ ...prev, [key]: value }));
  };

  const updateMedicine = <K extends keyof PrescriptionMedicine>(
    medicineId: string,
    key: K,
    value: PrescriptionMedicine[K],
  ) => {
    setSchedule((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine) =>
        medicine.id === medicineId ? { ...medicine, [key]: value } : medicine,
      ),
    }));
  };

  const updateTime = (medicineId: string, timeId: string, value: string) => {
    setSchedule((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine) =>
        medicine.id === medicineId
          ? {
              ...medicine,
              times: medicine.times.map((time) =>
                time.id === timeId ? { ...time, takeTime: value } : time,
              ),
            }
          : medicine,
      ),
    }));
  };

  const stepMedicineValue = (
    medicineId: string,
    key: "dosageAmount" | "timesPerDay" | "durationDays",
    direction: "up" | "down",
  ) => {
    setSchedule((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine) => {
        if (medicine.id !== medicineId) {
          return medicine;
        }

        const step = key === "dosageAmount" ? 0.5 : 1;
        const minimum = key === "dosageAmount" ? 0.5 : 1;
        const currentValue = parseNumericField(medicine[key], minimum);
        const nextValue =
          direction === "up"
            ? currentValue + step
            : Math.max(minimum, currentValue - step);
        const roundedValue =
          key === "dosageAmount" ? nextValue : Math.round(nextValue);

        return {
          ...medicine,
          [key]:
            key === "dosageAmount"
              ? formatHalfStep(roundedValue)
              : String(roundedValue),
          times:
            key === "timesPerDay"
              ? syncTimesWithCount(medicine.times, roundedValue)
              : medicine.times,
        };
      }),
    }));
  };

  const toggleMedicine = (medicineId: string) => {
    setExpandedMedicineIds((current) =>
      current.includes(medicineId)
        ? current.filter((id) => id !== medicineId)
        : [...current, medicineId],
    );
  };

  const addMedicine = () => {
    const nextMedicine = createMedicine(schedule.medicines.length + 1);

    setSchedule((prev) => ({
      ...prev,
      medicines: [...prev.medicines, nextMedicine],
    }));
    setExpandedMedicineIds((current) => [...current, nextMedicine.id]);
  };

  const removeMedicine = (medicineId: string) => {
    if (schedule.medicines.length === 1) {
      return;
    }

    setSchedule((prev) => ({
      ...prev,
      medicines: prev.medicines.filter(
        (medicine) => medicine.id !== medicineId,
      ),
    }));
    setExpandedMedicineIds((current) =>
      current.filter((id) => id !== medicineId),
    );
    setActiveUnitMedicineId((current) =>
      current === medicineId ? null : current,
    );
  };

  const openDatePicker = () => {
    setPendingPickerDate(parseDate(schedule.dispensedDate));
    setActiveDatePicker({
      field: "dispensedDate",
    });
  };

  const openTimePicker = (medicineId: string, timeId: string) => {
    setPendingPickerDate(parseTime(getTimeValue(schedule, medicineId, timeId)));
    setActiveTimePicker({
      medicineId,
      timeId,
    });
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (!activeTimePicker) {
      return;
    }

    if (Platform.OS === "android") {
      if (event.type !== "dismissed" && selectedDate) {
        updateTime(
          activeTimePicker.medicineId,
          activeTimePicker.timeId,
          formatPickerTime(event, selectedDate),
        );
      }
      setActiveTimePicker(null);
      setPendingPickerDate(null);
      return;
    }

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    setPendingPickerDate(selectedDate);
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (!activeDatePicker) {
      return;
    }

    if (Platform.OS === "android") {
      if (event.type !== "dismissed" && selectedDate) {
        updateScheduleField("dispensedDate", formatPickerDate(event, selectedDate));
      }
      setActiveDatePicker(null);
      setPendingPickerDate(null);
      return;
    }

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    setPendingPickerDate(selectedDate);
  };

  const cancelPicker = () => {
    setActiveDatePicker(null);
    setActiveTimePicker(null);
    setPendingPickerDate(null);
  };

  const confirmDatePicker = () => {
    if (!pendingPickerDate) {
      return;
    }

    updateScheduleField("dispensedDate", formatDateFromDate(pendingPickerDate));
    cancelPicker();
  };

  const confirmTimePicker = () => {
    if (!activeTimePicker || !pendingPickerDate) {
      return;
    }

    updateTime(
      activeTimePicker.medicineId,
      activeTimePicker.timeId,
      formatTimeFromDate(pendingPickerDate),
    );
    cancelPicker();
  };

  const activeTimeValue = activeTimePicker
    ? getTimeValue(
        schedule,
        activeTimePicker.medicineId,
        activeTimePicker.timeId,
      )
    : "08:00";
  const activeDateValue = activeDatePicker ? schedule.dispensedDate : "";

  const handleSubmit = async () => {
    const validationMessage = validateSchedule(schedule);

    if (validationMessage) {
      setFeedbackMessage(validationMessage);
      return;
    }

    const payload = toSchedulePayload(schedule);
    setIsSubmitting(true);
    setFeedbackMessage("");

    try {
      const savedSchedule =
        isEditMode && initialPrescription
          ? await updateSchedule(Number(initialPrescription.id), payload)
          : await createSchedule(payload);

      await rescheduleMedicationNotifications(savedSchedule);

      router.replace("/(tabs)/prescription");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : isEditMode
            ? "처방전을 수정하지 못했어요."
            : "처방전을 저장하지 못했어요.";

      setFeedbackMessage(message);
      Alert.alert("처방전", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.content}>
      <SectionShell title="처방전 정보">
        <CompactField
          label="병원명"
          placeholder="병원명을 입력하세요"
          value={schedule.hospitalName}
          onChangeText={(value) => updateScheduleField("hospitalName", value)}
        />
        <CompactField
          label="약국명"
          placeholder="약국명을 입력하세요"
          value={schedule.pharmacyName}
          onChangeText={(value) => updateScheduleField("pharmacyName", value)}
        />
        <CompactDateField
          label="조제일"
          value={schedule.dispensedDate}
          placeholder="날짜를 선택하세요"
          onPress={openDatePicker}
        />
        {activeDatePicker ? (
          <View style={styles.inlinePickerWrap}>
            <DateTimePicker
              display={Platform.OS === "ios" ? "spinner" : "default"}
              mode="date"
              onChange={handleDateChange}
              value={pendingPickerDate ?? parseDate(activeDateValue)}
            />
            {Platform.OS === "ios" ? (
              <PickerActionRow onCancel={cancelPicker} onConfirm={confirmDatePicker} />
            ) : null}
          </View>
        ) : null}
      </SectionShell>

      {schedule.medicines.map((medicine, medicineIndex) => {
        const isExpanded = expandedMedicineIds.includes(medicine.id);
        const canRemoveMedicine = schedule.medicines.length > 1;

        return (
          <View key={medicine.id} style={styles.section}>
            <View style={styles.medicineHeader}>
              <Pressable
                onPress={() => toggleMedicine(medicine.id)}
                style={styles.medicineHeaderMain}
              >
                <View style={styles.medicineHeaderCopy}>
                  <ThemedText style={styles.sectionTitle}>
                    {`약 ${medicineIndex + 1}`}
                  </ThemedText>
                </View>

                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={theme.textSecondary}
                />
              </Pressable>

              <Pressable
                onPress={() => removeMedicine(medicine.id)}
                disabled={!canRemoveMedicine}
                style={[
                  styles.medicineDeleteButton,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <Ionicons
                  name="remove"
                  size={16}
                  color={theme.textSecondary}
                  style={!canRemoveMedicine ? styles.disabledLabel : undefined}
                />
              </Pressable>
            </View>

            {isExpanded ? (
              <ThemedView type="backgroundElement" style={styles.sectionCard}>
                <View style={styles.medicineInfoSection}>
                  <CompactField
                    label="약 이름"
                    placeholder="약 이름을 입력하세요"
                    value={medicine.customMedicineName}
                    onChangeText={(value) =>
                      updateMedicine(medicine.id, "customMedicineName", value)
                    }
                  />

                  <View style={styles.inlineDoseRow}>
                    <StepperField
                      label="투여량"
                      value={medicine.dosageAmount}
                      suffix=""
                      onIncrement={() =>
                        stepMedicineValue(medicine.id, "dosageAmount", "up")
                      }
                      onDecrement={() =>
                        stepMedicineValue(medicine.id, "dosageAmount", "down")
                      }
                    />

                    <SelectField
                      label="단위"
                      value={medicine.dosageUnit}
                      onPress={() => setActiveUnitMedicineId(medicine.id)}
                    />

                    <StepperField
                      label="횟수"
                      value={medicine.timesPerDay}
                      suffix="회"
                      onIncrement={() =>
                        stepMedicineValue(medicine.id, "timesPerDay", "up")
                      }
                      onDecrement={() =>
                        stepMedicineValue(medicine.id, "timesPerDay", "down")
                      }
                    />

                    <StepperField
                      label="일수"
                      value={medicine.durationDays}
                      suffix="일"
                      onIncrement={() =>
                        stepMedicineValue(medicine.id, "durationDays", "up")
                      }
                      onDecrement={() =>
                        stepMedicineValue(medicine.id, "durationDays", "down")
                      }
                    />
                  </View>
                </View>

                <View
                  style={[
                    styles.sectionDivider,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                />

                <View style={styles.timeSection}>
                  <View style={styles.timeHeader}>
                    <View style={styles.subSectionHeader}>
                      <ThemedText
                        themeColor="textSecondary"
                        style={styles.subSectionCaption}
                      >
                        복용 시간
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.timeChipWrap}>
                    {medicine.times.map((time) => (
                      <ThemedView
                        key={time.id}
                        type="background"
                        style={styles.timeChipCard}
                      >
                        <View style={styles.timeChipRow}>
                          <Pressable
                            onPress={() =>
                              openTimePicker(medicine.id, time.id)
                            }
                            style={styles.timeChipValueButton}
                          >
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color={theme.textSecondary}
                            />
                            <ThemedText style={styles.timeChipValue}>
                              {time.takeTime}
                            </ThemedText>
                          </Pressable>
                        </View>
                      </ThemedView>
                    ))}
                  </View>
                  {activeTimePicker?.medicineId === medicine.id ? (
                    <View style={styles.inlinePickerWrap}>
                      <DateTimePicker
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        mode="time"
                        onChange={handleTimeChange}
                        value={pendingPickerDate ?? parseTime(activeTimeValue)}
                      />
                      {Platform.OS === "ios" ? (
                        <PickerActionRow onCancel={cancelPicker} onConfirm={confirmTimePicker} />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </ThemedView>
            ) : null}
          </View>
        );
      })}

      <Pressable
        onPress={addMedicine}
        style={[
          styles.secondaryButton,
          { backgroundColor: theme.backgroundElement },
        ]}
      >
        <ThemedText style={styles.secondaryButtonLabel}>약 추가</ThemedText>
      </Pressable>

      <ThemedView type="backgroundElement" style={styles.summarySection}>
        <ThemedText style={styles.summarySectionTitle}>처방전 요약</ThemedText>
        <View style={styles.summaryList}>
          {schedule.medicines.map((medicine) => (
            <View key={medicine.id} style={styles.summaryItem}>
              <ThemedText
                themeColor="textSecondary"
                style={styles.summaryItemText}
              >
                {buildMedicineSummary(medicine)}
              </ThemedText>
            </View>
          ))}
        </View>
      </ThemedView>

      {feedbackMessage ? (
        <ThemedText themeColor="textSecondary" style={styles.feedbackText}>
          {feedbackMessage}
        </ThemedText>
      ) : null}

      <Pressable
        onPress={() => {
          void handleSubmit();
        }}
        disabled={isSubmitting}
        style={[
          styles.primaryButton,
          {
            backgroundColor: theme.text,
            opacity: isSubmitting ? 0.7 : 1,
          },
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={theme.background} />
        ) : (
          <ThemedText
            style={[styles.primaryButtonLabel, { color: theme.background }]}
          >
            {isEditMode ? "처방전 수정" : "처방전 저장"}
          </ThemedText>
        )}
      </Pressable>

      <UnitSelectorModal
        activeMedicineId={activeUnitMedicineId}
        onClose={() => setActiveUnitMedicineId(null)}
        onSelect={(unit) => {
          if (!activeUnitMedicineId) {
            return;
          }

          updateMedicine(activeUnitMedicineId, "dosageUnit", unit);
          setActiveUnitMedicineId(null);
        }}
      />
    </View>
  );
}

type SectionShellProps = {
  title: string;
  children: React.ReactNode;
};

function SectionShell({ title, children }: SectionShellProps) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <ThemedView type="backgroundElement" style={styles.sectionCard}>
        {children}
      </ThemedView>
    </View>
  );
}

type CompactFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
};

function CompactField({
  label,
  placeholder,
  value,
  onChangeText,
}: CompactFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText themeColor="textSecondary" style={styles.fieldLabel}>
        {label}
      </ThemedText>
      <ThemedView type="background" style={styles.inputWrap}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
        />
      </ThemedView>
    </View>
  );
}

type CompactDateFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
};

function CompactDateField({
  label,
  value,
  placeholder,
  onPress,
}: CompactDateFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText themeColor="textSecondary" style={styles.fieldLabel}>
        {label}
      </ThemedText>
      <Pressable onPress={onPress}>
        <ThemedView type="background" style={styles.dateInputWrap}>
          <ThemedText
            style={[
              styles.inputText,
              { color: value ? theme.text : theme.textSecondary },
            ]}
          >
            {value || placeholder}
          </ThemedText>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={theme.textSecondary}
          />
        </ThemedView>
      </Pressable>
    </View>
  );
}

type StepperFieldProps = {
  label: string;
  value: string;
  suffix: string;
  onIncrement: () => void;
  onDecrement: () => void;
};

function StepperField({
  label,
  value,
  suffix,
  onIncrement,
  onDecrement,
}: StepperFieldProps) {
  return (
    <View style={styles.inlineField}>
      <ThemedText themeColor="textSecondary" style={styles.fieldLabel}>
        {label}
      </ThemedText>
      <ThemedView type="background" style={styles.stepperWrap}>
        <View style={styles.stepperValueRow}>
          <ThemedText style={styles.stepperValueText}>{value}</ThemedText>
          {suffix ? (
            <ThemedText themeColor="textSecondary" style={styles.stepperSuffix}>
              {suffix}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.stepperButtons}>
          <Pressable onPress={onIncrement} style={styles.stepperButton}>
            <Ionicons name="chevron-up" size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={onDecrement} style={styles.stepperButton}>
            <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </ThemedView>
    </View>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onPress: () => void;
};

function SelectField({ label, value, onPress }: SelectFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.inlineField}>
      <ThemedText themeColor="textSecondary" style={styles.fieldLabel}>
        {label}
      </ThemedText>
      <Pressable onPress={onPress}>
        <ThemedView type="background" style={styles.selectWrap}>
          <ThemedText style={styles.selectValue}>{value}</ThemedText>
          <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
        </ThemedView>
      </Pressable>
    </View>
  );
}

type PickerActionRowProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

function PickerActionRow({ onCancel, onConfirm }: PickerActionRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.pickerActionRow}>
      <Pressable
        onPress={onCancel}
        style={[styles.pickerActionButton, { backgroundColor: theme.backgroundSelected }]}
      >
        <ThemedText themeColor="textSecondary" style={styles.pickerActionLabel}>
          취소
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={onConfirm}
        style={[styles.pickerActionButton, { backgroundColor: theme.text }]}
      >
        <ThemedText style={[styles.pickerActionLabel, { color: theme.background }]}>
          확인
        </ThemedText>
      </Pressable>
    </View>
  );
}

type UnitSelectorModalProps = {
  activeMedicineId: string | null;
  onClose: () => void;
  onSelect: (unit: string) => void;
};

function UnitSelectorModal({
  activeMedicineId,
  onClose,
  onSelect,
}: UnitSelectorModalProps) {
  const theme = useTheme();

  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(activeMedicineId)}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalSheet,
            { backgroundColor: theme.backgroundElement },
          ]}
          onPress={() => undefined}
        >
          <ThemedText style={styles.modalTitle}>복용 단위 선택</ThemedText>
          <View style={styles.unitOptionList}>
            {dosageUnitOptions.map((unit) => (
              <Pressable
                key={unit}
                onPress={() => onSelect(unit)}
                style={[
                  styles.unitOptionButton,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText style={styles.unitOptionLabel}>{unit}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildMedicineSummary(medicine: PrescriptionMedicine) {
  const medicineName = medicine.customMedicineName || "약 이름 미입력";
  const amount = `${medicine.dosageAmount || "1"}${medicine.dosageUnit || "정"}`;
  const frequency = `${medicine.timesPerDay || "1"}회`;
  const duration = `${medicine.durationDays || "1"}일`;
  const times = medicine.times.map((time) => time.takeTime).join(", ");

  return [medicineName, `${amount} ${frequency} ${duration}`, times]
    .filter(Boolean)
    .join(" · ");
}

function getTimeValue(
  schedule: PrescriptionSchedule,
  medicineId: string,
  timeId: string,
) {
  const medicine = schedule.medicines.find((item) => item.id === medicineId);
  const time = medicine?.times.find((item) => item.id === timeId);
  return time?.takeTime ?? "08:00";
}

function validateSchedule(schedule: PrescriptionSchedule) {
  if (!isDateFormat(schedule.dispensedDate)) {
    return "조제일을 선택해주세요.";
  }

  for (const medicine of schedule.medicines) {
    if (!medicine.customMedicineName.trim()) {
      return "각 약의 이름을 입력해주세요.";
    }

    if (!medicine.dosageUnit.trim()) {
      return "복용 단위를 선택해주세요.";
    }

    if (parseNumericField(medicine.dosageAmount, 0) <= 0) {
      return "투여량은 0.5 이상이어야 해요.";
    }

    if (parseNumericField(medicine.timesPerDay, 0) < 1) {
      return "횟수는 1회 이상이어야 해요.";
    }

    if (parseNumericField(medicine.durationDays, 0) < 1) {
      return "일수는 1일 이상이어야 해요.";
    }

    if (medicine.times.length !== parseNumericField(medicine.timesPerDay, 1)) {
      return "복용 시간 개수가 횟수와 일치하지 않아요.";
    }

    for (const time of medicine.times) {
      if (!isTimeFormat(time.takeTime)) {
        return "복용 시간을 다시 선택해주세요.";
      }
    }
  }

  return "";
}

function toSchedulePayload(
  schedule: PrescriptionSchedule,
): ScheduleSavePayload {
  return {
    hospitalName: schedule.hospitalName.trim(),
    pharmacyName: schedule.pharmacyName.trim(),
    startDate: schedule.dispensedDate,
    dispensedDate: schedule.dispensedDate,
    medicines: schedule.medicines.map((medicine) => ({
      id: parseOptionalId(medicine.id),
      itemSeq: medicine.itemSeq,
      customMedicineName: medicine.customMedicineName.trim(),
      dosageAmount: medicine.dosageAmount.trim(),
      dosageUnit: medicine.dosageUnit.trim(),
      timesPerDay: parseOptionalNumber(medicine.timesPerDay),
      durationDays: parseOptionalNumber(medicine.durationDays),
      times: medicine.times.map((time, index) => ({
        id: parseOptionalId(time.id),
        takeTime: `${time.takeTime}:00`,
        sortOrder: index + 1,
      })),
    })),
  };
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalId(value: string) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseNumericField(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatHalfStep(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isDateFormat(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function isTimeFormat(value: string) {
  return /^\d{2}:\d{2}$/.test(value.trim());
}

function parseTime(value: string) {
  const [hourText, minuteText] = value.split(":");
  const date = new Date();
  date.setHours(Number(hourText) || 8, Number(minuteText) || 0, 0, 0);
  return date;
}

function formatPickerTime(event: DateTimePickerEvent, date: Date) {
  const correctedDate = toPickerWallClockDate(event, date);
  const hours = `${correctedDate.getUTCHours()}`.padStart(2, "0");
  const minutes = `${correctedDate.getUTCMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseDate(value: string) {
  if (!value) {
    return new Date();
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function formatPickerDate(event: DateTimePickerEvent, date: Date) {
  const correctedDate = toPickerWallClockDate(event, date);
  const year = correctedDate.getUTCFullYear();
  const month = `${correctedDate.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${correctedDate.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeFromDate(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDateFromDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toPickerWallClockDate(event: DateTimePickerEvent, fallbackDate: Date) {
  const { timestamp, utcOffset } = event.nativeEvent;

  if (
    typeof timestamp === "number" &&
    typeof utcOffset === "number" &&
    Number.isFinite(timestamp) &&
    Number.isFinite(utcOffset)
  ) {
    return new Date(timestamp + utcOffset * 60 * 1000);
  }

  const fallbackOffset = fallbackDate.getTimezoneOffset() * -1;
  return new Date(fallbackDate.getTime() + fallbackOffset * 60 * 1000);
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  medicineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  medicineHeaderMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  medicineHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  medicineDeleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  medicineInfoSection: {
    paddingTop: 0,
    gap: 8,
  },
  sectionDivider: {
    height: 1,
    opacity: 0.7,
  },
  timeSection: {
    gap: 8,
  },
  subSectionHeader: {
    flex: 1,
    gap: 1,
  },
  subSectionCaption: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "700",
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "700",
  },
  inputWrap: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  dateInputWrap: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  input: {
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: 0,
  },
  inputText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
  },
  inlineDoseRow: {
    flexDirection: "row",
    gap: 6,
  },
  inlineField: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  stepperWrap: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  stepperValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    flexShrink: 1,
  },
  stepperValueText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  stepperSuffix: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
  },
  stepperButtons: {
    gap: 4,
  },
  stepperButton: {
    width: 22,
    height: 16,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A1A",
  },
  selectWrap: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  selectValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  timeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  timeChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    columnGap: 8,
    rowGap: 10,
    paddingTop: 2,
  },
  timeChipCard: {
    flexGrow: 0,
    flexShrink: 0,
    width: "31.4%",
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  timeChipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeChipValueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    flex: 1,
  },
  timeChipValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  disabledLabel: {
    opacity: 0.4,
  },
  secondaryButton: {
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
  },
  summarySection: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  summarySectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  summaryList: {
    gap: 10,
  },
  summaryItem: {
    gap: 4,
  },
  summaryItemText: {
    fontSize: 13,
    lineHeight: 18,
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
  inlinePickerWrap: {
    width: "100%",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  pickerActionRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  pickerActionButton: {
    minWidth: 72,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  pickerActionLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    justifyContent: "flex-end",
    padding: 16,
  },
  modalSheet: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  unitOptionList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  unitOptionButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  unitOptionLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
  },
});
