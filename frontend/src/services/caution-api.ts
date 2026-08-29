import { apiFetch } from './api-client';

export type CautionTargetType = 'MEDICINE' | 'INGREDIENT';
export type CautionReason = 'ALLERGY' | 'SIDE_EFFECT' | 'OTHER';

export type CautionSuggestion = {
  targetType: CautionTargetType;
  itemSeq: number | null;
  itemName: string;
  ingredientCode: string;
  ingredientName: string;
};

export type CautionItem = {
  id: number;
  targetType: CautionTargetType;
  itemSeq: number | null;
  itemName: string;
  ingredientCode: string;
  ingredientName: string;
  reason: CautionReason | null;
};

export type CreateCautionPayload = {
  targetType: CautionTargetType;
  itemSeq: number | null;
  itemName: string;
  ingredientCode: string;
  ingredientName: string;
  reason: CautionReason;
};

type CautionSuggestionApiResponse = {
  item_seq?: number | null;
  item_name?: string | null;
  ingredient_code?: string | null;
  ingredient_name?: string | null;
};

type CautionItemApiResponse = CautionSuggestionApiResponse & {
  id: number;
  target_type: CautionTargetType;
  reason?: CautionReason | null;
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

function toCautionSuggestion(
  data: CautionSuggestionApiResponse,
  targetType: CautionTargetType,
): CautionSuggestion {
  return {
    targetType,
    itemSeq: data.item_seq ?? null,
    itemName: data.item_name ?? '',
    ingredientCode: data.ingredient_code ?? '',
    ingredientName: data.ingredient_name ?? '',
  };
}

function toCautionItem(data: CautionItemApiResponse): CautionItem {
  return {
    id: data.id,
    targetType: data.target_type,
    itemSeq: data.item_seq ?? null,
    itemName: data.item_name ?? '',
    ingredientCode: data.ingredient_code ?? '',
    ingredientName: data.ingredient_name ?? '',
    reason: data.reason ?? null,
  };
}

export async function fetchCautionSuggestions(
  keyword: string,
  targetType: CautionTargetType,
) {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return [];
  }

  const params = new URLSearchParams({
    target_type: targetType,
    keyword: trimmedKeyword,
  });
  const response = await apiFetch(`/caution/search?${params.toString()}`);
  const data = (await response.json().catch(() => null)) as
    | ApiMessageResponse
    | CautionSuggestionApiResponse[]
    | null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data as ApiMessageResponse | null,
        '주의 항목 자동완성 결과를 불러오지 못했어요.',
      ),
    );
  }

  if (!Array.isArray(data)) {
    throw new Error('주의 항목 자동완성 응답 형식이 올바르지 않아요.');
  }

  return data.map((item) => toCautionSuggestion(item, targetType));
}

export async function fetchMyCautions() {
  const response = await apiFetch('/caution/');
  const data = (await response.json().catch(() => null)) as
    | ApiMessageResponse
    | CautionItemApiResponse[]
    | null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data as ApiMessageResponse | null, '주의 항목 목록을 불러오지 못했어요.'),
    );
  }

  if (!Array.isArray(data)) {
    throw new Error('주의 항목 목록 응답 형식이 올바르지 않아요.');
  }

  return data.map(toCautionItem);
}

export async function createMyCaution(payload: CreateCautionPayload) {
  const response = await apiFetch('/caution/', {
    method: 'POST',
    body: JSON.stringify({
      target_type: payload.targetType,
      item_seq: payload.itemSeq,
      item_name: payload.itemName || null,
      ingredient_code: payload.ingredientCode || null,
      ingredient_name: payload.ingredientName || null,
      reason: payload.reason,
    }),
  });
  const data = (await response.json().catch(() => null)) as
    | ApiMessageResponse
    | CautionItemApiResponse
    | null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data as ApiMessageResponse | null, '주의 항목을 등록하지 못했어요.'),
    );
  }

  if (!data || Array.isArray(data) || !('id' in data)) {
    throw new Error('주의 항목 등록 응답 형식이 올바르지 않아요.');
  }

  return toCautionItem(data as CautionItemApiResponse);
}

export async function deleteMyCaution(id: number) {
  const response = await apiFetch(`/caution/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as ApiMessageResponse | null;

    throw new Error(getErrorMessage(data, '주의 항목을 삭제하지 못했어요.'));
  }
}
