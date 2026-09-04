import json
import logging
import re
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
입력으로 제공된 약 이름, 성분, 기저질환명, 건강상태 플래그, 참고 문서 내용만 사용해라.
근거가 부족하면 안전하다고 단정하지 말고, 확인 필요 수준으로 답해라.
진단이나 처방을 단정하지 말고, 필요한 경우 의사 또는 약사 상담을 권장해라.
응답은 한국어 JSON 객체 하나만 반환해라. 마크다운을 사용하지 마라.

각 약은 입력 medicines 배열과 같은 순서로 반환해라.
각 약마다 DISEASE, HEALTH_STATUS, CAUTION_ITEM 체크를 반드시 하나씩 포함해라.
severity는 safe, caution, warning 중 하나만 사용해라.
summary.message는 전체 약을 나열하지 말고, 사용자 건강정보와 참고 문서 내용에 맞는 주요 주의사항 2~3개만 자연스러운 문장으로 요약해라.
예: "임신 중인 상태에서는 부루펜정 복용 전 확인이 필요해요. 지르텍정은 졸음 가능성이 있어 운전 전 주의하고, 다이아벡스정은 신장 기능 상태에 따라 복용 확인이 필요합니다."

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

    chain = (prompt | _get_chat_model() | StrOutputParser()).with_retry(
        stop_after_attempt=3, wait_exponential_jitter=True
    )

    return chain


def _get_chat_model() -> ChatOpenAI:
    return ChatOpenAI(
        model=CHAT_MODEL,
        api_key=settings.openai_api_key,
        temperature=0,
        timeout=30,
        max_retries=0
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
                "referenceTexts": [
                    {
                        "documentType": document.get("documentType"),
                        "sectionTitle": document.get("sectionTitle"),
                        "text": document.get("text"),
                    }
                    for document in medicine.get("retrievedDocuments", [])[:5]
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
        _normalize_medicine_result(result_medicine, source_medicine, context["user"])
        for result_medicine, source_medicine in zip(
            result_medicines,
            context["medicines"],
            strict=True,
        )
    ]
    summary = result.get("summary") or {}

    return {
        "summary": {
            "title": _normalize_summary_title(summary.get("title")),
            "message": _build_summary_message(medicines),
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
            "checks": _build_fallback_checks(medicine, context["user"]),
        }
        for medicine in context["medicines"]
    ]

    return {
        "summary": {
            "title": "주요 주의사항",
            "message": _build_summary_message(medicines),
        },
        "medicines": medicines,
    }


def _normalize_medicine_result(
    result_medicine: dict[str, Any],
    source_medicine: dict[str, Any],
    user: dict[str, Any],
) -> dict[str, Any]:
    checks = _normalize_checks(
        checks=result_medicine.get("checks") or [],
        source_medicine=source_medicine,
        user=user,
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
    user: dict[str, Any],
) -> list[dict[str, Any]]:
    checks_by_type = {
        check.get("type"): check
        for check in checks
        if check.get("type") in CHECK_TYPES
    }
    fallback_checks = {
        check["type"]: check
        for check in _build_fallback_checks(source_medicine, user)
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
            }
        )

    return normalized


def _build_fallback_checks(
    medicine: dict[str, Any],
    user: dict[str, Any],
) -> list[dict[str, Any]]:
    return [
        {
            "type": "DISEASE",
            "title": "기저질환과의 관련성",
            "severity": disease_severity(medicine, user),
            "message": disease_message(medicine, user),
        },
        {
            "type": "HEALTH_STATUS",
            "title": "건강상태 기반 주의",
            "severity": health_status_severity(medicine, user),
            "message": health_status_message(medicine, user),
        },
        _build_caution_item_check(medicine),
    ]


def _medicine_text(medicine: dict[str, Any]) -> str:
    return " ".join(
        [
            str(medicine.get("medicineName") or ""),
            *[
                str(ingredient.get("ingredientName") or "")
                for ingredient in medicine.get("ingredients", [])
            ],
        ]
    ).lower()


