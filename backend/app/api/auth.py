from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.mysql import get_db
from app.schemas.user_schema import SignupRequest, LoginRequest, LoginResponse
from app.services.auth.auth_service import signup_user, login_user
from app.dependencies.auth import get_current_user
from app.models.user import User
router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    signup_user(db=db, request=request)
    return {"message": "signup success"}


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db=db, request=request)

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "username": current_user.username,
        "role": current_user.role,
    }