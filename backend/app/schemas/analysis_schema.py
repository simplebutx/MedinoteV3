from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PrescriptionAnalysisCreateRequest(BaseModel):
    schedule_id: int = Field(alias="scheduleId")

    model_config = ConfigDict(populate_by_name=True)


class PrescriptionAnalysisResponse(BaseModel):
    id: int
    schedule_id: int = Field(alias="scheduleId")
    user_id: int = Field(alias="userId")
    result_json: dict[str, Any] = Field(alias="resultJson")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)
