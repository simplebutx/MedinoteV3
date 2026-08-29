from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.mysql import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user_disease_schema import UserDiseaseRequest, UserDiseaseResponse, DiseaseMasterResponse

from app.crud.user_disease import create_user_disease, get_user_disease, delete_user_disease, get_disease_names

router = APIRouter(prefix="/disease", tags=["disease"])

@router.get("", response_model=list[UserDiseaseResponse])
def read_disease(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    disease = get_user_disease(db, current_user.id)
    return disease


@router.post("", response_model=UserDiseaseResponse)
def create_disease(
    request: UserDiseaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_user_disease(
        db=db,
        user_id=current_user.id,
        disease_code=request.disease_code,
        disease_name=request.disease_name
    )

@router.delete("/{disease_id}", status_code=204)
def delete_disease(
    disease_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_user_disease(db=db, user_id=current_user.id, disease_id=disease_id)
    return None

# 검색 자동완성
@router.get("/search", response_model=list[DiseaseMasterResponse])
def search_disease(
    keyword: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
):
    keyword = keyword.strip()
    if not keyword:
        return []
    return get_disease_names(db=db, keyword=keyword)
