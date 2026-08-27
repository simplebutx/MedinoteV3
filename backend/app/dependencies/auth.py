from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.crud.user import get_user_by_email
from app.db.mysql import get_db
from app.services.auth.token_service import decode_access_token

# Authorization 헤더에서 Bearer 토큰을 꺼내주는 도구
bearer_scheme = HTTPBearer()

# 현재 요청을 보낸 로그인 사용자 정보
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    payload = decode_access_token(token)

    email = payload.get("email")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 정보에 이메일이 없습니다.",
        )

    user = get_user_by_email(db=db, email=email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다.",
        )

    return user