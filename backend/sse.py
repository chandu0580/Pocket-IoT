"""Server-Sent Events broadcaster for real-time dashboard updates."""
from __future__ import annotations

import json
import queue
import threading
from typing import Any, Dict, Iterator


class SSEBroadcaster:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._clients: list[queue.Queue] = []

    def subscribe(self) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=100)
        with self._lock:
            self._clients.append(q)
        return q

    def unsubscribe(self, q: queue.Queue) -> None:
        with self._lock:
            try:
                self._clients.remove(q)
            except ValueError:
                pass

    def broadcast(self, event_type: str, data: Dict[str, Any]) -> None:
        message = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
        with self._lock:
            dead: list[queue.Queue] = []
            for q in self._clients:
                try:
                    q.put_nowait(message)
                except queue.Full:
                    dead.append(q)
            for d in dead:
                self._clients.remove(d)

    def stream_generator(self, q: queue.Queue) -> Iterator[str]:
        """Yield SSE messages, keeps connection alive with comments every 20s."""
        yield 'data: {"type":"connected"}\n\n'
        try:
            while True:
                try:
                    msg = q.get(timeout=20)
                    yield msg
                except queue.Empty:
                    yield ": keepalive\n\n"
        except GeneratorExit:
            self.unsubscribe(q)


broadcaster = SSEBroadcaster()
