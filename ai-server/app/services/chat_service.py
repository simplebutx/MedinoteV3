import logging

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.services.medicine_search_service import search_medicines

CHAT_MODEL = "gpt-4o-mini"

logger = logging.getLogger("uvicorn.error")


def get_chat_model():
    return ChatOpenAI(
        model=CHAT_MODEL,
        api_key=settings.openai_api_key,
        temperature=0,
    )


def build_context(search_results: list[dict]) -> str:
    if not search_results:
        return "검색된 문서가 없습니다."

    context_chunks = []

    for index, result in enumerate(search_results, start=1):
        context_chunks.append(
            "\n".join(
                [
                    f"[문서 {index}]",
                    f"문서 유형: {result.get('document_type') or '알 수 없음'}",
                    f"의약품 ID: {result.get('medicine_id') or '알 수 없음'}",
                    f"내용: {result.get('text')}",
                ]
            )
        )

    return "\n\n".join(context_chunks)


# 로그
def log_search_results(search_results: list[dict]) -> None:
    logger.info("chat debug search results count=%s", len(search_results))

    for index, result in enumerate(search_results, start=1):
        logger.info(
            "chat debug search result %s | score=%s | document_type=%s | medicine_id=%s | text=%s",
            index,
            result.get("score"),
            result.get("document_type"),
            result.get("medicine_id"),
            result.get("text"),
        )


def generate_answer_from_context(
    medicine_name: str,
    question: str,
    context: str,
) -> str:
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """
너는 의약품 문서 기반으로 답변하는 의료 정보 보조 AI다.
반드시 제공된 근거 문서 안의 정보만 사용해서 답변해라.
근거에 없는 내용은 추측하지 말고, 문서에서 확인할 수 없다고 답해라.
진단이나 처방을 단정하지 말고, 필요한 경우 전문가 상담을 권장해라.
답변은 한국어로 간결하게 해라.
마크다운 문법을 사용하지 말고 일반 텍스트로만 답변해라.
""",
        ),
        (
            "human",
            """
의약품명: {medicine_name}

근거 문서:
{context}

질문:
{question}
""",
        ),
    ])

    chain = prompt | get_chat_model() | StrOutputParser()

    return chain.invoke(
        {
            "medicine_name": medicine_name,
            "context": context,
            "question": question,
        }
    )

# 메인함수
def answer_question(medicine_name: str, question: str, top_k: int = 5) -> str:
    search_results = search_medicines(
        medicine_name=medicine_name,
        query=question,
        top_k=top_k,
    )
    log_search_results(search_results)

    return generate_answer_from_context(
        medicine_name=medicine_name,
        question=question,
        context=build_context(search_results),
    )
