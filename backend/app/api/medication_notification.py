from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.crud.medication_notification import (
    get_medication_notifications as crud_get_medication_notifications,
    hide_all_medication_notifications as crud_hide_all_medication_notifications,
    hide_medication_notification as crud_hide_medication_notification,
    mark_medication_notification_read as crud_mark_medication_notification_read,
)
from app.db.mysql import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.medication_notification_schema import (
    MedicationNotificationResponse,
)


router = APIRouter(prefix="/medication-notifications", tags=["medication-notifications"])


@router.get("", response_model=list[MedicationNotificationResponse])
def read_medication_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_get_medication_notifications(db=db, user_id=current_user.id)


@router.patch(
    "/{notification_id}/read",
    response_model=MedicationNotificationResponse,
)
def mark_medication_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_mark_medication_notification_read(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
        commit=True,
    )


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    crud_hide_medication_notification(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
        commit=True,
    )
    return None


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_medication_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    crud_hide_all_medication_notifications(
        db=db,
        user_id=current_user.id,
        commit=True,
    )
    return None
