from datetime import date
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.user import User


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def create_user(
    db: Session,
    email: str,
    username: str,
    password_hash: str,
    birth_date: date | None = None,
    gender: str | None = None,
):
    user = User(
        email=email,
        username=username,
        password_hash=password_hash,
        birth_date=birth_date,
        gender=gender,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except SQLAlchemyError:
        db.rollback()
        raise
