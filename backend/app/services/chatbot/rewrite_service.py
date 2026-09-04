from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.services.chatbot.answer_generation_service import get_chat_model


def build_chat_history(messages) -> str:
    if not messages:
        return "이전 대화 없음"

    return "\n".join(
        f"{message.role}: {message.content}"
        for message in messages
    )


def log_rewritten_question(
    original_question: str,
    rewritten_question: str,
) -> None:
    print("\n===== QUERY REWRITE =====")
    print(f"원본 질문: {original_question}")
    print(f"재작성 질문: {rewritten_question}")
    print("=========================\n")


def rewrite_question(
    medicine_name: str,
    question: str,
    messages: list,  # 최근 대화 메세지 목록
) -> str:
    if not messages:
        return f"{medicine_name} {question}"

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """
너는 사용자의 후속 질문을 검색에 적합한 독립 질문으로 재작성하는 AI다.
반드시 의약품명을 포함해서 질문을 재작성해라.
이전 대화 맥락을 참고해서 생략된 대상, 비교 기준, 증상 등을 보완해라.
새로운 정보를 추측하지 마라.
원래 질문이 이미 독립적이어도 의약품명이 빠져 있으면 의약품명을 포함해라.
답변하지 말고 재작성된 질문만 출력해라.
한국어로 작성해라.
""",
        ),
        (
            "human",
            """
의약품명:
{medicine_name}

이전 대화:
{chat_history}

현재 질문:
{question}
""",
        ),
    ])

    chain = (prompt | get_chat_model() | StrOutputParser()).with_retry(
        stop_after_attempt=3, wait_exponential_jitter=True
    )

    return chain.invoke({
        "medicine_name": medicine_name,
        "chat_history": build_chat_history(messages),
        "question": question,
    }).strip()
