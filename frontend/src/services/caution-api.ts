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
  reason: CautionReason;
  createdAt: string;
  updatedAt: string;
};

export type CreateCautionPayload = {
  targetType: CautionTargetType;
  itemSeq: number | null;
  itemName: string;
  ingredientCode: string;
  ingredientName: string;
  reason: CautionReason;
};

let mockCautions: CautionItem[] = [
  {
    id: 1,
    targetType: 'MEDICINE',
    itemSeq: 200300985,
    itemName: '뉴렙톨캡슐300밀리그램',
    ingredientCode: 'GABAPENTIN',
    ingredientName: '가바펜틴',
    reason: 'SIDE_EFFECT',
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
  },
];

const mockSuggestions: CautionSuggestion[] = [
  {
    targetType: 'MEDICINE',
    itemSeq: 200300985,
    itemName: '뉴렙톨캡슐300밀리그램',
    ingredientCode: 'GABAPENTIN',
    ingredientName: '가바펜틴',
  },
  {
    targetType: 'INGREDIENT',
    itemSeq: null,
    itemName: '',
    ingredientCode: 'AMLODIPINE',
    ingredientName: '암로디핀',
  },
];

export async function fetchCautionSuggestions(
  keyword: string,
  targetType: CautionTargetType,
) {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return [];
  }

  return mockSuggestions.filter(
    (item) =>
      item.targetType === targetType &&
      `${item.itemName}${item.ingredientName}`.includes(trimmedKeyword),
  );
}

export async function fetchMyCautions() {
  return mockCautions;
}

export async function createMyCaution(payload: CreateCautionPayload) {
  const now = new Date().toISOString();
  mockCautions = [
    ...mockCautions,
    {
      ...payload,
      id: Date.now(),
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export async function deleteMyCaution(id: number) {
  mockCautions = mockCautions.filter((caution) => caution.id !== id);
}
