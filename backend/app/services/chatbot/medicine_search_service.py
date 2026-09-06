import logging
import math
import re

from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore

from app.core.config import settings
from app.db.qdrant import get_qdrant_client
from qdrant_client.models import FieldCondition, Filter, MatchValue

logger = logging.getLogger("uvicorn.error")

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 1536
DEFAULT_SOURCE_NAME = "의약품안전나라"
DEFAULT_SOURCE_URL = "https://nedrug.mfds.go.kr"
VECTOR_SCORE_THRESHOLD = 0.2
HYBRID_VECTOR_WEIGHT = 0.7
HYBRID_LEXICAL_WEIGHT = 0.3
SEMANTIC_KEYWORD_THRESHOLD = 0.55
SEMANTIC_KEYWORD_TOP_K = 5

# 제거표현
STOPWORDS = {
    "이거","그거","이약","약", "의약품", "뭐", "무엇","어떻게",  "왜",  "언제",  "좀",  "알려줘",  "가능한가요",
    "가능한지", "가능", "괜찮은가요",  "괜찮나요",  "괜찮",  "되나요",  "돼요", "되요",  "먹어도", "복용해도",
}

# 조사,어미 제거
TRAILING_PARTICLES = (
    "으로는","에서는", "에게는", "한테는", "과는", "와는","에서","에게","한테","으로","까지","부터","처럼",
    "라도","이라","라면","이면","입니다","인가요","인가","나요","네요","겠죠","해야","해요","은","는",
    "이","가","을","를","에","도","만","과","와",
)

# 질문 엠베딩 -> 검색 -> 반환

# 임베딩 객체 생성
def get_embeddings():
    return OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        dimensions=EMBEDDING_DIMENSIONS,
        api_key=settings.openai_api_key,
        request_timeout=30,
        max_retries=2,
        retry_min_seconds=2,
        retry_max_seconds=10,
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
            "retrieve candidate %s | hybrid_score=%s | vector_score=%s | lexical_score=%s | matched_keywords=%s | matched_semantic_keywords=%s | document_type=%s | medicine_id=%s | text=%s",
            index,
            candidate.get("hybrid_score"),
            candidate.get("vector_score"),
            candidate.get("lexical_score"),
            candidate.get("matched_keywords"),
            candidate.get("matched_semantic_keywords"),
            candidate.get("document_type"),
            candidate.get("medicine_id"),
            candidate.get("text"),
        )

def normalize_text(value: str) -> str:
    return re.sub(r"\s+", "", value.lower())

def normalize_token(token: str) -> str:
    compact = normalize_text(token)

    for suffix in TRAILING_PARTICLES:
        if compact.endswith(suffix) and len(compact) > len(suffix) + 1:
            return compact[: -len(suffix)]

    return compact

# 중복제거
def dedupe_preserve_order(values: list[str]) -> list[str]:
    seen = set()
    result = []

    for value in values:
        if value in seen:
            continue

        seen.add(value)
        result.append(value)

    return result

# 검색에 사용할 핵심 단어 추출
def extract_search_keywords(query: str, medicine_name: str) -> list[str]:
    # 질문을 단어 단위로 분리
    raw_tokens = re.findall(r"[가-힣a-zA-Z0-9]+", query.lower())
    medicine_token = normalize_text(medicine_name)
    keywords = []

    # 제거단어들 제거, 약 이름 제거
    for token in raw_tokens:
        compact = normalize_token(token)

        if not compact:
            continue

        if len(compact) <= 1:
            continue

        if compact in STOPWORDS:
            continue

        if compact == medicine_token:
            continue

        keywords.append(compact)

    return dedupe_preserve_order(keywords)

# 검색된 문서 본문에서 단어들을 추출
def extract_document_tokens(text: str) -> list[str]:
    raw_tokens = re.findall(r"[가-힣a-zA-Z0-9]+", text.lower())
    tokens = []

    for token in raw_tokens:
        compact = normalize_token(token)

        if not compact:
            continue

        if len(compact) <= 1:
            continue

        if compact in STOPWORDS:
            continue

        tokens.append(compact)

    return dedupe_preserve_order(tokens)

# 질문 키워드와 문서 안의 개별 단어가 의미적으로 비슷한지 확인
def cosine_similarity(left: list[float], right: list[float]) -> float:
    dot_product = sum(
        left_value * right_value
        for left_value, right_value in zip(left, right, strict=True)
    )
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))

    if left_norm == 0 or right_norm == 0:
        return 0.0

    return dot_product / (left_norm * right_norm)

