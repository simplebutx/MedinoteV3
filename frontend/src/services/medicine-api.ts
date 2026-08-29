import { apiFetch } from './api-client';

export type MedicineSuggestion = {
  itemSeq: number;
  itemName: string;
};

export type MedicineIngredientResponse = {
  itemSeq: number;
  productName: string | null;
  ingredientSeq: number;
  ingredientCode: string | null;
  ingredientName: string | null;
  quantity: string | null;
  unit: string | null;
};

export type MedicineSearchResponse = {
  itemSeq: number;
  itemName: string | null;
  companyName: string | null;
  efficacy: string | null;
  useMethod: string | null;
  warningBeforeUse: string | null;
  caution: string | null;
  interaction: string | null;
  sideEffect: string | null;
  storageMethod: string | null;
  updateDe: string | null;
  imageUrl: string | null;
  ingredients: MedicineIngredientResponse[];
};

type MedicineIngredientApiResponse = {
  item_seq: number;
  product_name: string | null;
  ingredient_seq: number;
  ingredient_code: string | null;
  ingredient_name: string | null;
  quantity: string | null;
  unit: string | null;
};

type MedicineSearchApiResponse = {
  item_seq: number;
  item_name: string | null;
  company_name: string | null;
  efficacy: string | null;
  use_method: string | null;
  warning_before_use: string | null;
  caution: string | null;
  interaction: string | null;
  side_effect: string | null;
  storage_method: string | null;
  update_de: string | null;
  image_url: string | null;
  ingredients: MedicineIngredientApiResponse[];
};

type MedicineSuggestApiResponse = {
  results: {
    medicine_id: string;
    medicine_name: string;
  }[];
};

type MedicineSuggestApiItem = MedicineSuggestApiResponse['results'][number];

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

function toMedicineIngredient(
  data: MedicineIngredientApiResponse,
): MedicineIngredientResponse {
  return {
    itemSeq: data.item_seq,
    productName: data.product_name,
    ingredientSeq: data.ingredient_seq,
    ingredientCode: data.ingredient_code,
    ingredientName: data.ingredient_name,
    quantity: data.quantity,
    unit: data.unit,
  };
}

function toMedicineSearchResponse(
  data: MedicineSearchApiResponse,
): MedicineSearchResponse {
  return {
    itemSeq: data.item_seq,
    itemName: data.item_name,
    companyName: data.company_name,
    efficacy: data.efficacy,
    useMethod: data.use_method,
    warningBeforeUse: data.warning_before_use,
    caution: data.caution,
    interaction: data.interaction,
    sideEffect: data.side_effect,
    storageMethod: data.storage_method,
    updateDe: data.update_de,
    imageUrl: data.image_url,
    ingredients: data.ingredients.map(toMedicineIngredient),
  };
}

export async function fetchMedicineSuggestions(keyword: string) {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return [];
  }

  const response = await apiFetch(`/search/medicines?q=${encodeURIComponent(trimmedKeyword)}`);
  const data = (await response.json().catch(() => null)) as
    | ApiMessageResponse
    | MedicineSuggestApiResponse
    | null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data as ApiMessageResponse | null, '약 이름 자동완성을 불러오지 못했어요.'),
    );
  }

  if (
    !data ||
    Array.isArray(data) ||
    !('results' in data) ||
    !Array.isArray(data.results)
  ) {
    throw new Error('약 이름 자동완성 응답 형식이 올바르지 않아요.');
  }

  return data.results.map((item: MedicineSuggestApiItem) => ({
    itemSeq: Number(item.medicine_id),
    itemName: item.medicine_name,
  }));
}

export async function fetchMedicineSearchResult(itemSeq: number) {
  if (!Number.isFinite(itemSeq)) {
    throw new Error('선택한 약 정보가 올바르지 않아요.');
  }

  const response = await apiFetch(`/search/medicines/${itemSeq}`);
  const data = (await response.json().catch(() => null)) as
    | ApiMessageResponse
    | MedicineSearchApiResponse
    | null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data as ApiMessageResponse | null, '약 검색 결과를 불러오지 못했어요.'),
    );
  }

  if (!data || Array.isArray(data) || !('item_seq' in data)) {
    throw new Error('약 검색 응답 형식이 올바르지 않아요.');
  }

  return toMedicineSearchResponse(data as MedicineSearchApiResponse);
}
