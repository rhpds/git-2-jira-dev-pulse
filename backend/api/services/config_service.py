"""Configuration service for Git-2-Jira-Dev-Pulse.

Supports YAML-based multi-directory configuration with backward compatibility
for legacy .rh-jira-mcp.env configuration.
"""

import os
from pathlib import Path
from typing import List, Optional, Dict
import yaml
from pydantic import BaseModel, Field, field_validator


class ScanDirectory(BaseModel):
    """Configuration for a single scan directory."""
    path: str
    enabled: bool = True
    recursive: bool = False
    max_depth: int = 1
    exclude_patterns: List[str] = Field(default_factory=lambda: ["node_modules", ".venv", ".git", "__pycache__", ".pytest_cache"])
    exclude_folders: List[str] = Field(default_factory=list)

    @field_validator("path")
    @classmethod
    def expand_path(cls, v: str) -> str:
        """Expand ~ and environment variables in path."""
        expanded = os.path.expanduser(os.path.expandvars(v))
        return str(Path(expanded).resolve())


class AutoDiscoveryConfig(BaseModel):
    """Auto-discovery configuration."""
    enabled: bool = False
    watch_paths: List[str] = Field(default_factory=list)
    scan_interval_seconds: int = 300
    notify_on_new_repos: bool = True

    @field_validator("watch_paths")
    @classmethod
    def expand_paths(cls, v: List[str]) -> List[str]:
        """Expand ~ and environment variables in paths."""
        return [str(Path(os.path.expanduser(os.path.expandvars(p))).resolve()) for p in v]


class UIPreferences(BaseModel):
    """UI preferences."""
    theme: str = "standard"  # "standard" | "glassmorphic"
    animations_enabled: bool = True
    show_visualizations: bool = True
    default_view: str = "grid"  # "grid" | "list" | "visualization"


class PerformanceConfig(BaseModel):
    """Performance tuning configuration."""
    max_parallel_scans: int = 10
    cache_ttl_seconds: int = 300


class JiraBoard(BaseModel):
    """Jira board configuration."""
    id: int
    name: str
    type: str = "kanban"  # "kanban" | "scrum"


class JiraProject(BaseModel):
    """Jira project configuration."""
    key: str  # e.g., "TEAM"
    name: str  # e.g., "Team Project"
    default: bool = False  # Is this the default project for new tickets?
    boards: List[JiraBoard] = Field(default_factory=list)

    # Custom field mappings (optional)
    custom_fields: Dict[str, str] = Field(default_factory=dict)

    # Issue type configuration
    enabled_issue_types: List[str] = Field(
        default_factory=lambda: ["Story", "Task", "Bug", "Epic"]
    )


class JiraConfig(BaseModel):
    """Jira integration configuration."""
    enabled: bool = True
    projects: List[JiraProject] = Field(default_factory=list)

    # Auto-linking configuration
    auto_link_commits: bool = True  # Auto-link commits with PROJ-123 to Jira
    commit_message_pattern: str = r"([A-Z]+-\d+)"  # Regex to extract issue keys

    # Workflow automation
    auto_transition: bool = False  # Auto-transition issues based on git state
    transition_rules: Dict[str, str] = Field(default_factory=dict)  # git_state -> jira_status


class Git2JiraConfig(BaseModel):
    """Complete Git-2-Jira configuration."""
    version: str = "1.0"
    scan_directories: List[ScanDirectory]
    auto_discovery: AutoDiscoveryConfig = Field(default_factory=AutoDiscoveryConfig)
    ui: UIPreferences = Field(default_factory=UIPreferences)
    performance: PerformanceConfig = Field(default_factory=PerformanceConfig)
    jira: JiraConfig = Field(default_factory=JiraConfig)


