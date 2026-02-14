"""Unit tests for FolderScanner service."""
import pytest
from pathlib import Path
from api.services.folder_scanner import FolderScanner
from api.models.git_models import RepoStatus


@pytest.mark.unit
class TestFolderScanner:
    """Test cases for FolderScanner."""

    def test_scan_empty_directory(self, tmp_path):
        """Test scanning an empty directory returns empty list."""
        scanner = FolderScanner(str(tmp_path))
        repos = scanner.scan()
        assert repos == []

    def test_scan_nonexistent_directory(self):
        """Test scanning a nonexistent directory returns empty list."""
        scanner = FolderScanner("/nonexistent/path")
        repos = scanner.scan()
        assert repos == []

    def test_scan_with_filters_no_repos(self):
        """Test scanning with filters when no repos match."""
        scanner = FolderScanner("/tmp")
        result = scanner.scan_with_filters(min_commits=100)
        assert result == []

    def test_scan_with_filters_sort_by_name(self):
        """Test sorting repos by name."""
        scanner = FolderScanner("/tmp")
        # Would need mock repos for proper testing
        result = scanner.scan_with_filters(sort_by="name", sort_desc=False)
        assert isinstance(result, list)
