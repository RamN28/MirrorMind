from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import User
from app.services.auth_service import hash_password
from app.schemas.entry import EntryCreate
from app.services.ai_service import AIReflectionService
from app.services.blob_repository import BlobRepository
from app.services.repository import Repository
from app.services.seed_data import SEED_ENTRIES

settings = get_settings()
ai_service = AIReflectionService()


def ensure_demo_seed(db: Session) -> None:
    repo = Repository(db)

    user = repo.get_user_by_email(settings.demo_user_email)
    if not user:
        user = User(
            name="Maya Chen",
            email=settings.demo_user_email,
            password=hash_password(settings.demo_user_password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if repo.list_entries(user.id):
        return

    now = datetime.utcnow()
    for index, item in enumerate(SEED_ENTRIES):
        insight = ai_service.generate_entry_reflection(item["content"], item["mood"], item["tags"])
        entry = repo.create_entry(
            EntryCreate(
                user_id=user.id,
                content=item["content"],
                mood=item["mood"],
                tags=item["tags"],
            ),
            mood_score=ai_service.mood_to_score(item["mood"]),
            insight=insight,
        )
        entry.created_at = now - timedelta(days=len(SEED_ENTRIES) - index)
        db.add(entry)
    db.commit()


def ensure_blob_demo_seed() -> None:
    if not settings.blob_read_write_token:
        return

    repo = BlobRepository()
    demo_user = repo.get_user_by_email(settings.demo_user_email)
    if not demo_user:
        created = repo.create_user("Maya Chen", settings.demo_user_email, hash_password(settings.demo_user_password))
        demo_user_id = created.id
    else:
        demo_user_id = demo_user["id"]
    if repo.has_entries(demo_user_id):
        return

    for item in SEED_ENTRIES:
        insight = ai_service.generate_entry_reflection(item["content"], item["mood"], item["tags"])
        repo.create_entry(
            EntryCreate(
                user_id=demo_user_id,
                content=item["content"],
                mood=item["mood"],
                tags=item["tags"],
            ),
            mood_score=ai_service.mood_to_score(item["mood"]),
            insight=insight,
        )
