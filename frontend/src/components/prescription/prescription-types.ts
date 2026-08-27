import type {
  ScheduleMedicine,
  ScheduleRecord,
  ScheduleTime,
} from "@/services/schedule-api";

export type PrescriptionTime = {
  id: string;
  takeTime: string;
};

export type PrescriptionMedicine = {
  id: string;
  itemSeq: number | null;
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

export type PrescriptionSchedule = {
  hospitalName: string;
  pharmacyName: string;
  dispensedDate: string;
  medicines: PrescriptionMedicine[];
};

export function toPrescriptionRecord(schedule: ScheduleRecord): PrescriptionRecord {
  return {
    id: String(schedule.id),
    hospitalName: schedule.hospitalName,
    pharmacyName: schedule.pharmacyName,
    dispensedDate: schedule.dispensedDate,
    isActive: schedule.isActive,
    medicines: schedule.medicines.map(toPrescriptionMedicine),
  };
}

export function toPrescriptionMedicine(medicine: ScheduleMedicine): PrescriptionMedicine {
  return {
    id: String(medicine.id),
    itemSeq: medicine.itemSeq,
    customMedicineName: medicine.customMedicineName,
    dosageAmount: medicine.dosageAmount,
    dosageUnit: medicine.dosageUnit,
    timesPerDay: medicine.timesPerDay,
    durationDays: medicine.durationDays,
    times: medicine.times.map(toPrescriptionTime),
  };
}

export function toPrescriptionTime(time: ScheduleTime): PrescriptionTime {
  return {
    id: String(time.id),
    takeTime: time.takeTime,
  };
}
