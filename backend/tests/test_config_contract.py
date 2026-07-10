import pytest

from config import Settings


def test_production_rejects_default_secret():
    with pytest.raises(RuntimeError):
        Settings(ENVIRONMENT="production", SECRET_KEY="local-development-only-change-me").validate_runtime()


def test_production_rejects_wildcard_cors():
    with pytest.raises(RuntimeError):
        Settings(ENVIRONMENT="production", SECRET_KEY="x" * 40, CORS_ORIGINS="*").validate_runtime()


def test_production_accepts_explicit_safe_defaults():
    settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="x" * 40,
        CORS_ORIGINS="https://tether.example",
        ALLOW_ANONYMOUS_WS=False,
    )
    settings.validate_runtime()
