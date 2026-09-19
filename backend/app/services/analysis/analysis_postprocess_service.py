import json
from typing import Any

from app.core.exceptions import AppError

CHECK_TYPES = ("DISEASE", "HEALTH_STATUS", "CAUTION_ITEM")
SEVERITIES = ("safe", "warning")


class AnalysisPostprocessError(AppError):
    """LLM 응답을 최종 분석 결과로 변환하지 못한 경우."""

    code = "ANALYSIS_POSTPROCESS_FAILED"


def postprocess_analysis_result(
    raw_result: str,
    context: dict[str, Any],
) -> dict[str, Any]:
    try:
        result = json.loads(raw_result)
        result_medicines = result.get("medicines") or []
        if len(result_medicines) != len(context["medicines"]):
            raise ValueError("LLM 응답의 약 개수가 처방전과 다릅니다.")

        medicines = [
            _normalize_medicine_result(item, source, context["user"])
            for item, source in zip(
                result_medicines,
                context["medicines"],
                strict=True,
            )
        ]
        return {"medicines": medicines}
    except Exception as error:
        raise AnalysisPostprocessError("LLM 분석 결과 처리에 실패했습니다.") from error

# 약 하나의 분석결과 -> 최종형식으로 정리
def _normalize_medicine_result(
    result_medicine: dict[str, Any],
    source_medicine: dict[str, Any],
    user: dict[str, Any],
) -> dict[str, Any]:
    checks_by_type = {
        check.get("type"): check
        for check in result_medicine.get("checks", [])
        if check.get("type") in CHECK_TYPES
    }
    checks = []
    for check_type in CHECK_TYPES:
        if check_type == "CAUTION_ITEM":
            # 주의 약/성분 답변 정리
            checks.append(build_caution_item_check(source_medicine))
            continue

        check = checks_by_type.get(check_type)
        # 검색결과가 없는지 판단
        has_no_references = _has_no_reference_documents(source_medicine, check_type)
        if not isinstance(check, dict) and not has_no_references:
            raise ValueError(f"{check_type} 분석 결과가 없습니다.")
        check = check if isinstance(check, dict) else {}

        severity = check.get("severity")
        if severity == "caution":
            severity = "warning"
        if severity not in SEVERITIES and not has_no_references:
            raise ValueError(f"{check_type} severity가 올바르지 않습니다.")

        # 검색결과 없을 경우
        if has_no_references:
            severity = "safe"
            message = _no_reference_message(check_type)
        else:
            if not check.get("message"):
                raise ValueError(f"{check_type} 분석 결과가 없습니다.")
            message = check["message"]

        checks.append({
            "type": check_type,
            "severity": severity,
            "message": message,
        })

    return {
        "scheduleMedicineId": source_medicine["scheduleMedicineId"],
        "medicineName": result_medicine.get("medicineName") or source_medicine["medicineName"],
        "dosageAmount": source_medicine.get("dosageAmount"),
        "dosageUnit": source_medicine.get("dosageUnit"),
        "checks": checks,
    }


# 검색결과가 없는지 판단
def _has_no_reference_documents(
    medicine: dict[str, Any],
    check_type: str,
) -> bool:
    if check_type == "DISEASE":
        return not medicine.get("diseaseDocuments")
    if check_type == "HEALTH_STATUS":
        return not medicine.get("healthDocuments")
    return False

# 검색결과가 0개일 경우
def _no_reference_message(check_type: str) -> str:
    if check_type == "DISEASE":
        return "등록된 기저질환과 직접 연결되는 참고 문서는 확인되지 않았어요."
    return "등록된 건강정보와 직접 연결되는 참고 문서는 확인되지 않았어요."


# 주의 약/성분 답변 정리
def build_caution_item_check(medicine: dict[str, Any]) -> dict[str, Any]:
    # 주의 약/성분 매칭
    matched_names = _find_caution_matches(medicine)
    if matched_names:
        return {
            "type": "CAUTION_ITEM",
            "severity": "warning",
            "message": f"등록한 주의 약/성분 중 {', '.join(matched_names)} 항목과 관련이 있어요.",
        }

    return {
        "type": "CAUTION_ITEM",
        "severity": "safe",
        "message": "등록한 주의 약/성분 목록과 직접 일치하는 항목은 확인되지 않았어요.",
    }

# 주의 약/성분 매칭 로직
def _find_caution_matches(medicine: dict[str, Any]) -> list[str]:
    medicine_item_seq = medicine.get("itemSeq")
    ingredient_codes = {
        item.get("ingredientCode")
        for item in medicine.get("ingredients", [])
        if item.get("ingredientCode")
    }
    ingredient_names = {
        item.get("ingredientName")
        for item in medicine.get("ingredients", [])
        if item.get("ingredientName")
    }
    matches = []
    for caution_item in medicine.get("cautionItems", []):
        if caution_item.get("targetType") == "MEDICINE":
            if caution_item.get("itemSeq") == medicine_item_seq:
                matches.append(caution_item.get("itemName") or medicine["medicineName"])
        elif (
            caution_item.get("ingredientCode") in ingredient_codes
            or caution_item.get("ingredientName") in ingredient_names
        ):
            matches.append(caution_item.get("ingredientName"))

    return [name for name in matches if name]
