from typing import Dict

from fastapi import WebSocket


class WebsocketManager:
    def __init__(self) -> None:
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket) -> int:
        await websocket.accept()
        connection_id = id(websocket)
        self.active_connections[connection_id] = websocket
        return connection_id

    def disconnect(self, connection_id: int) -> None:
        self.active_connections.pop(connection_id, None)

    async def broadcast(self, message: dict) -> None:
        stale = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception:
                stale.append(connection_id)
        for connection_id in stale:
            self.disconnect(connection_id)


manager = WebsocketManager()
