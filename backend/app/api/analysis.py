from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.crud.analysis import (
    create_prescription_analysis as crud_create_prescription_analysis,
    get_latest_prescription_analysis as crud_get_latest_prescription_analysis,
    get_prescription_analysis as crud_get_prescription_analysis,
)
from app.db.mysql import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.analysis_schema import (
    PrescriptionAnalysisCreateRequest,
    PrescriptionAnalysisResponse,
)

router = APIRouter(prefix="/prescription-analyses", tags=["prescription-analysis"])


@router.post(
    "",
    response_model=PrescriptionAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_prescription_analysis(
    request: PrescriptionAnalysisCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_create_prescription_analysis(
        db=db,
        user_id=current_user.id,
        schedule_id=request.schedule_id,
    )


@router.get("", response_model=PrescriptionAnalysisResponse)
def read_latest_prescription_analysis(
    schedule_id: int = Query(..., alias="scheduleId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_get_latest_prescription_analysis(
        db=db,
        user_id=current_user.id,
        schedule_id=schedule_id,
    )


@router.get("/{analysis_id}", response_model=PrescriptionAnalysisResponse)
def read_prescription_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_get_prescription_analysis(
        db=db,
        user_id=current_user.id,
        analysis_id=analysis_id,
    )
