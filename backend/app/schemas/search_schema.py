from pydantic import BaseModel, ConfigDict

class SearchRequest(BaseModel):
    medicine_name: str
    query: str

class SearchResult(BaseModel):
    medicine_id: str | None = None
    document_type: str | None = None

class SearchResponse(BaseModel):
    results: list[SearchResult]

class MedicineSuggestion(BaseModel):
    medicine_id: str
    medicine_name: str

class MedicineSuggestResponse(BaseModel):
    results: list[MedicineSuggestion]


class MedicineIngredientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    item_seq: int
    product_name: str | None = None
    ingredient_seq: int
    ingredient_code: str | None = None
    ingredient_name: str | None = None
    quantity: str | None = None
    unit: str | None = None


class MedicineSearchResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    item_seq: int
    caution: str | None = None
    company_name: str | None = None
    efficacy: str | None = None
    image_url: str | None = None
    interaction: str | None = None
    item_name: str | None = None
    side_effect: str | None = None
    storage_method: str | None = None
    update_de: str | None = None
    use_method: str | None = None
    warning_before_use: str | None = None
    ingredients: list[MedicineIngredientResponse] = []
