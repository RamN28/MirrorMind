import json
import hashlib
from datetime import datetime
from typing import Any

import httpx
from vercel.blob import list_objects, put

from app.core.config import get_settings
from app.schemas.auth import AuthUser
from app.schemas.entry import EntryCreate, EntryResponse, InsightPayload

settings = get_settings()


class BlobRepository:
    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        result = list_objects(prefix=self._user_path(email), limit=1, token=settings.blob_read_write_token)
        if not result.blobs:
            return None
        return self._fetch_blob_json(result.blobs[0].url)

    def create_user(self, name: str, email: str, password_hash: str) -> AuthUser:
        user = {
            "id": self._generate_id(),
            "name": name,
            "email": email.lower(),
            "password": password_hash,
            "created_at": datetime.utcnow().isoformat(),
        }
        put(
            self._user_path(email),
            json.dumps(user).encode("utf-8"),
            access="private",
            content_type="application/json",
            overwrite=True,
            token=settings.blob_read_write_token,
        )
        return AuthUser(id=user["id"], name=user["name"], email=user["email"])

    def list_entries(self, user_id: int) -> list[EntryResponse]:
        prefix = self._prefix(user_id)
        result = list_objects(prefix=prefix, token=settings.blob_read_write_token)
        entries: list[EntryResponse] = []

        for blob in result.blobs:
            payload = self._fetch_blob_json(blob.url)
            if not payload:
                continue
            entries.append(self._deserialize_entry(payload))

        return sorted(entries, key=lambda entry: entry.created_at, reverse=True)

    def get_entry(self, entry_id: int, user_id: int | None = None) -> EntryResponse | None:
        if user_id is not None:
            entries = self.list_entries(user_id)
            return next((entry for entry in entries if entry.id == entry_id), None)
        return None

    def create_entry(self, payload: EntryCreate, mood_score: float | None, insight: InsightPayload) -> EntryResponse:
        entry = EntryResponse(
            id=self._generate_id(),
            user_id=payload.user_id,
            content=payload.content,
            mood=payload.mood,
            mood_score=mood_score,
            tags=payload.tags,
            created_at=datetime.utcnow(),
            insight=insight,
        )

        pathname = f"{self._prefix(payload.user_id)}{entry.id}.json"
        put(
            pathname,
            json.dumps(self._serialize_entry(entry)).encode("utf-8"),
            access="private",
            content_type="application/json",
            overwrite=True,
            token=settings.blob_read_write_token,
        )
        return entry

    def has_entries(self, user_id: int) -> bool:
        result = list_objects(prefix=self._prefix(user_id), limit=1, token=settings.blob_read_write_token)
        return bool(result.blobs)

    def get_state(self, user_id: int, key: str) -> dict[str, Any] | None:
        result = list_objects(prefix=self._state_path(user_id, key), limit=1, token=settings.blob_read_write_token)
        if not result.blobs:
            return None
        return self._fetch_blob_json(result.blobs[0].url)

    def save_state(self, user_id: int, key: str, payload: dict[str, Any] | None) -> dict[str, Any] | None:
        pathname = self._state_path(user_id, key)
        if payload is None:
            return None
        put(
            pathname,
            json.dumps(payload).encode("utf-8"),
            access="private",
            content_type="application/json",
            overwrite=True,
            token=settings.blob_read_write_token,
        )
        return payload

    def _prefix(self, user_id: int) -> str:
        return f"users/{user_id}/entries/"

    def _generate_id(self) -> int:
        return int(datetime.utcnow().timestamp() * 1000)

    def _user_hash(self, email: str) -> str:
        return hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()

    def _user_path(self, email: str) -> str:
        return f"users/accounts/{self._user_hash(email)}.json"

    def _state_path(self, user_id: int, key: str) -> str:
        return f"users/{user_id}/state/{key}.json"


    def _serialize_entry(self, entry: EntryResponse) -> dict[str, Any]:
        payload = entry.model_dump()
        payload["created_at"] = entry.created_at.isoformat()
        return payload

    def _fetch_blob_json(self, url: str) -> dict[str, Any] | None:
        response = httpx.get(
            url,
            headers={"Authorization": f"Bearer {settings.blob_read_write_token}"},
            timeout=10.0,
        )
        if response.status_code != 200:
            return None
        return response.json()

    def _deserialize_entry(self, payload: dict[str, Any]) -> EntryResponse:
        return EntryResponse(
            id=payload["id"],
            user_id=payload["user_id"],
            content=payload["content"],
            mood=payload.get("mood"),
            mood_score=payload.get("mood_score"),
            tags=payload.get("tags", []),
            created_at=datetime.fromisoformat(payload["created_at"]),
            insight=InsightPayload(**payload["insight"]) if payload.get("insight") else None,
        )
