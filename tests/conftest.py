import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.main import (
    app as fastapi_app,
)  # FastAPI アプリケーションと get_db をインポート
from src.main import get_db
from src.models.stock import Base

Base.metadata.clear()  # ここに移動

# テスト用データベースのURL (インメモリSQLite)
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def engine():
    """Provides a SQLAlchemy engine for the test database."""
    return create_engine(TEST_DATABASE_URL)


@pytest.fixture(scope="session")
def tables(engine):
    """Creates and drops database tables for the test session."""
    # Clear metadata before creating tables for a clean slate
    Base.metadata.clear()  # ここでクリア
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="function")
def db_session(engine, tables):
    """Provides a transactional database session for each test function."""
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = Session()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Provides a test client for the FastAPI application."""
    # Override the get_db dependency to use the test session
    fastapi_app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.clear()
