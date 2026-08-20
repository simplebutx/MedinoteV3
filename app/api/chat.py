from fastapi import APIRouter

from app.schemas.chat_schema import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest):
    return ChatResponse(
        answer=f"{request.question}에 대한 임시 답변임"
    )