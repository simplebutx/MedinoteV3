from sqlalchemy import Column, DateTime, Date, String, Integer
from sqlalchemy.sql import func

from app.db.mysql import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    username = Column(String(255), nullable=True)

    role = Column(String(50), nullable=False, server_default="USER")
    birth_date = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )