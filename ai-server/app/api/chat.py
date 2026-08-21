from fastapi import APIRouter

from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.chat_graph_service import answer_question_with_graph

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest):
    return ChatResponse(
        answer=answer_question_with_graph(
            medicine_name=request.medicine_name,
            question=request.question,
            top_k=request.top_k,
        )
    )
