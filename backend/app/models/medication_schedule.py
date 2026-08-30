from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.mysql import Base


class MedicationSchedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    hospital_name = Column(String(255), nullable=True)
    pharmacy_name = Column(String(255), nullable=True)
    start_date = Column(Date, nullable=False)
    dispensed_date = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="1")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    medicines = relationship(
        "MedicationScheduleMedicine",
        back_populates="schedule",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
