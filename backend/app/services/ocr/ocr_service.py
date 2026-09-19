from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError
from app.schemas.ocr_schema import OcrResponse
from app.services.ocr.ocr_graph_service import run_ocr_with_graph
from app.services.ocr.s3_service import is_user_object_key

# LangGraph를 통해 S3 조회 -> OCR 추출 -> 약품 DB 매칭 실행
def ocr(object_key: str, db: Session, user_id: int) -> OcrResponse:
    if not is_user_object_key(object_key=object_key, user_id=user_id):
        raise ForbiddenError("해당 처방전 이미지에 접근할 권한이 없습니다.")

    return run_ocr_with_graph(object_key=object_key, db=db)
