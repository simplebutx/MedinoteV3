from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    room_id: str
    medicine_name: str | None = None
    medicine_id: str | None = None
    question: str = Field(min_length=1, max_length=500)
    language: Literal["ko", "en"] = "ko"

class ChatSource(BaseModel):
    name: str | None = None
    url: str | None = None

class FallbackInfo(BaseModel):
    step: str
    reason: str
    error: str | None = None

class ChatResponse(BaseModel):
    room_id: str
    answer: str
    sources: list[ChatSource] = Field(default_factory=list)
    fallbacks: list[FallbackInfo] = Field(default_factory=list)

# ------
class CreateChatRoomRequest(BaseModel):
    title: str | None = None


class UpdateChatRoomRequest(BaseModel):
    title: str


class ChatRoomResponse(BaseModel):
    id: str
    title: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# 채팅방 메시지 조회
class ChatMessageResponse(BaseModel):
    id: int
    room_id: str
    role: str
    content: str
    sources: list[ChatSource] | None = None
    created_at: datetime

    class Config:
        from_attributes = True
