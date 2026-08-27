export type PrescriptionTime = {
  id: string;
  takeTime: string;
};

export type PrescriptionMedicine = {
  id: string;
  itemSeq?: number | null;
  customMedicineName: string;
  dosageAmount: string;
  dosageUnit: string;
  timesPerDay: string;
  durationDays: string;
  times: PrescriptionTime[];
};

export type PrescriptionRecord = {
  id: string;
  hospitalName: string;
  pharmacyName: string;
  dispensedDate: string;
  isActive: boolean;
  medicines: PrescriptionMedicine[];
};

export const prescriptionMockData: PrescriptionRecord[] = [
  {
    id: "1",
    hospitalName: "서울메디내과",
    pharmacyName: "메디약국",
    dispensedDate: "2026-07-04",
    isActive: true,
    medicines: [
      {
        id: "medicine-1",
        customMedicineName: "타이레놀정",
        dosageAmount: "1",
        dosageUnit: "정",
        timesPerDay: "3",
        durationDays: "7",
        times: [
          { id: "time-1", takeTime: "08:00" },
          { id: "time-2", takeTime: "12:00" },
          { id: "time-3", takeTime: "20:00" },
        ],
      },
      {
        id: "medicine-2",
        customMedicineName: "모사프리드정",
        dosageAmount: "1",
        dosageUnit: "정",
        timesPerDay: "2",
        durationDays: "5",
        times: [
          { id: "time-1", takeTime: "08:00" },
          { id: "time-2", takeTime: "18:00" },
        ],
      },
      {
        id: "medicine-3",
        customMedicineName: "알목스다리버캡슐",
        dosageAmount: "1",
        dosageUnit: "캡슐",
        timesPerDay: "3",
        durationDays: "7",
        times: [
          { id: "time-1", takeTime: "08:00" },
          { id: "time-2", takeTime: "14:00" },
          { id: "time-3", takeTime: "20:00" },
        ],
      },
    ],
  },
  {
    id: "2",
    hospitalName: "연세가정의학과",
    pharmacyName: "건강약국",
    dispensedDate: "2026-06-28",
    isActive: false,
    medicines: [
      {
        id: "medicine-1",
        customMedicineName: "베아밀정",
        dosageAmount: "1",
        dosageUnit: "정",
        timesPerDay: "2",
        durationDays: "5",
        times: [
          { id: "time-1", takeTime: "09:00" },
          { id: "time-2", takeTime: "21:00" },
        ],
      },
      {
        id: "medicine-2",
        customMedicineName: "유클리타임",
        dosageAmount: "1",
        dosageUnit: "정",
        timesPerDay: "3",
        durationDays: "3",
        times: [
          { id: "time-1", takeTime: "08:00" },
          { id: "time-2", takeTime: "13:00" },
          { id: "time-3", takeTime: "19:00" },
        ],
      },
    ],
  },
];

export function getPrescriptionById(id: string) {
  return prescriptionMockData.find((item) => item.id === id) ?? null;
}
