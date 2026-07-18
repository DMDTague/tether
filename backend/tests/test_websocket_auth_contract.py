import pytest

from main import websocket_endpoint


class RejectableWebSocket:
    def __init__(self):
        self.closed_with = None

    async def close(self, code: int, reason: str):
        self.closed_with = (code, reason)


@pytest.mark.asyncio
async def test_websocket_rejects_connections_without_a_ticket():
    websocket = RejectableWebSocket()

    await websocket_endpoint(websocket, ticket="", region="")

    assert websocket.closed_with == (4003, "Authentication required")
