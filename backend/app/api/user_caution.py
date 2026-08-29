from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.mysql import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.user_caution import CautionTargetType
from app.schemas.user_caution_schema import UserCautionRequest, UserCautionResponse, CautionSuggestionResponse

from app.crud.user_caution import (
    create_user_caution as crud_create_user_caution,
    delete_user_caution as crud_delete_user_caution,
    get_user_cautions as crud_get_user_cautions,
    search_caution_ingredient as crud_search_caution_ingredient,
    search_caution_medicine as crud_search_caution_medicine,
)

router = APIRouter(prefix="/caution", tags=["caution"])

@router.get("/", response_model=list[UserCautionResponse])
def read_cautions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cautions = crud_get_user_cautions(db=db, user_id=current_user.id)
    return cautions

@router.post("/", response_model=UserCautionResponse)
def create_caution(
    request: UserCautionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_create_user_caution(
        db=db,
        user_id=current_user.id,
        target_type=request.target_type,
        item_seq=request.item_seq,
        item_name=request.item_name,
        ingredient_code=request.ingredient_code,
        ingredient_name=request.ingredient_name,
        reason=request.reason
    )


# 자동완성
@router.get("/search", response_model=list[CautionSuggestionResponse])
def search_cautions(
    target_type: CautionTargetType = Query(...),
    keyword: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
):
    keyword = keyword.strip()

    if not keyword:
        return []

    if target_type == CautionTargetType.MEDICINE:
        return crud_search_caution_medicine(db=db, keyword=keyword)

    return crud_search_caution_ingredient(db=db, keyword=keyword)


@router.delete("/{caution_id}", status_code=204)
def delete_caution(
        caution_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    crud_delete_user_caution(db=db, user_id=current_user.id, caution_id=caution_id)
    return None
