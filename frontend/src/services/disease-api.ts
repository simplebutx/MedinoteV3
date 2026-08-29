import { apiFetch } from './api-client';

export type DiseaseSuggestResponse = {
  diseaseCode: string;
  diseaseName: string;
};

export type DiseaseResponse = {
  id: number;
  diseaseCode: string | null;
  diseaseName: string;
};

type DiseaseApiResponse = {
  id: number;
  disease_code: string | null;
  disease_name: string;
};

type DiseaseSuggestionApiResponse = {
  disease_code: string;
  disease_name: string;
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

function toDiseaseResponse(data: DiseaseApiResponse): DiseaseResponse {
  return {
    id: data.id,
    diseaseCode: data.disease_code,
    diseaseName: data.disease_name,
  };
}

function toDiseaseSuggestResponse(
  data: DiseaseSuggestionApiResponse
): DiseaseSuggestResponse {
  return {
    diseaseCode: data.disease_code,
    diseaseName: data.disease_name,
  };
}

export async function fetchDiseaseSuggestions(keyword: string) {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return [];
  }

  const response = await apiFetch(
    `/disease/search?keyword=${encodeURIComponent(trimmedKeyword)}`
  );
  const data = (await response.json().catch(() => null)) as
    | ApiMessageResponse
    | DiseaseSuggestionApiResponse[]
    | null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data as ApiMessageResponse | null,
        '기저질환 자동완성 결과를 불러오지 못했어요.'
      )
    );
  }

  if (!Array.isArray(data)) {
    throw new Error('기저질환 자동완성 응답 형식이 올바르지 않아요.');
  }

  return data.map(toDiseaseSuggestResponse);
}

export async function fetchMyDiseases() {
  const response = await apiFetch('/disease');
  const data = (await response.json().catch(() => null)) as
    | ApiMessageResponse
    | DiseaseApiResponse[]
    | null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data as ApiMessageResponse | null, '기저질환 목록을 불러오지 못했어요.')
    );
  }

  if (!Array.isArray(data)) {
    throw new Error('기저질환 목록 응답 형식이 올바르지 않아요.');
  }

  return data.map(toDiseaseResponse);
}

export async function createMyDisease(payload: DiseaseSuggestResponse) {
  const response = await apiFetch('/disease', {
    method: 'POST',
    body: JSON.stringify({
      disease_code: payload.diseaseCode || null,
      disease_name: payload.diseaseName,
    }),
  });
  const data = (await response.json().catch(() => null)) as
    | ApiMessageResponse
    | DiseaseApiResponse
    | null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data as ApiMessageResponse | null, '기저질환을 등록하지 못했어요.')
    );
  }

  if (!data || Array.isArray(data) || !('id' in data)) {
    throw new Error('기저질환 등록 응답 형식이 올바르지 않아요.');
  }

  return toDiseaseResponse(data as DiseaseApiResponse);
}

export async function deleteMyDisease(id: number) {
  const response = await apiFetch(`/disease/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as ApiMessageResponse | null;

    throw new Error(getErrorMessage(data, '기저질환을 삭제하지 못했어요.'));
  }
}
