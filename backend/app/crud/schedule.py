from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import and_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.crud.medication_notification import (
    create_medication_notifications,
    delete_future_notifications_for_schedule,
)
from app.models.medication_intake_log import MedicationIntakeLog
from app.models.medication_notification import (
    MedicationNotificationStatus,
    MedicationNotificationType,
)
from app.models.medication_schedule import MedicationSchedule
from app.models.medication_schedule_medicine import MedicationScheduleMedicine
from app.models.medication_schedule_time import MedicationScheduleTime
from app.schemas.medication_notification_schema import (
    MedicationNotificationCreateRequest,
)
from app.schemas.schedule_schema import (
    DailyMedicationGroupResponse,
    DailyMedicationItemResponse,
    DailyMedicationScheduleResponse,
    MedicationIntakeLogRequest,
    MedicationIntakeLogResponse,
    ScheduleMedicineRequest,
    ScheduleMedicineResponse,
    ScheduleRequest,
    ScheduleResponse,
    ScheduleTimeRequest,
    ScheduleTimeResponse,
)


def get_schedules(db: Session, user_id: int) -> list[ScheduleResponse]:
    stmt = (
        select(MedicationSchedule)
        .where(MedicationSchedule.user_id == user_id)
        .options(
            joinedload(MedicationSchedule.medicines).joinedload(
                MedicationScheduleMedicine.times
            )
        )
        .order_by(MedicationSchedule.created_at.desc(), MedicationSchedule.id.desc())
    )

    try:
        schedules = list(db.execute(stmt).unique().scalars().all())
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 일정 목록 조회 중 오류가 발생했어요.")

    return [to_schedule_response(schedule) for schedule in schedules]


def get_schedule(db: Session, user_id: int, schedule_id: int) -> ScheduleResponse:
    schedule = _get_schedule_model(db=db, user_id=user_id, schedule_id=schedule_id)
    return to_schedule_response(schedule)


