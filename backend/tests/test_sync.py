"""
Tether Backend Tests

Tests for the sync engine, models, and API routes.
"""

import pytest
import time
from services.sync import sync_engine


class TestSyncEngine:
    """Test the event-driven sync engine."""

    def test_calculate_position_playing(self):
        """Position should be now - track_start_epoch."""
        now = int(time.time() * 1000)
        start = now - 5000  # Started 5 seconds ago
        pos = sync_engine.calculate_position_ms(start, 300000, False)
        assert 4500 <= pos <= 6000  # Allow some timing slack

    def test_calculate_position_paused(self):
        """Position should be the pause snapshot."""
        pos = sync_engine.calculate_position_ms(0, 300000, True, 42000)
        assert pos == 42000

    def test_calculate_position_at_end(self):
        """Position should not exceed track duration."""
        now = int(time.time() * 1000)
        start = now - 999999  # Way past track end
        pos = sync_engine.calculate_position_ms(start, 300000, False)
        assert pos == 300000

    def test_drift_calculation(self):
        """Drift is the absolute difference between positions."""
        assert sync_engine.calculate_drift(5000, 3000) == 2000
        assert sync_engine.calculate_drift(3000, 5000) == 2000

    def test_needs_correction_under_threshold(self):
        """No correction for drift under 2 seconds."""
        assert sync_engine.needs_correction(1500) is False
        assert sync_engine.needs_correction(500) is False

    def test_needs_correction_over_threshold(self):
        """Correction needed for drift over 2 seconds."""
        assert sync_engine.needs_correction(2500) is True
        assert sync_engine.needs_correction(5000) is True

    def test_create_track_start_epoch(self):
        """Track start epoch should be now minus offset."""
        now = int(time.time() * 1000)
        epoch = sync_engine.create_track_start_epoch(5000)
        assert abs(epoch - (now - 5000)) < 100  # Within 100ms

    def test_pause_snapshot(self):
        """Pause snapshot should capture current position."""
        now = int(time.time() * 1000)
        start = now - 10000  # Started 10 seconds ago
        pos = sync_engine.pause_snapshot(start, 300000)
        assert 9500 <= pos <= 11000  # Allow timing slack

    def test_pause_snapshot_clamps(self):
        """Pause snapshot should not go below 0 or above duration."""
        now = int(time.time() * 1000)
        future_start = now + 5000  # Hasn't started yet
        pos = sync_engine.pause_snapshot(future_start, 300000)
        assert pos == 0


class TestReconnectionProtocol:
    """Test the reconnection logic concepts."""

    def test_drift_under_threshold_no_seek(self):
        """If drift < 2s, no seek correction should be issued."""
        client_pos = 45000
        server_pos = 46000
        drift = sync_engine.calculate_drift(client_pos, server_pos)
        assert not sync_engine.needs_correction(drift)

    def test_drift_over_threshold_needs_seek(self):
        """If drift > 2s, a seek correction should be issued."""
        client_pos = 45000
        server_pos = 50000  # 5 second drift
        drift = sync_engine.calculate_drift(client_pos, server_pos)
        assert sync_engine.needs_correction(drift)
