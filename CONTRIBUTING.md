# Contributing to Git-2-Jira-Dev-Pulse

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project follows the [Red Hat Community Code of Conduct](https://www.redhat.com/en/about/community-code-of-conduct). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

Before you begin, ensure you have:
- Python 3.11 or higher
- Node.js 20 or higher
- Git
- A Jira account with API access
- Familiarity with FastAPI, React, and TypeScript

### Find an Issue

1. Browse [open issues](https://github.com/rhpds/git-2-jira-dev-pulse/issues)
2. Look for issues labeled `good first issue` or `help wanted`
3. Comment on the issue to let others know you're working on it
4. Wait for maintainer approval before starting work

### Reporting Bugs

Found a bug? Please create an issue with:
- **Clear title** describing the problem
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Environment details** (OS, Python version, etc.)
- **Screenshots** if applicable

### Suggesting Features

Have an idea? Create an issue with:
- **Clear description** of the feature
- **Use case** explaining why it's needed
- **Proposed implementation** if you have ideas
- **Alternatives considered**

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/git-2-jira-dev-pulse.git
cd git-2-jira-dev-pulse

# Add upstream remote
git remote add upstream https://github.com/rhpds/git-2-jira-dev-pulse.git
```

### 2. Install Dependencies

```bash
make install
```

This installs:
- Backend Python dependencies (FastAPI, GitPython, Jira, etc.)
- Frontend Node.js dependencies (React, PatternFly, etc.)

### 3. Configure Environment

```bash
cp .env.example ~/.rh-jira-mcp.env
```

Edit `~/.rh-jira-mcp.env` with your Jira credentials:
```env
JIRA_URL=https://issues.redhat.com
JIRA_API_TOKEN=<your-token>
JIRA_DEFAULT_PROJECT=RHDPOPS
REPOS_BASE_PATH=~/repos
```

### 4. Verify Setup

```bash
# Start backend
make backend

# In another terminal, start frontend
make frontend

# Test API
curl http://localhost:8000/api/health
```

## Making Changes

### 1. Create a Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding tests

### 2. Make Your Changes

Follow these guidelines:
- **Keep changes focused** - One feature/fix per branch
- **Write clear commit messages** - See [commit message guidelines](#commit-messages)
- **Add tests** - For new features and bug fixes
- **Update documentation** - If you change APIs or behavior
- **Follow code style** - Run linters before committing

### 3. Test Your Changes

```bash
# Backend tests (coming soon)
cd backend
pytest

# Frontend tests (coming soon)
cd frontend
npm test

# Manual testing
make all  # Start both backend and frontend
# Test your changes in the browser
```

### 4. Commit Your Changes

#### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): short description

Longer description if needed.

Fixes #issue-number
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
feat(backend): add batch ticket creation endpoint

Add new /api/tickets/batch endpoint that allows creating
multiple Jira tickets in a single request.

Fixes #123
```

```bash
fix(frontend): resolve quarter display bug

Fix issue where FY quarters were not calculating correctly
for dates in February.

Fixes #456
```

## Submitting Changes

### 1. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 2. Create a Pull Request

1. Go to your fork on GitHub
2. Click "Pull Request" button
3. Select your branch and create PR
4. Fill out the PR template:
   - **Description** of changes
   - **Issue number** if applicable
   - **Testing** done
   - **Screenshots** for UI changes

### 3. PR Review Process

- A maintainer will review your PR
- Address any requested changes
- Keep your branch up to date with main:
  ```bash
  git fetch upstream
  git rebase upstream/main
  git push --force-with-lease
  ```
- Once approved, a maintainer will merge your PR

## Coding Standards

### Python (Backend)

**Style Guide:** Follow [PEP 8](https://pep8.org/)

```bash
# Format code
black backend/

# Sort imports
isort backend/

# Check types
mypy backend/

# Lint
ruff check backend/
```

**Key conventions:**
- Use type hints for all function parameters and returns
- Use Pydantic models for data validation
- Write docstrings for public functions
- Keep functions focused and under 50 lines
- Use meaningful variable names

**Example:**
```python
from typing import Optional
from pydantic import BaseModel

class Repository(BaseModel):
    """Represents a git repository."""
    name: str
    path: str
    last_commit: Optional[datetime] = None

def analyze_repository(path: str, max_commits: int = 30) -> GitWorkSummary:
    """Analyze git repository history.

    Args:
        path: Absolute path to repository
        max_commits: Maximum number of commits to analyze

    Returns:
        Summary of git work including commits and branches

    Raises:
        ValueError: If path is not a valid git repository
    """
    # Implementation
```

### TypeScript (Frontend)

**Style Guide:** Follow project's ESLint configuration

```bash
# Lint
cd frontend
npm run lint

# Format
npm run format
```

**Key conventions:**
- Use TypeScript strict mode
- Define interfaces for all data structures
- Use functional components with hooks
- Follow PatternFly component patterns
- Keep components under 200 lines

**Example:**
```typescript
interface Repository {
  name: string;
  path: string;
  lastCommit?: string;
}

interface RepoCardProps {
  repository: Repository;
  onSelect: (repo: Repository) => void;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repository, onSelect }) => {
  return (
    <Card onClick={() => onSelect(repository)}>
      <CardTitle>{repository.name}</CardTitle>
      <CardBody>{repository.path}</CardBody>
    </Card>
  );
};
```

### Project Structure

**Backend:**
```
backend/
├── api/
│   ├── main.py           # FastAPI app
│   ├── config.py         # Settings
│   ├── models/           # Pydantic models
│   ├── routes/           # API endpoints
│   └── services/         # Business logic
└── requirements.txt
```

**Frontend:**
```
frontend/
├── src/
│   ├── App.tsx          # Root component
│   ├── pages/           # Page components
│   ├── components/      # Reusable components
│   └── services/        # API client
└── package.json
```

## Testing

### Backend Tests (Coming Soon)

```bash
cd backend
pytest tests/

# With coverage
pytest --cov=api tests/
```

**Test structure:**
```python
# tests/test_git_analyzer.py
import pytest
from api.services.git_analyzer import GitAnalyzer

def test_analyze_repository():
    analyzer = GitAnalyzer()
    summary = analyzer.get_work_summary("/path/to/repo")
    assert summary.commits is not None
    assert len(summary.commits) > 0
```

### Frontend Tests (Coming Soon)

```bash
cd frontend
npm test

# With coverage
npm test -- --coverage
```

**Test structure:**
```typescript
// __tests__/RepoCard.test.tsx
import { render, fireEvent } from '@testing-library/react';
import { RepoCard } from '../components/RepoCard';

test('calls onSelect when clicked', () => {
  const onSelect = jest.fn();
  const repo = { name: 'test-repo', path: '/path' };

  const { getByText } = render(
    <RepoCard repository={repo} onSelect={onSelect} />
  );

  fireEvent.click(getByText('test-repo'));
  expect(onSelect).toHaveBeenCalledWith(repo);
});
```

### Manual Testing

Always test your changes manually:
1. Start backend and frontend
2. Test happy path (expected behavior)
3. Test edge cases (empty data, errors, etc.)
4. Test with different Jira projects
5. Verify error handling

## Documentation

### Updating Documentation

When making changes, update relevant docs:
- **README.md** - For user-facing changes
- **API.md** - For API endpoint changes
- **ARCHITECTURE.md** - For structural changes
- **TODO.md** - Mark completed items
- **Code comments** - For complex logic

### Writing Good Documentation

- Use clear, concise language
- Include code examples
- Add screenshots for UI features
- Keep it up to date with code changes
- Use proper Markdown formatting

## Questions?

- **Slack:** #rhdp-dev-tools (Red Hat internal)
- **GitHub Discussions:** For general questions
- **GitHub Issues:** For bugs and features
- **Email:** Contact the maintainers

## License

By contributing, you agree that your contributions will be licensed under the same license as this project (see LICENSE file).

## Recognition

Contributors will be:
- Listed in the project's contributors page
- Acknowledged in release notes for significant contributions
- Invited to become maintainers after consistent, quality contributions

Thank you for contributing! 🎉
