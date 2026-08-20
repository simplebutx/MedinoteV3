from pydantic import BaseModel

class OcrResponse(BaseModel):
    analysis: str