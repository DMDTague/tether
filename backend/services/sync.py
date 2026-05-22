"""
Tether Event-Driven Sync Engine

Uses local clock as source of truth for playback position.
API is only called on user-initiated events (skip, pause, resume).
"""

import time


class SyncEngine:
    """Calculates playback position using the local clock model."""

    @staticmethod
    def calculate_position_ms(track_start_epoch: int, track_duration_ms: int, is_paused: bool, pause_position_ms: int = 0) -> int:
        """
        Calculate the current playback position in milliseconds.
        
        When playing: position = now - track_start_epoch
        When paused:  position = pause_position_ms
        """
        if is_paused:
            return pause_position_ms

        now = int(time.time() * 1000)
        position = now - track_start_epoch

        # Handle looping or track end
        if position >= track_duration_ms:
            return track_duration_ms
        if position < 0:
            return 0

        return position

    @staticmethod
    def calculate_drift(client_position_ms: int, server_position_ms: int) -> int:
        """Calculate the drift between client and server positions."""
        return abs(client_position_ms - server_position_ms)

    @staticmethod
    def needs_correction(drift_ms: int, threshold_ms: int = 2000) -> bool:
        """Determine if the drift warrants a seek correction (> 2 seconds)."""
        return drift_ms > threshold_ms

    @staticmethod
    def create_track_start_epoch(position_ms: int = 0) -> int:
        """Create a track_start_epoch for the current time, optionally offset by position."""
        now = int(time.time() * 1000)
        return now - position_ms

    @staticmethod
    def pause_snapshot(track_start_epoch: int, track_duration_ms: int) -> int:
        """Take a snapshot of the current position when pausing."""
        now = int(time.time() * 1000)
        position = now - track_start_epoch
        return max(0, min(position, track_duration_ms))


sync_engine = SyncEngine()
