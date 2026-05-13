from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from dataclasses import dataclass

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Candidate, Score, User, UserRole
from app.schemas import CandidateListItem, ScoreCreate, ScoreUpdate
from app.services.realtime_service import candidate_event_bus


class CandidateServiceError(Exception):
    pass


class CandidateNotFoundError(CandidateServiceError):
    pass


class DuplicateScoreError(CandidateServiceError):
    pass


class PermissionDeniedError(CandidateServiceError):
    pass


class ScoreNotFoundError(CandidateServiceError):
    pass


class CandidateArchivedError(CandidateServiceError):
    pass


@dataclass
class CandidateListResult:
    items: list[CandidateListItem]
    total: int
    page: int
    page_size: int


def list_candidates(
    *,
    db: Session,
    status: str | None,
    role_applied: str | None,
    skill: str | None,
    keyword: str | None,
    page: int,
    page_size: int,
    viewer_role: str,
) -> CandidateListResult:
    offset = (page - 1) * page_size

    query = select(Candidate)
    count_query = select(func.count()).select_from(Candidate)

    filters = []
    if status:
        filters.append(Candidate.status == status)
    elif viewer_role == UserRole.REVIEWER.value:
        filters.append(Candidate.status != "archived")
    elif viewer_role == UserRole.ADMIN.value:
        filters.append(Candidate.status != "archived")
    if role_applied:
        filters.append(Candidate.role_applied == role_applied)
    if skill:
        filters.append(cast(Candidate.skills, String).ilike(f"%{skill}%"))
    if keyword:
        kw = f"%{keyword}%"
        filters.append(
            or_(
                Candidate.name.ilike(kw),
                Candidate.email.ilike(kw),
                Candidate.role_applied.ilike(kw),
            )
        )

    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    total = db.scalar(count_query) or 0
    candidates = db.scalars(
        query.order_by(Candidate.created_at.desc()).offset(offset).limit(page_size)
    ).all()

    items = [
        CandidateListItem(
            id=c.id,
            name=c.name,
            email=c.email,
            role_applied=c.role_applied,
            status=c.status,
            skills=c.skills,
            created_at=c.created_at,
        )
        for c in candidates
    ]
    return CandidateListResult(items=items, total=total, page=page, page_size=page_size)


def get_candidate_or_404(db: Session, candidate_id: str) -> Candidate:
    candidate = db.scalar(
        select(Candidate)
        .where(Candidate.id == candidate_id)
        .options(selectinload(Candidate.scores).selectinload(Score.reviewer))
    )
    if not candidate:
        raise CandidateNotFoundError("Candidate not found")
    return candidate


def get_candidate_scores_for_user(candidate: Candidate, user: User) -> list[Score]:
    visible_scores = [
        score
        for score in candidate.scores
        if score.deleted_at is None and score.reviewer and score.reviewer.deleted_at is None and score.reviewer.active
    ]
    if user.role == UserRole.ADMIN.value:
        return visible_scores
    return [score for score in visible_scores if score.reviewer_id == user.id]


def create_score(*, db: Session, candidate_id: str, reviewer: User, payload: ScoreCreate) -> Score:
    if reviewer.role != UserRole.REVIEWER.value:
        raise PermissionDeniedError("Only reviewers can submit scores")

    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate:
        raise CandidateNotFoundError("Candidate not found")
    if candidate.status == "archived":
        raise CandidateArchivedError("Cannot score archived candidate")

    existing_score = db.scalar(
        select(Score).where(
            Score.candidate_id == candidate_id,
            Score.reviewer_id == reviewer.id,
            Score.category == payload.category,
            Score.deleted_at.is_(None),
        )
    )
    if existing_score:
        raise DuplicateScoreError("Score already exists for this category")

    score = Score(
        candidate_id=candidate_id,
        reviewer_id=reviewer.id,
        category=payload.category,
        score=payload.score,
        note=payload.note,
    )
    db.add(score)
    db.commit()

    db.refresh(score)
    candidate_event_bus.publish_score_event(candidate_id=candidate_id, action="created", score_id=score.id)
    return score


