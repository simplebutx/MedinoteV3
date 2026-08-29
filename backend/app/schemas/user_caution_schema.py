from pydantic import BaseModel, ConfigDict

from app.models.user_caution import CautionTargetType


class UserCautionRequest(BaseModel):
    target_type: CautionTargetType
    item_seq: int | None = None
    item_name: str | None = None
    ingredient_code: str | None = None
    ingredient_name: str | None = None
    reason: str | None = None


class UserCautionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    target_type: CautionTargetType
    item_name: str | None = None
    ingredient_name: str | None = None
    reason: str | None = None


class CautionSuggestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    item_seq: int | None = None
    item_name: str | None = None
    ingredient_code: str | None = None
    ingredient_name: str | None = None
