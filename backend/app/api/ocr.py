from fastapi import APIRouter, UploadFile, File

from app.schemas.ocr_schema import OcrResponse

router = APIRouter(prefix="/ocr", tags=["OCR"])

@router.post("", response_model=OcrResponse)
async def ocr(file: UploadFile = File(...)):
    return OcrResponse(
        analysis=f"{file.filename}파일에서 추출된 임시 OCR 텍스트 입니다"
    )