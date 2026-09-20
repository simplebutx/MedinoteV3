from sqlalchemy.orm import Session

from app.services.agent.agent_graph_service import (
    answer_question_with_agent,
)


def send_agent_message(
    medicine_name: str | None,
    question: str,
    user_id: int,
    db: Session,
    messages: list | None = None,
) -> dict:
    return answer_question_with_agent(
        medicine_name=medicine_name,
        question=question,
        user_id=user_id,
        db=db,
        messages=messages,
    )
