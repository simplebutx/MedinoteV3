import json
import logging
from typing import Any

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

CHAT_MODEL = "gpt-4o-mini"
CHECK_TYPES = ("DISEASE", "HEALTH_STATUS", "CAUTION_ITEM")
SEVERITIES = ("safe", "caution", "warning")


def generate_analysis_with_llm(context: dict[str, Any]) -> dict[str, Any]:
    try:
        raw_result = _build_chain().invoke(
            {"context": json.dumps(_build_llm_payload(context), ensure_ascii=False)}
        )
        parsed_result = json.loads(raw_result)
    except Exception as error:
        logger.warning("analysis llm generation failed: %s", error)
        return build_fallback_result(context)

    return normalize_analysis_result(parsed_result, context)


def _build_chain():
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """
너는 처방전의 개인화 복약 주의사항을 분석하는 의료 정보 보조 AI다.
입력으로 제공된 약 이름, 성분, 기저질환명, 건강상태 플래그만 사용해라.
근거가 부족하면 안전하다고 단정하지 말고, 확인 필요 수준으로 답해라.
진단이나 처방을 단정하지 말고, 필요한 경우 의사 또는 약사 상담을 권장해라.
응답은 한국어 JSON 객체 하나만 반환해라. 마크다운을 사용하지 마라.

각 약은 입력 medicines 배열과 같은 순서로 반환해라.
각 약마다 DISEASE, HEALTH_STATUS, CAUTION_ITEM 체크를 반드시 하나씩 포함해라.
severity는 safe, caution, warning 중 하나만 사용해라.

JSON 형식:
{{
  "summary": {{
    "title": "총정리",
    "message": "전체 결과 요약"
  }},
  "medicines": [
    {{
      "medicineName": "약 이름",
      "checks": [
        {{
          "type": "DISEASE",
          "title": "기저질환과의 관련성",
          "severity": "safe|caution|warning",
          "message": "사용자에게 보여줄 짧은 설명"
        }},
        {{
          "type": "HEALTH_STATUS",
          "title": "건강상태 기반 주의",
          "severity": "safe|caution|warning",
          "message": "사용자에게 보여줄 짧은 설명"
        }},
        {{
          "type": "CAUTION_ITEM",
          "title": "주의 약/성분 매칭",
          "severity": "safe|caution|warning",
          "message": "주의 약/성분 목록은 입력되지 않았으므로 직접 매칭했다고 말하지 마라"
        }}
      ]
    }}
  ]
}}
""",
            ),
            ("human", "분석 컨텍스트:\n{context}"),
        ]
    )

    return prompt | _get_chat_model() | StrOutputParser()


def _get_chat_model() -> ChatOpenAI:
    return ChatOpenAI(
        model=CHAT_MODEL,
        api_key=settings.openai_api_key,
        temperature=0,
    )


def _build_llm_payload(context: dict[str, Any]) -> dict[str, Any]:
    return {
        "user": {
            "diseases": [
                disease["diseaseName"]
                for disease in context["user"]["diseases"]
                if disease.get("diseaseName")
            ],
            "healthProfile": context["user"]["healthProfile"],
        },
        "medicines": [
            {
                "medicineName": medicine["medicineName"],
                "ingredients": [
                    {
                        "ingredientName": ingredient.get("ingredientName"),
                        "quantity": ingredient.get("quantity"),
                        "unit": ingredient.get("unit"),
                    }
                    for ingredient in medicine["ingredients"]
                ],
            }
            for medicine in context["medicines"]
        ],
    }


