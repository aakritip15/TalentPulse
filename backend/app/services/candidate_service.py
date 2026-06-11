import asyncio
import json
from datetime import datetime
from uuid import uuid4
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Candidate, Score
from ..schemas import CandidateCreate, ScoreCreate


async def list_candidates(
    db: AsyncSession,
    status: str | None,
    role_applied: str | None,
    skill: str | None,
    keyword: str | None,
    page: int,
    page_size: int,
):
    query = select(Candidate).where(Candidate.deleted_at.is_(None))
    if status:
        query = query.where(Candidate.status == status)
    if role_applied:
        query = query.where(Candidate.role_applied == role_applied)
    if skill:
        query = query.where(Candidate.skills.like(f"%{skill}%"))
    if keyword:
        kw = f"%{keyword}%"
        query = query.where(
            or_(Candidate.name.like(kw), Candidate.email.like(kw), Candidate.role_applied.like(kw))
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all(), total


async def get_candidate(db: AsyncSession, candidate_id: str) -> Candidate | None:
    result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id, Candidate.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def create_candidate(db: AsyncSession, data: CandidateCreate) -> Candidate:
    candidate = Candidate(
        id=str(uuid4()),
        name=data.name,
        email=data.email,
        role_applied=data.role_applied,
        skills=json.dumps(data.skills),
        internal_notes=data.internal_notes,
    )
    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def submit_score(
    db: AsyncSession, candidate_id: str, reviewer_id: str, data: ScoreCreate
) -> Score:
    score = Score(
        id=str(uuid4()),
        candidate_id=candidate_id,
        category=data.category,
        score=data.score,
        reviewer_id=reviewer_id,
        note=data.note,
    )
    db.add(score)
    await db.commit()
    await db.refresh(score)
    return score


async def get_scores(
    db: AsyncSession, candidate_id: str, reviewer_id: str | None = None
) -> list[Score]:
    query = select(Score).where(Score.candidate_id == candidate_id)
    if reviewer_id:
        query = query.where(Score.reviewer_id == reviewer_id)
    result = await db.execute(query)
    return result.scalars().all()


async def update_notes(db: AsyncSession, candidate_id: str, notes: str) -> Candidate | None:
    candidate = await get_candidate(db, candidate_id)
    if candidate is None:
        return None
    candidate.internal_notes = notes
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def soft_delete(db: AsyncSession, candidate_id: str) -> bool:
    candidate = await get_candidate(db, candidate_id)
    if candidate is None:
        return False
    candidate.deleted_at = datetime.utcnow()
    candidate.status = "archived"
    await db.commit()
    return True


async def generate_summary(db: AsyncSession, candidate_id: str) -> dict | None:
    candidate = await get_candidate(db, candidate_id)
    if candidate is None:
        return None

    scores = await get_scores(db, candidate_id)

    await asyncio.sleep(2)

    top_category = "General"
    if scores:
        category_totals: dict[str, list[int]] = {}
        for s in scores:
            category_totals.setdefault(s.category, []).append(s.score)
        top_category = max(category_totals, key=lambda c: sum(category_totals[c]) / len(category_totals[c]))

    try:
        skills_list = json.loads(candidate.skills) if candidate.skills else []
    except (json.JSONDecodeError, ValueError):
        skills_list = []
    skills_str = ", ".join(skills_list) if skills_list else "N/A"

    summary = (
        f"Candidate {candidate.name} applied for {candidate.role_applied}. "
        f"Skills: {skills_str}. "
        f"Based on reviewer scores, this candidate shows strong potential in {top_category}."
    )
    return {"summary": summary, "generated_at": datetime.utcnow()}
