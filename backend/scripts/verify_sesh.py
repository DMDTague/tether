#!/usr/bin/env python3
"""Verify Sesh model accepts status=pending (run from backend/: python3 scripts/verify_sesh.py)."""
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models.models import Sesh  # noqa: E402


def main() -> None:
    publish_at = datetime.now(timezone.utc) + timedelta(hours=1)
    test_sesh = Sesh(
        user_id="dylan-test-id",
        status="pending",
        publish_at=publish_at,
        tracks=[{"id": "t1", "name": "Test", "artist": "Artist", "artUrl": ""}],
    )
    print("Sesh model verified:", test_sesh.status)
    print("publish_at:", test_sesh.publish_at)
    assert test_sesh.status == "pending"
    print("OK")


if __name__ == "__main__":
    main()
