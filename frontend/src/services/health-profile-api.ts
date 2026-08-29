import { apiFetch } from './api-client';

export type HealthProfilePayload = {
  isPregnant: boolean;
  isBreastfeeding: boolean;
  isSmoking: boolean;
  isDrinking: boolean;
  isChild: boolean;
  isElderly: boolean;
};

type HealthProfileApiResponse = {
  is_pregnant: boolean;
  is_breastfeeding: boolean;
  is_smoking: boolean;
  is_drinking: boolean;
  is_child: boolean;
  is_elderly: boolean;
};

type ApiMessageResponse = {
  message?: unknown;
  detail?: unknown;
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

function toHealthProfilePayload(data: HealthProfileApiResponse): HealthProfilePayload {
  return {
    isPregnant: data.is_pregnant,
    isBreastfeeding: data.is_breastfeeding,
    isSmoking: data.is_smoking,
    isDrinking: data.is_drinking,
    isChild: data.is_child,
    isElderly: data.is_elderly,
  };
}

function toHealthProfileRequest(payload: HealthProfilePayload): HealthProfileApiResponse {
  return {
    is_pregnant: payload.isPregnant,
    is_breastfeeding: payload.isBreastfeeding,
    is_smoking: payload.isSmoking,
    is_drinking: payload.isDrinking,
    is_child: payload.isChild,
    is_elderly: payload.isElderly,
  };
}

export async function fetchHealthProfile() {
  const response = await apiFetch('/health-profile');
  const data = (await response.json().catch(() => null)) as
    | (ApiMessageResponse & Partial<HealthProfileApiResponse>)
    | null;

  if (!response.ok) {
    throw new Error(getErrorMessage(data, '기본 건강정보를 불러오지 못했어요.'));
  }

  if (!data) {
    throw new Error('기본 건강정보 응답 형식이 올바르지 않아요.');
  }

  return toHealthProfilePayload(data as HealthProfileApiResponse);
}

export async function saveHealthProfile(payload: HealthProfilePayload) {
  const response = await apiFetch('/health-profile', {
    method: 'PUT',
    body: JSON.stringify(toHealthProfileRequest(payload)),
  });
  const data = (await response.json().catch(() => null)) as
    | (ApiMessageResponse & Partial<HealthProfileApiResponse>)
    | null;

  if (!response.ok) {
    throw new Error(getErrorMessage(data, '기본 건강정보를 저장하지 못했어요.'));
  }

  if (!data) {
    throw new Error('기본 건강정보 응답 형식이 올바르지 않아요.');
  }

  return toHealthProfilePayload(data as HealthProfileApiResponse);
}
