import { apiFetch } from './api-client';

export type AnalysisSeverity = 'safe' | 'caution' | 'warning';

export type PrescriptionAnalysisCheck = {
  type: string;
  title: string;
  severity: AnalysisSeverity;
  message: string;
};

export type PrescriptionAnalysisMedicine = {
  scheduleMedicineId: number;
  medicineName: string;
  dosageAmount: string | null;
  dosageUnit: string | null;
  checks: PrescriptionAnalysisCheck[];
};

export type PrescriptionAnalysisResult = {
  summary: {
    title: string;
    message: string;
  };
  medicines: PrescriptionAnalysisMedicine[];
};

export type PrescriptionAnalysisRecord = {
  id: number;
  scheduleId: number;
  userId: number;
  resultJson: PrescriptionAnalysisResult;
  createdAt: string | null;
  updatedAt: string | null;
};

type ApiMessageResponse = {
  message?: unknown;
  detail?: unknown;
};

type PrescriptionAnalysisApiResponse = {
  id: number;
  scheduleId?: number | null;
  schedule_id?: number | null;
  userId?: number | null;
  user_id?: number | null;
  resultJson?: Partial<PrescriptionAnalysisResult> | null;
  result_json?: Partial<PrescriptionAnalysisResult> | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
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

function toPrescriptionAnalysis(
  data: PrescriptionAnalysisApiResponse,
): PrescriptionAnalysisRecord {
  const resultJson = data.resultJson ?? data.result_json ?? {};

  return {
    id: data.id,
    scheduleId: data.scheduleId ?? data.schedule_id ?? 0,
    userId: data.userId ?? data.user_id ?? 0,
    resultJson: {
      summary: {
        title: resultJson.summary?.title ?? '총정리',
        message: resultJson.summary?.message ?? '',
      },
      medicines: (resultJson.medicines ?? []).map((medicine) => ({
        scheduleMedicineId: medicine.scheduleMedicineId ?? 0,
        medicineName: medicine.medicineName ?? '',
        dosageAmount: medicine.dosageAmount ?? null,
        dosageUnit: medicine.dosageUnit ?? null,
        checks: (medicine.checks ?? []).map((check) => ({
          type: check.type ?? '',
          title: check.title ?? '',
          severity: normalizeSeverity(check.severity),
          message: check.message ?? '',
        })),
      })),
    },
    createdAt: data.createdAt ?? data.created_at ?? null,
    updatedAt: data.updatedAt ?? data.updated_at ?? null,
  };
}

function normalizeSeverity(value: unknown): AnalysisSeverity {
  if (value === 'safe' || value === 'caution' || value === 'warning') {
    return value;
  }

  return 'caution';
}

export async function fetchLatestPrescriptionAnalysis(scheduleId: number) {
  const params = new URLSearchParams({ scheduleId: String(scheduleId) });
  const response = await apiFetch(`/prescription-analyses?${params.toString()}`);
  const data = await readJson<PrescriptionAnalysisApiResponse>(response);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '처방전 분석 결과를 불러오지 못했어요.'));
  }

  if (!data || Array.isArray(data) || !('id' in data)) {
    throw new Error('처방전 분석 응답 형식이 올바르지 않아요.');
  }

  return toPrescriptionAnalysis(data as PrescriptionAnalysisApiResponse);
}

export async function fetchPrescriptionAnalysisById(id: number) {
  const response = await apiFetch(`/prescription-analyses/${id}`);
  const data = await readJson<PrescriptionAnalysisApiResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '처방전 분석 결과를 불러오지 못했어요.'));
  }

  if (!data || Array.isArray(data) || !('id' in data)) {
    throw new Error('처방전 분석 응답 형식이 올바르지 않아요.');
  }

  return toPrescriptionAnalysis(data as PrescriptionAnalysisApiResponse);
}

export async function createPrescriptionAnalysis(scheduleId: number) {
  const response = await apiFetch('/prescription-analyses', {
    method: 'POST',
    body: JSON.stringify({ scheduleId }),
  });
  const data = await readJson<PrescriptionAnalysisApiResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiMessageResponse | null, '처방전 분석을 저장하지 못했어요.'));
  }

  if (!data || Array.isArray(data) || !('id' in data)) {
    throw new Error('처방전 분석 저장 응답 형식이 올바르지 않아요.');
  }

  return toPrescriptionAnalysis(data as PrescriptionAnalysisApiResponse);
}
