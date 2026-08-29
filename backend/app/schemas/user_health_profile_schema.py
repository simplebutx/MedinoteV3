from pydantic import BaseModel, ConfigDict


class HealthUpdateRequest(BaseModel):
    is_pregnant: bool = False
    is_breastfeeding: bool = False
    is_smoking: bool = False
    is_drinking: bool = False
    is_child: bool = False
    is_elderly: bool = False


class HealthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    is_pregnant: bool = False
    is_breastfeeding: bool = False
    is_smoking: bool = False
    is_drinking: bool = False
    is_child: bool = False
    is_elderly: bool = False