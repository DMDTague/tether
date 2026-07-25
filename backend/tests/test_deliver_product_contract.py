"""Regression contracts for honest recommendations and durable product systems."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_recommendations_expose_uncertainty_and_outcomes():
    source = (ROOT / "routes" / "recommendations.py").read_text()
    assert "no observed listen" in source
    assert "provenance" in source
    assert "RecommendationExposure" in source
    assert "RecommendationOutcome" in source
    assert "vibe_vector" not in source


def test_exchange_ranks_meaningful_outcomes():
    source = (ROOT / "routes" / "music_culture.py").read_text()
    assert 'counts["tetherCount"] * 6' in source
    assert 'counts["playCount"] * 3' in source
    assert "ReviewUsefulness" in source
    assert '["listen", "send", "tether"' in source


def test_telemetry_is_persisted_not_only_logged():
    source = (ROOT / "routes" / "telemetry.py").read_text()
    assert "ProductEvent(" in source
    assert '"ten_second_tether"' in source
    assert '"wavelength_to_tether"' in source
    assert '"exchange_to_listen"' in source
    assert "logger.info" not in source


def test_production_requires_migrations():
    source = (ROOT / "db" / "database.py").read_text()
    assert "alembic_version" in source
    assert "run_sync(Base.metadata.create_all)" in source
    assert "if not settings.is_production" in source
