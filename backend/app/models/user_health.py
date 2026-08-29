from sqlalchemy import Column, Integer, ForeignKey, Boolean, DateTime
from sqlalchemy.sql import func

from app.db.mysql import Base


class HealthProfile(Base):
    __tablename__ = "user_health_profile"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    is_pregnant = Column(Boolean, nullable=False, default=False, server_default="0")
    is_breastfeeding = Column(Boolean, nullable=False, default=False, server_default="0")
    is_smoking = Column(Boolean, nullable=False, default=False, server_default="0")
    is_drinking = Column(Boolean, nullable=False, default=False, server_default="0")
    is_child = Column(Boolean, nullable=False, default=False, server_default="0")
    is_elderly = Column(Boolean, nullable=False, default=False, server_default="0")

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
