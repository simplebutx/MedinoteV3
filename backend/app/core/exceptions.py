class AppError(Exception):
    status_code = 500
    code = "INTERNAL_ERROR"

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"


class BadRequestError(AppError):
    status_code = 400
    code = "BAD_REQUEST"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"


class ExternalServiceError(AppError):
    status_code = 503
    code = "EXTERNAL_SERVICE_UNAVAILABLE"

class DatabaseError(AppError):
    status_code = 500
    code = "DATABASE_ERROR"
