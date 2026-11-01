from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_sqlite_compatibility(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as connection:
        columns = connection.execute(text("PRAGMA table_info(insights)")).fetchall()
        column_names = {column[1] for column in columns}
        if "based_on_patterns" not in column_names:
            connection.execute(text("ALTER TABLE insights ADD COLUMN based_on_patterns TEXT"))

        user_columns = connection.execute(text("PRAGMA table_info(users)")).fetchall()
        user_column_names = {column[1] for column in user_columns}
        if "reminder_settings" not in user_column_names:
            connection.execute(text("ALTER TABLE users ADD COLUMN reminder_settings TEXT"))
        if "privacy_settings" not in user_column_names:
            connection.execute(text("ALTER TABLE users ADD COLUMN privacy_settings TEXT"))
        if "weekly_review" not in user_column_names:
            connection.execute(text("ALTER TABLE users ADD COLUMN weekly_review TEXT"))
