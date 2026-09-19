from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class OcrUploadUrlResponse(BaseModel):
    upload_url: str
    object_key: str
    expires_in: int = Field(description="seconds")


class OcrAnalyzeRequest(BaseModel):
    object_key: str = Field(min_length=1, max_length=500)


class OcrResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: Literal["success", "partial_success", "error"]
    result_json: dict[str, Any] | None = Field(default=None, alias="resultJson")
    error_message: str | None = Field(default=None, alias="errorMessage")
