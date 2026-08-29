from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException

from app.models.user_disease import UserDisease
from app.models.disease_master import DiseaseMaster

def get_user_disease(db: Session, user_id: int) -> list[UserDisease]:
    stmt = select(UserDisease).where(UserDisease.user_id == user_id).order_by(UserDisease.created_at.desc())
    try:
        return list(db.scalars(stmt).all())
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="기저질환 목록 조회 중 오류가 발생했어요.",
        )

def create_user_disease(
        db: Session,
        user_id: int,
        disease_code: str | None,
        disease_name: str
) -> UserDisease:
    if disease_code:
        stmt = select(DiseaseMaster).where(DiseaseMaster.disease_code == disease_code)
        try:
            disease_master = db.scalars(stmt).first()
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="질병 코드 확인 중 오류가 발생했어요.",
            )

        if disease_master is None:
            raise HTTPException(status_code=400, detail="존재하지 않는 질병 코드예요.")

    user_disease = UserDisease(
        user_id=user_id,
        disease_code=disease_code,
        disease_name=disease_name,
    )

    try:
        db.add(user_disease)
        db.commit()
        db.refresh(user_disease)
        return user_disease
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="등록할 수 없는 질병 정보예요.",
        )

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="기저질환 저장 중 오류가 발생했어요.",
        )

def delete_user_disease(
    db: Session,
    user_id: int,
    disease_id: int,
) -> None:
    stmt = select(UserDisease).where(
        UserDisease.user_id == user_id,
        UserDisease.id == disease_id,
    )

    user_disease = db.scalars(stmt).first()

    if user_disease is None:
        raise HTTPException(status_code=404, detail="기저질환을 찾을 수 없어요.")

    try:
        db.delete(user_disease)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="기저질환 삭제 중 오류가 발생했어요.",
        )

# 검색 자동완성
def get_disease_names(
    db: Session,
    keyword: str,
) -> list[DiseaseMaster]:
    stmt = select(DiseaseMaster).where(DiseaseMaster.disease_name.like(f"%{keyword}%")).limit(10)
    try:
        return list(db.scalars(stmt).all())
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="기저질환 자동완성 조회 중 오류가 발생했어요.",
        )
