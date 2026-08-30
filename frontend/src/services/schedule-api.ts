import { apiFetch } from './api-client';

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
    id?: number | null;
    itemSeq: number | null;
    customMedicineName: string;
    dosageAmount: string;
    dosageUnit: string;
    timesPerDay: number | null;
    durationDays: number | null;
    times: {
      id?: number | null;
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

type ApiMessageResponse = {
  message?: unknown;
  detail?: unknown;
};

type ScheduleTimeApiResponse = {
  id: number;
  medicationScheduleId?: number;
  medicationScheduleMedicineId?: number;
  timing?: string | null;
  takeTime?: string | null;
  sortOrder?: number | null;
};

type ScheduleMedicineApiResponse = {
  id: number;
  itemSeq?: number | null;
  customMedicineName?: string | null;
  dosageAmount?: string | null;
  dosageUnit?: string | null;
  timesPerDay?: number | null;
  durationDays?: number | null;
  times?: ScheduleTimeApiResponse[];
};

type ScheduleApiResponse = {
  id: number;
  hospitalName?: string | null;
  pharmacyName?: string | null;
  startDate?: string | null;
  dispensedDate?: string | null;
  isActive?: boolean;
  medicines?: ScheduleMedicineApiResponse[];
};

type MedicationIntakeLogApiResponse = {
  id: number;
  medicationScheduleId?: number;
  medicationScheduleTimeId?: number;
  status?: string | null;
  scheduledAt?: string | null;
  takenAt?: string | null;
  createdAt?: string | null;
};

type DailyMedicationApiRecord = {
  medicationScheduleId?: number;
  medicationScheduleMedicineId?: number;
  medicationScheduleTimeId?: number;
  medicationIntakeLogId?: number | null;
  itemSeq?: number | null;
  customMedicineName?: string | null;
  dosageAmount?: string | null;
  dosageUnit?: string | null;
  timesPerDay?: number | null;
  timing?: string | null;
  takeTime?: string | null;
  intakeStatus?: string | null;
  scheduledAt?: string | null;
  takenAt?: string | null;
  hospitalName?: string | null;
  pharmacyName?: string | null;
};

type DailyMedicationApiResponse = {
  date?: string | null;
  groups?: {
    takeTime?: string | null;
    medications?: DailyMedicationApiRecord[];
  }[];
};

function stringifyErrorDetail(detail: unknown) {
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object' && 'msg' in item) {
          return String(item.msg);
        }

        return null;
      })
      .filter(Boolean)
      .join('\n');
  }

  if (detail && typeof detail === 'object' && 'msg' in detail) {
    return String(detail.msg);
  }

  return '';
}

function getErrorMessage(data: ApiMessageResponse | null, fallback: string) {
  const detailMessage = stringifyErrorDetail(data?.detail);
  const message = stringifyErrorDetail(data?.message);

  return detailMessage || message || fallback;
}

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | ApiMessageResponse | null;
}

function normalizeTime(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value.slice(0, 5);
}

function toScheduleTime(data: ScheduleTimeApiResponse): ScheduleTime {
  return {
    id: data.id,
    takeTime: normalizeTime(data.takeTime),
    sortOrder: data.sortOrder ?? 0,
    timing: data.timing ?? null,
  };
}

function toScheduleMedicine(data: ScheduleMedicineApiResponse): ScheduleMedicine {
  return {
    id: data.id,
    itemSeq: data.itemSeq ?? null,
    customMedicineName: data.customMedicineName ?? '',
    dosageAmount: data.dosageAmount ?? '',
    dosageUnit: data.dosageUnit ?? '',
    timesPerDay: data.timesPerDay === null || data.timesPerDay === undefined ? '' : String(data.timesPerDay),
    durationDays: data.durationDays === null || data.durationDays === undefined ? '' : String(data.durationDays),
    times: (data.times ?? []).map(toScheduleTime),
  };
}

