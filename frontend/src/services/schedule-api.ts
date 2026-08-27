export type ScheduleTime = {
  id: number;
  takeTime: string;
  sortOrder: number;
  timing?: string | null;
};

export type ScheduleMedicine = {
  id: number;
  itemSeq: number | null;
  customMedicineName: string;
  dosageAmount: string;
  dosageUnit: string;
  timesPerDay: string;
  durationDays: string;
  times: ScheduleTime[];
};

export type ScheduleRecord = {
  id: number;
  hospitalName: string;
  pharmacyName: string;
  startDate: string;
  dispensedDate: string;
  isActive: boolean;
  medicines: ScheduleMedicine[];
};

export type ScheduleSavePayload = {
  hospitalName: string;
  pharmacyName: string;
  startDate: string;
  dispensedDate: string;
  medicines: {
    itemSeq: number | null;
    customMedicineName: string;
    dosageAmount: string;
    dosageUnit: string;
    timesPerDay: number | null;
    durationDays: number | null;
    times: {
      takeTime: string;
      sortOrder: number;
      timing?: string | null;
    }[];
  }[];
};

export type MedicationIntakeLogRecord = {
  id: number;
  medicationScheduleId: number;
  medicationScheduleTimeId: number;
  status: string;
  scheduledAt: string;
  takenAt: string | null;
  createdAt: string;
};

export type MedicationIntakeLogPayload = {
  medicationScheduleId: number;
  medicationScheduleTimeId: number;
  status: string;
  scheduledAt: string;
  takenAt: string | null;
};

export type DailyMedicationRecord = {
  medicationScheduleId: number;
  medicationScheduleMedicineId: number;
  medicationScheduleTimeId: number;
  medicationIntakeLogId: number | null;
  itemSeq: number | null;
  customMedicineName: string;
  dosageAmount: string;
  dosageUnit: string;
  timesPerDay: number | null;
  timing: string | null;
  takeTime: string;
  intakeStatus: string;
  scheduledAt: string;
  takenAt: string | null;
  hospitalName: string;
  pharmacyName: string;
};

export type DailyMedicationGroup = {
  takeTime: string;
  medications: DailyMedicationRecord[];
};

export type DailyMedicationSchedule = {
  date: string;
  groups: DailyMedicationGroup[];
};

let mockSchedules: ScheduleRecord[] = [
  {
    id: 1,
    hospitalName: '메디노트 내과',
    pharmacyName: '우리약국',
    startDate: '2026-08-27',
    dispensedDate: '2026-08-27',
    isActive: true,
    medicines: [
      {
        id: 11,
        itemSeq: 200300985,
        customMedicineName: '뉴렙톨캡슐300밀리그램',
        dosageAmount: '1',
        dosageUnit: '정',
        timesPerDay: '2',
        durationDays: '5',
        times: [
          { id: 101, timing: '아침', takeTime: '08:00', sortOrder: 1 },
          { id: 102, timing: '저녁', takeTime: '21:00', sortOrder: 2 },
        ],
      },
      {
        id: 12,
        itemSeq: 200610660,
        customMedicineName: '노바스크정5밀리그람',
        dosageAmount: '1',
        dosageUnit: '정',
        timesPerDay: '1',
        durationDays: '5',
        times: [{ id: 103, timing: '점심', takeTime: '13:00', sortOrder: 1 }],
      },
    ],
  },
];

let mockIntakeLogs: MedicationIntakeLogRecord[] = [
  {
    id: 1,
    medicationScheduleId: 1,
    medicationScheduleTimeId: 101,
    status: 'taken',
    scheduledAt: '2026-08-27T08:00:00.000Z',
    takenAt: '2026-08-27T08:05:00.000Z',
    createdAt: '2026-08-27T08:05:00.000Z',
  },
];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildScheduledAt(date: string, time: string) {
  return `${date}T${time}:00.000Z`;
}

export async function fetchSchedules() {
  return mockSchedules;
}

export async function fetchScheduleById(id: number) {
  const schedule = mockSchedules.find((item) => item.id === id);

  if (!schedule) {
    throw new Error('처방전을 찾지 못했어요.');
  }

  return schedule;
}

