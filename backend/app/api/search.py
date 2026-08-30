from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.mysql import get_db
from app.models.medicine_info import MedicineInfo
from app.models.medicine_ingredient import MedicineIngredient
from app.schemas.search_schema import (
    MedicineSearchResultResponse,
    MedicineSuggestResponse,
    MedicineSuggestion,
)
from app.services.chatbot.medicine_catalog_service import suggest_medicines

router = APIRouter(prefix="/search", tags=["Search"])


def build_medicine_search_result(
    db: Session,
    medicine: MedicineInfo,
) -> MedicineSearchResultResponse:
    ingredient_stmt = (
        select(MedicineIngredient)
        .where(MedicineIngredient.item_seq == medicine.item_seq)
        .order_by(MedicineIngredient.ingredient_seq)
    )

    try:
        ingredients = list(db.scalars(ingredient_stmt).all())
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="약 성분 조회 중 오류가 발생했어요.")

    return MedicineSearchResultResponse(
        item_seq=medicine.item_seq,
        caution=medicine.caution,
        company_name=medicine.company_name,
        efficacy=medicine.efficacy,
        image_url=medicine.image_url,
        interaction=medicine.interaction,
        item_name=medicine.item_name,
        side_effect=medicine.side_effect,
        storage_method=medicine.storage_method,
        update_de=medicine.update_de,
        use_method=medicine.use_method,
        warning_before_use=medicine.warning_before_use,
        ingredients=ingredients,
    )


# 약이름 자동완성
@router.get("/medicines", response_model=MedicineSuggestResponse)
def suggest_medicine_names(
    q: str = Query(default="", description="Medicine name search keyword"),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    keyword = q.strip()

    if not keyword:
        return MedicineSuggestResponse(results=[])

    stmt = (
        select(MedicineInfo.item_seq, MedicineInfo.item_name)
        .where(
            MedicineInfo.item_name.is_not(None),
            MedicineInfo.item_name.like(f"%{keyword}%"),
        )
        .limit(limit)
    )

    try:
        results = [
            MedicineSuggestion(
                medicine_id=str(row.item_seq),
                medicine_name=row.item_name,
            )
            for row in db.execute(stmt).all()
        ]
    except SQLAlchemyError:
        return MedicineSuggestResponse(
            results=suggest_medicines(query=keyword, limit=limit)
        )

    return MedicineSuggestResponse(
        results=results
    )


# 자동완성에서 선택한 약 하나 조회
@router.get("/medicines/{item_seq}", response_model=MedicineSearchResultResponse)
def get_medicine_result(
    item_seq: int,
    db: Session = Depends(get_db),
):
    stmt = select(MedicineInfo).where(MedicineInfo.item_seq == item_seq)

    try:
        medicine = db.scalars(stmt).first()
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="약 검색 중 오류가 발생했어요.")

    if medicine is None:
        raise HTTPException(status_code=404, detail="약 정보를 찾을 수 없어요.")

    return build_medicine_search_result(db=db, medicine=medicine)