def normalize_analysis_result(
    result: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    result_medicines = result.get("medicines") or []

    if len(result_medicines) != len(context["medicines"]):
        return build_fallback_result(context)

    medicines = [
        _normalize_medicine_result(result_medicine, source_medicine)
        for result_medicine, source_medicine in zip(
            result_medicines,
            context["medicines"],
            strict=True,
        )
    ]
    summary = result.get("summary") or {}

    return {
        "summary": {
            "title": summary.get("title") or "총정리",
            "message": summary.get("message") or _build_summary_message(medicines),
        },
        "medicines": medicines,
    }


def build_fallback_result(context: dict[str, Any]) -> dict[str, Any]:
    medicines = [
        {
            "scheduleMedicineId": medicine["scheduleMedicineId"],
            "medicineName": medicine["medicineName"],
            "dosageAmount": medicine.get("dosageAmount"),
            "dosageUnit": medicine.get("dosageUnit"),
            "checks": _build_fallback_checks(medicine),
        }
        for medicine in context["medicines"]
    ]

    return {
        "summary": {
            "title": "총정리",
            "message": _build_summary_message(medicines),
        },
        "medicines": medicines,
    }


def _normalize_medicine_result(
    result_medicine: dict[str, Any],
    source_medicine: dict[str, Any],
) -> dict[str, Any]:
    checks = _normalize_checks(
        checks=result_medicine.get("checks") or [],
        source_medicine=source_medicine,
    )

    return {
        "scheduleMedicineId": source_medicine["scheduleMedicineId"],
        "medicineName": result_medicine.get("medicineName") or source_medicine["medicineName"],
        "dosageAmount": source_medicine.get("dosageAmount"),
        "dosageUnit": source_medicine.get("dosageUnit"),
        "checks": checks,
    }


def _normalize_checks(
    checks: list[dict[str, Any]],
    source_medicine: dict[str, Any],
) -> list[dict[str, Any]]:
    checks_by_type = {
        check.get("type"): check
        for check in checks
        if check.get("type") in CHECK_TYPES
    }
    fallback_checks = {
        check["type"]: check
        for check in _build_fallback_checks(source_medicine)
    }
    normalized = []

    for check_type in CHECK_TYPES:
        if check_type == "CAUTION_ITEM":
            normalized.append(fallback_checks[check_type])
            continue

        check = checks_by_type.get(check_type) or {}
        fallback = fallback_checks[check_type]
        severity = check.get("severity")

        normalized.append(
            {
                "type": check_type,
                "title": check.get("title") or fallback["title"],
                "severity": severity if severity in SEVERITIES else fallback["severity"],
                "message": check.get("message") or fallback["message"],
                "evidence": source_medicine.get("retrievedDocuments", []),
            }
        )

    return normalized


def _build_fallback_checks(medicine: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "type": "DISEASE",
            "title": "기저질환과의 관련성",
            "severity": "caution",
            "message": (
                f"{medicine['medicineName']}이 사용자가 등록한 질환과 관련해 "
                "복용 전 확인이 필요한 약인지 점검합니다."
            ),
            "evidence": medicine.get("retrievedDocuments", []),
        },
        {
            "type": "HEALTH_STATUS",
            "title": "건강상태 기반 주의",
            "severity": "caution",
            "message": "임신, 수유, 흡연, 음주, 소아, 고령 여부에 따라 이 약에 추가 주의가 필요한지 확인합니다.",
            "evidence": medicine.get("retrievedDocuments", []),
        },
        _build_caution_item_check(medicine),
    ]


def _build_caution_item_check(medicine: dict[str, Any]) -> dict[str, Any]:
    matched_names = _find_caution_matches(
        caution_items=medicine.get("cautionItems", []),
        medicine=medicine,
    )

    if matched_names:
        return {
            "type": "CAUTION_ITEM",
            "title": "주의 약/성분 매칭",
            "severity": "warning",
            "message": f"등록한 주의 약/성분 중 {', '.join(matched_names)} 항목과 관련이 있어요.",
            "evidence": medicine.get("retrievedDocuments", []),
        }

    return {
        "type": "CAUTION_ITEM",
        "title": "주의 약/성분 매칭",
        "severity": "safe",
        "message": "등록한 주의 약/성분 목록과 직접 일치하는 항목은 확인되지 않았어요.",
        "evidence": medicine.get("retrievedDocuments", []),
    }


def _find_caution_matches(
    caution_items: list[dict[str, Any]],
    medicine: dict[str, Any],
) -> list[str]:
    medicine_item_seq = medicine.get("itemSeq")
    ingredient_codes = {
        ingredient.get("ingredientCode")
        for ingredient in medicine.get("ingredients", [])
        if ingredient.get("ingredientCode")
    }
    ingredient_names = {
        ingredient.get("ingredientName")
        for ingredient in medicine.get("ingredients", [])
        if ingredient.get("ingredientName")
    }
    matches = []

    for caution_item in caution_items:
        if caution_item.get("targetType") == "MEDICINE":
            if caution_item.get("itemSeq") == medicine_item_seq:
                matches.append(caution_item.get("itemName") or medicine["medicineName"])
            continue

        if (
            caution_item.get("ingredientCode") in ingredient_codes
            or caution_item.get("ingredientName") in ingredient_names
        ):
            matches.append(caution_item.get("ingredientName"))

    return [name for name in matches if name]


def _build_summary_message(medicines: list[dict[str, Any]]) -> str:
    return (
        f"{len(medicines)}개 약을 개인 정보 기준으로 점검했어요. "
        "아래 약별 분석에서 표시된 주의 항목을 먼저 살펴보세요."
    )
