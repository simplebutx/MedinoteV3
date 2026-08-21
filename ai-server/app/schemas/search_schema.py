from pydantic import BaseModel

class SearchRequest(BaseModel):
    medicine_name: str
    query: str
    top_k: int = 5

class SearchResult(BaseModel):
    text: str
    score: float
    medicine_id: str | None = None
    document_type: str | None = None

class SearchResponse(BaseModel):
    results: list[SearchResult]

class MedicineSuggestion(BaseModel):
    medicine_id: str
    medicine_name: str

class MedicineSuggestResponse(BaseModel):
    results: list[MedicineSuggestion]
