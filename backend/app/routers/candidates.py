from typing import Union
import asyncio
from queue import Empty

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_password_updated, require_reviewer
from app.database import get_db
from app.models import Candidate, User, UserRole
from app.schemas import (
    AISummaryResponse,
    CandidateDeleteResponse,
    CandidateDetailAdminResponse,
    CandidateDetailResponse,
    CandidateListResponse,
    CandidateStatusResponse,
    CandidateStatusUpdateRequest,
    InternalNotesResponse,
    InternalNotesUpdateRequest,
    ScoreAdminResponse,
    ScoreCreate,
    ScoreResponse,
    ScoreUpdate,
)
from app.services.candidate_service import (
    CandidateNotFoundError,
    create_score,
    delete_score,
    delete_internal_notes,
    generate_candidate_summary,
    get_candidate_or_404,
    get_candidate_scores_for_user,
    get_internal_notes,
    list_candidates,
    soft_delete_candidate,
    update_candidate_status,
    update_internal_notes,
    update_score,
)
from app.services.realtime_service import candidate_event_bus

router = APIRouter(prefix="/candidates", tags=["candidates"])


def get_visible_candidate_for_user(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_password_updated),
) -> Candidate:
    candidate = get_candidate_or_404(db, candidate_id)
    if current_user.role == UserRole.REVIEWER.value and candidate.status == "archived":
        raise CandidateNotFoundError("Candidate not found")
    return candidate


@router.get("/{candidate_id}/stream")
async def stream_candidate_events(
    candidate_id: str,
    _: Candidate = Depends(get_visible_candidate_for_user),
):
    channel = candidate_event_bus.subscribe(candidate_id)

    async def event_stream():
        try:
            while True:
                try:
                    message = await asyncio.to_thread(channel.get, True, 20)
                    yield message
                except Empty:
                    yield ": keepalive\n\n"
        finally:
            candidate_event_bus.unsubscribe(candidate_id, channel)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("", response_model=CandidateListResponse)
def get_candidates(
    status: str | None = None,
    role_applied: str | None = None,
    skill: str | None = None,
    keyword: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_password_updated),
) -> CandidateListResponse:
    result = list_candidates(
        db=db,
        status=status,
        role_applied=role_applied,
        skill=skill,
        keyword=keyword,
        page=page,
        page_size=page_size,
        viewer_role=current_user.role,
    )
    return CandidateListResponse(
        items=result.items,
        total=result.total,
        page=result.page,
        page_size=result.page_size,
    )


@router.get("/{candidate_id}", response_model=Union[CandidateDetailResponse, CandidateDetailAdminResponse])
def get_candidate_detail(
    candidate: Candidate = Depends(get_visible_candidate_for_user),
    current_user: User = Depends(get_current_user),
) -> Union[CandidateDetailResponse, CandidateDetailAdminResponse]:
    scores = get_candidate_scores_for_user(candidate, current_user)
    if current_user.role == UserRole.ADMIN.value:
        return CandidateDetailAdminResponse(
            id=candidate.id,
            name=candidate.name,
            email=candidate.email,
            role_applied=candidate.role_applied,
            status=candidate.status,
            skills=candidate.skills,
            experience_summary=candidate.experience_summary,
            resume_url=candidate.resume_url,
            ai_summary=candidate.ai_summary,
            internal_notes=candidate.internal_notes,
            created_at=candidate.created_at,
            updated_at=candidate.updated_at,
            scores=[
                ScoreAdminResponse(
                    id=s.id,
                    candidate_id=s.candidate_id,
                    reviewer_id=s.reviewer_id,
                    category=s.category,
                    score=s.score,
                    note=s.note,
                    created_at=s.created_at,
                    reviewer_name=s.reviewer.name,
                    reviewer_email=s.reviewer.email,
                )
                for s in scores
            ],
        )

    return CandidateDetailResponse(
        id=candidate.id,
        name=candidate.name,
        email=candidate.email,
        role_applied=candidate.role_applied,
        status=candidate.status,
        skills=candidate.skills,
        experience_summary=candidate.experience_summary,
        resume_url=candidate.resume_url,
        ai_summary=candidate.ai_summary,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
        scores=[
            ScoreResponse(
                id=s.id,
                candidate_id=s.candidate_id,
                reviewer_id=s.reviewer_id,
                category=s.category,
                score=s.score,
                note=s.note,
                created_at=s.created_at,
            )
            for s in scores
        ],
    )


