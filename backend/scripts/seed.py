from app.core.config import get_settings
from app.db.bootstrap import ensure_demo_seed
from app.db.session import Base, SessionLocal, engine

settings = get_settings()


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    ensure_demo_seed(db)
    print("Seeded MirrorMind demo data.")
    db.close()


if __name__ == "__main__":
    main()
