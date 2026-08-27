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
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()