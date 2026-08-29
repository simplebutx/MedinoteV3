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


# 약 검색 화면 자동완성: 이름만 반환
@router.get("/medicines/names", response_model=list[str])
def suggest_medicine_name_list(
    keyword: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
):
    keyword = keyword.strip()

    if not keyword:
        return []

    stmt = (
        select(MedicineInfo.item_name)
        .where(
            MedicineInfo.item_name.is_not(None),
            MedicineInfo.item_name.like(f"%{keyword}%"),
        )
        .limit(10)
    )

    try:
        return list(db.scalars(stmt).all())
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="약 이름 자동완성 조회 중 오류가 발생했어요.")


# 약 검색 결과: 약 전체 컬럼 + 연결 성분
@router.get("/medicines/results", response_model=list[MedicineSearchResultResponse])
def search_medicine_results(
    keyword: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
):
    keyword = keyword.strip()

    if not keyword:
        return []

    medicine_stmt = (
        select(MedicineInfo)
        .where(
            MedicineInfo.item_name.is_not(None),
            MedicineInfo.item_name.like(f"%{keyword}%"),
        )
        .limit(20)
    )

    try:
        medicines = list(db.scalars(medicine_stmt).all())
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="약 검색 중 오류가 발생했어요.")

    if not medicines:
        return []

    item_seqs = [medicine.item_seq for medicine in medicines]
    ingredient_stmt = (
        select(MedicineIngredient)
        .where(MedicineIngredient.item_seq.in_(item_seqs))
        .order_by(MedicineIngredient.item_seq, MedicineIngredient.ingredient_seq)
    )

    try:
        ingredients = list(db.scalars(ingredient_stmt).all())
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="약 성분 조회 중 오류가 발생했어요.")

    ingredients_by_item_seq: dict[int, list[MedicineIngredient]] = {
        item_seq: [] for item_seq in item_seqs
    }
    for ingredient in ingredients:
        ingredients_by_item_seq.setdefault(ingredient.item_seq, []).append(ingredient)

    return [
        MedicineSearchResultResponse(
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
            ingredients=ingredients_by_item_seq.get(medicine.item_seq, []),
        )
        for medicine in medicines
    ]


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
