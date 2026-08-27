from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.crud.user import create_user, get_user_by_email
from app.schemas.user_schema import SignupRequest, LoginRequest
from app.services.auth.password_service import hash_password, verify_password
from app.services.auth.token_service import create_access_token

def signup_user(db: Session, request: SignupRequest):
    existing_user = get_user_by_email(db=db, email=request.email)

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 가입된 이메일입니다.",
        )

    password_hash = hash_password(request.password)

    create_user(
        db=db,
        email=request.email,
        username=request.username,
        password_hash=password_hash,
        birth_date=request.birth_date,
        gender=request.gender,
    )

def login_user(db: Session, request: LoginRequest):
    existing_user = get_user_by_email(db=db, email=request.email)

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="이메일로 가입된 회원이 없습니다.",
        )

    if not verify_password(request.password, existing_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="비밀번호가 일치하지 않습니다.",
        )

    access_token = create_access_token(
        data={
            "sub": str(existing_user.id),
            "email": existing_user.email,
            "role": existing_user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "email": existing_user.email,
        "username": existing_user.username,
        "role": existing_user.role,
    }
