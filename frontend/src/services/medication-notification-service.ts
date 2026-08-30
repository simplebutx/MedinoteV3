import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { ScheduleRecord } from "@/services/schedule-api";

const NOTIFICATION_MAP_KEY = "medinote.medicationNotificationIdsBySchedule";
const MEDICATION_CHANNEL_ID = "medication-reminders";

type NotificationIdMap = Record<string, string[]>;

type MedicationOccurrence = {
  date: Date;
  scheduleId: number;
  scheduleTimeIds: number[];
  medicineNames: string[];
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function addMedicationNotificationResponseListener() {
  return Notifications.addNotificationResponseReceivedListener(() => {
    router.push("/(tabs)/schedule");
  });
}

export async function syncMedicationNotifications(schedules: ScheduleRecord[]) {
  if (!canUseNativeNotifications()) {
    return;
  }

  const hasPermission = await ensureNotificationPermission();

  if (!hasPermission) {
    return;
  }

  const currentMap = await readNotificationIdMap();
  const activeScheduleIds = new Set(schedules.map((schedule) => String(schedule.id)));
  const nextMap: NotificationIdMap = {};

  for (const [scheduleId, notificationIds] of Object.entries(currentMap)) {
    if (!activeScheduleIds.has(scheduleId)) {
      await cancelNotificationIds(notificationIds);
    }
  }

  for (const schedule of schedules) {
    await cancelNotificationIds(currentMap[String(schedule.id)] ?? []);
    nextMap[String(schedule.id)] = await scheduleMedicationNotifications(schedule);
  }

  await writeNotificationIdMap(nextMap);
}

export async function rescheduleMedicationNotifications(schedule: ScheduleRecord) {
  if (!canUseNativeNotifications()) {
    return;
  }

  const hasPermission = await ensureNotificationPermission();

  if (!hasPermission) {
    return;
  }

  const notificationMap = await readNotificationIdMap();
  await cancelNotificationIds(notificationMap[String(schedule.id)] ?? []);
  notificationMap[String(schedule.id)] = await scheduleMedicationNotifications(schedule);
  await writeNotificationIdMap(notificationMap);
}

export async function cancelMedicationNotifications(scheduleId: number) {
  if (!canUseNativeNotifications()) {
    return;
  }

  const notificationMap = await readNotificationIdMap();
  await cancelNotificationIds(notificationMap[String(scheduleId)] ?? []);
  delete notificationMap[String(scheduleId)];
  await writeNotificationIdMap(notificationMap);
}

async function scheduleMedicationNotifications(schedule: ScheduleRecord) {
  const notificationIds: string[] = [];
  const occurrences = buildMedicationOccurrences(schedule);

  for (const occurrence of occurrences) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "복약 시간이에요",
        body: buildNotificationBody(occurrence.medicineNames),
        data: {
          medicationScheduleId: occurrence.scheduleId,
          medicationScheduleTimeIds: occurrence.scheduleTimeIds,
          scheduledAt: occurrence.date.toISOString(),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: occurrence.date,
        channelId: MEDICATION_CHANNEL_ID,
      },
    });

    notificationIds.push(notificationId);
  }

  return notificationIds;
}

function buildMedicationOccurrences(schedule: ScheduleRecord) {
  const now = new Date();
  const occurrenceMap = new Map<string, MedicationOccurrence>();
  const [year, month, day] = schedule.startDate.split("-").map(Number);

  if (!year || !month || !day) {
    return [];
  }

  for (const medicine of schedule.medicines) {
    const durationDays = Number(medicine.durationDays || "1");
    const activeDays = Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 1;

    for (const scheduleTime of medicine.times) {
      const [hour, minute] = scheduleTime.takeTime.split(":").map(Number);

      if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        continue;
      }

      for (let offset = 0; offset < activeDays; offset += 1) {
        const date = new Date(year, month - 1, day + offset, hour, minute, 0, 0);

        if (date <= now) {
          continue;
        }

        const key = String(date.getTime());
        const occurrence =
          occurrenceMap.get(key) ??
          {
            date,
            scheduleId: schedule.id,
            scheduleTimeIds: [],
            medicineNames: [],
          };

        occurrence.scheduleTimeIds.push(scheduleTime.id);

        if (!occurrence.medicineNames.includes(medicine.customMedicineName)) {
          occurrence.medicineNames.push(medicine.customMedicineName);
        }

        occurrenceMap.set(key, occurrence);
      }
    }
  }

  return [...occurrenceMap.values()].sort(
    (left, right) => left.date.getTime() - right.date.getTime(),
  );
}

function buildNotificationBody(medicineNames: string[]) {
  const names = medicineNames.filter(Boolean);

  if (names.length === 0) {
    return "약을 복용할 시간입니다.";
  }

  if (names.length === 1) {
    return `${names[0]} 복용할 시간입니다.`;
  }

  return `${names[0]} 외 ${names.length - 1}개 약을 복용할 시간입니다.`;
}

async function ensureNotificationPermission() {
  await configureAndroidNotificationChannel();

  const currentPermissions = await Notifications.getPermissionsAsync();

  if (currentPermissions.granted) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return requestedPermissions.granted;
}

async function configureAndroidNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(MEDICATION_CHANNEL_ID, {
    name: "복약 알림",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#208AEF",
    sound: "default",
  });
}

async function cancelNotificationIds(notificationIds: string[]) {
  await Promise.all(
    notificationIds.map((notificationId) =>
      Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined),
    ),
  );
}

async function readNotificationIdMap(): Promise<NotificationIdMap> {
  const storedValue = await SecureStore.getItemAsync(NOTIFICATION_MAP_KEY).catch(() => null);

  if (!storedValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(storedValue);
    return isNotificationIdMap(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function writeNotificationIdMap(notificationMap: NotificationIdMap) {
  await SecureStore.setItemAsync(
    NOTIFICATION_MAP_KEY,
    JSON.stringify(notificationMap),
  ).catch(() => undefined);
}

function isNotificationIdMap(value: unknown): value is NotificationIdMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (notificationIds) =>
      Array.isArray(notificationIds) &&
      notificationIds.every((notificationId) => typeof notificationId === "string"),
  );
}

function canUseNativeNotifications() {
  return Platform.OS === "android" || Platform.OS === "ios";
}
