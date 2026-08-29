from datetime import date
from typing import Annotated

from pydantic import BaseModel, EmailStr, StringConstraints

Password = Annotated[str, StringConstraints(min_length=1)]
Username = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
Gender = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20)]

class SignupRequest(BaseModel):
    email: EmailStr
    password: Password
    username: Username
    birth_date: date | None = None
    gender: Gender | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: Password


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: EmailStr
    username: str | None = None
    role: str
