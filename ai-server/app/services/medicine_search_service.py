from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore

from app.core.config import settings
from app.db.qdrant import get_qdrant_client
from qdrant_client.models import FieldCondition, Filter, MatchValue
import logging

logger = logging.getLogger("uvicorn.error")

EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_SOURCE_NAME = "의약품안전나라"
DEFAULT_SOURCE_URL = "https://nedrug.mfds.go.kr"

# 질문 엠베딩 -> 검색 -> 반환

# 임베딩 객체 생성
def get_embeddings():
    return OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        api_key=settings.openai_api_key,
    )

# Qdrant VectorStore 객체: 검색기 객체 - 벡터 컬렉션 연결
def get_vector_store():
    return QdrantVectorStore(
        client=get_qdrant_client(),
        collection_name=settings.qdrant_collection_name,
        embedding=get_embeddings(),
        content_payload_key="text",
    )

def log_candidates(candidates: list[dict]) -> None:
    logger.info("retrieve candidates count=%s", len(candidates))

    for index, candidate in enumerate(candidates, start=1):
        logger.info(
            "retrieve candidate %s | vector_score=%s | document_type=%s | medicine_id=%s | text=%s",
            index,
            candidate.get("vector_score"),
            candidate.get("document_type"),
            candidate.get("medicine_id"),
            candidate.get("text"),
        )


# 메인함수
def retrieve_candidates(medicine_name: str, query: str, top_k: int = 5):
    vector_store = get_vector_store()

    candidate_k = max(top_k * 6, 30)

    # Document 내부: page_content, metadata
    # 리턴값: list[tuple[Document, float]] 
    # 튜플: (doc 객체, score)
    docs_with_scores = vector_store.similarity_search_with_score(
    query=query,
    k=candidate_k,
    filter=Filter(
        must=[
            FieldCondition(
                key="metadata.medicine_name",
                match=MatchValue(value=medicine_name),
            )
        ]
    ),
    )

    candidates = []

    for doc, score in docs_with_scores:
        metadata = doc.metadata or {}

        candidates.append({
            "text": doc.page_content,
            "vector_score": score,
            "medicine_id": metadata.get("medicine_id"),
            "document_type": metadata.get("document_type"),
            "source_name": metadata.get("source_name") or DEFAULT_SOURCE_NAME,
            "source_url": metadata.get("source_url") or DEFAULT_SOURCE_URL,
        })

    return candidates

# candidates: List[dict[str, object]]
