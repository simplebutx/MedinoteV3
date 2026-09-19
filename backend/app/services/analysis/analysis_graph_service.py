from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.services.analysis.analysis_context_service import build_analysis_context
from app.services.analysis.analysis_llm_service import generate_analysis_with_llm
from app.services.analysis.analysis_postprocess_service import (
    build_caution_item_check,
    postprocess_analysis_result,
)
from app.services.analysis.analysis_retrieval_service import attach_retrieval_context

import logging
logger = logging.getLogger(__name__)

class AnalysisState(TypedDict, total=False):
    db: Any
    user_id: int
    schedule: Any
    context: dict[str, Any]
    raw_result: str
    result: dict[str, Any]
    route: str

# 노드: 컨텍스트 빌드
def build_context_node(state: AnalysisState) -> dict[str, Any]:
    try:
        return {
            "context": build_analysis_context(
                db=state["db"],
                user_id=state["user_id"],
                schedule=state["schedule"],
            ),
            "route": "retrieve",
        }
    except Exception:
        logger.exception("analysis graph node failed: build_context")
        return {"route": "context_fallback"}

# 노드: 검색
def retrieve_context_node(state: AnalysisState) -> dict[str, Any]:
    try:
        reference_context = attach_retrieval_context(state["context"])
        return {"context": reference_context, "route": "llm"}
    except Exception:
        logger.exception("analysis graph node failed: retrieve_context")
        return {"route": "retrieval_fallback"}

# 노드: llm 답변 생성
def generate_llm_node(state: AnalysisState) -> dict[str, Any]:
    try:
        return {
            "raw_result": generate_analysis_with_llm(state["context"]),
            "route": "postprocess",
        }
    except Exception:
        logger.exception("analysis graph node failed: generate_llm")
        return {"route": "llm_fallback"}

# 노드: 후처리
def postprocess_node(state: AnalysisState) -> dict[str, Any]:
    try:
        return {
            "result": postprocess_analysis_result(
                raw_result=state["raw_result"],
                context=state["context"],
            ),
            "route": "end",
        }
    except Exception:
        logger.exception("analysis graph node failed: postprocess")
        return {"route": "postprocess_fallback"}


def _fallback_result(state: AnalysisState, reason: str) -> dict[str, Any]:
    context = state.get("context") or {}
    medicines = []
    for medicine in context.get("medicines", []):
        medicines.append({
            "scheduleMedicineId": medicine.get("scheduleMedicineId"),
            "medicineName": medicine.get("medicineName", ""),
            "dosageAmount": medicine.get("dosageAmount"),
            "dosageUnit": medicine.get("dosageUnit"),
            "checks": [
                {
                    "type": "DISEASE",
                    "title": "기저질환과의 관련성",
                    "severity": "warning",
                    "message": f"기저질환 분석을 완료하지 못했어요. {reason}",
                },
                {
                    "type": "HEALTH_STATUS",
                    "title": "건강상태 기반 주의",
                    "severity": "warning",
                    "message": f"건강상태 분석을 완료하지 못했어요. {reason}",
                },
                build_caution_item_check(medicine),
            ],
        })
    return {"result": {"medicines": medicines}}

# 폴백: 컨텍스트 빌드
def context_fallback_node(state: AnalysisState) -> dict[str, Any]:
    return _fallback_result(state, "사용자 정보를 확인해 주세요.")

# 폴백: 검색
def retrieval_fallback_node(state: AnalysisState) -> dict[str, Any]:
    return _fallback_result(state, "관련 문서를 검색하지 못했어요.")

# 폴백: llm 답변 생성
def llm_fallback_node(state: AnalysisState) -> dict[str, Any]:
    return _fallback_result(state, "잠시 후 다시 시도해 주세요.")

# 폴백: 후처리
def postprocess_fallback_node(state: AnalysisState) -> dict[str, Any]:
    return _fallback_result(state, "분석 결과 형식이 올바르지 않아요.")


def _route(state: AnalysisState) -> str:
    return state.get("route", "end")


builder = StateGraph(AnalysisState)
builder.add_node("context", build_context_node)
builder.add_node("retrieve", retrieve_context_node)
builder.add_node("llm", generate_llm_node)
builder.add_node("postprocess", postprocess_node)
builder.add_node("context_fallback", context_fallback_node)
builder.add_node("retrieval_fallback", retrieval_fallback_node)
builder.add_node("llm_fallback", llm_fallback_node)
builder.add_node("postprocess_fallback", postprocess_fallback_node)

builder.add_edge(START, "context")
builder.add_conditional_edges("context", _route, {
    "retrieve": "retrieve",
    "context_fallback": "context_fallback",
})
builder.add_conditional_edges("retrieve", _route, {
    "llm": "llm",
    "retrieval_fallback": "retrieval_fallback",
})
builder.add_conditional_edges("llm", _route, {
    "postprocess": "postprocess",
    "llm_fallback": "llm_fallback",
})
builder.add_conditional_edges("postprocess", _route, {
    "end": END,
    "postprocess_fallback": "postprocess_fallback",
})
for fallback_node in (
    "context_fallback",
    "retrieval_fallback",
    "llm_fallback",
    "postprocess_fallback",
):
    builder.add_edge(fallback_node, END)

analysis_graph = builder.compile()


def generate_prescription_analysis_with_graph(
    db: Any,
    user_id: int,
    schedule: Any,
) -> dict[str, Any]:
    state = analysis_graph.invoke({
        "db": db,
        "user_id": user_id,
        "schedule": schedule,
    })
    return state["result"]
