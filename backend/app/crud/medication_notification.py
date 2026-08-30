from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.medication_notification import (
    MedicationNotification,
    MedicationNotificationStatus,
)
from app.schemas.medication_notification_schema import (
    MedicationNotificationCreateRequest,
    MedicationNotificationUpdateRequest,
)


def get_medication_notifications(
    db: Session,
    user_id: int,
    include_hidden: bool = False,
    include_pending: bool = False,
) -> list[MedicationNotification]:
    stmt = select(MedicationNotification).where(
        MedicationNotification.user_id == user_id,
    )

    if not include_hidden:
        stmt = stmt.where(MedicationNotification.is_visible.is_(True))

    if not include_pending:
        stmt = stmt.where(MedicationNotification.scheduled_at <= _now_naive_utc())

    stmt = stmt.order_by(
        MedicationNotification.scheduled_at.desc(),
        MedicationNotification.id.desc(),
    )

    try:
        return list(db.scalars(stmt).all())
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 알림 목록 조회 중 오류가 발생했어요.")


def get_medication_notification(
    db: Session,
    user_id: int,
    notification_id: int,
) -> MedicationNotification:
    stmt = select(MedicationNotification).where(
        MedicationNotification.user_id == user_id,
        MedicationNotification.id == notification_id,
        MedicationNotification.is_visible.is_(True),
    )

    try:
        notification = db.scalars(stmt).first()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 알림 확인 중 오류가 발생했어요.")

    if notification is None:
        raise HTTPException(status_code=404, detail="복약 알림을 찾을 수 없어요.")

    return notification


def create_medication_notification(
    db: Session,
    user_id: int,
    request: MedicationNotificationCreateRequest,
    commit: bool = False,
) -> MedicationNotification:
    notification = MedicationNotification(
        user_id=user_id,
        medication_schedule_id=request.medication_schedule_id,
        medication_schedule_medicine_id=request.medication_schedule_medicine_id,
        medication_schedule_time_id=request.medication_schedule_time_id,
        type=request.type,
        title=request.title,
        body=request.body,
        status=request.status,
        scheduled_at=_normalize_datetime(request.scheduled_at),
        sent_at=_normalize_datetime(request.sent_at),
        read_at=_normalize_datetime(request.read_at),
        is_visible=request.is_visible,
    )

    try:
        db.add(notification)
        _commit_or_flush(db, commit)
        db.refresh(notification)
        return notification
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="이미 등록된 복약 알림이에요.")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 알림 저장 중 오류가 발생했어요.")


def create_medication_notifications(
    db: Session,
    user_id: int,
    requests: list[MedicationNotificationCreateRequest],
    commit: bool = False,
) -> list[MedicationNotification]:
    notifications = [
        MedicationNotification(
            user_id=user_id,
            medication_schedule_id=request.medication_schedule_id,
            medication_schedule_medicine_id=request.medication_schedule_medicine_id,
            medication_schedule_time_id=request.medication_schedule_time_id,
            type=request.type,
            title=request.title,
            body=request.body,
            status=request.status,
            scheduled_at=_normalize_datetime(request.scheduled_at),
            sent_at=_normalize_datetime(request.sent_at),
            read_at=_normalize_datetime(request.read_at),
            is_visible=request.is_visible,
        )
        for request in requests
    ]

    try:
        db.add_all(notifications)
        _commit_or_flush(db, commit)
        for notification in notifications:
            db.refresh(notification)
        return notifications
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="중복된 복약 알림이 포함되어 있어요.")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 알림 목록 저장 중 오류가 발생했어요.")


