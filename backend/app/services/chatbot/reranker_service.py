from langchain_community.document_compressors.flashrank_rerank import FlashrankRerank
from langchain_core.documents import Document
import logging

logger = logging.getLogger("uvicorn.error")

RERANK_MODEL = "ms-marco-MultiBERT-L-12"
DEFAULT_RERANK_TOP_N = 5
DEFAULT_RERANK_SCORE_THRESHOLD = 0.2  # 제거 기준점 (정확도)


def get_reranker(
    top_n: int = DEFAULT_RERANK_TOP_N,
    score_threshold: float = DEFAULT_RERANK_SCORE_THRESHOLD,
):
    return FlashrankRerank(
        model=RERANK_MODEL,
        top_n=top_n,
        score_threshold=score_threshold,
        prefix_metadata="rerank_",
    )

def log_reranked_candidates(reranked_candidates: list[dict]) -> None:
    logger.info("reranked candidates count=%s", len(reranked_candidates))

    for index, candidate in enumerate(reranked_candidates, start=1):
        logger.info(
            "reranked candidate %s | score=%s | rerank_score=%s | vector_score=%s | document_type=%s | medicine_id=%s | text=%s",
            index,
            candidate.get("score"),
            candidate.get("rerank_score"),
            candidate.get("vector_score"),
            candidate.get("document_type"),
            candidate.get("medicine_id"),
            candidate.get("text"),
        )

# 메인함수
def rerank_candidates(
    query: str,
    candidates: list[dict],
    top_n: int = DEFAULT_RERANK_TOP_N,
    score_threshold: float = DEFAULT_RERANK_SCORE_THRESHOLD,
) -> list[dict]:

    docs = []

    for candidate in candidates:
        docs.append(
            Document(
                page_content=candidate["text"],
                metadata={
                    **candidate,
                },
            )
        )

    reranker = get_reranker(
        top_n=top_n,
        score_threshold=score_threshold,
    )

    # rerank score 계산, 정렬, n개 반환
    reranked_docs = reranker.compress_documents(
        documents=docs,
        query=query,
    )

    reranked_candidates = []

    for doc in reranked_docs:
        metadata = doc.metadata or {}
        rerank_score = metadata.get("rerank_relevance_score")
        vector_score = metadata.get("vector_score")

        reranked_candidates.append({
            "text": doc.page_content,
            "score": rerank_score if rerank_score is not None else vector_score or 0.0,
            "rerank_score": rerank_score,
            "vector_score": vector_score,
            "medicine_id": metadata.get("medicine_id"),
            "document_type": metadata.get("document_type"),
            "source_name": metadata.get("source_name"),
            "source_url": metadata.get("source_url"),
        })

    return reranked_candidates