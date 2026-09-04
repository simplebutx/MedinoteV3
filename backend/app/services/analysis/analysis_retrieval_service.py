import logging
from typing import Any

from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client.models import FieldCondition, Filter, MatchValue

from app.core.config import settings
from app.db.qdrant import get_qdrant_client

logger = logging.getLogger("uvicorn.error")

EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_SOURCE_NAME = "의약품안전나라"
DEFAULT_SOURCE_URL = "https://nedrug.mfds.go.kr"
TOP_K_PER_QUERY = 3
MAX_DOCUMENTS_PER_MEDICINE = 8


def attach_retrieval_context(context: dict[str, Any]) -> dict[str, Any]:
    return {
        **context,
        "medicines": [
            {
                **medicine,
                "retrievedDocuments": retrieve_medicine_documents(
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
) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []

    for query in build_retrieval_queries(user_context=user_context, medicine=medicine):
        documents.extend(_retrieve_for_query(medicine_name=medicine["medicineName"], query=query))

    return _dedupe_documents(documents)[:MAX_DOCUMENTS_PER_MEDICINE]


def build_retrieval_queries(
    user_context: dict[str, Any],
    medicine: dict[str, Any],
) -> list[str]:
    medicine_name = medicine["medicineName"]
    disease_names = [
        disease["diseaseName"]
        for disease in user_context["diseases"]
        if disease.get("diseaseName")
    ]
    active_health_flags = _get_active_health_flags(user_context["healthProfile"])
    ingredient_names = [
        ingredient["ingredientName"]
        for ingredient in medicine["ingredients"]
        if ingredient.get("ingredientName")
    ]
    queries = [
        f"{medicine_name} 기저질환 금기 주의",
        f"{medicine_name} 임신 수유 소아 고령 음주 흡연 주의",
        f"{medicine_name} 성분 병용 주의 상호작용",
    ]

    if disease_names:
        queries.append(f"{medicine_name} {' '.join(disease_names)} 복용 주의 금기")

    if active_health_flags:
        queries.append(f"{medicine_name} {' '.join(active_health_flags)} 주의")

    if ingredient_names:
        queries.append(f"{medicine_name} {' '.join(ingredient_names)} 병용 주의 상호작용")

    return _dedupe_strings(queries)


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
        logger.warning("analysis retrieval failed: %s", error)
        return []

    documents = []

    for doc, score in docs_with_scores:
        metadata = doc.metadata or {}
        documents.append(
            {
                "query": query,
                "text": doc.page_content,
                "score": score,
                "medicineId": metadata.get("medicine_id"),
                "documentType": metadata.get("document_type"),
                "sectionTitle": metadata.get("section_title"),
                "sourceName": metadata.get("source_name") or DEFAULT_SOURCE_NAME,
                "sourceUrl": metadata.get("source_url") or DEFAULT_SOURCE_URL,
            }
        )

    return documents


def _get_vector_store() -> QdrantVectorStore:
    return QdrantVectorStore(
        client=get_qdrant_client(),
        collection_name=settings.qdrant_collection_name,
        embedding=OpenAIEmbeddings(model=EMBEDDING_MODEL, api_key=settings.openai_api_key),
        content_payload_key="text",
    )


def _get_active_health_flags(health_profile: dict[str, bool]) -> list[str]:
    labels = {
        "isPregnant": "임신",
        "isBreastfeeding": "수유",
        "isSmoking": "흡연",
        "isDrinking": "음주",
        "isChild": "소아",
        "isElderly": "고령",
    }

    return [label for key, label in labels.items() if health_profile.get(key)]


def _dedupe_documents(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    result = []

    for document in documents:
        key = (document.get("medicineId"), document.get("documentType"), document.get("text"))

        if key in seen:
            continue

        seen.add(key)
        result.append(document)

    return result


def _dedupe_strings(values: list[str]) -> list[str]:
    seen = set()
    result = []

    for value in values:
        if value in seen:
            continue

        seen.add(value)
        result.append(value)

    return result
