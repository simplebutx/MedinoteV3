from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.mysql import Base


class MedicationScheduleTime(Base):
    __tablename__ = "schedule_times"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_medicine_id = Column(
        Integer,
        ForeignKey("schedule_medicines.id", ondelete="CASCADE"),
        nullable=False,
    )
    timing = Column(String(100), nullable=True)
    take_time = Column(Time, nullable=False)
    sort_order = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    medicine = relationship("MedicationScheduleMedicine", back_populates="times")
