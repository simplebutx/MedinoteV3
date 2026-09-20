import logging
from datetime import date
from typing import Annotated, Any

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from app.crud.schedule import get_daily_medications, get_schedule_model, get_schedules
from app.crud.user_health import get_health_profile
from app.services.chatbot.chat_graph_service import answer_question_with_graph
from app.services.analysis.analysis_service import generate_prescription_analysis
from app.crud.user_caution import get_user_cautions
from app.crud.user_disease import get_user_disease
from app.schemas.user_disease_schema import UserDiseaseResponse

logger = logging.getLogger("uvicorn.error")


@tool
def answer_medicine_question(
        medicine_name: str,
        question: str,
) -> dict:
    """
    의약품의 효능, 복용법, 부작용, 주의사항 질문에 답변합니다.
    의약품 RAG 그래프를 실행합니다.
    """

    logger.info(
        "agent tool selected: answer_medicine_question | medicine_name=%s | question_length=%s",
        medicine_name,
        len(question),
    )

    result = answer_question_with_graph(
        medicine_name=medicine_name,
        question=question,
        top_k=5,
    )

    logger.info(
        "agent tool completed: answer_medicine_question | answer_length=%s | source_count=%s",
        len(result.get("answer", "")),
        len(result.get("sources", [])),
    )
    return result


@tool
def analyze_medicine_with_user_context(
    medicine_name: str,
    state: Annotated[dict[str, Any], InjectedState],
) -> dict:
    """
    로그인한 사용자의 건강정보, 기저질환, 주의 약/성분을 반영하여
    사용자의 처방전에 등록된 특정 의약품의 개인화된 주의사항을 분석합니다.
    "내 건강정보를 바탕으로 이 약의 주의사항"과 같은 질문에 사용합니다.
    """

    user_id = state["user_id"]
    logger.info(
        "agent tool selected: analyze_medicine_with_user_context | user_id=%s | medicine_name=%s",
        user_id,
        medicine_name,
    )

    schedules = get_schedules(db=state["db"], user_id=user_id)
    normalized_name = medicine_name.strip().casefold()
    matched_schedule = None

    for schedule in schedules:
        if any(
            normalized_name in (medicine.custom_medicine_name or "").strip().casefold()
            or (medicine.custom_medicine_name or "").strip().casefold() in normalized_name
            for medicine in schedule.medicines
        ):
            matched_schedule = schedule
            break

    if matched_schedule is None:
        logger.info(
            "agent tool completed: analyze_medicine_with_user_context | user_id=%s | status=MEDICINE_NOT_FOUND",
            user_id,
        )
        return {
            "status": "MEDICINE_NOT_FOUND",
            "medicine_name": medicine_name,
            "message": "현재 등록된 처방전에서 해당 의약품을 찾지 못했습니다.",
        }

    schedule_model = get_schedule_model(
        db=state["db"],
        user_id=user_id,
        schedule_id=matched_schedule.id,
    )
    analysis = generate_prescription_analysis(
        db=state["db"],
        user_id=user_id,
        schedule=schedule_model,
    )

    matched_medicines = [
        medicine
        for medicine in analysis.get("medicines", [])
        if (
            normalized_name in (medicine.get("medicineName") or "").strip().casefold()
            or (medicine.get("medicineName") or "").strip().casefold() in normalized_name
        )
    ]

    logger.info(
        "agent tool completed: analyze_medicine_with_user_context | user_id=%s | status=SUCCESS | matched_count=%s",
        user_id,
        len(matched_medicines),
    )
    return {
        "status": "SUCCESS",
        "medicine_name": medicine_name,
        "analysis": matched_medicines,
    }

# InjectedState: LLM이 직접 주입 x 그래프 상태에서 자동 주입
@tool
def get_today_medications(
    state: Annotated[dict[str, Any], InjectedState],
) -> dict:
    """
    로그인한 사용자가 오늘 복용해야 하는 약과 복용 시간을 조회합니다.
    오늘 먹어야 하는 약, 오늘 복약 일정, 오늘 약을 물으면 사용합니다.
    """

    target_date = date.today()
    user_id = state["user_id"]
    db = state["db"]

    logger.info(
        "agent tool selected: get_today_medications | user_id=%s | date=%s",
        user_id,
        target_date,
    )

    result = get_daily_medications(
        db=db,
        user_id=user_id,
        target_date=target_date,
    )

    # result 를 일반 Python 딕셔너리로 변환해서 반환
    response = result.model_dump(by_alias=True)
    logger.info(
        "agent tool completed: get_today_medications | user_id=%s | group_count=%s | medication_count=%s",
        user_id,
        len(response.get("groups", [])),
        sum(len(group.get("medications", [])) for group in response.get("groups", [])),
    )
    return response


