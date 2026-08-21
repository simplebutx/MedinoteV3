from pydantic import BaseModel

class ChatRequest(BaseModel):
    medicine_name: str
    question: str
    top_k: int = 5

class ChatSource(BaseModel):
    name: str | None = None
    url: str | None = None

class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource] = []