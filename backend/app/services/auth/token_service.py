from fastapi import HTTPException, status

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt, JWTError

from app.core.config import settings

# JWT 토큰 생성
def create_access_token(data: dict[str, Any]):
    # 토큰에 넣을 데이터를 복사해서 새 dict로
    to_encode = data.copy()

    # 만료시간 추가
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

# JWT 검증 함수
def decode_access_token(token: str):
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 정보가 유효하지 않습니다.",
        )