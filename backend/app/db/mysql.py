from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

DATABASE_URL = (
    f"mysql+pymysql://{settings.mysql_user}:"
    f"{settings.mysql_password}@{settings.mysql_host}:"
    f"{settings.mysql_port}/{settings.mysql_database}"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# ORM 모델 클래스들의 공통 부모 Base 생성
Base = declarative_base()

def get_db():
    db = SessionLocal()    # 세션 생성
    try:
        yield db   # 세션을 라우터에 전달 -> 엔드포인트와 CRUD가 db 사용
    finally:
        db.close()  # 요청 처리 후 세션 종료