class ConfigService:
    """Service for managing Git-2-Jira configuration."""

    DEFAULT_CONFIG_PATH = Path.home() / ".git2jira.config.yaml"
    LEGACY_ENV_PATH = Path.home() / ".rh-jira-mcp.env"

    def __init__(self, config_path: Optional[Path] = None):
        """Initialize config service.

        Args:
            config_path: Optional custom path to config file.
                        If None, uses DEFAULT_CONFIG_PATH.
        """
        self.config_path = config_path or self.DEFAULT_CONFIG_PATH
        self._config: Optional[Git2JiraConfig] = None

    def load_config(self) -> Git2JiraConfig:
        """Load configuration from YAML file or create from legacy env.

        Returns:
            Git2JiraConfig instance
        """
        # Try loading YAML config first
        if self.config_path.exists():
            return self._load_from_yaml()

        # Fallback to legacy .env configuration
        if self.LEGACY_ENV_PATH.exists():
            return self._create_from_legacy_env()

        # Create default config
        return self._create_default_config()

    def _load_from_yaml(self) -> Git2JiraConfig:
        """Load config from YAML file."""
        with open(self.config_path, "r") as f:
            data = yaml.safe_load(f)

        self._config = Git2JiraConfig(**data)
        return self._config

    def _create_from_legacy_env(self) -> Git2JiraConfig:
        """Create config from legacy .rh-jira-mcp.env file."""
        # Read legacy env file
        env_vars: Dict[str, str] = {}
        with open(self.LEGACY_ENV_PATH, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")

        # Get base path from env or default to ~/repos
        base_path = env_vars.get("REPOS_BASE_PATH", "~/repos")

        # Create config with single directory
        scan_dir = ScanDirectory(
            path=base_path,
            enabled=True,
            recursive=False,
            max_depth=1,
            exclude_patterns=["node_modules", ".venv", ".git"],
            exclude_folders=[]  # Legacy hardcoded exclusions will be handled separately
        )

        config = Git2JiraConfig(
            scan_directories=[scan_dir],
            auto_discovery=AutoDiscoveryConfig(enabled=False),
            ui=UIPreferences(),
            performance=PerformanceConfig()
        )

        self._config = config
        return config

    def _create_default_config(self) -> Git2JiraConfig:
        """Create default configuration."""
        config = Git2JiraConfig(
            scan_directories=[
                ScanDirectory(
                    path="~/repos",
                    enabled=True,
                    recursive=False,
                    max_depth=1
                )
            ]
        )

        self._config = config
        return config

    def save_config(self, config: Git2JiraConfig) -> None:
        """Save configuration to YAML file.

        Args:
            config: Configuration to save
        """
        self.config_path.parent.mkdir(parents=True, exist_ok=True)

        with open(self.config_path, "w") as f:
            yaml.dump(
                config.model_dump(mode="json"),
                f,
                default_flow_style=False,
                sort_keys=False
            )

        self._config = config

    def get_config(self, force_reload: bool = False) -> Git2JiraConfig:
        """Get current configuration (cached).

        Args:
            force_reload: If True, reload from disk even if cached

        Returns:
            Current Git2JiraConfig instance
        """
        if self._config is None or force_reload:
            self._config = self.load_config()
        return self._config

    def add_scan_directory(self, scan_dir: ScanDirectory) -> Git2JiraConfig:
        """Add a new scan directory to configuration.

        Args:
            scan_dir: ScanDirectory to add

        Returns:
            Updated configuration
        """
        config = self.get_config()

        # Check if directory already exists
        existing_paths = {Path(d.path) for d in config.scan_directories}
        new_path = Path(scan_dir.path)

        if new_path not in existing_paths:
            config.scan_directories.append(scan_dir)
            self.save_config(config)

        return config

    def remove_scan_directory(self, path: str) -> Git2JiraConfig:
        """Remove a scan directory from configuration.

        Args:
            path: Path of directory to remove

        Returns:
            Updated configuration
        """
        config = self.get_config()
        remove_path = Path(os.path.expanduser(os.path.expandvars(path))).resolve()

        config.scan_directories = [
            d for d in config.scan_directories
            if Path(d.path) != remove_path
        ]

        self.save_config(config)
        return config

    def update_ui_preferences(self, preferences: UIPreferences) -> Git2JiraConfig:
        """Update UI preferences.

        Args:
            preferences: New UI preferences

        Returns:
            Updated configuration
        """
        config = self.get_config()
        config.ui = preferences
        self.save_config(config)
        return config

    def migrate_from_env(self) -> Git2JiraConfig:
        """Migrate from legacy .env to YAML config.

        Returns:
            Newly created configuration

        Raises:
            FileNotFoundError: If legacy env file doesn't exist
        """
        if not self.LEGACY_ENV_PATH.exists():
            raise FileNotFoundError(f"Legacy config not found at {self.LEGACY_ENV_PATH}")

        # Create backup of original
        backup_path = self.LEGACY_ENV_PATH.with_suffix(".env.backup")
        if not backup_path.exists():
            import shutil
            shutil.copy2(self.LEGACY_ENV_PATH, backup_path)

        # Create config from env
        config = self._create_from_legacy_env()

        # Save to YAML
        self.save_config(config)

        return config

    def get_all_scan_paths(self) -> List[Path]:
        """Get all enabled scan directory paths.

        Returns:
            List of Path objects for enabled scan directories
        """
        config = self.get_config()
        return [
            Path(d.path)
            for d in config.scan_directories
            if d.enabled
        ]


# Global config service instance
_config_service: Optional[ConfigService] = None


def get_config_service() -> ConfigService:
    """Get global config service instance.

    Returns:
        ConfigService singleton
    """
    global _config_service
    if _config_service is None:
        _config_service = ConfigService()
    return _config_service
