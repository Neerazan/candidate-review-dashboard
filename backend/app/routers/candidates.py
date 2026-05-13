from typing import Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, UserRole
from app.schemas import (
    AISummaryResponse,
    CandidateDeleteResponse,
    CandidateDetailAdminResponse,
    CandidateDetailResponse,
    CandidateListResponse,
    InternalNotesResponse,
    InternalNotesUpdateRequest,
    ScoreAdminResponse,
    ScoreCreate,
    ScoreResponse,
    ScoreUpdate,
)
from app.services.candidate_service import (
    CandidateArchivedError,
    CandidateNotFoundError,
    DuplicateScoreError,
    PermissionDeniedError,
    ScoreNotFoundError,
    create_score,
    delete_score,
    delete_internal_notes,
    generate_candidate_summary,
    get_candidate_or_404,
    get_candidate_scores_for_user,
    get_internal_notes,
    list_candidates,
    soft_delete_candidate,
    update_internal_notes,
    update_score,
)

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("", response_model=CandidateListResponse)
def get_candidates(
    status: str | None = None,
    role_applied: str | None = None,
    skill: str | None = None,
    keyword: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Union[CandidateDetailResponse, CandidateDetailAdminResponse]:
    try:
        candidate = get_candidate_or_404(db, candidate_id)
    except CandidateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    if current_user.role == UserRole.REVIEWER.value and candidate.status == "archived":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

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
    current_user: User = Depends(get_current_user),
) -> ScoreResponse:
    try:
        score = create_score(db=db, candidate_id=candidate_id, reviewer=current_user, payload=payload)
    except CandidateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except CandidateArchivedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except DuplicateScoreError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return ScoreResponse.model_validate(score)


@router.put("/{candidate_id}/scores/{score_id}", response_model=ScoreResponse)
def edit_candidate_score(
    candidate_id: str,
    score_id: str,
    payload: ScoreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScoreResponse:
    try:
        score = update_score(
            db=db,
            candidate_id=candidate_id,
            score_id=score_id,
            actor=current_user,
            payload=payload,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except CandidateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except CandidateArchivedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ScoreNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return ScoreResponse.model_validate(score)


@router.delete("/{candidate_id}/scores/{score_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_candidate_score(
    candidate_id: str,
    score_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        delete_score(
            db=db,
            candidate_id=candidate_id,
            score_id=score_id,
            actor=current_user,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ScoreNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/{candidate_id}/summary", response_model=AISummaryResponse)
async def generate_summary(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AISummaryResponse:
    try:
        summary = await generate_candidate_summary(db=db, candidate_id=candidate_id, actor=current_user)
    except CandidateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return AISummaryResponse(candidate_id=candidate_id, ai_summary=summary)


@router.get("/{candidate_id}/internal-notes", response_model=InternalNotesResponse)
def get_candidate_internal_notes(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InternalNotesResponse:
    try:
        notes = get_internal_notes(db=db, candidate_id=candidate_id, actor=current_user)
    except CandidateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return InternalNotesResponse(candidate_id=candidate_id, internal_notes=notes)


@router.put("/{candidate_id}/internal-notes", response_model=InternalNotesResponse)
def put_candidate_internal_notes(
    candidate_id: str,
    payload: InternalNotesUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InternalNotesResponse:
    try:
        notes = update_internal_notes(
            db=db,
            candidate_id=candidate_id,
            actor=current_user,
            internal_notes=payload.internal_notes,
        )
    except CandidateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return InternalNotesResponse(candidate_id=candidate_id, internal_notes=notes)


@router.delete("/{candidate_id}/internal-notes", response_model=InternalNotesResponse)
def remove_candidate_internal_notes(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InternalNotesResponse:
    try:
        delete_internal_notes(db=db, candidate_id=candidate_id, actor=current_user)
    except CandidateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return InternalNotesResponse(candidate_id=candidate_id, internal_notes=None)


@router.delete("/{candidate_id}", response_model=CandidateDeleteResponse)
def archive_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CandidateDeleteResponse:
    try:
        candidate = soft_delete_candidate(db=db, candidate_id=candidate_id, actor=current_user)
    except CandidateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return CandidateDeleteResponse(candidate_id=candidate.id, status=candidate.status)
