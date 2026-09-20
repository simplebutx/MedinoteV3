from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.mysql import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.agent.agent_service import send_agent_message


router = APIRouter(
    prefix="/api/agent",
    tags=["Agent"],
)


class AgentRequest(BaseModel):
    medicine_name: str | None = None
    question: str = Field(min_length=1, max_length=500)


class AgentResponse(BaseModel):
    answer: str
    sources: list[dict] = Field(default_factory=list)


@router.post("/message", response_model=AgentResponse)
def send_message(
    request: AgentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return send_agent_message(
        medicine_name=request.medicine_name,
        question=request.question,
        user_id=current_user.id,
        db=db,
    )