def create_schedule(
    db: Session,
    user_id: int,
    request: ScheduleRequest,
) -> ScheduleResponse:
    _validate_schedule_request(request)
    schedule = MedicationSchedule(
        user_id=user_id,
        hospital_name=request.hospital_name,
        pharmacy_name=request.pharmacy_name,
        start_date=request.start_date,
        dispensed_date=request.dispensed_date,
        is_active=True,
    )
    schedule.medicines = [_build_medicine_model(medicine) for medicine in request.medicines]

    try:
        db.add(schedule)
        db.flush()
        _create_future_notifications_for_schedule(
            db=db,
            user_id=user_id,
            schedule=schedule,
            from_time=datetime.now(),
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 일정 저장 중 오류가 발생했어요.")

    return get_schedule(db=db, user_id=user_id, schedule_id=schedule.id)


def update_schedule(
    db: Session,
    user_id: int,
    schedule_id: int,
    request: ScheduleRequest,
) -> ScheduleResponse:
    _validate_schedule_request(request)
    schedule = _get_schedule_model(db=db, user_id=user_id, schedule_id=schedule_id)

    schedule.hospital_name = request.hospital_name
    schedule.pharmacy_name = request.pharmacy_name
    schedule.start_date = request.start_date
    schedule.dispensed_date = request.dispensed_date
    _sync_medicines(schedule, request.medicines)

    try:
        update_started_at = datetime.now()
        delete_future_notifications_for_schedule(
            db=db,
            user_id=user_id,
            schedule_id=schedule_id,
            from_time=update_started_at,
        )
        db.flush()
        _create_future_notifications_for_schedule(
            db=db,
            user_id=user_id,
            schedule=schedule,
            from_time=update_started_at,
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 일정 수정 중 오류가 발생했어요.")

    return get_schedule(db=db, user_id=user_id, schedule_id=schedule_id)


def delete_schedule(db: Session, user_id: int, schedule_id: int) -> None:
    schedule = _get_schedule_model(db=db, user_id=user_id, schedule_id=schedule_id)

    try:
        db.delete(schedule)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 일정 삭제 중 오류가 발생했어요.")


def create_schedule_time(
    db: Session,
    user_id: int,
    schedule_id: int,
    medicine_id: int,
    request: ScheduleTimeRequest,
) -> ScheduleTimeResponse:
    medicine = _get_schedule_medicine_model(
        db=db,
        user_id=user_id,
        schedule_id=schedule_id,
        medicine_id=medicine_id,
    )
    schedule_time = _build_time_model(request)
    medicine.times.append(schedule_time)

    try:
        db.commit()
        db.refresh(schedule_time)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 시간 저장 중 오류가 발생했어요.")

    return to_time_response(schedule_time, schedule_id=schedule_id)


def get_schedule_times(
    db: Session,
    user_id: int,
    schedule_id: int,
) -> list[ScheduleTimeResponse]:
    _assert_schedule_exists(db=db, user_id=user_id, schedule_id=schedule_id)
    stmt = (
        select(MedicationScheduleTime)
        .join(MedicationScheduleMedicine)
        .where(MedicationScheduleMedicine.schedule_id == schedule_id)
        .order_by(
            MedicationScheduleTime.take_time,
            MedicationScheduleTime.sort_order,
            MedicationScheduleTime.id,
        )
    )

    try:
        times = list(db.scalars(stmt).all())
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 시간 목록 조회 중 오류가 발생했어요.")

    return [to_time_response(schedule_time, schedule_id=schedule_id) for schedule_time in times]


def update_schedule_time(
    db: Session,
    user_id: int,
    time_id: int,
    request: ScheduleTimeRequest,
) -> ScheduleTimeResponse:
    schedule_time, schedule_id = _get_schedule_time_model(
        db=db,
        user_id=user_id,
        time_id=time_id,
    )
    schedule_time.timing = request.timing
    schedule_time.take_time = request.take_time
    schedule_time.sort_order = request.sort_order

    try:
        db.commit()
        db.refresh(schedule_time)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 시간 수정 중 오류가 발생했어요.")

    return to_time_response(schedule_time, schedule_id=schedule_id)


def delete_schedule_time(db: Session, user_id: int, time_id: int) -> None:
    schedule_time, _ = _get_schedule_time_model(db=db, user_id=user_id, time_id=time_id)

    try:
        db.delete(schedule_time)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 시간 삭제 중 오류가 발생했어요.")


def create_intake_log(
    db: Session,
    user_id: int,
    request: MedicationIntakeLogRequest,
) -> MedicationIntakeLogResponse:
    _assert_schedule_time_belongs_to_schedule(
        db=db,
        user_id=user_id,
        schedule_id=request.medication_schedule_id,
        time_id=request.medication_schedule_time_id,
    )
    log = MedicationIntakeLog(
        medication_schedule_id=request.medication_schedule_id,
        medication_schedule_time_id=request.medication_schedule_time_id,
        status=request.status,
        scheduled_at=_normalize_datetime(request.scheduled_at),
        taken_at=_normalize_datetime(request.taken_at),
    )

    try:
        db.add(log)
        db.commit()
        db.refresh(log)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복용 기록 저장 중 오류가 발생했어요.")

    return to_intake_log_response(log)


def get_intake_logs(
    db: Session,
    user_id: int,
    schedule_id: int,
) -> list[MedicationIntakeLogResponse]:
    _assert_schedule_exists(db=db, user_id=user_id, schedule_id=schedule_id)
    stmt = (
        select(MedicationIntakeLog)
        .where(MedicationIntakeLog.medication_schedule_id == schedule_id)
        .order_by(MedicationIntakeLog.scheduled_at.desc(), MedicationIntakeLog.id.desc())
    )

    try:
        logs = list(db.scalars(stmt).all())
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복용 기록 목록 조회 중 오류가 발생했어요.")

    return [to_intake_log_response(log) for log in logs]


def update_intake_log(
    db: Session,
    user_id: int,
    log_id: int,
    request: MedicationIntakeLogRequest,
) -> MedicationIntakeLogResponse:
    log = _get_intake_log_model(db=db, user_id=user_id, log_id=log_id)
    _assert_schedule_time_belongs_to_schedule(
        db=db,
        user_id=user_id,
        schedule_id=request.medication_schedule_id,
        time_id=request.medication_schedule_time_id,
    )

    log.medication_schedule_id = request.medication_schedule_id
    log.medication_schedule_time_id = request.medication_schedule_time_id
    log.status = request.status
    log.scheduled_at = _normalize_datetime(request.scheduled_at)
    log.taken_at = _normalize_datetime(request.taken_at)

    try:
        db.commit()
        db.refresh(log)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복용 기록 수정 중 오류가 발생했어요.")

    return to_intake_log_response(log)


def get_daily_medications(
    db: Session,
    user_id: int,
    target_date: date,
) -> DailyMedicationScheduleResponse:
    stmt = (
        select(MedicationSchedule)
        .where(
            MedicationSchedule.user_id == user_id,
            MedicationSchedule.is_active.is_(True),
        )
        .options(
            joinedload(MedicationSchedule.medicines).joinedload(
                MedicationScheduleMedicine.times
            )
        )
    )

    try:
        schedules = list(db.execute(stmt).unique().scalars().all())
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="선택 날짜 복약 목록 조회 중 오류가 발생했어요.")

    logs_by_key = _get_logs_by_schedule_time_and_date(
        db=db,
        user_id=user_id,
        target_date=target_date,
    )
    groups: dict[str, list[DailyMedicationItemResponse]] = {}

    for schedule in schedules:
        for medicine in _sort_medicines(schedule.medicines):
            if not medicine.is_active or not _medicine_is_due_on(medicine, schedule.start_date, target_date):
                continue

            for schedule_time in _sort_times(medicine.times):
                take_time_text = _format_time(schedule_time.take_time)
                scheduled_at = datetime.combine(target_date, schedule_time.take_time)
                log = logs_by_key.get((schedule.id, schedule_time.id))
                item = DailyMedicationItemResponse(
                    medicationScheduleId=schedule.id,
                    medicationScheduleMedicineId=medicine.id,
                    medicationScheduleTimeId=schedule_time.id,
                    medicationIntakeLogId=log.id if log else None,
                    itemSeq=medicine.item_seq,
                    customMedicineName=medicine.custom_medicine_name,
                    dosageAmount=medicine.dosage_amount,
                    dosageUnit=medicine.dosage_unit,
                    timesPerDay=medicine.times_per_day,
                    timing=schedule_time.timing,
                    takeTime=take_time_text,
                    intakeStatus=log.status if log else "pending",
                    scheduledAt=scheduled_at,
                    takenAt=log.taken_at if log else None,
                    hospitalName=schedule.hospital_name,
                    pharmacyName=schedule.pharmacy_name,
                )
                groups.setdefault(take_time_text, []).append(item)

    return DailyMedicationScheduleResponse(
        date=target_date,
        groups=[
            DailyMedicationGroupResponse(takeTime=take_time, medications=medications)
            for take_time, medications in sorted(groups.items())
        ],
    )


def to_schedule_response(schedule: MedicationSchedule) -> ScheduleResponse:
    return ScheduleResponse(
        id=schedule.id,
        userId=schedule.user_id,
        hospitalName=schedule.hospital_name,
        pharmacyName=schedule.pharmacy_name,
        startDate=schedule.start_date,
        dispensedDate=schedule.dispensed_date,
        isActive=schedule.is_active,
        createdAt=schedule.created_at,
        updatedAt=schedule.updated_at,
        medicines=[
            to_medicine_response(medicine, schedule_id=schedule.id)
            for medicine in _sort_medicines(schedule.medicines)
        ],
    )


def to_medicine_response(
    medicine: MedicationScheduleMedicine,
    schedule_id: int,
) -> ScheduleMedicineResponse:
    return ScheduleMedicineResponse(
        id=medicine.id,
        medicationScheduleId=schedule_id,
        itemSeq=medicine.item_seq,
        customMedicineName=medicine.custom_medicine_name,
        dosageAmount=medicine.dosage_amount,
        dosageUnit=medicine.dosage_unit,
        timesPerDay=medicine.times_per_day,
        durationDays=medicine.duration_days,
        isActive=medicine.is_active,
        createdAt=medicine.created_at,
        updatedAt=medicine.updated_at,
        times=[
            to_time_response(schedule_time, schedule_id=schedule_id)
            for schedule_time in _sort_times(medicine.times)
        ],
    )


def to_time_response(
    schedule_time: MedicationScheduleTime,
    schedule_id: int,
) -> ScheduleTimeResponse:
    return ScheduleTimeResponse(
        id=schedule_time.id,
        medicationScheduleId=schedule_id,
        medicationScheduleMedicineId=schedule_time.schedule_medicine_id,
        timing=schedule_time.timing,
        takeTime=_format_time(schedule_time.take_time),
        sortOrder=schedule_time.sort_order,
        createdAt=schedule_time.created_at,
        updatedAt=schedule_time.updated_at,
    )


def to_intake_log_response(log: MedicationIntakeLog) -> MedicationIntakeLogResponse:
    return MedicationIntakeLogResponse(
        id=log.id,
        medicationScheduleId=log.medication_schedule_id,
        medicationScheduleTimeId=log.medication_schedule_time_id,
        status=log.status,
        scheduledAt=log.scheduled_at,
        takenAt=log.taken_at,
        createdAt=log.created_at,
    )


def _validate_schedule_request(request: ScheduleRequest) -> None:
    if not request.medicines:
        raise HTTPException(status_code=400, detail="최소 1개의 약 정보가 필요해요.")

    for medicine in request.medicines:
        if not medicine.times:
            raise HTTPException(status_code=400, detail="복용 시간을 1개 이상 입력해주세요.")


def _build_medicine_model(
    request: ScheduleMedicineRequest,
) -> MedicationScheduleMedicine:
    medicine = MedicationScheduleMedicine(
        item_seq=request.item_seq,
        custom_medicine_name=request.custom_medicine_name,
        dosage_amount=request.dosage_amount,
        dosage_unit=request.dosage_unit,
        times_per_day=request.times_per_day,
        duration_days=request.duration_days,
        is_active=True,
    )
    medicine.times = [_build_time_model(schedule_time) for schedule_time in request.times]
    return medicine


def _sync_medicines(
    schedule: MedicationSchedule,
    medicine_requests: list[ScheduleMedicineRequest],
) -> None:
    existing_medicines = {
        medicine.id: medicine for medicine in schedule.medicines if medicine.id is not None
    }
    next_medicines: list[MedicationScheduleMedicine] = []

    for request in medicine_requests:
        if request.id is None:
            next_medicines.append(_build_medicine_model(request))
            continue

        medicine = existing_medicines.get(request.id)
        if medicine is None:
            raise HTTPException(status_code=400, detail="수정 대상 약 정보가 일정에 속하지 않아요.")

        medicine.item_seq = request.item_seq
        medicine.custom_medicine_name = request.custom_medicine_name
        medicine.dosage_amount = request.dosage_amount
        medicine.dosage_unit = request.dosage_unit
        medicine.times_per_day = request.times_per_day
        medicine.duration_days = request.duration_days
        medicine.is_active = True
        _sync_times(medicine, request.times)
        next_medicines.append(medicine)

    schedule.medicines = next_medicines


def _sync_times(
    medicine: MedicationScheduleMedicine,
    time_requests: list[ScheduleTimeRequest],
) -> None:
    existing_times = {
        schedule_time.id: schedule_time
        for schedule_time in medicine.times
        if schedule_time.id is not None
    }
    next_times: list[MedicationScheduleTime] = []

    for request in time_requests:
        if request.id is None:
            next_times.append(_build_time_model(request))
            continue

        schedule_time = existing_times.get(request.id)
        if schedule_time is None:
            raise HTTPException(status_code=400, detail="수정 대상 복약 시간이 약 정보에 속하지 않아요.")

        schedule_time.timing = request.timing
        schedule_time.take_time = request.take_time
        schedule_time.sort_order = request.sort_order
        next_times.append(schedule_time)

    medicine.times = next_times


def _build_time_model(request: ScheduleTimeRequest) -> MedicationScheduleTime:
    return MedicationScheduleTime(
        timing=request.timing,
        take_time=request.take_time,
        sort_order=request.sort_order,
    )


def _create_future_notifications_for_schedule(
    db: Session,
    user_id: int,
    schedule: MedicationSchedule,
    from_time: datetime,
) -> None:
    notification_requests: list[MedicationNotificationCreateRequest] = []

    for medicine in _sort_medicines(schedule.medicines):
        if not medicine.is_active:
            continue

        duration_days = medicine.duration_days or 1
        active_days = max(duration_days, 1)

        for day_offset in range(active_days):
            target_date = schedule.start_date + timedelta(days=day_offset)

            for schedule_time in _sort_times(medicine.times):
                if (
                    schedule.id is None
                    or medicine.id is None
                    or schedule_time.id is None
                ):
                    continue

                scheduled_at = datetime.combine(target_date, schedule_time.take_time)

                if scheduled_at <= from_time:
                    continue

                notification_requests.append(
                    MedicationNotificationCreateRequest(
                        medicationScheduleId=schedule.id,
                        medicationScheduleMedicineId=medicine.id,
                        medicationScheduleTimeId=schedule_time.id,
                        type=MedicationNotificationType.MEDICATION_REMINDER,
                        title="복약 시간이에요",
                        body=f"{medicine.custom_medicine_name} 복용할 시간입니다.",
                        status=MedicationNotificationStatus.PENDING,
                        scheduledAt=scheduled_at,
                    )
                )

    if not notification_requests:
        return

    create_medication_notifications(
        db=db,
        user_id=user_id,
        requests=notification_requests,
    )


def _get_schedule_model(
    db: Session,
    user_id: int,
    schedule_id: int,
) -> MedicationSchedule:
    stmt = (
        select(MedicationSchedule)
        .where(
            MedicationSchedule.user_id == user_id,
            MedicationSchedule.id == schedule_id,
        )
        .options(
            joinedload(MedicationSchedule.medicines).joinedload(
                MedicationScheduleMedicine.times
            )
        )
    )

    try:
        schedule = db.execute(stmt).unique().scalar_one_or_none()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 일정 조회 중 오류가 발생했어요.")

    if schedule is None:
        raise HTTPException(status_code=404, detail="복약 일정을 찾을 수 없어요.")

    return schedule


def _assert_schedule_exists(db: Session, user_id: int, schedule_id: int) -> None:
    stmt = select(MedicationSchedule.id).where(
        MedicationSchedule.user_id == user_id,
        MedicationSchedule.id == schedule_id,
    )

    try:
        schedule_id_value = db.scalars(stmt).first()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 일정 확인 중 오류가 발생했어요.")

    if schedule_id_value is None:
        raise HTTPException(status_code=404, detail="복약 일정을 찾을 수 없어요.")


def _get_schedule_medicine_model(
    db: Session,
    user_id: int,
    schedule_id: int,
    medicine_id: int,
) -> MedicationScheduleMedicine:
    stmt = (
        select(MedicationScheduleMedicine)
        .join(MedicationSchedule)
        .where(
            MedicationSchedule.user_id == user_id,
            MedicationSchedule.id == schedule_id,
            MedicationScheduleMedicine.id == medicine_id,
        )
    )

    try:
        medicine = db.scalars(stmt).first()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 약 정보 확인 중 오류가 발생했어요.")

    if medicine is None:
        raise HTTPException(status_code=404, detail="복약 약 정보를 찾을 수 없어요.")

    return medicine


def _get_schedule_time_model(
    db: Session,
    user_id: int,
    time_id: int,
) -> tuple[MedicationScheduleTime, int]:
    stmt = (
        select(MedicationScheduleTime, MedicationSchedule.id)
        .join(MedicationScheduleMedicine)
        .join(MedicationSchedule)
        .where(
            MedicationSchedule.user_id == user_id,
            MedicationScheduleTime.id == time_id,
        )
    )

    try:
        row = db.execute(stmt).first()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 시간 확인 중 오류가 발생했어요.")

    if row is None:
        raise HTTPException(status_code=404, detail="복약 시간을 찾을 수 없어요.")

    return row[0], row[1]


def _assert_schedule_time_belongs_to_schedule(
    db: Session,
    user_id: int,
    schedule_id: int,
    time_id: int,
) -> None:
    stmt = (
        select(MedicationScheduleTime.id)
        .join(MedicationScheduleMedicine)
        .join(MedicationSchedule)
        .where(
            MedicationSchedule.user_id == user_id,
            MedicationSchedule.id == schedule_id,
            MedicationScheduleTime.id == time_id,
        )
    )

    try:
        time_id_value = db.scalars(stmt).first()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복약 시간 확인 중 오류가 발생했어요.")

    if time_id_value is None:
        raise HTTPException(status_code=404, detail="복약 시간을 찾을 수 없어요.")


def _get_intake_log_model(
    db: Session,
    user_id: int,
    log_id: int,
) -> MedicationIntakeLog:
    stmt = (
        select(MedicationIntakeLog)
        .join(MedicationSchedule)
        .where(
            MedicationSchedule.user_id == user_id,
            MedicationIntakeLog.id == log_id,
        )
    )

    try:
        log = db.scalars(stmt).first()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복용 기록 확인 중 오류가 발생했어요.")

    if log is None:
        raise HTTPException(status_code=404, detail="복용 기록을 찾을 수 없어요.")

    return log


def _get_logs_by_schedule_time_and_date(
    db: Session,
    user_id: int,
    target_date: date,
) -> dict[tuple[int, int], MedicationIntakeLog]:
    day_start = datetime.combine(target_date, time.min)
    day_end = day_start + timedelta(days=1)
    stmt = (
        select(MedicationIntakeLog)
        .join(MedicationSchedule)
        .where(
            MedicationSchedule.user_id == user_id,
            and_(
                MedicationIntakeLog.scheduled_at >= day_start,
                MedicationIntakeLog.scheduled_at < day_end,
            ),
        )
        .order_by(MedicationIntakeLog.id.desc())
    )

    try:
        logs = list(db.scalars(stmt).all())
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="복용 기록 조회 중 오류가 발생했어요.")

    logs_by_key: dict[tuple[int, int], MedicationIntakeLog] = {}
    for log in logs:
        key = (log.medication_schedule_id, log.medication_schedule_time_id)
        logs_by_key.setdefault(key, log)

    return logs_by_key


def _medicine_is_due_on(
    medicine: MedicationScheduleMedicine,
    start_date: date,
    target_date: date,
) -> bool:
    duration_days = medicine.duration_days or 1
    end_date = start_date + timedelta(days=max(duration_days, 1))
    return start_date <= target_date < end_date


def _sort_medicines(
    medicines: list[MedicationScheduleMedicine],
) -> list[MedicationScheduleMedicine]:
    return sorted(medicines, key=lambda medicine: medicine.id or 0)


def _sort_times(
    times: list[MedicationScheduleTime],
) -> list[MedicationScheduleTime]:
    return sorted(
        times,
        key=lambda schedule_time: (
            schedule_time.sort_order is None,
            schedule_time.sort_order or 0,
            schedule_time.take_time,
            schedule_time.id or 0,
        ),
    )


def _format_time(value: time) -> str:
    return value.strftime("%H:%M")


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value

    return value.astimezone(timezone.utc).replace(tzinfo=None)