@tool
def get_medication_intake_status(
    state: Annotated[dict[str, Any], InjectedState],
) -> dict:
    """
    로그인한 사용자의 오늘 복약 일정과 복용 완료 여부를 조회합니다.
    오늘 약을 먹었는지, 아직 먹지 않은 약이 있는지 물을 때 사용합니다.
    """

    user_id = state["user_id"]
    logger.info(
        "agent tool selected: get_medication_intake_status | user_id=%s | date=%s",
        user_id,
        date.today(),
    )

    result = get_daily_medications(
        db=state["db"],
        user_id=user_id,
        target_date=date.today(),
    )

    response = result.model_dump(by_alias=True)
    medications = [
        medication
        for group in response.get("groups", [])
        for medication in group.get("medications", [])
    ]
    logger.info(
        "agent tool completed: get_medication_intake_status | user_id=%s | medication_count=%s | intake_statuses=%s",
        user_id,
        len(medications),
        sorted({medication.get("intakeStatus") for medication in medications}),
    )
    return response


@tool
def get_prescription_details(
    state: Annotated[dict[str, Any], InjectedState],
) -> list[dict]:
    """
    로그인한 사용자의 처방전 단위 복약 일정과 처방 약 상세 정보를 조회합니다.
    처방받은 약 목록, 용량, 복용 횟수, 복용 기간, 병원과 약국 정보를 물을 때 사용합니다.
    """

    user_id = state["user_id"]
    logger.info(
        "agent tool selected: get_prescription_details | user_id=%s",
        user_id,
    )

    results = get_schedules(
        db=state["db"],
        user_id=user_id,
    )

    response = [
        schedule.model_dump(by_alias=True, mode="json")
        for schedule in results
    ]
    logger.info(
        "agent tool completed: get_prescription_details | user_id=%s | prescription_count=%s",
        user_id,
        len(response),
    )
    return response


@tool
def get_user_diseases(
    state: Annotated[dict[str, Any], InjectedState],
) -> list[dict]:
    """
    로그인한 사용자가 등록한 기저질환 목록을 조회합니다.
    내 기저질환, 앓고 있는 질환, 지병을 물을 때 사용합니다.
    """

    user_id = state["user_id"]
    logger.info(
        "agent tool selected: get_user_diseases | user_id=%s",
        user_id,
    )

    results = get_user_disease(
        db=state["db"],
        user_id=user_id,
    )

    response = [
        UserDiseaseResponse.model_validate(disease).model_dump(mode="json")
        for disease in results
    ]
    logger.info(
        "agent tool completed: get_user_diseases | user_id=%s | disease_count=%s",
        user_id,
        len(response),
    )
    return response

@tool
def get_user_health_profile(
    state: Annotated[dict[str, Any], InjectedState],
) -> dict:
    """
    로그인한 사용자가 자신의 건강 정보 (user_health_profile 테이블)를 조회합니다.
    """

    user_id = state["user_id"]
    logger.info(
        "agent tool selected: get_user_health_profile | user_id=%s",
        user_id,
    )

    result = get_health_profile(
        db=state["db"],
        user_id=user_id,
    )

    if result is None:
        logger.info(
            "agent tool completed: get_user_health_profile | user_id=%s | profile_exists=false",
            user_id,
        )
        return {}

    response = {
        "is_pregnant": result.is_pregnant,
        "is_breastfeeding": result.is_breastfeeding,
        "is_smoking": result.is_smoking,
        "is_drinking": result.is_drinking,
        "is_child": result.is_child,
        "is_elderly": result.is_elderly,
    }
    logger.info(
        "agent tool completed: get_user_health_profile | user_id=%s | profile_exists=true",
        user_id,
    )
    return response

@tool
def get_cautions(
    state: Annotated[dict[str, Any], InjectedState],
) -> dict:
    """
    로그인한 사용자가 자신의 주의 약/성분 (user_caution 테이블)을 조회합니다.
    """

    user_id = state["user_id"]
    logger.info(
        "agent tool selected: get_cautions | user_id=%s",
        user_id,
    )

    result = get_user_cautions(
        db=state["db"],
        user_id=user_id,
    )

    if result is None:
        logger.info(
            "agent tool completed: get_cautions | user_id=%s | caution_count=0",
            user_id,
        )
        return {}

    response = [
        {
            "target_type": caution.target_type.value,
            "item_name": caution.item_name,
            "ingredient_name": caution.ingredient_name,
            "reason": caution.reason,
        }
        for caution in result
    ]
    logger.info(
        "agent tool completed: get_cautions | user_id=%s | caution_count=%s | target_types=%s",
        user_id,
        len(response),
        sorted({item["target_type"] for item in response}),
    )
    return response
# 기저질환 조회,
# 현재 복용중인 약

MEDICAL_TOOLS = [
    answer_medicine_question,
    analyze_medicine_with_user_context,
    get_today_medications,
    get_medication_intake_status,
    get_prescription_details,
    get_user_health_profile,
    get_cautions,
    get_user_diseases,
]
