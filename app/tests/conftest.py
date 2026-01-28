import os
import uuid
from collections.abc import Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.db import Base, get_db
from app.main import create_app


TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite+pysqlite:///:memory:")


@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(TEST_DATABASE_URL, future=True)
    Base.metadata.create_all(bind=engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine) -> Generator[Session, None, None]:
    connection = db_engine.connect()
    transaction = connection.begin()
    TestingSessionLocal = sessionmaker(bind=connection, autocommit=False, autoflush=False, future=True)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


def override_get_db(db_session: Session):
    def _get_db_override() -> Generator[Session, None, None]:
        try:
            yield db_session
        finally:
            pass

    return _get_db_override


@pytest.fixture(scope="function")
def app(db_session: Session) -> FastAPI:
    app = create_app()
    app.dependency_overrides[get_db] = override_get_db(db_session)
    return app


@pytest.fixture(scope="function")
def client(app: FastAPI) -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