function toScheduleRecord(data: ScheduleApiResponse): ScheduleRecord {
  return {
    id: data.id,
    hospitalName: data.hospitalName ?? '',
    pharmacyName: data.pharmacyName ?? '',
    startDate: data.startDate ?? '',
    dispensedDate: data.dispensedDate ?? '',
    isActive: data.isActive ?? true,
    medicines: (data.medicines ?? []).map(toScheduleMedicine),
  };
}

function toMedicationIntakeLog(data: MedicationIntakeLogApiResponse): MedicationIntakeLogRecord {
  return {
    id: data.id,
    medicationScheduleId: data.medicationScheduleId ?? 0,
    medicationScheduleTimeId: data.medicationScheduleTimeId ?? 0,
    status: data.status ?? 'pending',
    scheduledAt: data.scheduledAt ?? '',
    takenAt: data.takenAt ?? null,
    createdAt: data.createdAt ?? '',
  };
}

function toDailyMedicationRecord(data: DailyMedicationApiRecord): DailyMedicationRecord {
  return {
    medicationScheduleId: data.medicationScheduleId ?? 0,
    medicationScheduleMedicineId: data.medicationScheduleMedicineId ?? 0,
    medicationScheduleTimeId: data.medicationScheduleTimeId ?? 0,
    medicationIntakeLogId: data.medicationIntakeLogId ?? null,
    itemSeq: data.itemSeq ?? null,
    customMedicineName: data.customMedicineName ?? '',
    dosageAmount: data.dosageAmount ?? '',
    dosageUnit: data.dosageUnit ?? '',
    timesPerDay: data.timesPerDay ?? null,
    timing: data.timing ?? null,
    takeTime: normalizeTime(data.takeTime),
    intakeStatus: data.intakeStatus ?? 'pending',
    scheduledAt: data.scheduledAt ?? '',
    takenAt: data.takenAt ?? null,
    hospitalName: data.hospitalName ?? '',
    pharmacyName: data.pharmacyName ?? '',
  };
}

function toSchedulePayload(payload: ScheduleSavePayload) {
  return {
    hospitalName: payload.hospitalName || null,
    pharmacyName: payload.pharmacyName || null,
    startDate: payload.startDate,
    dispensedDate: payload.dispensedDate || null,
    medicines: payload.medicines.map((medicine) => ({
      id: medicine.id ?? null,
      itemSeq: medicine.itemSeq,
      customMedicineName: medicine.customMedicineName,
      dosageAmount: medicine.dosageAmount || null,
      dosageUnit: medicine.dosageUnit || null,
      timesPerDay: medicine.timesPerDay,
      durationDays: medicine.durationDays,
      times: medicine.times.map((time) => ({
        id: time.id ?? null,
        timing: time.timing ?? null,
        takeTime: time.takeTime,
        sortOrder: time.sortOrder,
      })),
    })),
  };
}

function toIntakeLogPayload(payload: MedicationIntakeLogPayload) {
  return {
    medicationScheduleId: payload.medicationScheduleId,
    medicationScheduleTimeId: payload.medicationScheduleTimeId,
    status: payload.status,
    scheduledAt: payload.scheduledAt,
    takenAt: payload.takenAt,
  };
}

export async function fetchSchedules() {
  const response = await apiFetch('/medication-schedules');
  const data = await readJson<ScheduleApiResponse[]>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '복약 일정 목록을 불러오지 못했어요.'));
  }

  if (!Array.isArray(data)) {
    throw new Error('복약 일정 목록 응답 형식이 올바르지 않아요.');
  }

  return data.map(toScheduleRecord);
}

export async function fetchScheduleById(id: number) {
  const response = await apiFetch(`/medication-schedules/${id}`);
  const data = await readJson<ScheduleApiResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '처방전을 찾지 못했어요.'));
  }

  if (!data || Array.isArray(data) || !('id' in data)) {
    throw new Error('처방전 응답 형식이 올바르지 않아요.');
  }

  return toScheduleRecord(data as ScheduleApiResponse);
}

