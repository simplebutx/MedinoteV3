from fastapi import APIRouter, Query

from app.schemas.search_schema import MedicineSuggestResponse, SearchRequest, SearchResponse
from app.services.medicine_catalog_service import suggest_medicines
from app.services.medicine_search_service import search_medicines

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/medicines", response_model=MedicineSuggestResponse)
def suggest_medicine_names(
    q: str = Query(default="", description="Medicine name search keyword"),
    limit: int = Query(default=10, ge=1, le=50),
):
    return MedicineSuggestResponse(
        results=suggest_medicines(query=q, limit=limit)
    )

@router.post("", response_model=SearchResponse)
def search(request: SearchRequest):
    results = search_medicines(
        medicine_name=request.medicine_name,
        query=request.query,
        top_k=request.top_k,
    )

    return SearchResponse(results=results)
