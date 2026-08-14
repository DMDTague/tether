"""Typed runtime configuration for the Tether API."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///./tether.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    WS_TICKET_EXPIRE_SECONDS: int = 60
    WEATHER_API_KEY: str = ""
    SPOTIFY_CLIENT_ID: str = ""
    SPOTIFY_CLIENT_SECRET: str = ""
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:19006,http://127.0.0.1:3000,http://127.0.0.1:19006"
    ALLOW_ANONYMOUS_WS: bool = False
    # Only honour X-Forwarded-For when the API actually sits behind a proxy you control.
    # Left False, a client can defeat auth rate limiting by sending a random XFF per request.
    TRUST_PROXY_HEADERS: bool = False
    AUTH_RATE_LIMIT_ATTEMPTS: int = 10
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 300
    LOCATION_CELL_DEGREES: float = 0.1
    LOCATION_TTL_SECONDS: int = 900
    PULSE_COOLDOWN_SECONDS: int = 3
    MAX_WS_MESSAGE_BYTES: int = 16_384
    TELEMETRY_ENABLED: bool = True
    TELEMETRY_ADMIN_USER_IDS: str = ""
    AD_SSV_SECRET: str = ""

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in {"production", "prod"}

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def telemetry_admin_user_ids(self) -> set[str]:
        return {value.strip() for value in self.TELEMETRY_ADMIN_USER_IDS.split(",") if value.strip()}

    def validate_runtime(self) -> None:
        unsafe = {
            "",
            "change-me-in-production",
            "local-development-only-change-me",
            "tether-dev-secret-key-change-in-production",
        }
        if self.SECRET_KEY in unsafe or len(self.SECRET_KEY.encode("utf-8")) < 32:
            raise RuntimeError("Tether requires a unique SECRET_KEY of at least 32 bytes.")
        # python-jose currently brings an unfixed ECDSA advisory into the dependency
        # tree. Tether deliberately uses HMAC only; make that an enforced invariant
        # instead of a convention that an environment variable can silently break.
        if self.ALGORITHM != "HS256":
            raise RuntimeError("Tether currently requires ALGORITHM=HS256.")
        if not self.cors_origins or "*" in self.cors_origins:
            raise RuntimeError("Tether requires an explicit CORS_ORIGINS allowlist.")
        if self.ALLOW_ANONYMOUS_WS:
            raise RuntimeError("Anonymous WebSocket connections are disabled.")
        if self.ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
            raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be positive.")
        if self.REFRESH_TOKEN_EXPIRE_DAYS <= 0:
            raise RuntimeError("REFRESH_TOKEN_EXPIRE_DAYS must be positive.")
        if self.WS_TICKET_EXPIRE_SECONDS <= 0:
            raise RuntimeError("WS_TICKET_EXPIRE_SECONDS must be positive.")
        if self.AUTH_RATE_LIMIT_ATTEMPTS <= 0 or self.AUTH_RATE_LIMIT_WINDOW_SECONDS <= 0:
            raise RuntimeError("Authentication rate-limit settings must be positive.")
        if not (0 < self.LOCATION_CELL_DEGREES <= 1):
            raise RuntimeError("LOCATION_CELL_DEGREES must be greater than 0 and at most 1.")
        if self.LOCATION_TTL_SECONDS <= 0 or self.PULSE_COOLDOWN_SECONDS <= 0:
            raise RuntimeError("Location and pulse TTL settings must be positive.")
        if self.MAX_WS_MESSAGE_BYTES <= 0:
            raise RuntimeError("MAX_WS_MESSAGE_BYTES must be positive.")


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_runtime()
    return settings
