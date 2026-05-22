from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
from requests.exceptions import ConnectionError, HTTPError

def send_push_message(token: str, message: str, extra=None):
    try:
        response = PushClient().publish(
            PushMessage(to=token, body=message, data=extra)
        )
    except PushServerError as exc:
        print(f"Push Server Error: {exc}")
        return
    except (ConnectionError, HTTPError) as exc:
        print(f"Connection Error: {exc}")
        return

    try:
        response.validate_response()
    except DeviceNotRegisteredError:
        print(f"Token {token} is no longer registered.")
        # Handle unregistering token
    except PushTicketError as exc:
        print(f"Push Ticket Error: {exc}")
