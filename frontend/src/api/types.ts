export type RepoStatus = "clean" | "dirty";

export interface RepoInfo {
  name: string;
  path: string;
  current_branch: string;
  status: RepoStatus;
  uncommitted_count: number;
  recent_commit_count: number;
  has_remote: boolean;
}

export interface FileChange {
  path: string;
  change_type: string;
  diff?: string | null;
}

export interface CommitInfo {
  sha: string;
  short_sha: string;
  message: string;
  author: string;
  author_email: string;
  date: string;
  files_changed: number;
  insertions: number;
  deletions: number;
  jira_refs: string[];
}

export interface BranchInfo {
  name: string;
  is_active: boolean;
  tracking?: string | null;
  ahead: number;
  behind: number;
  last_commit_date?: string | null;
  jira_refs: string[];
}

export interface UncommittedChanges {
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
}

export interface PullRequestInfo {
  number: number;
  title: string;
  url: string;
  branch: string;
  state: string;
  created_at?: string | null;
  merged_at?: string | null;
  closed_at?: string | null;
}

export interface RepoJiraTicket {
  key: string;
  summary: string;
  status: string;
  url: string;
}

export interface WorkSummary {
  repo_name: string;
  repo_path: string;
  current_branch: string;
  uncommitted: UncommittedChanges;
  recent_commits: CommitInfo[];
  branches: BranchInfo[];
  pull_requests: PullRequestInfo[];
}

export type IssueType = "Story" | "Task" | "Bug";
export type Priority = "Blocker" | "Critical" | "Major" | "Normal" | "Minor";

export const AVAILABLE_LABELS = [
  "ops-development",
  "ansible-agent",
  "cost-focused",
  "rhdpops-automation",
] as const;

export interface ExistingJiraMatch {
  key: string;
  summary: string;
  status: string;
  url: string;
}

export interface TicketSuggestion {
  id: string;
  summary: string;
  description: string;
  issue_type: IssueType;
  priority: Priority;
  labels: string[];
  assignee: string;
  pr_urls: string[];
  project_key: string;
  source_repo: string;
  source_branch: string;
  source_commits: string[];
  source_files: string[];
  already_tracked: boolean;
  existing_jira: ExistingJiraMatch[];
  selected: boolean;
}

export interface TicketCreateRequest {
  project_key: string;
  summary: string;
  description: string;
  issue_type: IssueType;
  priority: Priority;
  labels: string[];
  assignee: string;
  pr_urls: string[];
}

export interface CreatedTicket {
  key: string;
  url: string;
  summary: string;
  duplicate: boolean;
  error?: string | null;
}

export interface BatchCreateResult {
  created: CreatedTicket[];
  skipped_duplicates: number;
  errors: number;
}

export interface HealthStatus {
  status: string;
  jira: {
    connected: boolean;
    user?: string;
    email?: string;
    server?: string;
    error?: string;
  };
}

// History types
export interface AnalysisRunSummary {
  id: number;
  timestamp: string;
  repos_count: number;
  repos_analyzed: string[];
  project_key: string | null;
  total_suggestions: number;
  created_tickets: number;
}

export interface SuggestionDetail {
  id: number;
  summary: string;
  description: string;
  issue_type: string;
  priority: string;
  source_repo: string | null;
  labels: string[];
  was_created: boolean;
  jira_key: string | null;
}

export interface AnalysisRunDetail {
  id: number;
  timestamp: string;
  repos_analyzed: string[];
  project_key: string | null;
  metadata: Record<string, any>;
  suggestions: SuggestionDetail[];
}