# 질문 키워드와 문서 안의 단어가 의미적으로 비슷한지 찾아주는 함수
def build_semantic_keyword_map(
    query_keywords: list[str],
    candidates: list[dict],
) -> dict[str, list[str]]:
    if not query_keywords or not candidates:
        return {}

    # 모든 후보문서의 단어들을 하나로 합침 (중복제거)
    document_tokens = dedupe_preserve_order([
        token
        for candidate in candidates
        for token in extract_document_tokens(candidate.get("text") or "")
    ])

    if not document_tokens:
        return {}

    # 질문 키워드와 문서 단어들을 전부 벡터로 변환
    try:
        embeddings = get_embeddings().embed_documents(query_keywords + document_tokens)
    except Exception as error:
        logger.warning("semantic keyword expansion failed: %s", error)
        return {}

    # 질문키워드 임베딩결과
    query_embeddings = embeddings[: len(query_keywords)]
    # 문서키워드 임베딩결과
    document_embeddings = embeddings[len(query_keywords):]
    semantic_keyword_map = {}

    # 결과 비교
    for keyword, keyword_embedding in zip(query_keywords, query_embeddings, strict=True):
        scored_tokens = []

        # 질문키워드 임베딩결과와 문서키워드 임베딩결과 묶기
        for document_token, document_embedding in zip(
            document_tokens,
            document_embeddings,
            strict=True,
        ):
            # 유사도 비교
            similarity = cosine_similarity(keyword_embedding, document_embedding)

            if similarity < SEMANTIC_KEYWORD_THRESHOLD:
                continue

            scored_tokens.append((document_token, similarity))

        # 유사도 점수가 높은 문서 단어를 골라서 저장
        scored_tokens.sort(key=lambda item: item[1], reverse=True)
        semantic_keyword_map[keyword] = [
            token
            for token, _ in scored_tokens[:SEMANTIC_KEYWORD_TOP_K]
        ]

    return semantic_keyword_map

# 검색된 문서 안에 질문의 키워드가 얼마나 포함되어 있는지 점수화
def calculate_lexical_score(
    text: str,
    query_keywords: list[str],
    semantic_keyword_map: dict[str, list[str]],
) -> tuple[float, list[str], list[str]]:
    if not query_keywords:
        return 0.0, [], []

    normalized_text = normalize_text(text)
    semantic_keywords = dedupe_preserve_order([
        keyword
        for keywords in semantic_keyword_map.values()
        for keyword in keywords
    ])
    matched_keywords = [
        keyword
        for keyword in query_keywords
        if keyword in normalized_text
    ]
    matched_semantic_keywords = [
        keyword
        for keyword in semantic_keywords
        if keyword in normalized_text and keyword not in matched_keywords
    ]
    exact_score = len(matched_keywords)
    semantic_score = len(matched_semantic_keywords) * 0.7
    lexical_score = min(
        (exact_score + semantic_score) / max(len(query_keywords), 1),
        1.0,
    )

    return lexical_score, matched_keywords, matched_semantic_keywords

# 벡터 검색 점수와 키워드 일치 점수를 합쳐서 문서 순위를 다시 정하는 함수
def apply_hybrid_scores(
    candidates: list[dict],
    query: str,
    medicine_name: str,
) -> list[dict]:
    # 검색에 사용할 핵심 단어 추출
    query_keywords = extract_search_keywords(query, medicine_name)
    # 질문 키워드와 문서 안의 단어가 의미적으로 비슷한지
    semantic_keyword_map = build_semantic_keyword_map(query_keywords, candidates)

    logger.info(
        "hybrid retrieval keywords=%s | semantic_keyword_map=%s",
        query_keywords,
        semantic_keyword_map,
    )

    scored_candidates = []

    for candidate in candidates:
        # 문서안에 질문키워드 포함 점수 계산
        lexical_score, matched_keywords, matched_semantic_keywords = calculate_lexical_score(
            text=candidate.get("text") or "",
            query_keywords=query_keywords,
            semantic_keyword_map=semantic_keyword_map,
        )
        vector_score = candidate.get("vector_score") or 0.0

        # 종합점수
        hybrid_score = (
            vector_score * HYBRID_VECTOR_WEIGHT
            + lexical_score * HYBRID_LEXICAL_WEIGHT
        )

        # 결과 리스트화
        scored_candidates.append({
            **candidate,
            "hybrid_score": hybrid_score,
            "lexical_score": lexical_score,
            "matched_keywords": matched_keywords,
            "matched_semantic_keywords": matched_semantic_keywords,
        })

    # 재정렬
    scored_candidates.sort(
        key=lambda candidate: (
            candidate.get("hybrid_score") or 0.0,
            candidate.get("vector_score") or 0.0,
        ),
        reverse=True,
    )

    return scored_candidates


# 메인함수
def retrieve_candidates(medicine_name: str, query: str, top_k: int = 5):
    vector_store = get_vector_store()

    candidate_k = max(top_k * 4, 20)

    # Document 내부: page_content, metadata
    # 리턴값: list[tuple[Document, float]] 
    # 튜플: (doc 객체, score)

    # 쿼리전체 - 문서전체 임베딩 비교
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

    # 각 청크를 dict로 저장
    # vector score: 질문 벡터와 문서 벡터 비교 점수 (by Qdrant)
    for doc, score in docs_with_scores:
        if score < VECTOR_SCORE_THRESHOLD:
            continue
        metadata = doc.metadata or {}

        candidates.append({
            "text": doc.page_content,
            "vector_score": score,
            "medicine_id": metadata.get("medicine_id"),
            "document_type": metadata.get("document_type"),
            "source_name": metadata.get("source_name") or DEFAULT_SOURCE_NAME,
            "source_url": metadata.get("source_url") or DEFAULT_SOURCE_URL,
        })


    scored_candidates = apply_hybrid_scores(
        candidates=candidates,
        query=query,
        medicine_name=medicine_name,
    )

    return scored_candidates[:top_k]

# candidates: List[dict[str, object]]
