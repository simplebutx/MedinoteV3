import re
from difflib import SequenceMatcher
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.medicine_info import MedicineInfo

MIN_MATCH_SCORE = 0.9
MAX_CANDIDATES = 10


def match_medicines_with_db(result: dict[str, Any], db: Session) -> dict[str, Any]:
    medicines = result.get("medicines")
    if not isinstance(medicines, list):
        return result

    matched_medicines = []

    for medicine in medicines:
        if not isinstance(medicine, dict):
            continue

        # 추출약이름 공백제거
        medicine_name = str(medicine.get("customMedicineName") or "").strip()
        # DB에서 가장 유사한 약 찾기
        matched_medicine = find_best_medicine_match(db=db, medicine_name=medicine_name)

        # 매칭 성공 시 itemSeq만 채우고, LLM 추출 이름은 사용자 확인용으로 유지
        if matched_medicine:
            medicine = {
                **medicine,
                "itemSeq": matched_medicine.item_seq,
                "matchedMedicineName": matched_medicine.item_name,
            }

        matched_medicines.append(medicine)

    return {
        **result,
        "medicines": matched_medicines,
    }


def find_best_medicine_match(
    db: Session,
    medicine_name: str,
) -> MedicineInfo | None:
    normalized_query = normalize_medicine_name(medicine_name)
    if not normalized_query:
        return None

    candidates = search_medicine_candidates(db=db, medicine_name=medicine_name)
    if not candidates:
        return None

    best_medicine = None
    best_score = 0.0

    for candidate in candidates:
        candidate_name = candidate.item_name or ""
        score = calculate_match_score(normalized_query, candidate_name)

        if score > best_score:
            best_score = score
            best_medicine = candidate

    if best_score < MIN_MATCH_SCORE:
        return None

    return best_medicine


def search_medicine_candidates(
    db: Session,
    medicine_name: str,
) -> list[MedicineInfo]:
    keyword = medicine_name.strip()
    normalized_keyword = normalize_medicine_name(keyword)

    # like 검색
    stmt = (
        select(MedicineInfo)
        .where(MedicineInfo.item_name.is_not(None))
        .where(MedicineInfo.item_name.like(f"%{keyword}%"))
        .limit(MAX_CANDIDATES)
    )
    candidates = list(db.scalars(stmt).all())

    if candidates:
        return candidates

    if not normalized_keyword:
        return []

    # 이름 앞부분만 잘라서 재검색
    short_keyword = normalized_keyword[: max(2, min(len(normalized_keyword), 4))]
    fallback_stmt = (
        select(MedicineInfo)
        .where(MedicineInfo.item_name.is_not(None))
        .where(MedicineInfo.item_name.like(f"%{short_keyword}%"))
        .limit(MAX_CANDIDATES)
    )

    return list(db.scalars(fallback_stmt).all())

# 매칭 유사도 점수 계산
def calculate_match_score(
    normalized_query: str,
    candidate_name: str,
) -> float:
    normalized_candidate = normalize_medicine_name(candidate_name)
    if not normalized_candidate:
        return 0.0

    if normalized_query == normalized_candidate:
        return 1.0

    if normalized_query in normalized_candidate:
        return 0.95

    if normalized_candidate in normalized_query:
        return 0.9

    return SequenceMatcher(None, normalized_query, normalized_candidate).ratio()


def normalize_medicine_name(value: str) -> str:
    normalized = value.lower()
    normalized = re.sub(r"\([^)]*\)", "", normalized)
    normalized = re.sub(r"\[[^\]]*\]", "", normalized)
    normalized = normalized.replace("그램", "그람")
    normalized = re.sub(r"[^0-9a-z가-힣]+", "", normalized)

    return normalized
