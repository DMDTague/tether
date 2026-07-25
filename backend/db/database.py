"""Async database setup with migration discipline in production."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import get_settings

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
# Backwards-compatible name used by older services.
async_session_maker = async_session


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create tables only for local development.

    Production must be deployed at a known Alembic revision. Silently calling
    ``create_all`` in production can produce a schema that does not match the
    migrations or rollback plan.
    """
    if not settings.is_production:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        return

    async with engine.connect() as conn:
        try:
            revision = await conn.scalar(text("SELECT version_num FROM alembic_version LIMIT 1"))
        except Exception as exc:
            raise RuntimeError(
                "Production database is not Alembic-managed; run migrations before startup."
            ) from exc
        if not revision:
            raise RuntimeError("Production database has no Alembic revision.")
