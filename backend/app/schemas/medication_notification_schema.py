from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models.medication_notification import (
    MedicationNotificationStatus,
    MedicationNotificationType,
)


NotificationTitle = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]
NotificationBody = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
]


class MedicationNotificationCreateRequest(BaseModel):
    medication_schedule_id: int = Field(alias="medicationScheduleId")
    medication_schedule_medicine_id: int = Field(alias="medicationScheduleMedicineId")
    medication_schedule_time_id: int = Field(alias="medicationScheduleTimeId")
    type: MedicationNotificationType = MedicationNotificationType.MEDICATION_REMINDER
    title: NotificationTitle
    body: NotificationBody
    status: MedicationNotificationStatus = MedicationNotificationStatus.PENDING
    scheduled_at: datetime = Field(alias="scheduledAt")
    sent_at: datetime | None = Field(default=None, alias="sentAt")
    read_at: datetime | None = Field(default=None, alias="readAt")
    is_visible: bool = Field(default=True, alias="isVisible")

    model_config = ConfigDict(populate_by_name=True)


class MedicationNotificationUpdateRequest(BaseModel):
    type: MedicationNotificationType | None = None
    title: NotificationTitle | None = None
    body: NotificationBody | None = None
    status: MedicationNotificationStatus | None = None
    scheduled_at: datetime | None = Field(default=None, alias="scheduledAt")
    sent_at: datetime | None = Field(default=None, alias="sentAt")
    read_at: datetime | None = Field(default=None, alias="readAt")
    is_visible: bool | None = Field(default=None, alias="isVisible")

    model_config = ConfigDict(populate_by_name=True)


class MedicationNotificationResponse(BaseModel):
    id: int
    user_id: int = Field(alias="userId")
    medication_schedule_id: int = Field(alias="medicationScheduleId")
    medication_schedule_medicine_id: int = Field(alias="medicationScheduleMedicineId")
    medication_schedule_time_id: int = Field(alias="medicationScheduleTimeId")
    type: MedicationNotificationType
    title: str
    body: str
    status: MedicationNotificationStatus
    scheduled_at: datetime = Field(alias="scheduledAt")
    sent_at: datetime | None = Field(default=None, alias="sentAt")
    read_at: datetime | None = Field(default=None, alias="readAt")
    is_visible: bool = Field(alias="isVisible")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
