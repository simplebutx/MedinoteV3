from fastapi import APIRouter, Query

from app.schemas.search_schema import MedicineSuggestResponse
from app.services.medicine_catalog_service import suggest_medicines

router = APIRouter(prefix="/search", tags=["Search"])

# 약이름 자동완성
@router.get("/medicines", response_model=MedicineSuggestResponse)
def suggest_medicine_names(
    q: str = Query(default="", description="Medicine name search keyword"),
    limit: int = Query(default=10, ge=1, le=50),
):
    return MedicineSuggestResponse(
        results=suggest_medicines(query=q, limit=limit)
    )
