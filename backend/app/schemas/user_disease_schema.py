from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

DiseaseName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]
DiseaseCode = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=20),
]

class UserDiseaseRequest(BaseModel):
    disease_code: DiseaseCode | None = None
    disease_name: DiseaseName

class UserDiseaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    disease_code: str | None = None
    disease_name: str

class DiseaseMasterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    disease_code: str
    disease_name: str
