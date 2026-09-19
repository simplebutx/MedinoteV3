from typing import TypedDict
import logging

from langgraph.graph import END, START, StateGraph

from app.services.chatbot.rewrite_service import (
    log_rewritten_question,
    rewrite_question,
)
from app.services.chatbot.answer_generation_service import (
    build_context,
    generate_answer_from_context,
)
from app.services.chatbot.medicine_search_service import (
    retrieve_candidates,
    log_candidates,
)
from app.services.chatbot.reranker_service import (
    rerank_candidates,
    log_reranked_candidates,
)

logger = logging.getLogger(__name__)

class ChatState(TypedDict, total=False):
    messages: list
    rewritten_question: str
    medicine_name: str
    question: str
    top_k: int
    candidates: list[dict]
    search_results: list[dict]
    context: str
    answer: str
    sources: list[dict]
    route: str
    failure_code: str

# 답변에 추가할 출처 목록
def build_sources(search_results: list[dict]) -> list[dict]:
    sources = []
    seen = set()

    for result in search_results:
        name = result.get("source_name")
        url = result.get("source_url")

        if not name and not url:
            continue

        source_key = (name, url)

        if source_key in seen:
            continue

        seen.add(source_key)
        sources.append({
            "name": name,
            "url": url,
        })

    return sources

# =================================================
# 노드: 쿼리 재작성
def rewrite_user_question(state: ChatState):
    try:
        rewritten_question = rewrite_question(
            medicine_name=state["medicine_name"],
            question=state["question"],
            messages=state.get("messages", []),
        )

        log_rewritten_question(
            original_question=state["question"],
            rewritten_question=rewritten_question,
        )

        return {
            "rewritten_question": rewritten_question,
            "route": "retrieve_candidates",
        }

    except Exception:
        logger.exception("chat graph node failed: rewrite_user_question")
        return {
            "route": "fallback_rewrite_question",
        }

# 폴백: 쿼리 재작성
def fallback_rewrite_question(state: ChatState):
    fallback_question = f'{state["medicine_name"]} {state["question"]}'

    log_rewritten_question(
        original_question=state["question"],
        rewritten_question=fallback_question,
    )

    return {
        "rewritten_question": fallback_question,
        "route": "retrieve_candidates",
    }

# 분기: 쿼리재작성 이후
def route_after_rewrite(state: ChatState):
    return state["route"]

# ==========================================================

# 노드: 검색
def retrieve_candidate_documents(state: ChatState):
    query = state.get("rewritten_question") or state["question"]
    try:
        candidates = retrieve_candidates(
            medicine_name=state["medicine_name"],
            query=query,
            top_k=state["top_k"],
        )

        log_candidates(candidates)

        # 예외: Threshold 기준점 넘는 문서가 없음
        if not candidates:
            return {
                "route": "fallback_retrieve_candidates",
                "failure_code": "NO_RESULTS",
            }

        return {
            "candidates": candidates,
            "route": "rerank_candidates",
        }

    # 예외: 검색 실패 (에러)
    except Exception:
        logger.exception("chat graph node failed: retrieve_candidate_documents")
        return {
            "route": "fallback_retrieve_candidates",
            "failure_code": "SEARCH_UNAVAILABLE",
        }

