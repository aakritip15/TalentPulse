from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index
from .database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role_applied = Column(String, nullable=False)
    status = Column(String, default="new")
    skills = Column(String, nullable=True)
    internal_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)


class Score(Base):
    __tablename__ = "scores"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    category = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    reviewer_id = Column(String, nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="reviewer")
    created_at = Column(DateTime, default=datetime.utcnow)


Index("ix_candidates_status", Candidate.status)
Index("ix_candidates_role_applied", Candidate.role_applied)
Index("ix_scores_candidate_id", Score.candidate_id)
