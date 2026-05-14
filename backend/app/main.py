from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers.auth import router as auth_router
from app.routers.candidates import router as candidates_router
from app.seed import seed_database
from app.services.auth_service import (
    EmailAlreadyRegisteredError,
    ForbiddenActionError,
    InactiveAccountError,
    InvalidCredentialsError,
    PasswordMismatchError,
    RefreshTokenError,
    UserNotFoundError,
)
from app.services.candidate_service import (
    CandidateArchivedError,
    CandidateNotFoundError,
    DuplicateScoreError,
    PermissionDeniedError,
    ScoreNotFoundError,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    seed_database()
    yield


app = FastAPI(title="Candidate Review API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(candidates_router)


def _register_exception_handler(app: FastAPI, exc_type: type[Exception], status_code: int) -> None:
    @app.exception_handler(exc_type)
    async def _handler(_, exc: Exception):
        return JSONResponse(status_code=status_code, content={"detail": str(exc)})


_register_exception_handler(app, CandidateNotFoundError, 404)
_register_exception_handler(app, ScoreNotFoundError, 404)
_register_exception_handler(app, CandidateArchivedError, 409)
_register_exception_handler(app, DuplicateScoreError, 409)
_register_exception_handler(app, PermissionDeniedError, 403)

_register_exception_handler(app, EmailAlreadyRegisteredError, 409)
_register_exception_handler(app, InvalidCredentialsError, 401)
_register_exception_handler(app, InactiveAccountError, 403)
_register_exception_handler(app, RefreshTokenError, 401)
_register_exception_handler(app, PasswordMismatchError, 400)
_register_exception_handler(app, ForbiddenActionError, 403)
_register_exception_handler(app, UserNotFoundError, 404)


@app.get("/health")
def health_check():
    return {"status": "ok"}
