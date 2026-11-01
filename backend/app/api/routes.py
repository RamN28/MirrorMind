from collections import Counter

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.auth import LoginRequest, LoginResponse
from app.schemas.auth import SessionUserResponse, SignupRequest
from app.schemas.entry import EntryCreate, EntryListResponse, EntryResponse
from app.schemas.insight import DashboardSummary, PatternItem
from app.schemas.user_state import (
    PrivacySettingsPayload,
    ReminderSettingsPayload,
    UserStateEnvelope,
    WeeklyReviewRecordPayload,
)
from app.services.ai_service import AIReflectionService, build_trend_points, count_entries_this_week
from app.services.auth_service import create_session_token, hash_password, verify_password, verify_session_token
from app.services.repository import Repository, get_repository, serialize_entry

router = APIRouter()
settings = get_settings()
ai_service = AIReflectionService()


def to_auth_user_payload(user) -> dict[str, int | str]:
    if hasattr(user, "id") and hasattr(user, "email"):
        return {"id": user.id, "name": user.name, "email": user.email}
    return {"id": user["id"], "name": user["name"], "email": user["email"]}


def require_authenticated_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    token = authorization.removeprefix("Bearer ").strip()
    session_payload = verify_session_token(token)
    if not session_payload:
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")

    repo = get_repository(db)
    user = repo.get_user_by_email(session_payload["email"])
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    auth_user = to_auth_user_payload(user)
    if auth_user["id"] != session_payload["user_id"]:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return auth_user


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    repo = get_repository(db)
    user = repo.get_user_by_email(payload.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    stored_password = user.password if isinstance(repo, Repository) else user["password"]
    if not verify_password(payload.password, stored_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    auth_user = to_auth_user_payload(user)
    return LoginResponse(
        user=auth_user,
        session_token=create_session_token(auth_user["id"], auth_user["email"]),
        message="Signed in successfully.",
    )


@router.post("/auth/signup", response_model=LoginResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> LoginResponse:
    repo = get_repository(db)
    existing_user = repo.get_user_by_email(payload.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    user = repo.create_user(
        name=payload.name.strip(),
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    return LoginResponse(
        user=user,
        session_token=create_session_token(user.id, user.email),
        message="Account created successfully.",
    )


@router.get("/auth/me", response_model=SessionUserResponse)
def get_current_user(current_user=Depends(require_authenticated_user)) -> SessionUserResponse:
    return SessionUserResponse(user=current_user)


def validate_state_access(current_user, user_id: int) -> None:
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only access your own settings.")


@router.get("/entries", response_model=EntryListResponse)
def list_entries(
    user_id: int = Query(..., gt=0),
    current_user=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> EntryListResponse:
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only access your own entries.")
    repo = get_repository(db)
    if isinstance(repo, Repository):
        entries = [serialize_entry(entry) for entry in repo.list_entries(user_id=user_id)]
    else:
        entries = repo.list_entries(user_id=user_id)
    return EntryListResponse(entries=entries)


@router.post("/entries", response_model=EntryResponse)
def create_entry(
    payload: EntryCreate,
    current_user=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> EntryResponse:
    if current_user["id"] != payload.user_id:
        raise HTTPException(status_code=403, detail="You can only create entries for your own account.")
    repo = get_repository(db)
    if isinstance(repo, Repository):
        recent_entries = [serialize_entry(entry).model_dump() for entry in repo.list_entries(user_id=payload.user_id)[:8]]
    else:
        recent_entries = [entry.model_dump() for entry in repo.list_entries(user_id=payload.user_id)[:8]]
    insight = ai_service.generate_entry_reflection(payload.content, payload.mood, payload.tags, recent_entries=recent_entries)
    mood_score = ai_service.mood_to_score(payload.mood)
    entry = repo.create_entry(payload=payload, mood_score=mood_score, insight=insight)
    return serialize_entry(entry) if isinstance(repo, Repository) else entry


@router.get("/entries/{entry_id}", response_model=EntryResponse)
def get_entry(entry_id: int, current_user=Depends(require_authenticated_user), db: Session = Depends(get_db)) -> EntryResponse:
    repo = get_repository(db)
    if isinstance(repo, Repository):
        entry = repo.get_entry(entry_id)
        if entry and entry.user_id != current_user["id"]:
            entry = None
    else:
        entry = repo.get_entry(entry_id, user_id=current_user["id"])
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found.")
    return serialize_entry(entry) if isinstance(repo, Repository) else entry


@router.get("/patterns", response_model=list[PatternItem])
def get_patterns(
    user_id: int = Query(..., gt=0),
    current_user=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> list[PatternItem]:
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only access your own patterns.")
    repo = get_repository(db)
    if isinstance(repo, Repository):
        entries = [serialize_entry(entry).model_dump() for entry in repo.list_entries(user_id=user_id)]
    else:
        entries = [entry.model_dump() for entry in repo.list_entries(user_id=user_id)]
    return ai_service.generate_patterns(entries)


@router.get("/insights/dashboard", response_model=DashboardSummary)
def get_dashboard_insights(
    user_id: int = Query(..., gt=0),
    current_user=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> DashboardSummary:
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only access your own insights.")
    repo = get_repository(db)
    if isinstance(repo, Repository):
        entries = [serialize_entry(entry).model_dump() for entry in repo.list_entries(user_id=user_id)]
    else:
        entries = [entry.model_dump() for entry in repo.list_entries(user_id=user_id)]

    mood_breakdown_counter = Counter(entry["mood"] for entry in entries if entry.get("mood"))
    mood_breakdown = [{"mood": mood, "count": count} for mood, count in mood_breakdown_counter.items()]
    mood_scores = [float(entry["mood_score"]) for entry in entries if entry.get("mood_score") is not None]
    average_mood = round(sum(mood_scores) / len(mood_scores), 2) if mood_scores else 5.0

    return DashboardSummary(
        total_entries=len(entries),
        entries_this_week=count_entries_this_week(entries),
        average_mood_score=average_mood,
        mood_breakdown=mood_breakdown,
        trend_points=build_trend_points(entries),
        recent_patterns=ai_service.generate_patterns(entries),
        weekly_summary=ai_service.generate_weekly_summary(entries),
    )


@router.get("/user-state", response_model=UserStateEnvelope)
def get_user_state(
    user_id: int = Query(..., gt=0),
    current_user=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> UserStateEnvelope:
    validate_state_access(current_user, user_id)
    repo = get_repository(db)
    reminders = repo.get_state(user_id, "reminders")
    privacy = repo.get_state(user_id, "privacy")
    weekly_review = repo.get_state(user_id, "weekly-review")
    return UserStateEnvelope(
        user_id=user_id,
        reminders=ReminderSettingsPayload(**reminders) if reminders else None,
        privacy=PrivacySettingsPayload(**privacy) if privacy else None,
        weekly_review=WeeklyReviewRecordPayload(**weekly_review) if weekly_review else None,
    )


@router.put("/user-state/reminders", response_model=ReminderSettingsPayload)
def save_reminders(
    payload: UserStateEnvelope,
    current_user=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> ReminderSettingsPayload:
    validate_state_access(current_user, payload.user_id)
    if payload.reminders is None:
        raise HTTPException(status_code=400, detail="Reminder settings are required.")
    repo = get_repository(db)
    saved = repo.save_state(payload.user_id, "reminders", payload.reminders.model_dump())
    return ReminderSettingsPayload(**saved)


@router.put("/user-state/privacy", response_model=PrivacySettingsPayload)
def save_privacy(
    payload: UserStateEnvelope,
    current_user=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> PrivacySettingsPayload:
    validate_state_access(current_user, payload.user_id)
    if payload.privacy is None:
        raise HTTPException(status_code=400, detail="Privacy settings are required.")
    repo = get_repository(db)
    saved = repo.save_state(payload.user_id, "privacy", payload.privacy.model_dump())
    return PrivacySettingsPayload(**saved)


@router.put("/user-state/weekly-review", response_model=WeeklyReviewRecordPayload)
def save_weekly_review(
    payload: UserStateEnvelope,
    current_user=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> WeeklyReviewRecordPayload:
    validate_state_access(current_user, payload.user_id)
    if payload.weekly_review is None:
        raise HTTPException(status_code=400, detail="Weekly review is required.")
    repo = get_repository(db)
    saved = repo.save_state(payload.user_id, "weekly-review", payload.weekly_review.model_dump(mode="json"))
    return WeeklyReviewRecordPayload(**saved)
