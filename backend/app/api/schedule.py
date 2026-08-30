from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.crud.schedule import (
    create_intake_log as crud_create_intake_log,
    create_schedule as crud_create_schedule,
    create_schedule_time as crud_create_schedule_time,
    delete_schedule as crud_delete_schedule,
    delete_schedule_time as crud_delete_schedule_time,
    get_daily_medications as crud_get_daily_medications,
    get_intake_logs as crud_get_intake_logs,
    get_schedule as crud_get_schedule,
    get_schedule_times as crud_get_schedule_times,
    get_schedules as crud_get_schedules,
    update_intake_log as crud_update_intake_log,
    update_schedule as crud_update_schedule,
    update_schedule_time as crud_update_schedule_time,
)
from app.db.mysql import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.schedule_schema import (
    DailyMedicationScheduleResponse,
    MedicationIntakeLogRequest,
    MedicationIntakeLogResponse,
    ScheduleRequest,
    ScheduleResponse,
    ScheduleTimeRequest,
    ScheduleTimeResponse,
)

schedule_router = APIRouter(prefix="/medication-schedules", tags=["schedule"])
intake_log_router = APIRouter(prefix="/medication-intake-logs", tags=["schedule"])
schedule_time_router = APIRouter(prefix="/medication-schedule-times", tags=["schedule"])


@schedule_router.post(
    "",
    response_model=ScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_schedule(
    request: ScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_create_schedule(db=db, user_id=current_user.id, request=request)


@schedule_router.get("", response_model=list[ScheduleResponse])
def read_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_get_schedules(db=db, user_id=current_user.id)


@schedule_router.get("/daily", response_model=DailyMedicationScheduleResponse)
def read_daily_medications(
    date_value: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_get_daily_medications(
        db=db,
        user_id=current_user.id,
        target_date=date_value,
    )


@schedule_router.get("/{schedule_id}", response_model=ScheduleResponse)
def read_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_get_schedule(db=db, user_id=current_user.id, schedule_id=schedule_id)


@schedule_router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: int,
    request: ScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_update_schedule(
        db=db,
        user_id=current_user.id,
        schedule_id=schedule_id,
        request=request,
    )


@schedule_router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    crud_delete_schedule(db=db, user_id=current_user.id, schedule_id=schedule_id)
    return None


@schedule_router.post(
    "/{schedule_id}/medicines/{medicine_id}/times",
    response_model=ScheduleTimeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_schedule_time(
    schedule_id: int,
    medicine_id: int,
    request: ScheduleTimeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_create_schedule_time(
        db=db,
        user_id=current_user.id,
        schedule_id=schedule_id,
        medicine_id=medicine_id,
        request=request,
    )


@schedule_router.get("/{schedule_id}/times", response_model=list[ScheduleTimeResponse])
def read_schedule_times(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_get_schedule_times(db=db, user_id=current_user.id, schedule_id=schedule_id)


@schedule_time_router.put("/{time_id}", response_model=ScheduleTimeResponse)
def update_schedule_time(
    time_id: int,
    request: ScheduleTimeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_update_schedule_time(
        db=db,
        user_id=current_user.id,
        time_id=time_id,
        request=request,
    )


@schedule_time_router.delete("/{time_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule_time(
    time_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    crud_delete_schedule_time(db=db, user_id=current_user.id, time_id=time_id)
    return None


@intake_log_router.post(
    "",
    response_model=MedicationIntakeLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_intake_log(
    request: MedicationIntakeLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_create_intake_log(db=db, user_id=current_user.id, request=request)


@intake_log_router.get("", response_model=list[MedicationIntakeLogResponse])
def read_intake_logs(
    medication_schedule_id: int = Query(..., alias="medicationScheduleId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_get_intake_logs(
        db=db,
        user_id=current_user.id,
        schedule_id=medication_schedule_id,
    )


@intake_log_router.put("/{log_id}", response_model=MedicationIntakeLogResponse)
def update_intake_log(
    log_id: int,
    request: MedicationIntakeLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_update_intake_log(
        db=db,
        user_id=current_user.id,
        log_id=log_id,
        request=request,
    )
