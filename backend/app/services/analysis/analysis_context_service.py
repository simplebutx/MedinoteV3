import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import DatabaseError
from app.models.medicine_ingredient import MedicineIngredient
from app.models.medication_schedule import MedicationSchedule
from app.models.user_caution import UserCaution
from app.models.user_disease import UserDisease
from app.models.user_health import HealthProfile

logger = logging.getLogger(__name__)
# 사용자 건강정보 + 약 정보
def build_analysis_context(
    db: Session,
    user_id: int,
    schedule: MedicationSchedule,
) -> dict[str, Any]:
    caution_items = _get_user_caution_items(db=db, user_id=user_id)

    return {
        "user": {
            "diseases": _get_user_diseases(db=db, user_id=user_id),
            "healthProfile": _get_health_profile(db=db, user_id=user_id),
            "cautionItems": caution_items,
        },
        "medicines": [
            {
                "scheduleMedicineId": medicine.id,
                "medicineName": medicine.custom_medicine_name,
                "dosageAmount": medicine.dosage_amount,
                "dosageUnit": medicine.dosage_unit,
                "itemSeq": medicine.item_seq,
                "ingredients": _get_medicine_ingredients(db=db, item_seq=medicine.item_seq),
                "cautionItems": caution_items,
            }
            for medicine in sorted(schedule.medicines, key=lambda item: item.id or 0)
        ],
    }

# 질병 정보 조회
def _get_user_diseases(db: Session, user_id: int) -> list[dict[str, str | None]]:
    stmt = (
        select(UserDisease)
        .where(UserDisease.user_id == user_id)
        .order_by(UserDisease.created_at.desc(), UserDisease.id.desc())
    )

    try:
        diseases = list(db.scalars(stmt).all())
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("failed to load user diseases")

        raise DatabaseError(
            "기저질환 목록을 불러오지 못했어요."
        ) from error

    return [
        {
            "diseaseCode": disease.disease_code,
            "diseaseName": disease.disease_name,
        }
        for disease in diseases
    ]

# 건강정보 조회
def _get_health_profile(db: Session, user_id: int) -> dict[str, bool]:
    stmt = select(HealthProfile).where(HealthProfile.user_id == user_id)

    try:
        health_profile = db.scalars(stmt).one_or_none()
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("failed to load user health profile")

        raise DatabaseError(
            "기본 건강정보를 불러오지 못했어요."
        ) from error

    if health_profile is None:
        return {
            "isPregnant": False,
            "isBreastfeeding": False,
            "isSmoking": False,
            "isDrinking": False,
            "isChild": False,
            "isElderly": False,
        }

    return {
        "isPregnant": health_profile.is_pregnant,
        "isBreastfeeding": health_profile.is_breastfeeding,
        "isSmoking": health_profile.is_smoking,
        "isDrinking": health_profile.is_drinking,
        "isChild": health_profile.is_child,
        "isElderly": health_profile.is_elderly,
    }

# 사용자 주의 약 조회
def _get_user_caution_items(db: Session, user_id: int) -> list[dict[str, Any]]:
    stmt = (
        select(UserCaution)
        .where(UserCaution.user_id == user_id)
        .order_by(UserCaution.created_at.desc(), UserCaution.id.desc())
    )

    try:
        caution_items = list(db.scalars(stmt).all())
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("failed to load user caution items")

        raise DatabaseError(
            "사용자 주의약/성분을 불러오지 못했어요."
        ) from error

    return [
        {
            "targetType": caution_item.target_type.value,
            "itemSeq": caution_item.item_seq,
            "itemName": caution_item.item_name,
            "ingredientCode": caution_item.ingredient_code,
            "ingredientName": caution_item.ingredient_name,
            "reason": caution_item.reason,
        }
        for caution_item in caution_items
    ]

# 약 성분 조회
def _get_medicine_ingredients(
    db: Session,
    item_seq: int | None,
) -> list[dict[str, Any]]:
    if item_seq is None:
        return []

    stmt = (
        select(MedicineIngredient)
        .where(MedicineIngredient.item_seq == item_seq)
        .order_by(MedicineIngredient.ingredient_seq)
    )

    try:
        ingredients = list(db.scalars(stmt).all())
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("failed to load medicine ingredients")

        raise DatabaseError(
            "약 성분 정보를 불러오지 못했어요."
        ) from error

    return [
        {
            "ingredientCode": ingredient.ingredient_code,
            "ingredientName": ingredient.ingredient_name,
            "quantity": ingredient.quantity,
            "unit": ingredient.unit,
        }
        for ingredient in ingredients
    ]
