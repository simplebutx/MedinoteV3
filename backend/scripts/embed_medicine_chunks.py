# 임베딩 -> db 저장

import json
import uuid
from pathlib import Path

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client.models import Distance, VectorParams

from app.core.config import settings
from app.db.qdrant import get_qdrant_client

EMBEDDING_SIZE = 1536
CHUNKS_PATH = Path("data/processed/medicine_chunks.jsonl")
EMBEDDING_MODEL = "text-embedding-3-small"
# 한번에 임베딩할 청크 수
BATCH_SIZE = 100

# collection 생성
def create_collection():
    client = get_qdrant_client()

    if client.collection_exists(settings.qdrant_collection_name):
        print(f"Collection already exists: {settings.qdrant_collection_name}")
        return

    client.create_collection(
        collection_name=settings.qdrant_collection_name,
        vectors_config=VectorParams(
            size=EMBEDDING_SIZE,
            distance=Distance.COSINE,
        )
    )

    print(f"Created collection: {settings.qdrant_collection_name}")

# JSONL에서 청크 하나씩 꺼내기
def load_chunks():
    with CHUNKS_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            chunk = json.loads(line)
            text = chunk.get("text", "").strip()

            if not text:
                continue

            yield chunk

# point 별 고유 ID 생성
def chunk_to_point_id(chunk):
    raw_id = "|".join(
        [
            str(chunk.get("medicine_id", "")),
            str(chunk.get("document_type", "")),
            str(chunk.get("chunk_index", "")),
            str(chunk.get("section_chunk_index", "")),
        ]
    )

    return str(uuid.uuid5(uuid.NAMESPACE_URL, raw_id))

# 임베딩 객체 생성
def get_embeddings():
    return OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        api_key=settings.openai_api_key,
    )


def get_vector_store():
    return QdrantVectorStore(
        client=get_qdrant_client(),
        collection_name=settings.qdrant_collection_name,
        embedding=get_embeddings(),
        content_payload_key="text",
        metadata_payload_key="metadata",
    )

# 청크 하나를 Document 객체로 변환
def chunk_to_document(chunk):
    metadata = {
        key: value
        for key, value in chunk.items()
        if key != "text"
    }
    metadata["embedding_model"] = EMBEDDING_MODEL

    return Document(
        page_content=chunk["text"],
        metadata=metadata,
    )


# 청크 여러개를 한묶음으로 qdrant에 저장
def add_document_batch(vector_store, chunks):
    documents = [chunk_to_document(chunk) for chunk in chunks]
    ids = [chunk_to_point_id(chunk) for chunk in chunks]

    vector_store.add_documents(
        documents=documents,
        ids=ids,
    )

    return len(documents)


# 메인함수
def embed_and_store_chunks():
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is empty.")

    create_collection()

    vector_store = get_vector_store()

    batch = []
    total_count = 0

    # jsonl에서 청크 하나씩 읽어서 배치에 담기
    for chunk in load_chunks():
        batch.append(chunk)

        if len(batch) >= BATCH_SIZE:
            total_count += add_document_batch(vector_store, batch)
            print(f"Upserted {total_count} chunks")
            batch = []

    if batch:
        total_count += add_document_batch(vector_store, batch)
        print(f"Upserted {total_count} chunks")

    print(f"Done. Total upserted chunks: {total_count}")



if __name__ == "__main__":
    embed_and_store_chunks()
