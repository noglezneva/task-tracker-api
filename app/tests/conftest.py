import os
from collections.abc import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.db import Base, get_db
from app.main import create_app


TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")


@pytest_asyncio.fixture(scope="session")
async def db_engine() -> AsyncGenerator[AsyncEngine, None]:
    engine = create_async_engine(TEST_DATABASE_URL, future=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        yield engine
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

        await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    async with db_engine.connect() as connection:
        transaction = await connection.begin()

        testing_session_local = async_sessionmaker(
            bind=connection,
            autocommit=False,
            autoflush=False,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        async with testing_session_local() as session:
            try:
                yield session
            finally:
                await transaction.rollback()


def override_get_db(db_session: AsyncSession):
    async def _get_db_override() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    return _get_db_override


@pytest.fixture(scope="function")
def app(db_session: AsyncSession) -> FastAPI:
    application = create_app()
    application.dependency_overrides[get_db] = override_get_db(db_session)
    return application


@pytest.fixture(scope="function")
def client(app: FastAPI) -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c