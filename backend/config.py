"""Typed runtime configuration for the Tether API."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
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
    OPENWEATHER_API_KEY: str = ""
    JWT_SECRET: str = ""
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:19006,http://127.0.0.1:3000,http://127.0.0.1:19006"
    ALLOW_ANONYMOUS_WS: bool = False
    AUTH_RATE_LIMIT_ATTEMPTS: int = 10
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 300
    LOCATION_CELL_DEGREES: float = 0.1
    LOCATION_TTL_SECONDS: int = 900
    PULSE_COOLDOWN_SECONDS: int = 3
    MAX_WS_MESSAGE_BYTES: int = 16_384
    TELEMETRY_ENABLED: bool = True
    AD_SSV_SECRET: str = ""

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in {"production", "prod"}

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def validate_runtime(self) -> None:
        unsafe = {
            "",
            "change-me-in-production",
            "local-development-only-change-me",
            "tether-dev-secret-key-change-in-production",
        }
        if self.SECRET_KEY in unsafe or len(self.SECRET_KEY) < 32:
            raise RuntimeError("Tether requires a unique SECRET_KEY of at least 32 characters.")
        if not self.cors_origins or "*" in self.cors_origins:
            raise RuntimeError("Tether requires an explicit CORS_ORIGINS allowlist.")
        if self.ALLOW_ANONYMOUS_WS:
            raise RuntimeError("Anonymous WebSocket connections are disabled.")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_runtime()
    return settings
