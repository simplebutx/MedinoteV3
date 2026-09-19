from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.mysql import get_db
from app.schemas.ocr_schema import OcrUploadUrlResponse, OcrResponse, OcrAnalyzeRequest
from app.services.ocr.s3_service import create_presigned_upload_url
from app.services.ocr.ocr_service import ocr
from app.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/ocr", tags=["OCR"])

@router.post("/upload-url", response_model=OcrUploadUrlResponse)
def create_ocr_upload_url(
    current_user: User = Depends(get_current_user),
):
    object_key, upload_url = create_presigned_upload_url(
        user_id=current_user.id,
    )

    return OcrUploadUrlResponse(
        object_key=object_key,
        upload_url=upload_url,
        expires_in=600,
    )

@router.post("/analyze", response_model=OcrResponse)
def create_ocr(
    request: OcrAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ocr(
        object_key=request.object_key,
        db=db,
        user_id=current_user.id,
    )
