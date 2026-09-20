import json
import logging
from typing import Annotated, Any, TypedDict

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition

from app.core.config import settings
from app.services.agent.tools import MEDICAL_TOOLS

logger = logging.getLogger("uvicorn.error")


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    user_id: int
    db: Any
    answer: str
    sources: list[dict]

# LLM 객체 생성
def get_agent_model():
    model = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
        temperature=0,
    )

    # 도구 목록 연결
    return model.bind_tools(MEDICAL_TOOLS, parallel_tool_calls=False)

# 노드: LLM 호출
def call_agent_model(state: AgentState):
    system_message = SystemMessage(
        content=(
        "너는 Medinote 건강관리 AI Agent다. "
        "사용자 질문의 의도를 파악하고 도구 설명을 참고해 "
        "가장 적절한 도구를 선택한다. "
        "질문에 여러 정보가 필요하면 여러 도구를 순서대로 호출하고 "
        "결과를 종합해서 답변한다. "
        "일반적인 의약품 정보와 사용자의 건강정보를 반영한 개인화 분석을 구분한다. "
        "사용자 건강정보, 기저질환, 주의성분을 반영한 특정 처방약의 주의사항은 "
        "analyze_medicine_with_user_context를 우선 사용한다. "
        "도구 결과에 없는 내용은 추측하지 않는다. "
        "모든 답변은 한국어로 작성한다."
        )
    )

    model = get_agent_model()

    # 시스템 지침 + 대화 메시지 전달
    response = model.invoke(
        [
            system_message,
            *state["messages"],
        ]
    )

    tool_calls = getattr(response, "tool_calls", []) or []
    if tool_calls:
        logger.info(
            "agent decision: tool_call | user_id=%s | tools=%s",
            state["user_id"],
            [call.get("name") for call in tool_calls],
        )
    else:
        logger.info(
            "agent decision: final_answer | user_id=%s | answer_length=%s",
            state["user_id"],
            len(response.content) if isinstance(response.content, str) else 0,
        )

    return {
        "messages": [response],
    }


def route_after_tools(state: AgentState):
    tool_messages = [
        message
        for message in state["messages"]
        if getattr(message, "type", None) == "tool"
    ]

    logger.info(
        "agent route after tools | user_id=%s | executed_tools=%s",
        state["user_id"],
        [getattr(message, "name", None) for message in tool_messages],
    )

    # RAG 도구만 단독으로 호출된 경우에는 Agent가 재생성하지 않고
    # RAG가 생성한 답변을 그대로 반환한다.
    if (
        len(tool_messages) == 1
        and getattr(tool_messages[0], "name", None)
        == "answer_medicine_question"
    ):
        return "return_rag_answer"

    # 여러 도구가 호출된 경우에는 Agent가 결과를 종합한다.
    return "agent"


def return_rag_answer(state: AgentState):
    tool_message = state["messages"][-1]
    content = tool_message.content

    if isinstance(content, str):
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            result = {
                "answer": content,
                "sources": [],
            }
    else:
        result = content

    response = {
        "answer": result.get("answer", ""),
        "sources": result.get("sources", []),
    }
    logger.info(
        "agent completed: rag_answer_passthrough | user_id=%s | answer_length=%s | source_count=%s",
        state["user_id"],
        len(response["answer"]),
        len(response["sources"]),
    )
    return response


graph_builder = StateGraph(AgentState)

graph_builder.add_node("agent", call_agent_model)
graph_builder.add_node("return_rag_answer", return_rag_answer)

# 도구 실행 노드 등록
graph_builder.add_node("tools", ToolNode(MEDICAL_TOOLS))

graph_builder.add_edge(START, "agent")

# 도구 실행 분기
graph_builder.add_conditional_edges(
    "agent",
    tools_condition,
    {
        "tools": "tools",
        END: END,
    },
)

graph_builder.add_conditional_edges(
    "tools",
    route_after_tools,
    {
        "return_rag_answer": "return_rag_answer",
        "agent": "agent",
    },
)

graph_builder.add_edge("return_rag_answer", END)

agent_graph = graph_builder.compile()

# 랭그래프 실행
def answer_question_with_agent(
    medicine_name: str | None,
    question: str,
    user_id: int,
    db: Any,
    messages: list | None = None,
) -> dict:
    medicine_context = (
        f"현재 선택된 의약품명: {medicine_name}\n"
        if medicine_name
        else "현재 선택된 의약품명: 없음\n"
    )

    history_messages: list[BaseMessage] = []

    for message in messages or []:
        if message.role == "user":
            history_messages.append(HumanMessage(content=message.content))
        else:
            history_messages.append(AIMessage(content=message.content))

    user_message = HumanMessage(
        content=(
            medicine_context + f"사용자 질문: {question}"
        )
    )

    logger.info(
        "agent request started | user_id=%s | medicine_name=%s | question_length=%s | history_count=%s",
        user_id,
        medicine_name,
        len(question),
        len(messages or []),
    )

    result = agent_graph.invoke(
        {
            "messages": [*history_messages, user_message],
            "user_id": user_id,
            "db": db,
        }
    )

    if "answer" in result:
        logger.info(
            "agent request completed | user_id=%s | answer_length=%s | source_count=%s",
            user_id,
            len(result["answer"]),
            len(result.get("sources", [])),
        )
        return {
            "answer": result["answer"],
            "sources": result.get("sources", []),
        }

    last_message = result["messages"][-1]
    answer = last_message.content

    if not isinstance(answer, str):
        answer = str(answer)

    logger.info(
        "agent request completed | user_id=%s | answer_length=%s | source_count=0",
        user_id,
        len(answer),
    )

    return {
        "answer": answer,
        "sources": [],
    }
