"""OpenWeather integration for environmental capsule locks."""

import logging

import httpx

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
_OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"


async def _fetch_weather(params: dict[str, object]) -> dict | None:
    """Fetch current conditions without leaking provider credentials into logs."""
    api_key = settings.weather_api_key
    if not api_key:
        logger.warning("weather.api_key_missing")
        return None

    request_params = {**params, "appid": api_key}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(_OPENWEATHER_URL, params=request_params)
            response.raise_for_status()
        data = response.json()
        return data if isinstance(data, dict) else None
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "weather.provider_http_error",
            extra={"status_code": exc.response.status_code},
        )
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        logger.warning("weather.provider_error", extra={"reason": type(exc).__name__})
    return None


async def check_if_raining(city: str) -> bool:
    """Return whether OpenWeather reports rain, drizzle, or a thunderstorm."""
    normalized_city = city.strip()
    if not normalized_city:
        return False

    data = await _fetch_weather({"q": normalized_city})
    if not data:
        return False

    conditions = data.get("weather")
    if not isinstance(conditions, list) or not conditions:
        return False
    first = conditions[0]
    if not isinstance(first, dict):
        return False
    return first.get("main") in {"Rain", "Drizzle", "Thunderstorm"}


async def get_temperature(lat: float, lon: float) -> float | None:
    """Get current temperature in Fahrenheit for validated coordinates."""
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None

    data = await _fetch_weather({"lat": lat, "lon": lon, "units": "imperial"})
    if not data:
        return None

    main = data.get("main")
    if not isinstance(main, dict):
        return None
    temperature = main.get("temp")
    return float(temperature) if isinstance(temperature, (int, float)) else None
