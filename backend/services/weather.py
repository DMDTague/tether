import httpx
import logging
from config import get_settings

logger = logging.getLogger(__name__)

async def check_if_raining(city: str) -> bool:
    """
    Check if it's currently raining or drizzling in the given city using OpenWeather API.
    """
    settings = get_settings()
    if not settings.WEATHER_API_KEY:
        logger.warning("WEATHER_API_KEY not set. Defaulting to False for rain checks.")
        return False
        
    if not city:
        return False

    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={settings.WEATHER_API_KEY}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            
        if response.status_code != 200:
            logger.error(f"OpenWeather API error: {response.status_code} - {response.text}")
            return False
            
        data = response.json()
        
        # Check if 'weather' array exists and has elements
        if "weather" in data and len(data["weather"]) > 0:
            main_condition = data["weather"][0].get("main", "")
            return main_condition in ("Rain", "Drizzle", "Thunderstorm")
            
        return False
        
    except Exception as e:
        return False

async def get_temperature(lat: float, lon: float) -> float | None:
    """Get current temperature in Fahrenheit for coordinates."""
    settings = get_settings()
    if not settings.WEATHER_API_KEY:
        return None
        
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={settings.WEATHER_API_KEY}&units=imperial"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            
        if response.status_code == 200:
            data = response.json()
            return data.get("main", {}).get("temp")
    except Exception as e:
        logger.error(f"Exception getting temperature: {str(e)}")
        
    return None
