from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

EntryTag = Table(
    "entry_tags",
    Base.metadata,
    Column("entry_id", ForeignKey("entries.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True),
)


class Entry(Base):
    __tablename__ = "entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    mood: Mapped[str | None] = mapped_column(String(32), nullable=True)
    mood_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="entries")
    tags = relationship("Tag", secondary=EntryTag, back_populates="entries")
    insight = relationship("Insight", back_populates="entry", uselist=False, cascade="all, delete-orphan")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    entries = relationship("Entry", secondary=EntryTag, back_populates="tags")


class Insight(Base):
    __tablename__ = "insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("entries.id"), unique=True, index=True)
    summary: Mapped[str] = mapped_column(Text)
    emotional_patterns: Mapped[str] = mapped_column(Text)
    recurring_concerns: Mapped[str] = mapped_column(Text)
    based_on_patterns: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_up_questions: Mapped[str] = mapped_column(Text)
    action_suggestion: Mapped[str] = mapped_column(Text)
    disclaimer: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    entry = relationship("Entry", back_populates="insight")
