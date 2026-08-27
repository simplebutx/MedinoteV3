export type DiseaseSuggestResponse = {
  diseaseCode: string;
  diseaseName: string;
};

export type DiseaseResponse = {
  id: number;
  diseaseCode: string;
  diseaseName: string;
};

let mockDiseases: DiseaseResponse[] = [
  { id: 1, diseaseCode: 'I10', diseaseName: '고혈압' },
  { id: 2, diseaseCode: 'E11', diseaseName: '제2형 당뇨병' },
];

const mockSuggestions: DiseaseSuggestResponse[] = [
  { diseaseCode: 'I10', diseaseName: '고혈압' },
  { diseaseCode: 'E11', diseaseName: '제2형 당뇨병' },
  { diseaseCode: 'J45', diseaseName: '천식' },
];

export async function fetchDiseaseSuggestions(keyword: string) {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return [];
  }

  return mockSuggestions.filter((item) => item.diseaseName.includes(trimmedKeyword));
}

export async function fetchMyDiseases() {
  return mockDiseases;
}

export async function createMyDisease(payload: DiseaseSuggestResponse) {
  mockDiseases = [
    ...mockDiseases,
    {
      id: Date.now(),
      diseaseCode: payload.diseaseCode,
      diseaseName: payload.diseaseName,
    },
  ];
}

export async function deleteMyDisease(id: number) {
  mockDiseases = mockDiseases.filter((disease) => disease.id !== id);
}
