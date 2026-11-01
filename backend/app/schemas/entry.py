from datetime import datetime

from pydantic import BaseModel, Field


class EntryCreate(BaseModel):
    user_id: int = Field(..., gt=0)
    content: str = Field(..., min_length=10, max_length=5000)
    mood: str | None = None
    tags: list[str] = []


class InsightPayload(BaseModel):
    summary: str
    emotional_patterns: str
    recurring_concerns: str
    based_on_patterns: str | None = None
    follow_up_questions: list[str]
    action_suggestion: str
    disclaimer: str


class EntryResponse(BaseModel):
    id: int
    user_id: int
    content: str
    mood: str | None
    mood_score: float | None
    tags: list[str]
    created_at: datetime
    insight: InsightPayload | None

    class Config:
        from_attributes = True


class EntryListResponse(BaseModel):
    entries: list[EntryResponse]
