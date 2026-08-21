# 질문 엠베딩 -> 검색 -> 반환

from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore

from app.core.config import settings
from app.db.qdrant import get_qdrant_client
from qdrant_client.models import FieldCondition, Filter, MatchValue

EMBEDDING_MODEL = "text-embedding-3-small"

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

# 검색
def search_medicines(medicine_name: str, query: str, top_k: int = 5):
    vector_store = get_vector_store()

    docs_with_scores = vector_store.similarity_search_with_score(
        query=query,
        k=top_k,
        filter=Filter(
            must=[
                FieldCondition(
                    key="metadata.medicine_name",
                    match=MatchValue(value=medicine_name),
                )
            ]
        ),
    )

    results = []

    for doc, score in docs_with_scores:
        metadata = doc.metadata or {}

        results.append({
            "text": doc.page_content,
            "score": score,
            "medicine_id": metadata.get("medicine_id"),
            "document_type": metadata.get("document_type"),
        })

    return results