# 폴백: 검색
def fallback_retrieve_candidates(state: ChatState):
    messages = {
        "NO_RESULTS": (
            "질문과 관련된 의약품 문서를 찾지 못했습니다. "
            "의약품명이나 질문 내용을 다시 확인해 주세요."
        ),
        "SEARCH_UNAVAILABLE": (
            "검색 서비스를 일시적으로 사용할 수 없습니다. "
            "잠시 후 다시 시도해 주세요."
        ),
    }
    failure_code = state.get("failure_code")
    return {
        "answer": messages.get(
            failure_code,
            "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ),
    }

# 분기: 검색 이후
def route_after_retrieve(state: ChatState):
    return state["route"]

# ==============================================

# 노드: 리랭커
def rerank_candidate_documents(state: ChatState):
    query = state.get("rewritten_question") or state["question"]

    try:
        search_results = rerank_candidates(
            query=query,
            candidates=state["candidates"],
            top_n=state["top_k"],
        )

        log_reranked_candidates(search_results)

        # 예외: Threshold 기준점 넘는 문서가 없음
        if not search_results:
            return {
                "route": "fallback_rerank_candidates",
                "failure_code": "NO_RESULTS",
            }

        return {
            "search_results": search_results,
            "context": build_context(search_results),
            "sources": build_sources(search_results),
            "route": "generate_answer",
        }

    # 예외: 재정렬 실패 (에러)
    except Exception:
        logger.exception("chat graph node failed: rerank_candidate_documents")
        return {
            "route": "fallback_rerank_candidates",
            "failure_code": "SEARCH_UNAVAILABLE",
        }

# 폴백: 리랭커
def fallback_rerank_candidates(state: ChatState):
    messages = {
        "NO_RESULTS": (
            "질문과 관련된 의약품 문서를 찾지 못했습니다. "
            "의약품명이나 질문 내용을 다시 확인해 주세요."
        ),
        "SEARCH_UNAVAILABLE": (
            "검색 서비스를 일시적으로 사용할 수 없습니다. "
            "잠시 후 다시 시도해 주세요."
        ),
    }

    failure_code = state.get("failure_code")

    return {
        "answer": messages.get(
            failure_code,
            "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ),
    }

# 분기: 리랭커 이후
def route_after_rerank(state: ChatState):
    return state["route"]

# ===============================================    

# 노드: 답변생성
def generate_answer(state: ChatState):
    try:
        answer = generate_answer_from_context(
            medicine_name=state["medicine_name"],
            question=state["question"],
            context=state.get("context", ""),
        )

        return {
            "answer": answer,
        }

    # 예외: 답변생성 실패 (에러)
    except Exception:
        logger.exception("chat graph node failed: generate_answer")
        return {
            "answer": (
                "답변을 생성하는 중 문제가 발생했습니다. "
                "잠시 후 다시 시도해 주세요."
            ),
        }

# 그래프 조립
graph_builder = StateGraph(ChatState)

graph_builder.add_node("rewrite_question", rewrite_user_question)
graph_builder.add_node("fallback_rewrite_question", fallback_rewrite_question)
graph_builder.add_node("retrieve_candidates", retrieve_candidate_documents)
graph_builder.add_node("rerank_candidates", rerank_candidate_documents)
graph_builder.add_node("generate_answer", generate_answer)
graph_builder.add_node("fallback_retrieve_candidates", fallback_retrieve_candidates)
graph_builder.add_node("fallback_rerank_candidates", fallback_rerank_candidates)

graph_builder.add_edge(START, "rewrite_question")

graph_builder.add_conditional_edges(
    "rewrite_question",
    route_after_rewrite,
    {
        "retrieve_candidates": "retrieve_candidates",
        "fallback_rewrite_question": "fallback_rewrite_question",
    },
)

graph_builder.add_edge("fallback_rewrite_question", "retrieve_candidates")
graph_builder.add_conditional_edges(
    "retrieve_candidates",
    route_after_retrieve,
    {
        "rerank_candidates": "rerank_candidates",
        "fallback_retrieve_candidates": "fallback_retrieve_candidates",
    },
)
graph_builder.add_edge("fallback_retrieve_candidates", END)

graph_builder.add_conditional_edges(
    "rerank_candidates",
    route_after_rerank,
    {
        "generate_answer": "generate_answer",
        "fallback_rerank_candidates": "fallback_rerank_candidates",
    },
)

graph_builder.add_edge("fallback_rerank_candidates", END)
graph_builder.add_edge("generate_answer", END)

chat_graph = graph_builder.compile()


# langgraph 실행
def answer_question_with_graph(
    medicine_name: str,
    question: str,
    messages: list | None = None,
    top_k: int = 5,
) -> dict:
    result = chat_graph.invoke({
        "medicine_name": medicine_name,
        "question": question,
        "messages": messages or [],
        "top_k": top_k,
    })

    return {
        "answer": result["answer"],
        "sources": result.get("sources", []),
    }
