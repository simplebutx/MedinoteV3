# 약이름 자동완성

import json
from functools import lru_cache
from pathlib import Path

CHUNKS_PATH = Path(__file__).resolve().parents[2] / "data" / "processed" / "medicine_chunks.jsonl"


def normalize_medicine_name(value: str) -> str:
    return "".join(value.lower().split())


@lru_cache(maxsize=1)
def load_medicine_catalog() -> list[dict]:
    medicines_by_id: dict[str, dict] = {}

    if not CHUNKS_PATH.exists():
        return []

    with CHUNKS_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            chunk = json.loads(line)
            medicine_id = str(chunk.get("medicine_id") or "").strip()
            medicine_name = str(chunk.get("medicine_name") or "").strip()

            if not medicine_id or not medicine_name:
                continue

            medicines_by_id[medicine_id] = {
                "medicine_id": medicine_id,
                "medicine_name": medicine_name,
            }

    return sorted(
        medicines_by_id.values(),
        key=lambda medicine: medicine["medicine_name"],
    )


def suggest_medicines(query: str, limit: int = 10) -> list[dict]:
    normalized_query = normalize_medicine_name(query)

    if not normalized_query:
        return []

    prefix_matches = []
    contains_matches = []

    for medicine in load_medicine_catalog():
        normalized_name = normalize_medicine_name(medicine["medicine_name"])

        if normalized_name.startswith(normalized_query):
            prefix_matches.append(medicine)
        elif normalized_query in normalized_name:
            contains_matches.append(medicine)

    return (prefix_matches + contains_matches)[:limit]
