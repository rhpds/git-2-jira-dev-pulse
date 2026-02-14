"""SQLAlchemy database models."""
import json
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.types import TypeDecorator

# Create declarative base for models
Base = declarative_base()


class JSONType(TypeDecorator):
    """Custom type for JSON serialization."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Serialize to JSON string."""
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):
        """Deserialize from JSON string."""
        if value is not None:
            return json.loads(value)
        return None


class AnalysisRun(Base):
    """Stores information about each analysis run."""

    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    repos_analyzed = Column(JSONType, nullable=False)  # List of repo paths/names
    project_key = Column(String(50), nullable=True, index=True)
    metadata = Column(JSONType, nullable=True)  # Additional info (commit counts, etc.)

    # Relationship to suggestions
    suggestions = relationship(
        "AnalysisSuggestion",
        back_populates="analysis_run",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        repos_list = self.repos_analyzed if isinstance(self.repos_analyzed, list) else []
        return f"<AnalysisRun(id={self.id}, timestamp={self.timestamp}, repos={len(repos_list)})>"


class TicketTemplate(Base):
    """Stores ticket templates for different types of work."""

    __tablename__ = "ticket_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    summary_pattern = Column(String(500), nullable=False)
    description_template = Column(Text, nullable=False)
    issue_type = Column(String(50), nullable=False, default="Task")
    priority = Column(String(20), nullable=False, default="Medium")
    labels = Column(JSONType, nullable=True)  # List of label strings
    is_default = Column(Boolean, nullable=False, default=False)

    def __repr__(self):
        return f"<TicketTemplate(id={self.id}, name={self.name}, is_default={self.is_default})>"


class AnalysisSuggestion(Base):
    """Stores individual ticket suggestions from an analysis run."""

    __tablename__ = "analysis_suggestions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id = Column(
        Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    suggestion_id = Column(String(100), nullable=False)  # UUID or identifier
    summary = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    issue_type = Column(String(50), nullable=False)
    priority = Column(String(20), nullable=False)
    source_repo = Column(String(500), nullable=True)
    labels = Column(JSONType, nullable=True)  # List of label strings
    was_created = Column(Boolean, nullable=False, default=False)
    jira_key = Column(String(50), nullable=True)  # e.g., "RHDPOPS-1234"
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationship to analysis run
    analysis_run = relationship("AnalysisRun", back_populates="suggestions")

    def __repr__(self):
        return f"<AnalysisSuggestion(id={self.id}, summary={self.summary[:50]}, was_created={self.was_created})>"
