"""Expo push notification delivery helpers."""

import logging

from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
from requests.exceptions import ConnectionError, HTTPError

logger = logging.getLogger(__name__)


def send_push_message(token: str, message: str, extra: dict | None = None) -> bool:
    """Deliver one Expo push without logging device tokens or message content."""
    if not token:
        return False

    try:
        response = PushClient().publish(PushMessage(to=token, body=message, data=extra))
    except PushServerError as exc:
        logger.warning("push.server_error", extra={"reason": type(exc).__name__})
        return False
    except (ConnectionError, HTTPError) as exc:
        logger.warning("push.connection_error", extra={"reason": type(exc).__name__})
        return False

    try:
        response.validate_response()
    except DeviceNotRegisteredError:
        logger.info("push.device_not_registered")
        return False
    except PushTicketError as exc:
        logger.warning("push.ticket_error", extra={"reason": type(exc).__name__})
        return False
    return True
