export type MedicineSearchResponse = {
  itemSeq: number;
  itemName: string;
  companyName: string;
  efficacy: string;
  useMethod: string;
  warningBeforeUse: string;
  caution: string;
  interaction: string;
  sideEffect: string;
  storageMethod: string;
  updateDe: string;
  imageUrl: string;
};

const mockMedicines: MedicineSearchResponse[] = [
  {
    itemSeq: 200300985,
    itemName: '뉴렙톨캡슐300밀리그램(가바펜틴)',
    companyName: '한국화이자제약',
    efficacy: '신경병증성 통증 완화에 사용하는 약입니다.',
    useMethod: '의사의 처방에 따라 정해진 시간에 복용합니다.',
    warningBeforeUse: '졸림이나 어지러움이 있을 수 있어 운전 전 주의가 필요합니다.',
    caution: '임신, 수유, 신장질환이 있다면 복용 전 전문가와 상담하세요.',
    interaction: '중추신경계 억제제와 병용 시 졸림이 증가할 수 있습니다.',
    sideEffect: '졸림, 어지러움, 피로감 등이 나타날 수 있습니다.',
    storageMethod: '실온에서 보관하고 습기를 피하세요.',
    updateDe: '2026-08-27',
    imageUrl: '',
  },
  {
    itemSeq: 200610660,
    itemName: '노바스크정5밀리그람(암로디핀베실산염)',
    companyName: '한국화이자제약',
    efficacy: '고혈압과 협심증 치료에 사용하는 약입니다.',
    useMethod: '하루 한 번 같은 시간에 복용합니다.',
    warningBeforeUse: '저혈압 증상이나 부종이 있으면 전문가와 상담하세요.',
    caution: '간질환이 있거나 다른 혈압약을 복용 중이면 상담이 필요합니다.',
    interaction: '일부 항진균제, 항생제와 상호작용할 수 있습니다.',
    sideEffect: '두통, 안면홍조, 발목 부종 등이 나타날 수 있습니다.',
    storageMethod: '직사광선을 피해 실온 보관하세요.',
    updateDe: '2026-08-27',
    imageUrl: '',
  },
];

export async function fetchMedicineSuggestions(keyword: string) {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return [];
  }

  return mockMedicines
    .filter((medicine) => medicine.itemName.includes(trimmedKeyword))
    .map((medicine) => medicine.itemName);
}

export async function fetchMedicineSearchResult(keyword: string) {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    throw new Error('Search keyword is required.');
  }

  return (
    mockMedicines.find((medicine) => medicine.itemName.includes(trimmedKeyword)) ??
    mockMedicines[0]
  );
}
