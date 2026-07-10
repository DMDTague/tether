from types import SimpleNamespace

from routes.discovery import _enrich_user_dict


def test_discovery_payload_never_contains_phone_number():
    user = SimpleNamespace(
        id="user-1",
        username="listener",
        display_name="Listener",
        initials="LI",
        privacy_mode="open",
        ad_free_until=None,
        streaming_service="spotify",
        has_premium=False,
        bio=None,
        profile_picture_url=None,
        is_onboarded=True,
        is_sparked=False,
        theme_colors=None,
        backdrop_type="auto_mesh",
        backdrop_url=None,
        primary_vibe="chill",
        skia_style="mesh",
        skia_speed=1.0,
        vibe_vector=None,
        top_artists=[],
        phone_number="2155550100",
        spark_token="private",
    )
    payload = _enrich_user_dict(user)
    assert "phoneNumber" not in payload
    assert "phone_number" not in payload
    assert "sparkToken" not in payload
