"""Service for managing ticket templates."""
import re
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session

from ..models.db_models import TicketTemplate
from ..models.template_models import TemplateCreate, TemplateUpdate
from ..models.git_models import WorkSummary
from ..models.jira_models import TicketSuggestion
from ..exceptions import TemplateError


class TemplateService:
    """Service for CRUD operations on ticket templates."""

    def __init__(self, db: Session):
        self.db = db

    # Template variables that can be used in patterns
    TEMPLATE_VARS = {
        "repo_name": "Repository name",
        "branch": "Current branch name",
        "commit_count": "Number of commits",
        "file_count": "Number of files changed",
        "work_type": "Type of work (uncommitted/commits/branch/pr)",
        "commits_list": "Bulleted list of commit messages",
        "files_list": "Bulleted list of changed files",
    }

    def create(self, template_data: TemplateCreate) -> TicketTemplate:
        """
        Create a new template.

        Args:
            template_data: Template creation data

        Returns:
            Created template

        Raises:
            TemplateError: If template with same name already exists
        """
        # Check for duplicate name
        existing = (
            self.db.query(TicketTemplate)
            .filter(TicketTemplate.name == template_data.name)
            .first()
        )

        if existing:
            raise TemplateError(
                f"Template with name '{template_data.name}' already exists",
                template_name=template_data.name,
            )

        # If setting as default, unset other defaults
        if template_data.is_default:
            self._unset_all_defaults()

        template = TicketTemplate(
            name=template_data.name,
            summary_pattern=template_data.summary_pattern,
            description_template=template_data.description_template,
            issue_type=template_data.issue_type.value,
            priority=template_data.priority.value,
            labels=template_data.labels,
            is_default=template_data.is_default,
        )

        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def get(self, template_id: int) -> Optional[TicketTemplate]:
        """Get a template by ID."""
        return (
            self.db.query(TicketTemplate)
            .filter(TicketTemplate.id == template_id)
            .first()
        )

    def get_by_name(self, name: str) -> Optional[TicketTemplate]:
        """Get a template by name."""
        return (
            self.db.query(TicketTemplate)
            .filter(TicketTemplate.name == name)
            .first()
        )

    def list_all(self) -> List[TicketTemplate]:
        """List all templates."""
        return self.db.query(TicketTemplate).all()

    def get_default(self) -> Optional[TicketTemplate]:
        """Get the default template."""
        return (
            self.db.query(TicketTemplate)
            .filter(TicketTemplate.is_default == True)  # noqa: E712
            .first()
        )

    def update(self, template_id: int, update_data: TemplateUpdate) -> Optional[TicketTemplate]:
        """
        Update a template.

        Args:
            template_id: Template ID
            update_data: Update data

        Returns:
            Updated template or None if not found
        """
        template = self.get(template_id)
        if not template:
            return None

        # If setting as default, unset other defaults
        if update_data.is_default:
            self._unset_all_defaults()

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if field in ("issue_type", "priority") and value:
                value = value.value
            setattr(template, field, value)

        self.db.commit()
        self.db.refresh(template)
        return template

    def delete(self, template_id: int) -> bool:
        """
        Delete a template.

        Args:
            template_id: Template ID

        Returns:
            True if deleted, False if not found
        """
        template = self.get(template_id)
        if not template:
            return False

        self.db.delete(template)
        self.db.commit()
        return True

    def set_default(self, template_id: int) -> bool:
        """
        Set a template as the default.

        Args:
            template_id: Template ID

        Returns:
            True if set, False if template not found
        """
        template = self.get(template_id)
        if not template:
            return False

        self._unset_all_defaults()
        template.is_default = True  # type: ignore
        self.db.commit()
        return True

    def apply_template(
        self,
        template: TicketTemplate,
        work_summary: WorkSummary,
    ) -> TicketSuggestion:
        """
        Apply a template to a work summary to generate a ticket suggestion.

        Args:
            template: Template to apply
            work_summary: Work summary data

        Returns:
            Generated ticket suggestion
        """
        # Build variable context
        context = self._build_context(work_summary)

        # Apply template
        summary = self._substitute_vars(str(template.summary_pattern), context)  # type: ignore
        description = self._substitute_vars(str(template.description_template), context)  # type: ignore

        # Build source files list (extract file paths from FileChange objects)
        source_files = [
            fc.path for fc in work_summary.uncommitted.staged[:10]
        ] + [
            fc.path for fc in work_summary.uncommitted.unstaged[:10]
        ]

        return TicketSuggestion(
            id="",  # Will be set by caller
            summary=summary,
            description=description,
            issue_type=template.issue_type,  # type: ignore
            priority=template.priority,  # type: ignore
            labels=template.labels or [],  # type: ignore
            source_repo=work_summary.repo_name,
            source_branch=work_summary.current_branch,
            source_commits=[c.sha[:8] for c in work_summary.recent_commits[:10]],
            source_files=source_files,
        )

    def _build_context(self, work_summary: WorkSummary) -> Dict[str, Any]:
        """Build template variable context from work summary."""
        # Determine work type
        work_type = "work"
        if work_summary.uncommitted.staged or work_summary.uncommitted.unstaged:
            work_type = "uncommitted changes"
        elif work_summary.recent_commits:
            work_type = "commits"
        elif len(work_summary.branches) > 1:
            work_type = "branch work"

        # Build commits list
        commits_list = "\n".join(
            f"- {c.message.split(chr(10))[0]}" for c in work_summary.recent_commits[:10]
        )

        # Build files list
        all_files = (
            work_summary.uncommitted.staged[:20]
            + work_summary.uncommitted.unstaged[:20]
        )
        files_list = "\n".join(f"- {f}" for f in all_files)

        return {
            "repo_name": work_summary.repo_name,
            "branch": work_summary.current_branch,
            "commit_count": str(len(work_summary.recent_commits)),
            "file_count": str(
                len(work_summary.uncommitted.staged)
                + len(work_summary.uncommitted.unstaged)
            ),
            "work_type": work_type,
            "commits_list": commits_list or "No recent commits",
            "files_list": files_list or "No files changed",
        }

    def _substitute_vars(self, text: str, context: Dict[str, Any]) -> str:
        """Substitute template variables in text."""
        result = text
        for var_name, var_value in context.items():
            pattern = r"\{" + var_name + r"\}"
            result = re.sub(pattern, str(var_value), result)
        return result

    def _unset_all_defaults(self):
        """Unset all default templates."""
        self.db.query(TicketTemplate).filter(
            TicketTemplate.is_default == True  # noqa: E712
        ).update({"is_default": False})
