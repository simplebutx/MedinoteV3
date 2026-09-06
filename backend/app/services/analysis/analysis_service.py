from sqlalchemy.orm import Session

from app.models.medication_schedule import MedicationSchedule
from app.services.analysis.analysis_graph_service import (
    generate_prescription_analysis_with_graph,
)

# 랭그래프 실행
def generate_prescription_analysis(
    db: Session,
    user_id: int,
    schedule: MedicationSchedule,
) -> dict:
    return generate_prescription_analysis_with_graph(
        db=db,
        user_id=user_id,
        schedule=schedule,
    )
