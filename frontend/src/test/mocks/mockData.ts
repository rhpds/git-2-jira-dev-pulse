import type { RepoInfo, WorkSummary, TicketSuggestion } from '../../api/types';

export const mockRepos: RepoInfo[] = [
  {
    name: 'test-repo-1',
    path: '/tmp/test-repo-1',
    current_branch: 'main',
    status: 'clean',
    uncommitted_count: 0,
    recent_commit_count: 5,
    has_remote: true,
  },
  {
    name: 'test-repo-2',
    path: '/tmp/test-repo-2',
    current_branch: 'feature-branch',
    status: 'dirty',
    uncommitted_count: 3,
    recent_commit_count: 2,
    has_remote: true,
  },
];

export const mockWorkSummaries: WorkSummary[] = [
  {
    repo_name: 'test-repo-1',
    repo_path: '/tmp/test-repo-1',
    current_branch: 'main',
    uncommitted: {
      staged: [],
      unstaged: [],
      untracked: [],
    },
    recent_commits: [],
    branches: [],
    pull_requests: [],
  },
];

export const mockTicketSuggestions: TicketSuggestion[] = [
  {
    id: '1',
    summary: 'Test suggestion 1',
    description: 'Test description',
    issue_type: 'Task',
    priority: 'Major',
    labels: ['test'],
    assignee: '',
    pr_urls: [],
    project_key: 'TEST',
    source_repo: 'test-repo-1',
    source_branch: 'main',
    source_commits: [],
    source_files: [],
    already_tracked: false,
    existing_jira: [],
    selected: true,
  },
];
