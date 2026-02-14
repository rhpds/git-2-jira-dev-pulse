"""Git-related test fixtures."""
from datetime import datetime
from pathlib import Path


def create_mock_commit(
    sha="abc123",
    message="Test commit",
    author="Test Author",
    files_changed=1,
):
    """Create a mock commit for testing."""
    return {
        "sha": sha,
        "short_sha": sha[:7],
        "message": message,
        "author": author,
        "author_email": f"{author.lower().replace(' ', '.')}@example.com",
        "date": datetime.utcnow().isoformat(),
        "files_changed": files_changed,
        "insertions": 10,
        "deletions": 5,
        "jira_refs": [],
    }


def create_mock_branch(name="main", is_active=True):
    """Create a mock branch for testing."""
    return {
        "name": name,
        "is_active": is_active,
        "tracking": f"origin/{name}",
        "ahead": 0,
        "behind": 0,
        "last_commit_date": datetime.utcnow().isoformat(),
        "jira_refs": [],
    }


def setup_temp_git_repo(tmp_path: Path):
    """Set up a temporary git repository for testing."""
    repo_path = tmp_path / "test-repo"
    repo_path.mkdir()
    # Note: Requires git to be installed
    import subprocess

    subprocess.run(["git", "init"], cwd=repo_path, check=True)
    subprocess.run(
        ["git", "config", "user.name", "Test User"], cwd=repo_path, check=True
    )
    subprocess.run(
        ["git", "config", "user.email", "test@example.com"],
        cwd=repo_path,
        check=True,
    )

    # Create initial commit
    test_file = repo_path / "test.txt"
    test_file.write_text("test content")
    subprocess.run(["git", "add", "."], cwd=repo_path, check=True)
    subprocess.run(
        ["git", "commit", "-m", "Initial commit"], cwd=repo_path, check=True
    )

    return repo_path
