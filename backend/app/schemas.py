import json
from datetime import datetime
from typing import Annotated
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    role: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class ScoreCreate(BaseModel):
    category: str
    score: Annotated[int, Field(ge=1, le=5)]
    note: str | None = None


class ScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    candidate_id: str
    category: str
    score: int
    reviewer_id: str
    note: str | None
    created_at: datetime


class CandidateCreate(BaseModel):
    name: str
    email: EmailStr
    role_applied: str
    skills: list[str]
    internal_notes: str | None = None


class CandidateListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    role_applied: str
    status: str
    skills: list[str]
    created_at: datetime

    @field_validator("skills", mode="before")
    @classmethod
    def parse_skills(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        return v or []


class CandidateOut(CandidateListItem):
    internal_notes: str | None = None
    scores: list[ScoreOut] = []


class PaginatedCandidates(BaseModel):
    items: list[CandidateListItem]
    total: int
    page: int
    page_size: int


class NotesUpdate(BaseModel):
    notes: str


class SummaryOut(BaseModel):
    summary: str
    generated_at: datetime
