from sqlalchemy import Column, DateTime, ForeignKey, String, Text, BigInteger, JSON
from sqlalchemy.sql import func

from app.db.mysql import Base

class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id = Column(String(36), primary_key=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    # 가장 최근에 언급한 약
    last_medicine_name = Column(String(255), nullable=True)
    last_medicine_id = Column(String(100), nullable=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    room_id = Column(String(36), ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)