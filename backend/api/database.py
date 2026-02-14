"""Database configuration and session management."""
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session

from .config import settings
from .models.db_models import Base


class Database:
    """Singleton database manager."""

    _instance = None
    _engine: Engine | None = None
    _session_factory = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def initialize(self):
        """Initialize database engine and session factory."""
        if self._engine is None:
            # Create engine with SQLite-specific settings
            self._engine = create_engine(
                f"sqlite:///{settings.db_path}",
                echo=settings.log_level == "DEBUG",
                connect_args={"check_same_thread": False},  # Allow multi-threaded access
                pool_pre_ping=True,  # Verify connections before using
            )

            # Enable foreign key constraints for SQLite
            @event.listens_for(self._engine, "connect")
            def set_sqlite_pragma(dbapi_conn, _connection_record):
                cursor = dbapi_conn.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()

            # Create session factory
            self._session_factory = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self._engine,
            )

            # Create all tables
            Base.metadata.create_all(bind=self._engine)

    @property
    def engine(self) -> Engine:
        """Get database engine."""
        if self._engine is None:
            self.initialize()
        assert self._engine is not None
        return self._engine

    @property
    def session_factory(self):
        """Get session factory."""
        if self._session_factory is None:
            self.initialize()
        assert self._session_factory is not None
        return self._session_factory

    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """Get database session context manager."""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


# Global database instance
db = Database()


def init_db():
    """Initialize database (create tables if needed)."""
    db.initialize()


def get_db() -> Generator[Session, None, None]:
    """Get database session for dependency injection."""
    session = db.session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
