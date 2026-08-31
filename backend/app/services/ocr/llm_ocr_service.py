import base64
import json

from openai import OpenAI

from app.core.config import settings

client = OpenAI(api_key=settings.openai_api_key)
PLACEHOLDER_MEDICINE_NAMES = {
    "",
    "약",
    "약명",
    "약물명",
    "약 이름",
    "약제명",
    "의약품명",
    "약품명",
}


def extract_prescription_from_image(image_bytes: bytes) -> dict:
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    response = client.responses.create(
        model="gpt-4o",
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "이 처방전 이미지에서 사용자가 처방전 등록 폼에 확인 후 저장할 정보를 추출해줘. "
                            "이미지가 90도, 180도, 270도 회전되어 있으면 방향을 추론해서 읽어줘. "
                            "실제로 이미지에서 읽을 수 있는 값만 채워줘. "
                            "약물명, 약명, 약제명, 의약품명 같은 라벨이나 예시 문구를 약 이름으로 넣지 마. "
                            "약 이름을 실제로 읽을 수 없는 항목은 medicines에 포함하지 마. "
                            "병원명, 약국명, 조제일, 투여량, 단위, 횟수, 일수를 읽을 수 없으면 빈 문자열로 둬. "
                            "dispensedDate는 읽을 수 있을 때만 YYYY-MM-DD 형식으로 변환해줘. "
                            "복용 시간은 추출하지 마. 사용자가 직접 설정할 값이므로 times는 항상 빈 배열로 반환해줘."
                        ),
                    },
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{image_base64}",
                    },
                ],
            }
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "prescription_schedule",
                "strict": True,
                "schema": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "hospitalName": {"type": "string"},
                        "pharmacyName": {"type": "string"},
                        "dispensedDate": {"type": "string"},
                        "medicines": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "itemSeq": {"type": ["integer", "null"]},
                                    "customMedicineName": {"type": "string"},
                                    "dosageAmount": {"type": "string"},
                                    "dosageUnit": {"type": "string"},
                                    "timesPerDay": {"type": "string"},
                                    "durationDays": {"type": "string"},
                                    "times": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "additionalProperties": False,
                                            "properties": {
                                                "takeTime": {"type": "string"}
                                            },
                                            "required": ["takeTime"],
                                        },
                                    },
                                },
                                "required": [
                                    "itemSeq",
                                    "customMedicineName",
                                    "dosageAmount",
                                    "dosageUnit",
                                    "timesPerDay",
                                    "durationDays",
                                    "times",
                                ],
                            },
                        },
                    },
                    "required": [
                        "hospitalName",
                        "pharmacyName",
                        "dispensedDate",
                        "medicines",
                    ],
                },
            }
        },
    )

    result = json.loads(response.output_text)
    return normalize_prescription_result(result)


# 프론트 응답용 dict
def normalize_prescription_result(result: dict) -> dict:
    medicines = result.get("medicines")
    if not isinstance(medicines, list):
        medicines = []

    valid_medicines = []

    for medicine in medicines:
        if not isinstance(medicine, dict):
            continue

        medicine_name = str(medicine.get("customMedicineName") or "").strip()
        if medicine_name in PLACEHOLDER_MEDICINE_NAMES:
            continue

        valid_medicines.append(
            {
                "itemSeq": medicine.get("itemSeq")
                if isinstance(medicine.get("itemSeq"), int)
                else None,
                "customMedicineName": medicine_name,
                "dosageAmount": str(medicine.get("dosageAmount") or "").strip(),
                "dosageUnit": str(medicine.get("dosageUnit") or "").strip(),
                "timesPerDay": str(medicine.get("timesPerDay") or "").strip(),
                "durationDays": str(medicine.get("durationDays") or "").strip(),
                "times": [],
            }
        )

    return {
        "hospitalName": str(result.get("hospitalName") or "").strip(),
        "pharmacyName": str(result.get("pharmacyName") or "").strip(),
        "dispensedDate": str(result.get("dispensedDate") or "").strip(),
        "medicines": valid_medicines,
    }
