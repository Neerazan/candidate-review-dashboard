from __future__ import annotations

import json
from datetime import UTC, datetime
from queue import Queue
from threading import Lock


class CandidateEventBus:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[Queue[str]]] = {}
        self._lock = Lock()

    def subscribe(self, candidate_id: str) -> Queue[str]:
        channel: Queue[str] = Queue()
        with self._lock:
            self._subscribers.setdefault(candidate_id, set()).add(channel)
        return channel

    def unsubscribe(self, candidate_id: str, channel: Queue[str]) -> None:
        with self._lock:
            if candidate_id not in self._subscribers:
                return
            self._subscribers[candidate_id].discard(channel)
            if not self._subscribers[candidate_id]:
                del self._subscribers[candidate_id]

    def publish_score_event(self, candidate_id: str, action: str, score_id: str) -> None:
        payload = {
            "candidate_id": candidate_id,
            "action": action,
            "score_id": score_id,
            "updated_at": datetime.now(UTC).isoformat(),
        }
        message = f"event: score_updated\ndata: {json.dumps(payload)}\n\n"

        with self._lock:
            channels = list(self._subscribers.get(candidate_id, set()))

        for channel in channels:
            channel.put(message)


candidate_event_bus = CandidateEventBus()