export async function createSchedule(payload: ScheduleSavePayload) {
  const response = await apiFetch('/medication-schedules', {
    method: 'POST',
    body: JSON.stringify(toSchedulePayload(payload)),
  });
  const data = await readJson<ScheduleApiResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '처방전을 저장하지 못했어요.'));
  }

  if (!data || Array.isArray(data) || !('id' in data)) {
    throw new Error('처방전 저장 응답 형식이 올바르지 않아요.');
  }

  return toScheduleRecord(data as ScheduleApiResponse);
}

export async function updateSchedule(id: number, payload: ScheduleSavePayload) {
  const response = await apiFetch(`/medication-schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toSchedulePayload(payload)),
  });
  const data = await readJson<ScheduleApiResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '처방전을 수정하지 못했어요.'));
  }

  if (!data || Array.isArray(data) || !('id' in data)) {
    throw new Error('처방전 수정 응답 형식이 올바르지 않아요.');
  }

  return toScheduleRecord(data as ScheduleApiResponse);
}

export async function deleteSchedule(id: number) {
  const response = await apiFetch(`/medication-schedules/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await readJson<ApiMessageResponse>(response);
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '처방전을 삭제하지 못했어요.'));
  }
}

export async function fetchMedicationIntakeLogs(scheduleId: number) {
  const params = new URLSearchParams({ medicationScheduleId: String(scheduleId) });
  const response = await apiFetch(`/medication-intake-logs?${params.toString()}`);
  const data = await readJson<MedicationIntakeLogApiResponse[]>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '복용 기록 목록을 불러오지 못했어요.'));
  }

  if (!Array.isArray(data)) {
    throw new Error('복용 기록 목록 응답 형식이 올바르지 않아요.');
  }

  return data.map(toMedicationIntakeLog);
}

export async function createMedicationIntakeLog(payload: MedicationIntakeLogPayload) {
  const response = await apiFetch('/medication-intake-logs', {
    method: 'POST',
    body: JSON.stringify(toIntakeLogPayload(payload)),
  });
  const data = await readJson<MedicationIntakeLogApiResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '복용 기록을 저장하지 못했어요.'));
  }

  if (!data || Array.isArray(data) || !('id' in data)) {
    throw new Error('복용 기록 저장 응답 형식이 올바르지 않아요.');
  }

  return toMedicationIntakeLog(data as MedicationIntakeLogApiResponse);
}

export async function updateMedicationIntakeLog(
  id: number,
  payload: MedicationIntakeLogPayload,
) {
  const response = await apiFetch(`/medication-intake-logs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toIntakeLogPayload(payload)),
  });
  const data = await readJson<MedicationIntakeLogApiResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '복용 기록을 수정하지 못했어요.'));
  }

  if (!data || Array.isArray(data) || !('id' in data)) {
    throw new Error('복용 기록 수정 응답 형식이 올바르지 않아요.');
  }

  return toMedicationIntakeLog(data as MedicationIntakeLogApiResponse);
}

export async function fetchDailyMedicationSchedule(date: string) {
  const params = new URLSearchParams({ date });
  const response = await apiFetch(`/medication-schedules/daily?${params.toString()}`);
  const data = await readJson<DailyMedicationApiResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '선택 날짜 복약 목록을 불러오지 못했어요.'));
  }

  if (!data || Array.isArray(data)) {
    throw new Error('선택 날짜 복약 목록 응답 형식이 올바르지 않아요.');
  }

  const dailyData = data as DailyMedicationApiResponse;

  return {
    date: dailyData.date ?? date,
    groups: (dailyData.groups ?? []).map((group) => ({
      takeTime: normalizeTime(group.takeTime),
      medications: (group.medications ?? []).map(toDailyMedicationRecord),
    })),
  } satisfies DailyMedicationSchedule;
}
