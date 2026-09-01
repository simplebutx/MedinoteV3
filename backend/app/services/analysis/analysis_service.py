from sqlalchemy.orm import Session

from app.models.medication_schedule import MedicationSchedule
from app.services.analysis.analysis_context_service import build_analysis_context
from app.services.analysis.analysis_llm_service import generate_analysis_with_llm
from app.services.analysis.analysis_retrieval_service import attach_retrieval_context


def generate_prescription_analysis(
    db: Session,
    user_id: int,
    schedule: MedicationSchedule,
) -> dict:
    context = build_analysis_context(db=db, user_id=user_id, schedule=schedule)
    context_with_evidence = attach_retrieval_context(context)
    return generate_analysis_with_llm(context_with_evidence)
