import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models import User
from ..schemas import (
    CandidateCreate, CandidateOut, CandidateListItem, PaginatedCandidates,
    ScoreCreate, ScoreOut, SummaryOut, NotesUpdate,
)
from ..auth import get_current_user, require_admin
from ..services import candidate_service

router = APIRouter()


@router.get("/", response_model=PaginatedCandidates)
async def list_candidates(
    status: str | None = None,
    role_applied: str | None = None,
    skill: str | None = None,
    keyword: str | None = None,
    page: int = 1,
    page_size: int = Query(default=20, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    candidates, total = await candidate_service.list_candidates(
        db, status, role_applied, skill, keyword, page, page_size
    )
    return PaginatedCandidates(
        items=[CandidateListItem.model_validate(c) for c in candidates],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{candidate_id}", response_model=CandidateOut)
async def get_candidate(
    candidate_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    candidate = await candidate_service.get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Reviewers see only their own scores; admins see all
    reviewer_id = None if current_user.role == "admin" else current_user.id
    scores = await candidate_service.get_scores(db, candidate_id, reviewer_id)

    out = CandidateOut.model_validate(candidate)
    out.scores = [ScoreOut.model_validate(s) for s in scores]
    if current_user.role == "reviewer":
        out.internal_notes = None
    return out


@router.post("/", response_model=CandidateOut, status_code=201)
async def create_candidate(
    data: CandidateCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    candidate = await candidate_service.create_candidate(db, data)
    out = CandidateOut.model_validate(candidate)
    out.scores = []
    return out


@router.post("/{candidate_id}/scores", response_model=ScoreOut)
async def submit_score(
    candidate_id: str,
    data: ScoreCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    candidate = await candidate_service.get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    score = await candidate_service.submit_score(db, candidate_id, current_user.id, data)
    return ScoreOut.model_validate(score)


@router.post("/{candidate_id}/summary", response_model=SummaryOut)
async def generate_summary(
    candidate_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await candidate_service.generate_summary(db, candidate_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return SummaryOut(**result)


@router.patch("/{candidate_id}/notes", response_model=CandidateOut)
async def update_notes(
    candidate_id: str,
    body: NotesUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    candidate = await candidate_service.update_notes(db, candidate_id, body.notes)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    scores = await candidate_service.get_scores(db, candidate_id)
    out = CandidateOut.model_validate(candidate)
    out.scores = [ScoreOut.model_validate(s) for s in scores]
    return out


@router.delete("/{candidate_id}")
async def delete_candidate(
    candidate_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    deleted = await candidate_service.soft_delete(db, candidate_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"status": "archived"}


@router.get("/{candidate_id}/stream")
async def stream_scores(
    candidate_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    candidate = await candidate_service.get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    async def event_generator():
        for _ in range(10):
            scores = await candidate_service.get_scores(db, candidate_id)
            data = [{"id": s.id, "category": s.category, "score": s.score} for s in scores]
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
