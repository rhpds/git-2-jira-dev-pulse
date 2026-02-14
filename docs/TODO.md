# TODO

## High Priority

### Features
- [ ] Batch ticket creation (select multiple suggestions and create all at once)
- [ ] Ticket templates (save common ticket patterns)
- [ ] Filters for repo list (by activity, last commit date, etc.)
- [ ] Export work summary to CSV/JSON
- [ ] Dark mode toggle in UI

### Bugs
- [ ] Handle repos with no commits gracefully in UI
- [ ] Improve error messages when Jira token is invalid
- [ ] Fix loading state when switching between quarters

### Documentation
- [x] MCP setup guide
- [ ] Video tutorials for first-time users
- [ ] API documentation with examples
- [ ] Troubleshooting guide

## Medium Priority

### Features
- [ ] Smart grouping of related commits into single tickets
- [ ] Link detection (find existing Jira tickets mentioned in commits)
- [ ] Branch naming convention suggestions
- [ ] Email notifications when tickets are created
- [ ] Slack integration for ticket notifications
- [ ] Custom quarter date ranges

### Testing
- [ ] Backend unit tests (services)
- [ ] Frontend component tests
- [ ] E2E tests with Playwright
- [ ] MCP server integration tests

### Performance
- [ ] Cache git analysis results
- [ ] Parallel repo scanning
- [ ] Lazy loading for large repo lists

## Low Priority

### Features
- [ ] Support for GitLab and Bitbucket
- [ ] Multi-Jira instance support (switch between instances)
- [ ] Ticket dependencies and linking
- [ ] Time tracking estimation
- [ ] Sprint planning integration
- [ ] GitHub Actions workflow for automated ticket creation

### DevOps
- [ ] Docker Compose setup
- [ ] Kubernetes deployment manifests
- [ ] CI/CD pipeline
- [ ] Automated releases

### UI/UX
- [ ] Keyboard shortcuts
- [ ] Drag-and-drop for ticket prioritization
- [ ] Customizable dashboard widgets
- [ ] Mobile-responsive design improvements

## Tech Debt

- [ ] Refactor ticket suggester logic into smaller functions
- [ ] Add type hints to all Python functions
- [ ] Improve error handling in git analyzer
- [ ] Add logging throughout backend
- [ ] Consolidate duplicate code between CLI and API
- [ ] Update frontend dependencies
- [ ] Add frontend linting rules

## Research

- [ ] Evaluate AI-powered commit message summarization
- [ ] Investigate git hooks for automatic ticket creation
- [ ] Research better quarter visualization libraries
- [ ] Explore real-time collaboration features

## Completed ✅

- [x] Initial FastAPI backend
- [x] React + PatternFly frontend
- [x] CLI interface with Typer
- [x] MCP server for Claude integration
- [x] Git repository scanning
- [x] Commit analysis
- [x] Jira ticket creation
- [x] Quarter-based grouping
- [x] Health check endpoint
- [x] Environment configuration

---

**Last Updated:** 2026-02-13

**Contributors:** Add your name when you complete an item!
