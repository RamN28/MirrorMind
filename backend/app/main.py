from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.db.bootstrap import ensure_blob_demo_seed, ensure_demo_seed
from app.db.migrations import ensure_sqlite_compatibility
from app.db.session import Base, engine
from app.db.session import SessionLocal

settings = get_settings()

Base.metadata.create_all(bind=engine)
ensure_sqlite_compatibility(engine)
with SessionLocal() as db:
    ensure_demo_seed(db)
ensure_blob_demo_seed()

app = FastAPI(
    title="MirrorMind API",
    version="0.1.0",
    description="Backend API for MirrorMind, an AI self-awareness coach.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
