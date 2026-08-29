from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud.user_health_profile import get_health_profile, upsert_health_profile
from app.db.mysql import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user_health_profile_schema import HealthResponse, HealthUpdateRequest

router = APIRouter(prefix="/health-profile", tags=["health-profile"])


@router.get("", response_model=HealthResponse)
def read_health_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    health_profile = get_health_profile(db, current_user.id)

    if health_profile is None:
        return HealthResponse()

    return health_profile


@router.put("", response_model=HealthResponse)
def save_health_profile(
    request: HealthUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return upsert_health_profile(
        db=db,
        user_id=current_user.id,
        is_pregnant=request.is_pregnant,
        is_breastfeeding=request.is_breastfeeding,
        is_smoking=request.is_smoking,
        is_drinking=request.is_drinking,
        is_child=request.is_child,
        is_elderly=request.is_elderly,
    )