def update_medication_notification(
    db: Session,
    user_id: int,
    notification_id: int,
    request: MedicationNotificationUpdateRequest,
    commit: bool = False,
) -> MedicationNotification:
    notification = get_medication_notification(
        db=db,
        user_id=user_id,
        notification_id=notification_id,
    )

    if request.type is not None:
        notification.type = request.type
    if request.title is not None:
        notification.title = request.title
    if request.body is not None:
        notification.body = request.body
    if request.status is not None:
        notification.status = request.status
    if request.scheduled_at is not None:
        notification.scheduled_at = _normalize_datetime(request.scheduled_at)
    if request.sent_at is not None:
        notification.sent_at = _normalize_datetime(request.sent_at)
    if request.read_at is not None:
        notification.read_at = _normalize_datetime(request.read_at)
    if request.is_visible is not None:
        notification.is_visible = request.is_visible

    try:
        _commit_or_flush(db, commit)
        db.refresh(notification)
        return notification
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="이미 등록된 복약 알림이에요.")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 알림 수정 중 오류가 발생했어요.")


def mark_medication_notification_read(
    db: Session,
    user_id: int,
    notification_id: int,
    read_at: datetime | None = None,
    commit: bool = False,
) -> MedicationNotification:
    notification = get_medication_notification(
        db=db,
        user_id=user_id,
        notification_id=notification_id,
    )
    notification.read_at = _normalize_datetime(read_at) or _now_naive_utc()

    try:
        _commit_or_flush(db, commit)
        db.refresh(notification)
        return notification
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 알림 읽음 처리 중 오류가 발생했어요.")


def mark_medication_notification_sent(
    db: Session,
    user_id: int,
    notification_id: int,
    sent_at: datetime | None = None,
    commit: bool = False,
) -> MedicationNotification:
    notification = get_medication_notification(
        db=db,
        user_id=user_id,
        notification_id=notification_id,
    )
    notification.status = MedicationNotificationStatus.SENT
    notification.sent_at = _normalize_datetime(sent_at) or _now_naive_utc()

    try:
        _commit_or_flush(db, commit)
        db.refresh(notification)
        return notification
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 알림 발송 처리 중 오류가 발생했어요.")


def hide_medication_notification(
    db: Session,
    user_id: int,
    notification_id: int,
    commit: bool = False,
) -> None:
    notification = get_medication_notification(
        db=db,
        user_id=user_id,
        notification_id=notification_id,
    )
    notification.is_visible = False

    try:
        _commit_or_flush(db, commit)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 알림 삭제 중 오류가 발생했어요.")


def hide_all_medication_notifications(
    db: Session,
    user_id: int,
    commit: bool = False,
) -> int:
    notifications = get_medication_notifications(db=db, user_id=user_id)

    for notification in notifications:
        notification.is_visible = False

    try:
        _commit_or_flush(db, commit)
        return len(notifications)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 알림 전체 삭제 중 오류가 발생했어요.")


def hide_future_notifications_for_schedule(
    db: Session,
    user_id: int,
    schedule_id: int,
    from_time: datetime | None = None,
    commit: bool = False,
) -> int:
    cutoff = _normalize_datetime(from_time) or _now_naive_utc()
    stmt = select(MedicationNotification).where(
        MedicationNotification.user_id == user_id,
        MedicationNotification.medication_schedule_id == schedule_id,
        MedicationNotification.scheduled_at > cutoff,
        MedicationNotification.is_visible.is_(True),
    )

    try:
        notifications = list(db.scalars(stmt).all())
        for notification in notifications:
            notification.is_visible = False
        _commit_or_flush(db, commit)
        return len(notifications)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 알림 갱신 중 오류가 발생했어요.")


def delete_future_notifications_for_schedule(
    db: Session,
    user_id: int,
    schedule_id: int,
    from_time: datetime | None = None,
    commit: bool = False,
) -> int:
    cutoff = _normalize_datetime(from_time) or _now_naive_utc()
    stmt = select(MedicationNotification).where(
        MedicationNotification.user_id == user_id,
        MedicationNotification.medication_schedule_id == schedule_id,
        MedicationNotification.scheduled_at > cutoff,
    )

    try:
        notifications = list(db.scalars(stmt).all())
        for notification in notifications:
            db.delete(notification)
        _commit_or_flush(db, commit)
        return len(notifications)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 알림 갱신 중 오류가 발생했어요.")


def _commit_or_flush(db: Session, commit: bool) -> None:
    if commit:
        db.commit()
        return

    db.flush()


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value

    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _now_naive_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
