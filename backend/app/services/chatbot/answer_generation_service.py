from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.services.chatbot.medicine_search_service import retrieve_candidates
from app.services.chatbot.reranker_service import rerank_candidates

CHAT_MODEL = "gpt-4o-mini"


def get_chat_model():
    return ChatOpenAI(
        model=CHAT_MODEL,
        api_key=settings.openai_api_key,
        temperature=0,
        timeout = 30,
        max_retries=0
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

    chain = (prompt | get_chat_model() | StrOutputParser()).with_retry(
        stop_after_attempt=3, wait_exponential_jitter=True,)

    return chain.invoke(
        {
            "medicine_name": medicine_name,
            "context": context,
            "question": question,
        }
    )

# 메인함수
def answer_question(medicine_name: str, question: str, top_k: int = 5) -> str:

    # 검색
    candidates = retrieve_candidates(
        medicine_name=medicine_name,
        query=question,
        top_k=top_k,
    )

    # 리랭커
    search_results = rerank_candidates(
        query=question,
        candidates=candidates,
        top_n=top_k,
        score_threshold=0.0,
    )

    # llm 응답 생성
    return generate_answer_from_context(
        medicine_name=medicine_name,
        question=question,
        context=build_context(search_results),
    )
