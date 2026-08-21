from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.services.chat_service import (
    build_context,
    generate_answer_from_context,
    log_search_results,
)
from app.services.medicine_search_service import search_medicines


class ChatState(TypedDict):
    medicine_name: str
    question: str
    top_k: int
    search_results: list[dict]
    context: str
    answer: str

# 노드: 현재 state -> 검색 -> state에 결과 추가
def retrieve_documents(state: ChatState):
    results = search_medicines(
        medicine_name=state["medicine_name"],
        query=state["question"],
        top_k=state["top_k"],
    )
    log_search_results(results)

    return {
        "search_results": results,
        "context": build_context(results),
    }

# 노드: 답변 생성
def generate_answer(state: ChatState):
    answer = generate_answer_from_context(
        medicine_name=state["medicine_name"],
        question=state["question"],
        context=state["context"],
    )

    return {"answer": answer}

# 그래프 조립
graph_builder = StateGraph(ChatState)

graph_builder.add_node("retrieve_documents", retrieve_documents)
graph_builder.add_node("generate_answer", generate_answer)

graph_builder.add_edge(START, "retrieve_documents")
graph_builder.add_edge("retrieve_documents", "generate_answer")
graph_builder.add_edge("generate_answer", END)

chat_graph = graph_builder.compile()

# langgraph 실행
def answer_question_with_graph(
    medicine_name: str,
    question: str,
    top_k: int = 5,
) -> str:
    result = chat_graph.invoke({
        "medicine_name": medicine_name,
        "question": question,
        "top_k": top_k,
    })

    return result["answer"]
