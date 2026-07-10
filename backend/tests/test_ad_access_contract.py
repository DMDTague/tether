from routes.ad_pass import AdPassStatus


def test_core_access_is_never_ad_gated():
    status = AdPassStatus()
    assert status.active is True
    assert status.core_access_gated is False
