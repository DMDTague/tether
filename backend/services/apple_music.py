import time
import jwt
from config import get_settings

settings = get_settings()

def get_apple_music_developer_token() -> str:
    """
    Generate an Apple Music Developer Token.
    This requires a 10-character Team ID, a 10-character Key ID, and the private key content.
    """
    team_id = getattr(settings, "APPLE_TEAM_ID", None)
    key_id = getattr(settings, "APPLE_KEY_ID", None)
    private_key = getattr(settings, "APPLE_PRIVATE_KEY", None)

    if not team_id or not key_id or not private_key:
        print("⚠️ Apple Music credentials not configured. Using dummy token.")
        return "dummy-apple-developer-token"

    # Token expires in 30 days (Apple recommends max 6 months)
    headers = {
        "alg": "ES256",
        "kid": key_id
    }
    
    payload = {
        "iss": team_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + (86400 * 30) 
    }

    try:
        token = jwt.encode(payload, private_key, algorithm="ES256", headers=headers)
        return token
    except Exception as e:
        print(f"❌ Failed to generate Apple Developer Token: {e}")
        return "dummy-apple-developer-token"
