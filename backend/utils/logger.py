import json
import logging

logging.basicConfig(level=logging.INFO)
_logger = logging.getLogger("tether_app")

class StructuredLogger:
    @staticmethod
    def info(event: str, **kwargs):
        _logger.info(f"[INFO] {event} {json.dumps(kwargs)}")

    @staticmethod
    def warn(event: str, **kwargs):
        _logger.warning(f"[WARN] {event} {json.dumps(kwargs)}")

    @staticmethod
    def error(event: str, **kwargs):
        _logger.error(f"[ERROR] {event} {json.dumps(kwargs)}")

logger = StructuredLogger()
