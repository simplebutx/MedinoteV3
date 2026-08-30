from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.db.mysql import Base


class MedicationIntakeLog(Base):
    __tablename__ = "medication_intake_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_schedule_id = Column(
        Integer,
        ForeignKey("schedules.id", ondelete="CASCADE"),
        nullable=False,
    )
    medication_schedule_time_id = Column(
        Integer,
        ForeignKey("schedule_times.id", ondelete="CASCADE"),
        nullable=False,
    )
    status = Column(String(50), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    taken_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
