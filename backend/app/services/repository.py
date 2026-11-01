import json

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.models import Entry, Insight, Tag, User
from app.schemas.entry import EntryCreate, EntryResponse, InsightPayload
from app.schemas.auth import AuthUser

settings = get_settings()


class Repository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_user_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def create_user(self, name: str, email: str, password_hash: str) -> AuthUser:
        user = User(name=name, email=email.lower(), password=password_hash)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return AuthUser.model_validate(user)

    def list_entries(self, user_id: int) -> list[Entry]:
        query: Select[tuple[Entry]] = (
            select(Entry)
            .where(Entry.user_id == user_id)
            .options(joinedload(Entry.tags), joinedload(Entry.insight))
            .order_by(Entry.created_at.desc())
        )
        return list(self.db.scalars(query).unique().all())

    def get_entry(self, entry_id: int) -> Entry | None:
        query = (
            select(Entry)
            .where(Entry.id == entry_id)
            .options(joinedload(Entry.tags), joinedload(Entry.insight))
        )
        return self.db.scalar(query)

    def create_entry(self, payload: EntryCreate, mood_score: float | None, insight: InsightPayload) -> Entry:
        tags = self._get_or_create_tags(payload.tags)
        entry = Entry(
            user_id=payload.user_id,
            content=payload.content,
            mood=payload.mood,
            mood_score=mood_score,
            tags=tags,
        )
        entry.insight = Insight(
            summary=insight.summary,
            emotional_patterns=insight.emotional_patterns,
            recurring_concerns=insight.recurring_concerns,
            based_on_patterns=insight.based_on_patterns,
            follow_up_questions=json.dumps(insight.follow_up_questions),
            action_suggestion=insight.action_suggestion,
            disclaimer=insight.disclaimer,
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return self.get_entry(entry.id) or entry

    def get_state(self, user_id: int, key: str) -> dict | None:
        user = self.db.get(User, user_id)
        if not user:
            return None
        raw = {
            "reminders": user.reminder_settings,
            "privacy": user.privacy_settings,
            "weekly-review": user.weekly_review,
        }.get(key)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    def save_state(self, user_id: int, key: str, payload: dict | None) -> dict | None:
        user = self.db.get(User, user_id)
        if not user:
            return None
        column_name = {
            "reminders": "reminder_settings",
            "privacy": "privacy_settings",
            "weekly-review": "weekly_review",
        }.get(key)
        if not column_name:
            return None
        setattr(user, column_name, json.dumps(payload) if payload is not None else None)
        self.db.add(user)
        self.db.commit()
        return payload

    def _get_or_create_tags(self, names: list[str]) -> list[Tag]:
        cleaned = [name.strip().lower() for name in names if name.strip()]
        if not cleaned:
            return []

        existing = {
            tag.name: tag
            for tag in self.db.scalars(select(Tag).where(Tag.name.in_(cleaned))).all()
        }
        tags: list[Tag] = []
        for name in cleaned:
            if name in existing:
                tags.append(existing[name])
                continue
            tag = Tag(name=name)
            self.db.add(tag)
            self.db.flush()
            tags.append(tag)
            existing[name] = tag
        return tags


def serialize_entry(entry: Entry) -> EntryResponse:
    insight = None
    if entry.insight:
        insight = InsightPayload(
            summary=entry.insight.summary,
            emotional_patterns=entry.insight.emotional_patterns,
            recurring_concerns=entry.insight.recurring_concerns,
            based_on_patterns=entry.insight.based_on_patterns,
            follow_up_questions=json.loads(entry.insight.follow_up_questions),
            action_suggestion=entry.insight.action_suggestion,
            disclaimer=entry.insight.disclaimer,
        )
    return EntryResponse(
        id=entry.id,
        user_id=entry.user_id,
        content=entry.content,
        mood=entry.mood,
        mood_score=entry.mood_score,
        tags=[tag.name for tag in entry.tags],
        created_at=entry.created_at,
        insight=insight,
    )


def get_repository(db: Session):
    if not settings.database_url.startswith("sqlite"):
        return Repository(db)
    if settings.blob_read_write_token:
        from app.services.blob_repository import BlobRepository

        return BlobRepository()
    return Repository(db)
