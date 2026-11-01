import base64
import hashlib
import hmac
import os
import time

from app.core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return f"{base64.b64encode(salt).decode()}:{base64.b64encode(digest).decode()}"


def verify_password(password: str, hashed_password: str) -> bool:
    if ":" not in hashed_password:
        return hmac.compare_digest(password, hashed_password)

    try:
        salt_b64, digest_b64 = hashed_password.split(":", 1)
        salt = base64.b64decode(salt_b64.encode())
        expected = base64.b64decode(digest_b64.encode())
    except Exception:
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return hmac.compare_digest(actual, expected)


def create_session_token(user_id: int, email: str) -> str:
    issued_at = int(time.time())
    expires_at = issued_at + settings.session_ttl_seconds
    payload = f"{user_id}:{email.lower()}:{expires_at}"
    signature = hmac.new(
        settings.session_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    token = f"{payload}:{signature}"
    return base64.urlsafe_b64encode(token.encode("utf-8")).decode("utf-8")


def verify_session_token(token: str) -> dict[str, str | int] | None:
    try:
        raw = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        user_id, email, expires_at, signature = raw.split(":", 3)
    except Exception:
        return None

    payload = f"{user_id}:{email}:{expires_at}"
    expected_signature = hmac.new(
        settings.session_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        return None

    if int(expires_at) < int(time.time()):
        return None

    return {"user_id": int(user_id), "email": email.lower(), "expires_at": int(expires_at)}
