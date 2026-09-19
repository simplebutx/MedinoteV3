import logging
from typing import Any

from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client.models import FieldCondition, Filter, MatchValue
from tenacity import retry, stop_after_attempt, wait_exponential_jitter

from app.core.config import settings
from app.core.exceptions import ExternalServiceError
from app.db.qdrant import get_qdrant_client
from app.services.chatbot.medicine_search_service import (
    apply_hybrid_scores,
)

logger = logging.getLogger("uvicorn.error")

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 1536
DEFAULT_SOURCE_NAME = "의약품안전나라"
DEFAULT_SOURCE_URL = "https://nedrug.mfds.go.kr"
TOP_K_PER_QUERY = 3
MAX_DOCUMENTS_PER_MEDICINE = 20


class AnalysisRetrievalError(ExternalServiceError):
    """처방전 분석 문서 검색 실패."""

# 메인
def attach_retrieval_context(context: dict[str, Any]) -> dict[str, Any]:
    return {
        **context,
        "medicines": [
            {
                **medicine,
                **retrieve_medicine_documents(
                    user_context=context["user"],
                    medicine=medicine,
                ),
            }
            for medicine in context["medicines"]
        ],
    }


def retrieve_medicine_documents(
    user_context: dict[str, Any],
    medicine: dict[str, Any],
) -> dict[str, list[dict[str, Any]]]:
    # 검색어 생성
    queries_by_category = build_retrieval_queries(user_context=user_context)
    documents_by_category: dict[str, list[dict[str, Any]]] = {}

    for category, queries in queries_by_category.items():
        candidates: list[dict[str, Any]] = []

        # 키워드별로 Qdrant 검색
        for query in queries:
            candidates.extend(
                _retrieve_for_query(
                    medicine_name=medicine["medicineName"],
                    query=query,
                )
            )

        candidates = _dedupe_documents(candidates)

        # 같은 카테고리의 키워드들을 기준으로 점수 재계산
        if candidates:
            candidates = apply_hybrid_scores(
                candidates=candidates,
                query=" ".join(queries),
                medicine_name=medicine["medicineName"],
            )

        documents_by_category[f"{category}Documents"] = (
            candidates[:MAX_DOCUMENTS_PER_MEDICINE]
        )

    return documents_by_category

# 검색어 생성 - 건강정보 + 기저질환
def build_retrieval_queries(
    user_context: dict[str, Any],
) -> dict[str, list[str]]:
    disease_names = [
        disease["diseaseName"]
        for disease in user_context["diseases"]
        if disease.get("diseaseName")
    ]
    active_health_flags = _get_active_health_flags(user_context["healthProfile"])

    return {
        "health": _dedupe_strings(active_health_flags),
        "disease": _dedupe_strings(disease_names),
    }

# 키워드별로 Qdrant에서 후보청크 검색
@retry(stop=stop_after_attempt(3), wait=wait_exponential_jitter(), reraise=True)
def _retrieve_for_query(medicine_name: str, query: str) -> list[dict[str, Any]]:
    try:
        docs_with_scores = _get_vector_store().similarity_search_with_score(
            query=query,
            k=TOP_K_PER_QUERY,
            filter=Filter(
                must=[
                    FieldCondition(
                        key="metadata.medicine_name",
                        match=MatchValue(value=medicine_name),
                    )
                ]
            ),
        )
    except Exception as error:
        logger.exception("analysis retrieval failed")
        raise AnalysisRetrievalError("처방전 분석 문서 검색에 실패했습니다.") from error

    documents = []

    # 검색 결과 응답 생성
    for doc, score in docs_with_scores:
        metadata = doc.metadata or {}
        documents.append(
            {
                "query": query,
                "text": doc.page_content,
                "vector_score": score,
                "medicineId": metadata.get("medicine_id"),
                "documentType": metadata.get("document_type"),
                "sectionTitle": metadata.get("section_title"),
                "sourceName": metadata.get("source_name") or DEFAULT_SOURCE_NAME,
                "sourceUrl": metadata.get("source_url") or DEFAULT_SOURCE_URL,
            }
        )

    return documents

# 검색기 객체 생성
def _get_vector_store() -> QdrantVectorStore:
    return QdrantVectorStore(
        client=get_qdrant_client(),
        collection_name=settings.qdrant_collection_name,
        embedding=OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            dimensions=EMBEDDING_DIMENSIONS,
            api_key=settings.openai_api_key,
        ),
        content_payload_key="text",
    )

# 건강정보 조회 후 리스트에 추가
def _get_active_health_flags(health_profile: dict[str, bool]) -> list[str]:
    labels = {
        "isPregnant": "임신",
        "isBreastfeeding": "수유",
        "isSmoking": "흡연",
        "isDrinking": "음주",
        "isChild": "소아",
        "isElderly": "고령",
    }

    # True인것만 추가
    return [label for key, label in labels.items() if health_profile.get(key)]

# 중복제거
def _dedupe_documents(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    result = []

    for document in documents:
        # 서로 다른 검색어에서 나온 결과는 같은 청크여도 각각 유지한다.
        # 예: 당뇨 검색 결과와 간질환 검색 결과를 모두 LLM에 전달한다.
        key = (
            document.get("query"),
            document.get("medicineId"),
            document.get("documentType"),
            document.get("text"),
        )

        if key in seen:
            continue

        seen.add(key)
        result.append(document)

    return result

# 중복제거
def _dedupe_strings(values: list[str]) -> list[str]:
    seen = set()
    result = []

    for value in values:
        if value in seen:
            continue

        seen.add(value)
        result.append(value)

    return result
