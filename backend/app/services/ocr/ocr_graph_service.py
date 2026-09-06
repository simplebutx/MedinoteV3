from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.schemas.ocr_schema import OcrResponse
from app.services.ocr.image_preprocess_service import preprocess_image_for_ocr
from app.services.ocr.llm_ocr_service import extract_prescription_from_image
from app.services.ocr.medicine_match_service import match_medicines_with_db
from app.services.ocr.s3_service import get_object_bytes


class OcrState(TypedDict, total=False):
    object_key: str
    db: Any
    image_bytes: bytes
    ocr_result: dict[str, Any]
    response: OcrResponse
    route: str

# 노드: 이미지 요청 & 전처리
def fetch_image_node(state: OcrState) -> dict[str, Any]:
    try:
        image_bytes = get_object_bytes(state["object_key"])
        if not image_bytes:
            raise ValueError("S3에서 이미지가 비어 있습니다.")

        return {
            "image_bytes": preprocess_image_for_ocr(image_bytes),
            "route": "extract",
        }
    except Exception:
        return {"route": "fetch_fallback"}

# 노드: llm 분석 요청
def extract_prescription_node(state: OcrState) -> dict[str, Any]:
    try:
        result = extract_prescription_from_image(state["image_bytes"])
        if not result.get("medicines"):
            raise ValueError("처방전에서 약품 정보를 확인하지 못했습니다.")

        return {"ocr_result": result, "route": "match"}
    except Exception:
        return {"route": "extract_fallback"}

# 노드: 약품명 매칭
def match_medicines_node(state: OcrState) -> dict[str, Any]:
    try:
        result = match_medicines_with_db(
            result=state["ocr_result"],
            db=state["db"],
        )
        return {
            "response": OcrResponse(
                status="success",
                result_json=result,
                error_message=None,
            ),
            "route": "end",
        }
    except Exception:
        # 약품 매칭만 실패한 경우 OCR 결과는 유지해 수동 확인을 가능하게 한다.
        return {
            "response": OcrResponse(
                status="partial_success",
                result_json=state["ocr_result"],
                error_message="약품 DB 매칭에 실패했습니다. 약품명을 확인해 주세요.",
            ),
            "route": "end",
        }

# 폴백: 이미지 요청
def fetch_fallback_node(state: OcrState) -> dict[str, Any]:
    return {
        "response": OcrResponse(
            status="error",
            result_json=None,
            error_message="처방전 이미지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ),
        "route": "end",
    }

# 폴백: llm 분석 요청
def extract_fallback_node(state: OcrState) -> dict[str, Any]:
    return {
        "response": OcrResponse(
            status="error",
            result_json=None,
            error_message="처방전에서 약품 정보를 읽지 못했습니다. 이미지를 확인해 주세요.",
        ),
        "route": "end",
    }


def _route(state: OcrState) -> str:
    return state.get("route", "end")


builder = StateGraph(OcrState)
builder.add_node("fetch_image", fetch_image_node)
builder.add_node("extract_prescription", extract_prescription_node)
builder.add_node("match_medicines", match_medicines_node)
builder.add_node("fetch_fallback", fetch_fallback_node)
builder.add_node("extract_fallback", extract_fallback_node)

builder.add_edge(START, "fetch_image")
builder.add_conditional_edges("fetch_image", _route, {
    "extract": "extract_prescription",
    "fetch_fallback": "fetch_fallback",
})
builder.add_conditional_edges("extract_prescription", _route, {
    "match": "match_medicines",
    "extract_fallback": "extract_fallback",
})
builder.add_edge("match_medicines", END)
builder.add_edge("fetch_fallback", END)
builder.add_edge("extract_fallback", END)

ocr_graph = builder.compile()


def run_ocr_with_graph(object_key: str, db: Any) -> OcrResponse:
    result = ocr_graph.invoke({"object_key": object_key, "db": db})
    return result["response"]
