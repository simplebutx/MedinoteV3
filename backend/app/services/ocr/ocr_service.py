from sqlalchemy.orm import Session

from app.schemas.ocr_schema import OcrResponse
from app.services.ocr.ocr_graph_service import run_ocr_with_graph

# LangGraph를 통해 S3 조회 -> OCR 추출 -> 약품 DB 매칭 실행
def ocr(object_key: str, db: Session) -> OcrResponse:
    return run_ocr_with_graph(object_key=object_key, db=db)
