import time

from jose import jwt

from config import get_settings

settings = get_settings()


def get_apple_music_developer_token() -> str:
    """Generate an Apple Music developer token using the installed JWT stack."""
    team_id = getattr(settings, "APPLE_TEAM_ID", None)
    key_id = getattr(settings, "APPLE_KEY_ID", None)
    private_key = getattr(settings, "APPLE_PRIVATE_KEY", None)

    if not team_id or not key_id or not private_key:
        return "dummy-apple-developer-token"

    headers = {"alg": "ES256", "kid": key_id}
    payload = {
        "iss": team_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + (86400 * 30),
    }

    try:
        return jwt.encode(payload, private_key, algorithm="ES256", headers=headers)
    except Exception:
        return "dummy-apple-developer-token"
