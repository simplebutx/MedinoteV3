from datetime import date, datetime, time
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


OptionalShortText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=255),
]
RequiredShortText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]
DosageText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=50),
]
TimingText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=100),
]


class ScheduleTimeRequest(BaseModel):
    id: int | None = None
    timing: TimingText | None = None
    take_time: time = Field(alias="takeTime")
    sort_order: int | None = Field(default=None, alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True)


class ScheduleMedicineRequest(BaseModel):
    id: int | None = None
    item_seq: int | None = Field(default=None, alias="itemSeq")
    custom_medicine_name: RequiredShortText = Field(alias="customMedicineName")
    dosage_amount: DosageText | None = Field(default=None, alias="dosageAmount")
    dosage_unit: DosageText | None = Field(default=None, alias="dosageUnit")
    times_per_day: int | None = Field(default=None, alias="timesPerDay")
    duration_days: int | None = Field(default=None, alias="durationDays")
    times: list[ScheduleTimeRequest]

    model_config = ConfigDict(populate_by_name=True)


class ScheduleRequest(BaseModel):
    hospital_name: OptionalShortText | None = Field(default=None, alias="hospitalName")
    pharmacy_name: OptionalShortText | None = Field(default=None, alias="pharmacyName")
    start_date: date = Field(alias="startDate")
    dispensed_date: date | None = Field(default=None, alias="dispensedDate")
    medicines: list[ScheduleMedicineRequest]

    model_config = ConfigDict(populate_by_name=True)


class ScheduleTimeResponse(BaseModel):
    id: int
    medication_schedule_id: int = Field(alias="medicationScheduleId")
    medication_schedule_medicine_id: int = Field(alias="medicationScheduleMedicineId")
    timing: str | None = None
    take_time: str = Field(alias="takeTime")
    sort_order: int | None = Field(default=None, alias="sortOrder")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class ScheduleMedicineResponse(BaseModel):
    id: int
    medication_schedule_id: int = Field(alias="medicationScheduleId")
    item_seq: int | None = Field(default=None, alias="itemSeq")
    custom_medicine_name: str = Field(alias="customMedicineName")
    dosage_amount: str | None = Field(default=None, alias="dosageAmount")
    dosage_unit: str | None = Field(default=None, alias="dosageUnit")
    times_per_day: int | None = Field(default=None, alias="timesPerDay")
    duration_days: int | None = Field(default=None, alias="durationDays")
    is_active: bool = Field(alias="isActive")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")
    times: list[ScheduleTimeResponse]

    model_config = ConfigDict(populate_by_name=True)


class ScheduleResponse(BaseModel):
    id: int
    user_id: int = Field(alias="userId")
    hospital_name: str | None = Field(default=None, alias="hospitalName")
    pharmacy_name: str | None = Field(default=None, alias="pharmacyName")
    start_date: date = Field(alias="startDate")
    dispensed_date: date | None = Field(default=None, alias="dispensedDate")
    is_active: bool = Field(alias="isActive")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")
    medicines: list[ScheduleMedicineResponse]

    model_config = ConfigDict(populate_by_name=True)


class MedicationIntakeLogRequest(BaseModel):
    medication_schedule_id: int = Field(alias="medicationScheduleId")
    medication_schedule_time_id: int = Field(alias="medicationScheduleTimeId")
    status: RequiredShortText
    scheduled_at: datetime = Field(alias="scheduledAt")
    taken_at: datetime | None = Field(default=None, alias="takenAt")

    model_config = ConfigDict(populate_by_name=True)


class MedicationIntakeLogResponse(BaseModel):
    id: int
    medication_schedule_id: int = Field(alias="medicationScheduleId")
    medication_schedule_time_id: int = Field(alias="medicationScheduleTimeId")
    status: str
    scheduled_at: datetime = Field(alias="scheduledAt")
    taken_at: datetime | None = Field(default=None, alias="takenAt")
    created_at: datetime | None = Field(default=None, alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class DailyMedicationItemResponse(BaseModel):
    medication_schedule_id: int = Field(alias="medicationScheduleId")
    medication_schedule_medicine_id: int = Field(alias="medicationScheduleMedicineId")
    medication_schedule_time_id: int = Field(alias="medicationScheduleTimeId")
    medication_intake_log_id: int | None = Field(default=None, alias="medicationIntakeLogId")
    item_seq: int | None = Field(default=None, alias="itemSeq")
    custom_medicine_name: str = Field(alias="customMedicineName")
    dosage_amount: str | None = Field(default=None, alias="dosageAmount")
    dosage_unit: str | None = Field(default=None, alias="dosageUnit")
    times_per_day: int | None = Field(default=None, alias="timesPerDay")
    timing: str | None = None
    take_time: str = Field(alias="takeTime")
    intake_status: str = Field(alias="intakeStatus")
    scheduled_at: datetime = Field(alias="scheduledAt")
    taken_at: datetime | None = Field(default=None, alias="takenAt")
    hospital_name: str | None = Field(default=None, alias="hospitalName")
    pharmacy_name: str | None = Field(default=None, alias="pharmacyName")

    model_config = ConfigDict(populate_by_name=True)


class DailyMedicationGroupResponse(BaseModel):
    take_time: str = Field(alias="takeTime")
    medications: list[DailyMedicationItemResponse]

    model_config = ConfigDict(populate_by_name=True)


class DailyMedicationScheduleResponse(BaseModel):
    date: date
    groups: list[DailyMedicationGroupResponse]

    model_config = ConfigDict(populate_by_name=True)
