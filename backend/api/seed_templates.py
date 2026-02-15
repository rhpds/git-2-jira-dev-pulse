"""Seed default ticket templates."""
from sqlalchemy.orm import Session

from .models.db_models import TicketTemplate
from .models.jira_models import IssueType, Priority


def seed_default_templates(db: Session):
    """
    Create default ticket templates if they don't exist.

    Args:
        db: Database session
    """
    # Check if templates already exist
    existing_count = db.query(TicketTemplate).count()
    if existing_count > 0:
        return  # Templates already seeded

    # Default template for uncommitted work
    uncommitted_template = TicketTemplate(
        name="Uncommitted Work",
        summary_pattern="{repo_name}: {work_type} on {branch}",
        description_template="""Repository: {repo_name}
Branch: {branch}

## Work Summary
Type: {work_type}
Files changed: {file_count}
Recent commits: {commit_count}

## Files Changed
{files_list}

## Recent Commits
{commits_list}

This ticket tracks uncommitted changes and recent work on the {branch} branch.
""",
        issue_type=IssueType.TASK.value,
        priority=Priority.MAJOR.value,
        labels=["ops-development", "devpulse-automation"],
        is_default=True,
    )

    # Template for feature branch work
    feature_branch_template = TicketTemplate(
        name="Feature Branch",
        summary_pattern="{repo_name}: Feature work on {branch}",
        description_template="""Repository: {repo_name}
Branch: {branch}

## Feature Summary
This branch contains {commit_count} commits with changes to {file_count} files.

## Commits
{commits_list}

## Files Changed
{files_list}

## Next Steps
- Review changes
- Test functionality
- Merge to main branch
""",
        issue_type=IssueType.STORY.value,
        priority=Priority.NORMAL.value,
        labels=["ops-development"],
        is_default=False,
    )

    # Template for bug fixes
    bugfix_template = TicketTemplate(
        name="Bug Fix",
        summary_pattern="{repo_name}: Bug fix on {branch}",
        description_template="""Repository: {repo_name}
Branch: {branch}

## Bug Description
[Describe the bug that was fixed]

## Changes Made
{commits_list}

## Files Modified
{files_list}

## Testing
- [ ] Verified fix locally
- [ ] Added/updated tests
- [ ] No regressions found
""",
        issue_type=IssueType.BUG.value,
        priority=Priority.MAJOR.value,
        labels=["ops-development", "bug-fix"],
        is_default=False,
    )

    # Add all templates
    db.add(uncommitted_template)
    db.add(feature_branch_template)
    db.add(bugfix_template)
    db.commit()
