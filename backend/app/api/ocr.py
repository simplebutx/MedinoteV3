from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.mysql import get_db
from app.schemas.ocr_schema import OcrUploadUrlResponse, OcrResponse, OcrAnalyzeRequest
from app.services.ocr.s3_service import create_presigned_upload_url
from app.services.ocr.ocr_service import ocr

router = APIRouter(prefix="/ocr", tags=["OCR"])

@router.post("/upload-url", response_model=OcrUploadUrlResponse)
def create_ocr_upload_url():
    object_key, upload_url = create_presigned_upload_url()

    return OcrUploadUrlResponse(
        object_key=object_key,
        upload_url=upload_url,
        expires_in=600
    )

@router.post("/analyze", response_model=OcrResponse)
def create_ocr(request: OcrAnalyzeRequest, db: Session = Depends(get_db)):
    return ocr(request.object_key, db=db)
