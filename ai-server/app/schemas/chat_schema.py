from pydantic import BaseModel

class ChatRequest(BaseModel):
    medicine_name: str
    question: str
    top_k: int = 5

class ChatResponse(BaseModel):
    answer: str