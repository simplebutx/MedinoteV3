from datetime import date

from pydantic import BaseModel, EmailStr

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    username: str
    birth_date: date | None = None
    gender: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: EmailStr
    username: str | None = None
    role: str
