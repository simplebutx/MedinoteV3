from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, Enum as SqlEnum
from sqlalchemy.sql import func
from app.db.mysql import Base
from enum import Enum

class CautionTargetType(str, Enum):
    INGREDIENT = "INGREDIENT"
    MEDICINE = "MEDICINE"


class UserCaution(Base):
    __tablename__ = "user_caution"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    target_type = Column(SqlEnum(CautionTargetType), nullable=False)
    item_seq = Column(Integer, nullable=True)
    item_name = Column(String(512), nullable=True)
    ingredient_code = Column(String(50), nullable=True)
    ingredient_name = Column(String(512), nullable=True)

    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)


