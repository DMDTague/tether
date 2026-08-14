import pytest

from config import Settings


@pytest.mark.parametrize(
    "secret",
    [
        "",
        "change-me-in-production",
        "local-development-only-change-me",
        "tether-dev-secret-key-change-in-production",
        "too-short",
    ],
)
def test_every_environment_rejects_unsafe_secrets(secret):
    with pytest.raises(RuntimeError, match="unique SECRET_KEY"):
        Settings(ENVIRONMENT="development", SECRET_KEY=secret).validate_runtime()


def test_every_environment_rejects_wildcard_cors():
    with pytest.raises(RuntimeError, match="explicit CORS_ORIGINS allowlist"):
        Settings(ENVIRONMENT="development", SECRET_KEY="x" * 40, CORS_ORIGINS="*").validate_runtime()


def test_every_environment_rejects_anonymous_websockets():
    with pytest.raises(RuntimeError, match="Anonymous WebSocket connections are disabled"):
        Settings(
            ENVIRONMENT="development",
            SECRET_KEY="x" * 40,
            ALLOW_ANONYMOUS_WS=True,
        ).validate_runtime()


def test_runtime_rejects_non_hmac_jwt_algorithm():
    with pytest.raises(RuntimeError, match="ALGORITHM=HS256"):
        Settings(
            ENVIRONMENT="development",
            SECRET_KEY="x" * 40,
            ALGORITHM="ES256",
        ).validate_runtime()


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("ACCESS_TOKEN_EXPIRE_MINUTES", 0, "ACCESS_TOKEN_EXPIRE_MINUTES"),
        ("REFRESH_TOKEN_EXPIRE_DAYS", 0, "REFRESH_TOKEN_EXPIRE_DAYS"),
        ("WS_TICKET_EXPIRE_SECONDS", 0, "WS_TICKET_EXPIRE_SECONDS"),
        ("AUTH_RATE_LIMIT_ATTEMPTS", 0, "rate-limit"),
        ("AUTH_RATE_LIMIT_WINDOW_SECONDS", 0, "rate-limit"),
        ("LOCATION_CELL_DEGREES", 0, "LOCATION_CELL_DEGREES"),
        ("LOCATION_CELL_DEGREES", 1.1, "LOCATION_CELL_DEGREES"),
        ("LOCATION_TTL_SECONDS", 0, "Location and pulse TTL"),
        ("PULSE_COOLDOWN_SECONDS", 0, "Location and pulse TTL"),
        ("MAX_WS_MESSAGE_BYTES", 0, "MAX_WS_MESSAGE_BYTES"),
    ],
)
def test_runtime_rejects_invalid_positive_bounds(field, value, message):
    settings = Settings(ENVIRONMENT="development", SECRET_KEY="x" * 40, **{field: value})
    with pytest.raises(RuntimeError, match=message):
        settings.validate_runtime()


def test_production_accepts_explicit_safe_settings():
    settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="x" * 40,
        CORS_ORIGINS="https://tether.example",
        ALLOW_ANONYMOUS_WS=False,
    )
    settings.validate_runtime()
