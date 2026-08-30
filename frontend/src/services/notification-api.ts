import { apiFetch } from "./api-client";

export type MedicationNotificationStatus = "PENDING" | "SENT" | "FAILED";
export type MedicationNotificationType = "MEDICATION_REMINDER";

export type MedicationNotificationRecord = {
  id: number;
  userId: number;
  medicationScheduleId: number;
  medicationScheduleMedicineId: number;
  medicationScheduleTimeId: number;
  type: MedicationNotificationType;
  title: string;
  body: string;
  status: MedicationNotificationStatus;
  scheduledAt: string;
  sentAt: string | null;
  readAt: string | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiMessageResponse = {
  message?: unknown;
  detail?: unknown;
};

type MedicationNotificationApiResponse = {
  id: number;
  userId?: number | null;
  medicationScheduleId?: number | null;
  medicationScheduleMedicineId?: number | null;
  medicationScheduleTimeId?: number | null;
  type?: MedicationNotificationType | null;
  title?: string | null;
  body?: string | null;
  status?: MedicationNotificationStatus | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  isVisible?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function stringifyErrorDetail(detail: unknown) {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "msg" in item) {
          return String(item.msg);
        }

        return null;
      })
      .filter(Boolean)
      .join("\n");
  }

  if (detail && typeof detail === "object" && "msg" in detail) {
    return String(detail.msg);
  }

  return "";
}

function getErrorMessage(data: ApiMessageResponse | null, fallback: string) {
  const detailMessage = stringifyErrorDetail(data?.detail);
  const message = stringifyErrorDetail(data?.message);

  return detailMessage || message || fallback;
}

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as
    | T
    | ApiMessageResponse
    | null;
}

function toMedicationNotificationRecord(
  data: MedicationNotificationApiResponse,
): MedicationNotificationRecord {
  return {
    id: data.id,
    userId: data.userId ?? 0,
    medicationScheduleId: data.medicationScheduleId ?? 0,
    medicationScheduleMedicineId: data.medicationScheduleMedicineId ?? 0,
    medicationScheduleTimeId: data.medicationScheduleTimeId ?? 0,
    type: data.type ?? "MEDICATION_REMINDER",
    title: data.title ?? "",
    body: data.body ?? "",
    status: data.status ?? "PENDING",
    scheduledAt: data.scheduledAt ?? "",
    sentAt: data.sentAt ?? null,
    readAt: data.readAt ?? null,
    isVisible: data.isVisible ?? true,
    createdAt: data.createdAt ?? "",
    updatedAt: data.updatedAt ?? "",
  };
}

export async function fetchMedicationNotifications() {
  const response = await apiFetch("/medication-notifications");
  const data = await readJson<MedicationNotificationApiResponse[]>(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data as ApiMessageResponse | null, "알림 목록을 불러오지 못했어요."),
    );
  }

  if (!Array.isArray(data)) {
    throw new Error("알림 목록 응답 형식이 올바르지 않아요.");
  }

  return data.map(toMedicationNotificationRecord);
}

export async function markMedicationNotificationRead(id: number) {
  const response = await apiFetch(`/medication-notifications/${id}/read`, {
    method: "PATCH",
  });
  const data = await readJson<MedicationNotificationApiResponse>(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data as ApiMessageResponse | null, "알림을 읽음 처리하지 못했어요."),
    );
  }

  if (!data || Array.isArray(data) || !("id" in data)) {
    throw new Error("알림 읽음 처리 응답 형식이 올바르지 않아요.");
  }

  return toMedicationNotificationRecord(data as MedicationNotificationApiResponse);
}

export async function deleteMedicationNotification(id: number) {
  const response = await apiFetch(`/medication-notifications/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = await readJson<ApiMessageResponse>(response);
    throw new Error(
      getErrorMessage(data as ApiMessageResponse | null, "알림을 삭제하지 못했어요."),
    );
  }
}

export async function deleteAllMedicationNotifications() {
  const response = await apiFetch("/medication-notifications", {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = await readJson<ApiMessageResponse>(response);
    throw new Error(
      getErrorMessage(data as ApiMessageResponse | null, "알림을 모두 삭제하지 못했어요."),
    );
  }
}
