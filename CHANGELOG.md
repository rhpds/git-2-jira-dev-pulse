# Changelog

All notable changes to Git-2-Jira-Dev-Pulse are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-14

### 🎉 Major Release: Modern UI & Multi-Directory Support

This release transforms Git-2-Jira-Dev-Pulse from a single-directory tool into a flexible, visually stunning platform with auto-discovery capabilities.

### Added

#### Backend - Configuration & Multi-Directory Support (Phase 1)

- **YAML Configuration System** (`~/.git2jira.config.yaml`)
  - Multi-directory scanning with individual settings per directory
  - Recursive scanning with configurable depth limits (1-10 levels)
  - Pattern-based exclusions using glob patterns
  - Per-directory folder exclusions
  - Backward compatible with legacy `.git2jira.env`

- **Configuration Service** (`backend/api/services/config_service.py`)
  - Centralized configuration management
  - Hot-reloading support with `force_reload` parameter
  - Migration from legacy .env to YAML
  - Cross-platform path expansion (`~` support)

- **Enhanced Folder Scanner** (`backend/api/services/folder_scanner.py`)
  - Multi-directory scanning mode
  - Configurable exclusion patterns (no hardcoded lists)
  - Performance optimizations for large directory trees

- **Configuration API Endpoints** (`backend/api/routes/config.py`)
  - `GET /api/config/` - Get current configuration
  - `POST /api/config/scan-directories` - Add scan directory
  - `DELETE /api/config/scan-directories` - Remove scan directory
  - `PUT /api/config/ui-preferences` - Update UI preferences
  - Auto-discovery control endpoints (see below)

#### Backend - File System Watcher (Phase 3)

- **Auto-Discovery Service** (`backend/api/services/watcher_service.py`)
  - Real-time file system monitoring using `watchdog` library
  - Automatic detection of new git repositories within 30 seconds
  - Periodic fallback scanning every 300 seconds (configurable)
  - Graceful startup/shutdown with FastAPI lifespan management

- **Watcher API Endpoints**
  - `POST /api/config/auto-discovery/toggle` - Enable/disable watcher
  - `POST /api/config/auto-discovery/start` - Start watcher service
  - `POST /api/config/auto-discovery/stop` - Stop watcher service
  - `GET /api/config/auto-discovery/status` - Get watcher status
  - `POST /api/config/auto-discovery/discover` - Trigger manual scan

#### CLI Enhancement (Phase 2)

- **Configuration Commands** (`cli/main.py`)
  - `config list` - Display all scan directories with rich formatting
  - `config add` - Add scan directory with interactive prompts
  - `config remove` - Remove scan directory
  - `config migrate` - Migrate from .env to YAML
  - `config export` - Export configuration to JSON/YAML
  - `config watcher` - Control auto-discovery watcher

- **Enhanced Output**
  - Color-coded terminal output using Rich library
  - Directory grouping with `--group` flag
  - Formatted tables for configuration display
  - Progress indicators for long-running operations

#### Frontend - Visual Foundation (Phase 4)

- **Glassmorphic Design System** (`frontend/src/styles/glassmorphism.css`)
  - Modern frosted glass aesthetic with backdrop blur
  - CSS custom properties for theming
  - 6+ gradient presets (primary, secondary, tertiary, success, warning, danger)
  - Animation utilities (pulse, float, glow)
  - Dark/light mode compatible

- **GlassCard Component** (`frontend/src/components/GlassCard/GlassCard.tsx`)
  - Reusable glassmorphic card with Framer Motion
  - 4 variants: default, gradient, border-gradient, strong
  - Hover and pulse effects
  - Customizable gradients and opacity

- **Custom Animated Icons** (`frontend/src/components/CustomIcons/index.tsx`)
  - 8 unique SVG icons with animations
  - NO traditional folder/git icons (differentiation strategy)
  - Icons: PulseIcon, CodeFlowIcon, ActivityBurstIcon, RepoIdentityIcon, DataFlowIcon, NetworkIcon, StatusIcon, ConfigIcon
  - All icons animated with Framer Motion

#### Frontend - Data Visualizations (Phase 5)

- **ActivityHeatmap** (`frontend/src/components/Visualizations/ActivityHeatmap.tsx`)
  - Stacked bar chart showing top 10 active repositories
  - Commits (blue gradient) + uncommitted changes (pink gradient)
  - Summary statistics cards
  - Responsive and interactive with Recharts

- **RepoStatusPie** (`frontend/src/components/Visualizations/RepoStatusPie.tsx`)
  - Donut chart showing clean vs dirty distribution
  - Color-coded status indicators
  - Percentage breakdowns
  - Summary cards with totals

#### Frontend - Settings Page (Phase 6)

