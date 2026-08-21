from fastapi import APIRouter

from app.schemas.search_schema import SearchRequest, SearchResponse
from app.services.medicine_search_service import search_medicines

router = APIRouter(prefix="/search", tags=["Search"])

@router.post("", response_model=SearchResponse)
def search(request: SearchRequest):
    results = search_medicines(
        medicine_name=request.medicine_name,
        query=request.query,
        top_k=request.top_k,
    )

    return SearchResponse(results=results)
