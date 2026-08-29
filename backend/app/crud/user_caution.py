from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, select
from fastapi import HTTPException

from app.models.medicine_info import MedicineInfo
from app.models.medicine_ingredient import MedicineIngredient
from app.models.user_caution import UserCaution, CautionTargetType

def get_user_cautions(db: Session, user_id: int) -> list[UserCaution]:
    stmt = select(UserCaution).where(UserCaution.user_id == user_id).order_by(UserCaution.created_at.desc())
    try:
        return list(db.scalars(stmt).all())
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="주의성분 조회 중 오류 발생")


def create_user_caution(
        db: Session,
        user_id: int,
        target_type: CautionTargetType,
        item_seq: int | None,
        item_name: str | None,
        ingredient_code: str | None,
        ingredient_name: str | None,
        reason: str | None
) -> UserCaution:
    if target_type == CautionTargetType.MEDICINE:
        if item_seq is None or not item_name:
            raise HTTPException(status_code=400, detail="약 ID와 약 이름이 필요해요.")

        stmt = select(MedicineInfo).where(MedicineInfo.item_seq == item_seq)
        try:
            medicine = db.scalars(stmt).first()
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(status_code=500, detail="약 정보 확인 중 오류가 발생했어요.")

        if medicine is None:
            raise HTTPException(status_code=400, detail="존재하지 않는 약이에요.")

    if target_type == CautionTargetType.INGREDIENT:
        if not ingredient_code or not ingredient_name:
            raise HTTPException(status_code=400, detail="성분 코드와 성분 이름이 필요해요.")

        stmt = select(MedicineIngredient).where(
            MedicineIngredient.ingredient_code == ingredient_code,
            MedicineIngredient.ingredient_name == ingredient_name,
        )
        try:
            ingredient = db.scalars(stmt).first()
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(status_code=500, detail="성분 정보 확인 중 오류가 발생했어요.")

        if ingredient is None:
            raise HTTPException(status_code=400, detail="존재하지 않는 성분이에요.")

    user_caution = UserCaution(
        user_id=user_id,
        target_type=target_type,
        item_seq=item_seq,
        item_name=item_name,
        ingredient_code=ingredient_code,
        ingredient_name=ingredient_name,
        reason=reason
    )

    try:
        db.add(user_caution)
        db.commit()
        db.refresh(user_caution)
        return user_caution
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="등록할 수 없는 주의 항목이에요.")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="주의 항목 저장 중 오류가 발생했어요.")


def delete_user_caution(db: Session, user_id: int, caution_id: int) -> None:
    stmt = select(UserCaution).where(UserCaution.user_id == user_id, UserCaution.id == caution_id)

    try:
        user_caution = db.scalars(stmt).first()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="주의 항목 확인 중 오류가 발생했어요.")

    if user_caution is None:
        raise HTTPException(status_code=404, detail="주의 항목을 찾을 수 없어요.")

    try:
        db.delete(user_caution)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="주의 항목 삭제 중 오류가 발생했어요.")


# 약 자동완성
def search_caution_medicine(
    db: Session,
    keyword: str,
    limit: int = 10,
) -> list[MedicineInfo]:
    stmt = (
        select(MedicineInfo)
        .where(
            MedicineInfo.item_name.is_not(None),
            MedicineInfo.item_name.like(f"%{keyword}%"),
        )
        .limit(limit)
    )
    try:
        return list(db.scalars(stmt).all())
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="약 자동완성 조회 중 오류가 발생했어요.")


# 성분 자동완성
def search_caution_ingredient(
    db: Session,
    keyword: str,
    limit: int = 10
) -> list[dict[str, int | str | None]]:
    stmt = (
        select(
            func.min(MedicineIngredient.item_seq).label("item_seq"),
            MedicineIngredient.ingredient_code.label("ingredient_code"),
            MedicineIngredient.ingredient_name.label("ingredient_name"),
        )
        .where(
            MedicineIngredient.ingredient_name.is_not(None),
            or_(
                MedicineIngredient.ingredient_name.like(f"%{keyword}%"),
                MedicineIngredient.ingredient_code.like(f"%{keyword}%"),
            ),
        )
        .group_by(
            MedicineIngredient.ingredient_code,
            MedicineIngredient.ingredient_name,
        )
        .limit(limit)
    )
    try:
        return [dict(row) for row in db.execute(stmt).mappings().all()]
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="성분 자동완성 조회 중 오류가 발생했어요.")