@router.post("/{candidate_id}/scores", response_model=ScoreResponse, status_code=status.HTTP_201_CREATED)
def add_candidate_score(
    candidate_id: str,
    payload: ScoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
) -> ScoreResponse:
    score = create_score(db=db, candidate_id=candidate_id, reviewer=current_user, payload=payload)
    return ScoreResponse.model_validate(score)


@router.put("/{candidate_id}/scores/{score_id}", response_model=ScoreResponse)
def edit_candidate_score(
    candidate_id: str,
    score_id: str,
    payload: ScoreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
) -> ScoreResponse:
    score = update_score(
        db=db,
        candidate_id=candidate_id,
        score_id=score_id,
        actor=current_user,
        payload=payload,
    )
    return ScoreResponse.model_validate(score)


@router.delete("/{candidate_id}/scores/{score_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_candidate_score(
    candidate_id: str,
    score_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer),
) -> None:
    delete_score(
        db=db,
        candidate_id=candidate_id,
        score_id=score_id,
        actor=current_user,
    )


@router.post("/{candidate_id}/summary", response_model=AISummaryResponse)
async def generate_summary(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_password_updated),
) -> AISummaryResponse:
    summary = await generate_candidate_summary(db=db, candidate_id=candidate_id, actor=current_user)

    return AISummaryResponse(candidate_id=candidate_id, ai_summary=summary)


@router.get("/{candidate_id}/internal-notes", response_model=InternalNotesResponse)
def get_candidate_internal_notes(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_password_updated),
) -> InternalNotesResponse:
    notes = get_internal_notes(db=db, candidate_id=candidate_id, actor=current_user)

    return InternalNotesResponse(candidate_id=candidate_id, internal_notes=notes)


@router.put("/{candidate_id}/internal-notes", response_model=InternalNotesResponse)
def put_candidate_internal_notes(
    candidate_id: str,
    payload: InternalNotesUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_password_updated),
) -> InternalNotesResponse:
    notes = update_internal_notes(
        db=db,
        candidate_id=candidate_id,
        actor=current_user,
        internal_notes=payload.internal_notes,
    )

    return InternalNotesResponse(candidate_id=candidate_id, internal_notes=notes)


@router.delete("/{candidate_id}/internal-notes", response_model=InternalNotesResponse)
def remove_candidate_internal_notes(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_password_updated),
) -> InternalNotesResponse:
    delete_internal_notes(db=db, candidate_id=candidate_id, actor=current_user)

    return InternalNotesResponse(candidate_id=candidate_id, internal_notes=None)


@router.delete("/{candidate_id}", response_model=CandidateDeleteResponse)
def archive_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_password_updated),
) -> CandidateDeleteResponse:
    candidate = soft_delete_candidate(db=db, candidate_id=candidate_id, actor=current_user)

    return CandidateDeleteResponse(candidate_id=candidate.id, status=candidate.status)


@router.patch("/{candidate_id}/status", response_model=CandidateStatusResponse)
def patch_candidate_status(
    candidate_id: str,
    payload: CandidateStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_password_updated),
) -> CandidateStatusResponse:
    candidate = update_candidate_status(
        db=db,
        candidate_id=candidate_id,
        actor=current_user,
        status=payload.status,
    )

    return CandidateStatusResponse(candidate_id=candidate.id, status=candidate.status)
