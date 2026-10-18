"""Domain / HTTP exception helpers."""

from fastapi import HTTPException, status


class AppError(HTTPException):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(status_code=status_code, detail=detail)


class UnauthorizedError(AppError):
    def __init__(self, detail: str = "Could not validate credentials") -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class ForbiddenError(AppError):
    def __init__(self, detail: str = "Not enough permissions") -> None:
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class NotFoundError(AppError):
    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ConflictError(AppError):
    def __init__(self, detail: str = "Resource already exists") -> None:
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class BadRequestError(AppError):
    def __init__(self, detail: str = "Bad request") -> None:
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