- **Complete Settings UI** (`frontend/src/pages/SettingsPage.tsx`)
  - Tabbed interface for all configuration options
  - Real-time updates with React Query
  - Form validation and error handling

- **Scan Directories Tab** (`frontend/src/components/Settings/ScanDirectoriesTab.tsx`)
  - List all configured directories
  - Add/remove with modal dialog
  - Configure recursive scanning and depth
  - Custom exclusion patterns
  - Enable/disable individual directories

- **Auto-Discovery Tab** (`frontend/src/components/Settings/AutoDiscoveryTab.tsx`)
  - Watcher status with 5-second polling
  - Enable/disable toggle
  - Start/Stop/Manual Scan buttons
  - Discovered repository count
  - Watch paths display

- **Visual Preferences Tab** (`frontend/src/components/Settings/VisualPreferencesTab.tsx`)
  - Theme selector: Standard vs Glassmorphic
  - Animations toggle
  - Data visualizations toggle
  - Default view mode selection
  - Live preview of glassmorphic cards

- **Advanced Tab** (`frontend/src/components/Settings/AdvancedTab.tsx`)
  - Performance tuning (max parallel scans, cache TTL)
  - Export configuration to JSON
  - System information display
  - Configuration file location

#### Frontend - Enhanced ScanPage (Phase 7)

- **Statistics Summary Cards**
  - Total repositories with PulseIcon
  - Recent commits with ActivityBurstIcon
  - Uncommitted changes with StatusIcon
  - Clean repos with CodeFlowIcon
  - Glassmorphic styling when theme enabled

- **View Mode Toggle**
  - Grid View (default)
  - List View (placeholder)
  - Visualization View (expanded charts)
  - Smooth transitions with AnimatePresence

- **Enhanced RepoGrid** (`frontend/src/components/ScanPage/RepoGrid.tsx`)
  - Theme-aware rendering (standard vs glassmorphic)
  - Custom RepoIdentityIcon for each repository
  - Status-based icon coloring
  - Additional labels for commits and changes
  - Improved hover effects

- **Integrated Visualizations**
  - ActivityHeatmap above repo grid (top 10 repos)
  - RepoStatusPie alongside heatmap
  - Toggle visibility via settings
  - Responsive grid layout

#### Dependencies

- **Backend**
  - `pyyaml>=6.0.0` - YAML configuration parsing
  - `watchdog>=6.0.0` - File system monitoring

- **Frontend**
  - `framer-motion@^12.17.0` - Animations and transitions
  - `recharts@^2.15.0` - Data visualizations
  - `d3-shape@^3.2.0` - Shape utilities for charts

### Changed

- **Breaking**: Configuration now defaults to `~/.git2jira.config.yaml` instead of only `.git2jira.env`
- **Backend**: Folder scanner refactored to support multiple base directories
- **Backend**: Removed hardcoded `EXCLUDED_FOLDERS` constant
- **Frontend**: Updated port from 5173 to 5175 to avoid conflicts
- **CLI**: Scan command now processes all configured directories by default
- **Navigation**: Added Settings link to main navigation

### Fixed

- **Config Caching**: Added `force_reload` parameter to prevent stale data
- **Type Safety**: Fixed Framer Motion type imports (ComponentProps pattern)
- **Module Resolution**: Resolved RepoStatus enum vs type conflicts
- **Cross-Platform Paths**: Consistent `pathlib` usage with `expanduser()`

### Deprecated

- Single-directory mode via `REPOS_BASE_PATH` env variable (still works but migrating to YAML recommended)

### Documentation

- **README.md**: Added Web UI Features section
- **CHANGELOG.md**: Complete release notes (this file)
- **example.config.yaml**: Comprehensive configuration template with comments
- **CLI Help**: Updated command documentation

### Migration Guide

For existing users, the tool maintains backward compatibility:

1. **Automatic Fallback**: If no YAML config exists, the tool falls back to `~/.git2jira.env`
2. **Migration Command**: Run `python cli/main.py config migrate` to convert to new format
3. **Preview First**: Migration shows preview before saving
4. **Backup Created**: Original `.env` file backed up to `.git2jira.env.backup`

### Performance

- **Parallel Scanning**: Configurable max parallel scans (default: 10)
- **Caching**: Repository scan results cached (configurable TTL, default: 300s)
- **Lazy Loading**: Visualizations and heavy components lazy-loaded
- **Optimized Polling**: Auto-discovery status polling every 5 seconds (UI only)

### Security

- No hardcoded credentials or paths
- Secure token storage in home directory
- Pattern-based exclusions prevent scanning sensitive directories
- API endpoints require local access only

---

## [1.0.0] - 2025-01-XX

### Initial Release

- Basic repository scanning
- Work dashboard with quarterly grouping
- Jira ticket creation
- Web UI, CLI, and MCP server support
- Single-directory configuration via .env file
