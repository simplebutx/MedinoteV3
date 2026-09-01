from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.models.analysis import PrescriptionAnalysis
from app.models.medication_schedule import MedicationSchedule
from app.schemas.analysis_schema import PrescriptionAnalysisResponse
from app.services.analysis.analysis_service import generate_prescription_analysis


def create_prescription_analysis(
    db: Session,
    user_id: int,
    schedule_id: int,
) -> PrescriptionAnalysisResponse:
    schedule = _get_schedule_model(db=db, user_id=user_id, schedule_id=schedule_id)
    analysis = PrescriptionAnalysis(
        schedule_id=schedule.id,
        user_id=user_id,
        result_json=generate_prescription_analysis(
            db=db,
            user_id=user_id,
            schedule=schedule,
        ),
    )

    try:
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="처방전 분석 저장 중 오류가 발생했어요.")

    return to_analysis_response(analysis)


def get_latest_prescription_analysis(
    db: Session,
    user_id: int,
    schedule_id: int,
) -> PrescriptionAnalysisResponse:
    _assert_schedule_exists(db=db, user_id=user_id, schedule_id=schedule_id)
    stmt = (
        select(PrescriptionAnalysis)
        .where(
            PrescriptionAnalysis.user_id == user_id,
            PrescriptionAnalysis.schedule_id == schedule_id,
        )
        .order_by(PrescriptionAnalysis.created_at.desc(), PrescriptionAnalysis.id.desc())
    )

    try:
        analysis = db.scalars(stmt).first()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="처방전 분석 조회 중 오류가 발생했어요.")

    if analysis is None:
        raise HTTPException(status_code=404, detail="처방전 분석 결과가 없어요.")

    return to_analysis_response(analysis)


def get_prescription_analysis(
    db: Session,
    user_id: int,
    analysis_id: int,
) -> PrescriptionAnalysisResponse:
    stmt = select(PrescriptionAnalysis).where(
        PrescriptionAnalysis.user_id == user_id,
        PrescriptionAnalysis.id == analysis_id,
    )

    try:
        analysis = db.scalars(stmt).first()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="처방전 분석 조회 중 오류가 발생했어요.")

    if analysis is None:
        raise HTTPException(status_code=404, detail="처방전 분석 결과를 찾을 수 없어요.")

    return to_analysis_response(analysis)


def to_analysis_response(analysis: PrescriptionAnalysis) -> PrescriptionAnalysisResponse:
    return PrescriptionAnalysisResponse(
        id=analysis.id,
        scheduleId=analysis.schedule_id,
        userId=analysis.user_id,
        resultJson=analysis.result_json,
        createdAt=analysis.created_at,
        updatedAt=analysis.updated_at,
    )


def _get_schedule_model(
    db: Session,
    user_id: int,
    schedule_id: int,
) -> MedicationSchedule:
    stmt = (
        select(MedicationSchedule)
        .where(
            MedicationSchedule.user_id == user_id,
            MedicationSchedule.id == schedule_id,
        )
        .options(joinedload(MedicationSchedule.medicines))
    )

    try:
        schedule = db.execute(stmt).unique().scalar_one_or_none()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 일정 확인 중 오류가 발생했어요.")

    if schedule is None:
        raise HTTPException(status_code=404, detail="복약 일정을 찾을 수 없어요.")

    return schedule


def _assert_schedule_exists(db: Session, user_id: int, schedule_id: int) -> None:
    stmt = select(MedicationSchedule.id).where(
        MedicationSchedule.user_id == user_id,
        MedicationSchedule.id == schedule_id,
    )

    try:
        schedule_id_value = db.scalars(stmt).first()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 일정 확인 중 오류가 발생했어요.")

    if schedule_id_value is None:
        raise HTTPException(status_code=404, detail="복약 일정을 찾을 수 없어요.")