export async function createSchedule(payload: ScheduleSavePayload) {
  const schedule: ScheduleRecord = {
    id: Date.now(),
    hospitalName: payload.hospitalName,
    pharmacyName: payload.pharmacyName,
    startDate: payload.startDate,
    dispensedDate: payload.dispensedDate,
    isActive: true,
    medicines: payload.medicines.map((medicine, medicineIndex) => ({
      id: Date.now() + medicineIndex,
      itemSeq: medicine.itemSeq,
      customMedicineName: medicine.customMedicineName,
      dosageAmount: medicine.dosageAmount,
      dosageUnit: medicine.dosageUnit,
      timesPerDay: medicine.timesPerDay === null ? '' : String(medicine.timesPerDay),
      durationDays: medicine.durationDays === null ? '' : String(medicine.durationDays),
      times: medicine.times.map((time, timeIndex) => ({
        id: Date.now() + medicineIndex * 10 + timeIndex,
        takeTime: time.takeTime,
        sortOrder: time.sortOrder,
        timing: time.timing,
      })),
    })),
  };

  mockSchedules = [schedule, ...mockSchedules];
  return schedule;
}

export async function updateSchedule(id: number, payload: ScheduleSavePayload) {
  const updated = await createSchedule(payload);
  updated.id = id;
  mockSchedules = mockSchedules.map((schedule) => (schedule.id === id ? updated : schedule));
  return updated;
}

export async function deleteSchedule(id: number) {
  mockSchedules = mockSchedules.filter((schedule) => schedule.id !== id);
}

export async function fetchMedicationIntakeLogs(scheduleId: number) {
  return mockIntakeLogs.filter((log) => log.medicationScheduleId === scheduleId);
}

export async function createMedicationIntakeLog(payload: MedicationIntakeLogPayload) {
  const log: MedicationIntakeLogRecord = {
    ...payload,
    id: Date.now(),
    createdAt: new Date().toISOString(),
  };

  mockIntakeLogs = [...mockIntakeLogs, log];
  return log;
}

export async function updateMedicationIntakeLog(
  id: number,
  payload: MedicationIntakeLogPayload,
) {
  const updated: MedicationIntakeLogRecord = {
    ...payload,
    id,
    createdAt: new Date().toISOString(),
  };

  mockIntakeLogs = mockIntakeLogs.map((log) => (log.id === id ? updated : log));
  return updated;
}

export async function fetchDailyMedicationSchedule(date: string) {
  const groupsByTime = new Map<string, DailyMedicationRecord[]>();

  for (const schedule of mockSchedules) {
    for (const medicine of schedule.medicines) {
      for (const time of medicine.times) {
        const scheduledAt = buildScheduledAt(date, time.takeTime);
        const log = mockIntakeLogs.find(
          (item) =>
            item.medicationScheduleId === schedule.id &&
            item.medicationScheduleTimeId === time.id &&
            item.scheduledAt.startsWith(date),
        );
        const record: DailyMedicationRecord = {
          medicationScheduleId: schedule.id,
          medicationScheduleMedicineId: medicine.id,
          medicationScheduleTimeId: time.id,
          medicationIntakeLogId: log?.id ?? null,
          itemSeq: medicine.itemSeq,
          customMedicineName: medicine.customMedicineName,
          dosageAmount: medicine.dosageAmount,
          dosageUnit: medicine.dosageUnit,
          timesPerDay: Number(medicine.timesPerDay) || null,
          timing: time.timing ?? null,
          takeTime: time.takeTime,
          intakeStatus: log?.status ?? 'pending',
          scheduledAt,
          takenAt: log?.takenAt ?? null,
          hospitalName: schedule.hospitalName,
          pharmacyName: schedule.pharmacyName,
        };
        const current = groupsByTime.get(time.takeTime) ?? [];
        groupsByTime.set(time.takeTime, [...current, record]);
      }
    }
  }

  return {
    date: date || toDateKey(new Date()),
    groups: [...groupsByTime.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([takeTime, medications]) => ({ takeTime, medications })),
  } satisfies DailyMedicationSchedule;
}
