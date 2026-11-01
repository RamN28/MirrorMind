import os
from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


def get_default_database_url() -> str:
    explicit_database_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if explicit_database_url:
        return normalize_database_url(explicit_database_url)

    # Vercel serverless functions can only write to /tmp.
    if os.getenv("VERCEL") or os.getenv("VERCEL_ENV") or Path("/var/task").exists():
        return "sqlite:////tmp/mirrormind.db"

    return f"sqlite:///{(Path(__file__).resolve().parents[2] / 'mirrormind.db').as_posix()}"


IS_VERCEL_RUNTIME = bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV") or Path("/var/task").exists())


class Settings(BaseSettings):
    app_name: str = "MirrorMind"
    database_url: str = get_default_database_url()
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    session_secret: str = "mirrormind-dev-session-secret"
    session_ttl_seconds: int = 60 * 60 * 24 * 14
    blob_read_write_token: str | None = None
    cors_origins: list[str] = ["http://localhost:3000"]
    demo_user_email: str = "demo@mirrormind.app"
    demo_user_password: str = "demo123"

    @model_validator(mode="after")
    def normalize_urls(self):
        self.database_url = normalize_database_url(self.database_url)
        return self

    model_config = SettingsConfigDict(
        env_file=None if IS_VERCEL_RUNTIME else ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
