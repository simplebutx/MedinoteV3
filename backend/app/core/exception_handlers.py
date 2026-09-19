import logging

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import AppError

# 발생한 예외를 실제 HTTP 응답으로 변환

logger = logging.getLogger(__name__)

HTTP_ERROR_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    500: "INTERNAL_ERROR",
    503: "EXTERNAL_SERVICE_UNAVAILABLE",
}

async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.message,
        }
    )

async def unexpected_error_handler(
    request: Request,
    exc: Exception,
):
    logger.exception("unexpected server error")

    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_ERROR",
            "message": "서버 오류가 발생했습니다.",
        },
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "요청을 처리할 수 없습니다."

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": HTTP_ERROR_CODES.get(exc.status_code, "HTTP_ERROR"),
            "message": detail,
        },
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": "요청 형식이 올바르지 않습니다.",
            "errors": exc.errors(),
        },
    )
