import os
from pathlib import Path
import sqlite3
import subprocess
import sys


def test_clean_database_migrates_to_required_head(tmp_path):
    backend = Path(__file__).resolve().parents[1]
    database_path = tmp_path / "clean-migration.db"
    environment = os.environ.copy()
    environment.update(
        {
            "DATABASE_URL": f"sqlite+aiosqlite:///{database_path}",
            "SECRET_KEY": "migration-test-secret-key-longer-than-thirty-two",
        }
    )
    executable = Path(sys.executable).parent / "alembic"
    subprocess.run(
        [str(executable), "upgrade", "head"],
        cwd=backend,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )

    with sqlite3.connect(database_path) as connection:
        revision = connection.execute("SELECT version_num FROM alembic_version").fetchone()
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
    assert revision == ("e4d7b2a91c30",)
    assert {"dating_profile_media", "private_album_grants", "tap_tether_tokens"}.issubset(tables)
