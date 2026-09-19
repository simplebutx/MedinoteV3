import json
from typing import Any

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.core.exceptions import ExternalServiceError

CHAT_MODEL = "gpt-4o-mini"


class AnalysisLLMError(ExternalServiceError):
    """처방전 분석 LLM 호출 실패."""


def generate_analysis_with_llm(context: dict[str, Any]) -> str:
    try:
        # 프롬프트 빌드
        raw_result = _build_chain().invoke(
            # 검색 결과 빌드
            {"context": json.dumps(_build_llm_payload(context), ensure_ascii=False)}
        )
    except Exception as error:
        raise AnalysisLLMError("처방전 분석 LLM 호출에 실패했습니다.") from error

    return raw_result


def _build_chain():
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """
너는 처방전의 개인화 복약 주의사항을 분석하는 의료 정보 보조 AI다.
입력으로 제공된 약 이름, 성분, 기저질환명, 건강상태 플래그, 참고 문서 내용만 사용해라.
근거가 부족하면 안전하다고 단정하지 말고, 확인 필요 수준으로 답해라.
관련 참고 문서가 없으면 해당 항목에 직접 연결되는 근거가 없다고 설명하고, 임의로 주의사항을 만들어내지 마라.
healthReferenceTexts가 비어 있으면 HEALTH_STATUS는 safe로 하고 "등록된 건강정보와 직접 연결되는 참고 문서는 확인되지 않았어요."라고 답해라.
diseaseReferenceTexts가 비어 있으면 DISEASE는 safe로 하고 "등록된 기저질환과 직접 연결되는 참고 문서는 확인되지 않았어요."라고 답해라.
진단이나 처방을 단정하지 말고, 필요한 경우 의사 또는 약사 상담을 권장해라.
응답은 한국어 JSON 객체 하나만 반환해라. 마크다운을 사용하지 마라.

각 약은 입력 medicines 배열과 같은 순서로 반환해라.
각 약마다 DISEASE, HEALTH_STATUS, CAUTION_ITEM 체크를 반드시 하나씩 포함해라.
healthReferenceTexts는 건강정보 관련 참고 문서이고, diseaseReferenceTexts는 기저질환 관련 참고 문서다.
severity는 safe 또는 warning 중 하나만 사용해라.
JSON 형식:
{{
  "medicines": [
    {{
      "medicineName": "약 이름",
      "checks": [
        {{
          "type": "DISEASE",
          "severity": "safe|warning",
          "message": "사용자에게 보여줄 짧은 설명"
        }},
        {{
          "type": "HEALTH_STATUS",
          "severity": "safe|warning",
          "message": "사용자에게 보여줄 짧은 설명"
        }},
        {{
          "type": "CAUTION_ITEM",
          "severity": "safe|warning",
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

# 검색 결과 빌드
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
                "healthReferenceTexts": [
                    {
                        "documentType": document.get("documentType"),
                        "sectionTitle": document.get("sectionTitle"),
                        "text": document.get("text"),
                    }
                    for document in medicine.get("healthDocuments", [])
                ],
                "diseaseReferenceTexts": [
                    {
                        "documentType": document.get("documentType"),
                        "sectionTitle": document.get("sectionTitle"),
                        "text": document.get("text"),
                    }
                    for document in medicine.get("diseaseDocuments", [])
                ],
            }
            for medicine in context["medicines"]
        ],
    }
