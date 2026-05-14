import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=utcnow_naive,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=utcnow_naive,
        onupdate=utcnow_naive,
        nullable=False,
    )


class UUIDMixin:
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )


class UserRole(str, Enum):
    ADMIN = "admin"
    REVIEWER = "reviewer"


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(100), nullable=False)

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=UserRole.REVIEWER.value,
    )

    active: Mapped[bool] = mapped_column(default=True, nullable=False)

    force_password_change: Mapped[bool] = mapped_column(default=False, nullable=False)

    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    scores: Mapped[list["Score"]] = relationship(back_populates="reviewer")

    __table_args__ = (
        CheckConstraint(
            "role IN ('admin', 'reviewer')",
            name="check_user_role",
        ),
    )


class Candidate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "candidates"

    name: Mapped[str] = mapped_column(String(100), nullable=False)

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    role_applied: Mapped[str] = mapped_column(String(100), nullable=False)

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="new",
    )

    skills: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    experience_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    resume_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    scores: Mapped[list["Score"]] = relationship(
        back_populates="candidate",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('new', 'reviewed', 'hired', 'rejected', 'archived')",
            name="check_candidate_status",
        ),
        Index("idx_candidates_status", "status"),
        Index("idx_candidates_role_applied", "role_applied"),
    )


class Score(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "scores"

    candidate_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("candidates.id"),
        nullable=False,
    )

    reviewer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(String(100), nullable=False)

    score: Mapped[int] = mapped_column(Integer, nullable=False)

    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    candidate: Mapped["Candidate"] = relationship(back_populates="scores")

    reviewer: Mapped["User"] = relationship(back_populates="scores")

    __table_args__ = (
        CheckConstraint(
            "score >= 1 AND score <= 5",
            name="check_score_range",
        ),
        Index(
            "idx_unique_active_candidate_reviewer_category",
            "candidate_id",
            "reviewer_id",
            "category",
            unique=True,
            sqlite_where=text("deleted_at IS NULL"),
        ),
        Index("idx_scores_candidate_id", "candidate_id"),
    )


class RefreshToken(Base, UUIDMixin):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)

    jti: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, index=True)

    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship()
