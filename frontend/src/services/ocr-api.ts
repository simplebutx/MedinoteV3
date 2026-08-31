import { apiFetch } from './api-client';

export type OcrUploadUrlResponse = {
  upload_url: string;
  object_key: string;
  expires_in: number;
};

export type OcrResponse = {
  status: string;
  resultJson: OcrPrescriptionSchedule | null;
  errorMessage: string | null;
};

export type OcrPrescriptionSchedule = {
  hospitalName: string;
  pharmacyName: string;
  dispensedDate: string;
  medicines: OcrPrescriptionMedicine[];
};

export type OcrPrescriptionMedicine = {
  itemSeq: number | null;
  customMedicineName: string;
  matchedMedicineName?: string | null;
  dosageAmount: string;
  dosageUnit: string;
  timesPerDay: string;
  durationDays: string;
  times: {
    takeTime: string;
  }[];
};

type ApiErrorResponse = {
  detail?: unknown;
  message?: unknown;
};

type OcrApiResponse =
  | OcrResponse
  | {
      status?: unknown;
      result_json?: unknown;
      resultJson?: unknown;
      error_message?: unknown;
      errorMessage?: unknown;
      message?: unknown;
    };

function stringifyError(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
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

  return '';
}

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | ApiErrorResponse | null;
}

function getErrorMessage(data: ApiErrorResponse | null, fallback: string) {
  return stringifyError(data?.detail) || stringifyError(data?.message) || fallback;
}

function formatForLog(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function logOcrDebug(message: string, value: unknown) {
  const formattedValue = formatForLog(value);

  console.log(`[OCR] ${message}\n`, formattedValue);
  console.warn(`[OCR] ${message}\n${formattedValue}`);
}

export async function createOcrUploadUrl() {
  const response = await apiFetch('/ocr/upload-url', {
    method: 'POST',
  });
  const data = await readJson<OcrUploadUrlResponse>(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiErrorResponse | null, 'OCR 업로드 URL을 발급받지 못했어요.'));
  }

  if (!data || Array.isArray(data) || !('upload_url' in data) || !('object_key' in data)) {
    throw new Error('OCR 업로드 URL 응답 형식이 올바르지 않아요.');
  }

  return data as OcrUploadUrlResponse;
}

export async function uploadImageToPresignedUrl(
  uploadUrl: string,
  imageUri: string,
  contentType = 'image/jpeg',
) {
  const imageResponse = await fetch(imageUri);

  if (!imageResponse.ok) {
    throw new Error('선택한 이미지를 읽지 못했어요.');
  }

  const imageBlob = await imageResponse.blob();
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: imageBlob,
  });

  if (!uploadResponse.ok) {
    const responseText = await uploadResponse.text().catch(() => '');

    console.error('[OCR] S3 upload failed', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      responseText,
    });

    throw new Error(
      `S3에 처방전 이미지를 업로드하지 못했어요. (${uploadResponse.status})`,
    );
  }
}

export async function analyzeOcrImage(objectKey: string) {
  const response = await apiFetch('/ocr/analyze', {
    method: 'POST',
    body: JSON.stringify({
      object_key: objectKey,
    }),
  });
  const data = await readJson<OcrApiResponse>(response);
  logOcrDebug('analyze raw response', data);

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiErrorResponse | null, 'OCR 분석 요청에 실패했어요.'));
  }

  if (!data || Array.isArray(data)) {
    throw new Error('OCR 분석 응답 형식이 올바르지 않아요.');
  }

  const rawData = data as OcrApiResponse;
  const resultJson =
    'resultJson' in rawData && rawData.resultJson
      ? rawData.resultJson
      : 'result_json' in rawData
        ? rawData.result_json
        : 'message' in rawData
          ? parseLegacyMessage(rawData.message)
          : null;
  const errorMessage =
    'errorMessage' in rawData && typeof rawData.errorMessage === 'string'
      ? rawData.errorMessage
      : 'error_message' in rawData && typeof rawData.error_message === 'string'
        ? rawData.error_message
        : null;

  if (!('status' in rawData) && !resultJson) {
    throw new Error('OCR 분석 응답 형식이 올바르지 않아요.');
  }

  const normalizedResponse = {
    status: typeof rawData.status === 'string' ? rawData.status : 'success',
    resultJson: isOcrPrescriptionSchedule(resultJson)
      ? resultJson
      : null,
    errorMessage,
  } satisfies OcrResponse;

  logOcrDebug('analyze normalized response', normalizedResponse);

  return normalizedResponse;
}

function isOcrPrescriptionSchedule(value: unknown): value is OcrPrescriptionSchedule {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'hospitalName' in value &&
      'pharmacyName' in value &&
      'dispensedDate' in value &&
      'medicines' in value &&
      Array.isArray((value as Partial<OcrPrescriptionSchedule>).medicines),
  );
}

function parseLegacyMessage(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(
        value
          .replaceAll("'", '"')
          .replaceAll('None', 'null')
          .replaceAll('True', 'true')
          .replaceAll('False', 'false'),
      );
    } catch {
      return null;
    }
  }
}
