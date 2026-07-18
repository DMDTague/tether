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


def test_production_accepts_explicit_safe_settings():
    settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="x" * 40,
        CORS_ORIGINS="https://tether.example",
        ALLOW_ANONYMOUS_WS=False,
    )
    settings.validate_runtime()
