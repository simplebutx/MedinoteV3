from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.medication_notification import router as medication_notification_router
from app.api.user_health import router as user_health_profile_router
from app.api.user_disease import router as user_disease_router
from app.api.ocr import router as ocr_router
from app.core.config import settings
from app.api.health import router as health_router
from app.api.search import router as search_router
from app.api.schedule import (
    intake_log_router,
    schedule_router,
    schedule_time_router,
)
from app.api.user_caution import router as user_caution_profile_router
from app.db.mysql import Base, engine
from app.models import chat as chat_models
from app.models import disease_master as disease_master_models
from app.models import medicine_info as medicine_info_models
from app.models import medicine_ingredient as medicine_ingredient_models
from app.models import medication_intake_log as medication_intake_log_models
from app.models import medication_notification as medication_notification_models
from app.models import medication_schedule as medication_schedule_models
from app.models import medication_schedule_medicine as medication_schedule_medicine_models
from app.models import medication_schedule_time as medication_schedule_time_models
from app.models import user as user_models
from app.models import user_caution as user_caution_models
from app.models import user_disease as user_disease_models
from app.models import user_health as user_health_profile_models

# DB 테이블 자동생성
# Base.metadata 내부에 테이블 정보
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    description="RAG, LangChain, LangGraph 기반 의료 AI 포트폴리오 API",
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(ocr_router)
app.include_router(health_router)
app.include_router(search_router)
app.include_router(auth_router)
app.include_router(user_health_profile_router)
app.include_router(user_disease_router)
app.include_router(user_caution_profile_router)
app.include_router(schedule_router)
app.include_router(schedule_time_router)
app.include_router(intake_log_router)
app.include_router(medication_notification_router)
app.include_router(schedule_router, prefix="/api")
app.include_router(schedule_time_router, prefix="/api")
app.include_router(intake_log_router, prefix="/api")
app.include_router(medication_notification_router, prefix="/api")

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Medinote AI API is running",
    }


@app.get("/")
def root():
    return {
        "service": "Medinote AI API",
        "features": ["chatbot", "ocr"],
    }
