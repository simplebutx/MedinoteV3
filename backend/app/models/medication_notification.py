from enum import Enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.db.mysql import Base


class MedicationNotificationType(str, Enum):
    MEDICATION_REMINDER = "MEDICATION_REMINDER"


class MedicationNotificationStatus(str, Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class MedicationNotification(Base):
    __tablename__ = "medication_notifications"
    __table_args__ = (
        Index(
            "ix_medication_notifications_user_visible_scheduled",
            "user_id",
            "is_visible",
            "scheduled_at",
        ),
        Index(
            "ix_medication_notifications_user_read_at",
            "user_id",
            "read_at",
        ),
        Index(
            "ix_medication_notifications_schedule_scheduled",
            "medication_schedule_id",
            "scheduled_at",
        ),
        Index(
            "ix_medication_notifications_time_scheduled",
            "medication_schedule_time_id",
            "scheduled_at",
        ),
        UniqueConstraint(
            "user_id",
            "medication_schedule_id",
            "medication_schedule_medicine_id",
            "medication_schedule_time_id",
            "scheduled_at",
            name="uq_medication_notifications_occurrence",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    medication_schedule_id = Column(
        Integer,
        ForeignKey("schedules.id", ondelete="CASCADE"),
        nullable=False,
    )
    medication_schedule_medicine_id = Column(
        Integer,
        ForeignKey("schedule_medicines.id", ondelete="CASCADE"),
        nullable=False,
    )
    medication_schedule_time_id = Column(
        Integer,
        ForeignKey("schedule_times.id", ondelete="CASCADE"),
        nullable=False,
    )
    type = Column(
        SqlEnum(MedicationNotificationType),
        nullable=False,
        server_default=MedicationNotificationType.MEDICATION_REMINDER.value,
    )
    title = Column(String(255), nullable=False)
    body = Column(String(500), nullable=False)
    status = Column(
        SqlEnum(MedicationNotificationStatus),
        nullable=False,
        server_default=MedicationNotificationStatus.PENDING.value,
    )
    scheduled_at = Column(DateTime, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    is_visible = Column(Boolean, nullable=False, server_default="1")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
