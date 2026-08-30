from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.mysql import Base


class MedicationScheduleMedicine(Base):
    __tablename__ = "schedule_medicines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(
        Integer,
        ForeignKey("schedules.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_seq = Column(Integer, nullable=True)
    custom_medicine_name = Column(String(255), nullable=False)
    dosage_amount = Column(String(50), nullable=True)
    dosage_unit = Column(String(50), nullable=True)
    times_per_day = Column(Integer, nullable=True)
    duration_days = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="1")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    schedule = relationship("MedicationSchedule", back_populates="medicines")
    times = relationship(
        "MedicationScheduleTime",
        back_populates="medicine",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