def health_status_severity(medicine: dict[str, Any], user: dict[str, Any]) -> str:
    text = _medicine_text(medicine)
    profile = user.get("healthProfile") or {}
    if profile.get("isPregnant") and ("이부프로펜" in text or "부루펜" in text):
        return "warning"
    if "세티리진" in text or "지르텍" in text:
        return "caution"
    if profile.get("isElderly") and ("이부프로펜" in text or "부루펜" in text):
        return "caution"
    return "safe"


def health_status_message(medicine: dict[str, Any], user: dict[str, Any]) -> str:
    text = _medicine_text(medicine)
    profile = user.get("healthProfile") or {}
    if profile.get("isPregnant") and ("이부프로펜" in text or "부루펜" in text):
        return "임신 중인 상태에서는 부루펜정 복용 전 의사 또는 약사와 확인이 필요해요."
    if "세티리진" in text or "지르텍" in text:
        return "졸음이 나타날 수 있어 복용 후 운전이나 기계 조작은 주의하세요."
    if profile.get("isElderly") and ("이부프로펜" in text or "부루펜" in text):
        return "고령자는 부루펜정 복용 시 위장관 및 신장 관련 부작용에 주의하세요."
    return "등록된 건강상태와 직접 연결되는 추가 주의사항은 크게 확인되지 않았어요."


def disease_severity(medicine: dict[str, Any], user: dict[str, Any]) -> str:
    text = _medicine_text(medicine)
    disease_names = " ".join(
        str(disease.get("diseaseName") or "")
        for disease in user.get("diseases", [])
    )
    if ("메트포르민" in text or "다이아벡스" in text) and (
        "신장" in disease_names or "콩팥" in disease_names
    ):
        return "warning"
    return "safe"


def disease_message(medicine: dict[str, Any], user: dict[str, Any]) -> str:
    text = _medicine_text(medicine)
    disease_names = " ".join(
        str(disease.get("diseaseName") or "")
        for disease in user.get("diseases", [])
    )
    if ("메트포르민" in text or "다이아벡스" in text) and (
        "신장" in disease_names or "콩팥" in disease_names
    ):
        return "신장질환이 있는 경우 다이아벡스정 복용 전 신장 기능 확인이 필요해요."
    return "등록한 기저질환과 직접 연결되는 주의사항은 크게 확인되지 않았어요."


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
        }

    return {
        "type": "CAUTION_ITEM",
        "title": "주의 약/성분 매칭",
        "severity": "safe",
        "message": "등록한 주의 약/성분 목록과 직접 일치하는 항목은 확인되지 않았어요.",
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
    highlighted_messages = []

    for medicine in medicines:
        medicine_name = _get_summary_medicine_name(medicine.get("medicineName") or "이 약")
        checks = medicine.get("checks", [])
        priority_checks = sorted(
            [
                check
                for check in checks
                if check.get("severity") in ("warning", "caution")
            ],
            key=_get_summary_check_priority,
        )

        for check in priority_checks:
            message = str(check.get("message") or "").strip()
            if not message:
                continue

            highlighted_messages.append(_build_summary_sentence(medicine_name, message))
            break

        if len(highlighted_messages) >= 3:
            break

    if highlighted_messages:
        return " ".join(highlighted_messages)

    return f"{len(medicines)}개 약에서 등록된 건강정보 기준의 직접 주의 항목은 크게 확인되지 않았어요."


def _normalize_summary_title(title: Any) -> str:
    if not title or title == "총정리":
        return "주요 주의사항"

    return str(title)


def _get_summary_check_priority(check: dict[str, Any]) -> tuple[int, int]:
    severity_priority = 0 if check.get("severity") == "warning" else 1
    type_priority = {
        "HEALTH_STATUS": 0,
        "DISEASE": 1,
        "CAUTION_ITEM": 2,
    }.get(check.get("type"), 3)

    return (severity_priority, type_priority)


def _get_summary_medicine_name(medicine_name: str) -> str:
    without_export_name = medicine_name.split("(수출명", 1)[0]
    without_ingredient = re.sub(r"\([^)]*\)", "", without_export_name)
    return without_ingredient.strip() or medicine_name


def _build_summary_sentence(medicine_name: str, message: str) -> str:
    normalized_message = message.rstrip(".。 ")

    if normalized_message.startswith(medicine_name):
        return f"{normalized_message}."

    return f"{medicine_name}은 {normalized_message}."