def update_score(
    *,
    db: Session,
    candidate_id: str,
    score_id: str,
    actor: User,
    payload: ScoreUpdate,
) -> Score:
    if actor.role != UserRole.REVIEWER.value:
        raise PermissionDeniedError("Only reviewers can update scores")

    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate:
        raise CandidateNotFoundError("Candidate not found")
    if candidate.status == "archived":
        raise CandidateArchivedError("Cannot update score for archived candidate")

    score = db.scalar(select(Score).where(Score.id == score_id, Score.candidate_id == candidate_id))
    if not score or score.deleted_at is not None:
        raise ScoreNotFoundError("Score not found")

    if score.reviewer_id != actor.id:
        raise PermissionDeniedError("You can only update your own scores")

    if payload.score is not None:
        score.score = payload.score
    score.note = payload.note

    db.commit()
    db.refresh(score)
    candidate_event_bus.publish_score_event(candidate_id=candidate_id, action="updated", score_id=score.id)
    return score


def delete_score(*, db: Session, candidate_id: str, score_id: str, actor: User) -> None:
    if actor.role != UserRole.REVIEWER.value:
        raise PermissionDeniedError("Only reviewers can delete scores")

    score = db.scalar(select(Score).where(Score.id == score_id, Score.candidate_id == candidate_id))
    if not score or score.deleted_at is not None:
        raise ScoreNotFoundError("Score not found")

    if score.reviewer_id != actor.id:
        raise PermissionDeniedError("You can only delete your own scores")

    deleted_score_id = score.id
    score.deleted_at = datetime.now(UTC).replace(tzinfo=None)
    db.commit()
    candidate_event_bus.publish_score_event(candidate_id=candidate_id, action="deleted", score_id=deleted_score_id)


def soft_delete_candidate(*, db: Session, candidate_id: str, actor: User) -> Candidate:
    if actor.role != UserRole.ADMIN.value:
        raise PermissionDeniedError("Admin access required")

    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate:
        raise CandidateNotFoundError("Candidate not found")

    candidate.status = "archived"
    db.commit()
    db.refresh(candidate)
    return candidate


def update_candidate_status(*, db: Session, candidate_id: str, actor: User, status: str) -> Candidate:
    if actor.role != UserRole.ADMIN.value:
        raise PermissionDeniedError("Admin access required")

    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate:
        raise CandidateNotFoundError("Candidate not found")

    candidate.status = status
    db.commit()
    db.refresh(candidate)
    return candidate


def get_internal_notes(*, db: Session, candidate_id: str, actor: User) -> str | None:
    if actor.role != UserRole.ADMIN.value:
        raise PermissionDeniedError("Admin access required")

    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate:
        raise CandidateNotFoundError("Candidate not found")
    return candidate.internal_notes


def update_internal_notes(*, db: Session, candidate_id: str, actor: User, internal_notes: str) -> str:
    if actor.role != UserRole.ADMIN.value:
        raise PermissionDeniedError("Admin access required")

    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate:
        raise CandidateNotFoundError("Candidate not found")

    candidate.internal_notes = internal_notes
    db.commit()
    return internal_notes


def delete_internal_notes(*, db: Session, candidate_id: str, actor: User) -> None:
    if actor.role != UserRole.ADMIN.value:
        raise PermissionDeniedError("Admin access required")

    candidate = db.scalar(select(Candidate).where(Candidate.id == candidate_id))
    if not candidate:
        raise CandidateNotFoundError("Candidate not found")

    candidate.internal_notes = None
    db.commit()


async def generate_candidate_summary(*, db: Session, candidate_id: str, actor: User) -> str:
    candidate = get_candidate_or_404(db, candidate_id)
    if actor.role == UserRole.REVIEWER.value and candidate.status in {"archived", "hired", "rejected"}:
        raise PermissionDeniedError("Reviewers cannot generate summaries for archived, hired, or rejected candidates")

    visible_scores = get_candidate_scores_for_user(candidate, actor)

    await asyncio.sleep(2)

    if visible_scores:
        avg_score = sum(score.score for score in visible_scores) / len(visible_scores)
        categories = ", ".join(
            sorted({_humanize_category(score.category) for score in visible_scores})
        )
        score_line = f"Average score is {avg_score:.1f}/5 across: {categories}."
    else:
        score_line = "No scores available yet; evaluation is pending reviewer input."

    summary = (
        f"{candidate.name} is being considered for {candidate.role_applied}. "
        f"Current status is {candidate.status}. "
        f"Key skills include {', '.join(candidate.skills)}. "
        f"{score_line}"
    )

    candidate.ai_summary = summary
    db.commit()
    return summary


def _humanize_category(category: str) -> str:
    return category.replace("_", " ").title()
