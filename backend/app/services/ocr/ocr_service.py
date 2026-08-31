from app.schemas.ocr_schema import OcrResponse
from sqlalchemy.orm import Session

from app.services.ocr.image_preprocess_service import preprocess_image_for_ocr
from app.services.ocr.medicine_match_service import match_medicines_with_db
from app.services.ocr.s3_service import get_object_bytes
from app.services.ocr.llm_ocr_service import extract_prescription_from_image

# s3 클라 생성 -> 이미지 가져오기 -> llm에 schema와 함께 요청 -> 응답반환
def ocr(object_key: str, db: Session) -> OcrResponse:
    image_bytes = get_object_bytes(object_key)
    image_bytes = preprocess_image_for_ocr(image_bytes)
    result = extract_prescription_from_image(image_bytes)
    result = match_medicines_with_db(result=result, db=db)

    return OcrResponse(
        status="success",
        result_json=result,
        error_message=None,
    )
