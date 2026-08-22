from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.services.chat_service import (
    build_context,
    generate_answer_from_context,
)
from app.services.medicine_search_service import (
    retrieve_candidates,
    log_candidates,
)
from app.services.reranker_service import (
    rerank_candidates,
    log_reranked_candidates,
)


class ChatState(TypedDict):
    medicine_name: str
    question: str
    top_k: int
    candidates: list[dict]
    search_results: list[dict]
    context: str
    answer: str
    sources: list[dict]

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

# 노드: 검색
def retrieve_candidate_documents(state: ChatState):
    candidates = retrieve_candidates(
        medicine_name=state["medicine_name"],
        query=state["question"],
        top_k=state["top_k"],
    )
    log_candidates(candidates)
    return {
        "candidates": candidates,
    }

# 노드: 리랭커
def rerank_candidate_documents(state: ChatState):
    search_results = rerank_candidates(
        query=state["question"],
        candidates=state["candidates"],
        top_n=state["top_k"],
        score_threshold=0.0,
    )

    log_reranked_candidates(search_results)

    return {
        "search_results": search_results,
        "context": build_context(search_results),
        "sources": build_sources(search_results),
    }

# 노드: 답변생성
def generate_answer(state: ChatState):
    answer = generate_answer_from_context(
        medicine_name=state["medicine_name"],
        question=state["question"],
        context=state["context"],
    )

    return {
        "answer": answer,
    }

# 그래프 조립
graph_builder = StateGraph(ChatState)

graph_builder.add_node("retrieve_candidates", retrieve_candidate_documents)
graph_builder.add_node("rerank_candidates", rerank_candidate_documents)
graph_builder.add_node("generate_answer", generate_answer)

graph_builder.add_edge(START, "retrieve_candidates")
graph_builder.add_edge("retrieve_candidates", "rerank_candidates")
graph_builder.add_edge("rerank_candidates", "generate_answer")
graph_builder.add_edge("generate_answer", END)

chat_graph = graph_builder.compile()


# langgraph 실행
def answer_question_with_graph(
    medicine_name: str,
    question: str,
    top_k: int = 5,
) -> dict:
    result = chat_graph.invoke({
        "medicine_name": medicine_name,
        "question": question,
        "top_k": top_k,
    })

    return {
        "answer": result["answer"],
        "sources": result.get("sources", []),
    }
