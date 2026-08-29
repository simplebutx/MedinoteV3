from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.user_health_profile import HealthProfile


def get_health_profile(db: Session, user_id: int) -> HealthProfile | None:
    stmt = select(HealthProfile).where(HealthProfile.user_id == user_id)
    try:
        return db.scalars(stmt).one_or_none()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="기본 건강정보 조회 중 오류가 발생했어요.",
        )


def upsert_health_profile(
    db: Session,
    user_id: int,
    is_pregnant: bool,
    is_breastfeeding: bool,
    is_smoking: bool,
    is_drinking: bool,
    is_child: bool,
    is_elderly: bool,
) -> HealthProfile:
    health_profile = get_health_profile(db, user_id)

    if health_profile is None:
        health_profile = HealthProfile(user_id=user_id)
        db.add(health_profile)

    health_profile.is_pregnant = is_pregnant
    health_profile.is_breastfeeding = is_breastfeeding
    health_profile.is_smoking = is_smoking
    health_profile.is_drinking = is_drinking
    health_profile.is_child = is_child
    health_profile.is_elderly = is_elderly

    try:
        db.commit()
        db.refresh(health_profile)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="기본 건강정보 저장 중 오류가 발생했어요.",
        )

    return health_profile
