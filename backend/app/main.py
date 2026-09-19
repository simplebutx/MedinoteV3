from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.analysis import router as analysis_router
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
app.include_router(analysis_router)

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
