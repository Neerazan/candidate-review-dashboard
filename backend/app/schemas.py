from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _normalize_email(value: str) -> str:
    normalized = value.strip().lower()
    if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
        raise ValueError("Invalid email format")
    return normalized


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    role: str
    active: bool
    force_password_change: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str


class StaffResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    role: str
    active: bool
    deleted_at: datetime | None
    created_at: datetime


class StaffListResponse(BaseModel):
    items: list[StaffResponse]


AllowedScoreCategory = Literal[
    "technical_skills",
    "problem_solving",
    "communication",
    "experience",
    "culture_fit",
]


class ScoreCreate(BaseModel):
    category: AllowedScoreCategory
    score: int = Field(ge=1, le=5)
    note: str | None = None


class ScoreUpdate(BaseModel):
    score: int | None = Field(default=None, ge=1, le=5)
    note: str | None = None


class ScoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    candidate_id: str
    reviewer_id: str
    category: str
    score: int
    note: str | None
    created_at: datetime


class ScoreAdminResponse(ScoreResponse):
    reviewer_name: str
    reviewer_email: str


ScoreType = TypeVar("ScoreType", bound=ScoreResponse)


class CandidateListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    role_applied: str
    status: str
    skills: list[str]
    created_at: datetime


class CandidateListResponse(BaseModel):
    items: list[CandidateListItem]
    total: int
    page: int
    page_size: int


class CandidateDetailBase(BaseModel, Generic[ScoreType]):
    id: str
    name: str
    email: str
    role_applied: str
    status: str
    skills: list[str]
    experience_summary: str | None
    resume_url: str | None
    ai_summary: str | None
    created_at: datetime
    updated_at: datetime
    scores: list[ScoreType]


class CandidateDetailResponse(CandidateDetailBase[ScoreResponse]):
    pass


class CandidateDetailAdminResponse(CandidateDetailBase[ScoreAdminResponse]):
    internal_notes: str | None


class AISummaryResponse(BaseModel):
    candidate_id: str
    ai_summary: str


class InternalNotesUpdateRequest(BaseModel):
    internal_notes: str = Field(min_length=1, max_length=5000)


class InternalNotesResponse(BaseModel):
    candidate_id: str
    internal_notes: str | None


class CandidateDeleteResponse(BaseModel):
    candidate_id: str
    status: str


AllowedCandidateStatus = Literal[
    "new",
    "reviewed",
    "hired",
    "rejected",
    "archived",
]


class CandidateStatusUpdateRequest(BaseModel):
    status: AllowedCandidateStatus


class CandidateStatusResponse(BaseModel):
    candidate_id: str
    status: str
