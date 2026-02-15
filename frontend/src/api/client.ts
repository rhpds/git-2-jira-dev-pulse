import axios from "axios";
import type {
  BatchCreateResult,
  CreatedTicket,
  HealthStatus,
  RepoInfo,
  RepoJiraTicket,
  TicketCreateRequest,
  TicketSuggestion,
  WorkSummary,
  AnalysisRunSummary,
  AnalysisRunDetail,
  Git2JiraConfig,
  ScanDirectory,
  UIPreferences,
} from "./types";

const api = axios.create({ baseURL: "/api" });

export { api as apiClient };

export async function getHealth(): Promise<HealthStatus> {
  const { data } = await api.get("/health");
  return data;
}

export async function getFolders(): Promise<RepoInfo[]> {
  const { data } = await api.get("/folders/");
  return data;
}

export async function analyzeFolders(
  paths: string[],
  maxCommits = 100,
  sinceDays = 120
): Promise<WorkSummary[]> {
  const { data } = await api.post("/folders/analyze", {
    paths,
    max_commits: maxCommits,
    since_days: sinceDays,
  });
  return data;
}

export async function suggestTickets(
  summaries: WorkSummary[],
  projectKey: string
): Promise<TicketSuggestion[]> {
  const { data } = await api.post("/jira/suggest", {
    summaries,
    project_key: projectKey,
  });
  return data;
}

export async function createTicket(
  ticket: TicketCreateRequest
): Promise<CreatedTicket> {
  const { data } = await api.post("/jira/create", ticket);
  return data;
}

export async function createBatch(
  tickets: TicketCreateRequest[],
  skipDuplicates = true
): Promise<BatchCreateResult> {
  const { data } = await api.post("/jira/create-batch", {
    tickets,
    skip_duplicates: skipDuplicates,
  });
  return data;
}

export async function getRepoTickets(
  projectKey: string,
  repoName: string,
  since?: string
): Promise<RepoJiraTicket[]> {
  const { data } = await api.get("/jira/repo-tickets", {
    params: { project_key: projectKey, repo_name: repoName, since: since ?? "" },
  });
  return data;
}

export async function getProjects(): Promise<
  { key: string; name: string }[]
> {
  const { data } = await api.get("/jira/projects");
  return data;
}

export interface RemoteBranch {
  branch: string;
  pr_number: number;
  pr_title: string;
  pr_state: string;
  pr_url: string;
}

export async function getRemoteBranches(
  path: string
): Promise<RemoteBranch[]> {
  const { data } = await api.get("/git/remote-branches", {
    params: { path },
  });
  return data;
}

export async function gitPull(
  path: string,
  branch: string
): Promise<{
  success: boolean;
  branch: string;
  output?: string;
  error?: string;
  current_branch?: string;
}> {
  const { data } = await api.post("/git/pull", { path, branch });
  return data;
}

// History API
export async function getAnalysisHistory(
  limit = 50,
  projectKey?: string
): Promise<AnalysisRunSummary[]> {
  const { data } = await api.get("/history/runs", {
    params: { limit, project_key: projectKey },
  });
  return data;
}

export async function getAnalysisRun(
  runId: number
): Promise<AnalysisRunDetail> {
  const { data } = await api.get(`/history/runs/${runId}`);
  return data;
}

export async function deleteAnalysisRun(runId: number): Promise<void> {
  await api.delete(`/history/runs/${runId}`);
}

export async function restoreAnalysisRun(
  runId: number
): Promise<TicketSuggestion[]> {
  const { data } = await api.post(`/history/runs/${runId}/restore`);
  return data;
}

// Configuration API
export async function getConfig(): Promise<Git2JiraConfig> {
  const { data } = await api.get("/config/");
  return data;
}

export async function addScanDirectory(
  scanDirectory: ScanDirectory
): Promise<Git2JiraConfig> {
  const { data } = await api.post("/config/scan-directories", {
    scan_directory: scanDirectory,
  });
  return data;
}

export async function removeScanDirectory(
  path: string
): Promise<Git2JiraConfig> {
  const { data } = await api.delete("/config/scan-directories", {
    data: { path },
  });
  return data;
}

export async function updateUIPreferences(
  preferences: UIPreferences
): Promise<Git2JiraConfig> {
  const { data } = await api.put("/config/ui-preferences", {
    preferences,
  });
  return data;
}

export async function toggleAutoDiscovery(
  enabled: boolean
): Promise<Git2JiraConfig> {
  const { data } = await api.post(`/config/auto-discovery/toggle`, null, {
    params: { enabled },
  });
  return data;
}

export async function getAutoDiscoveryStatus(): Promise<{
  running: boolean;
  enabled: boolean;
  watch_paths: string[];
  scan_interval_seconds: number;
  discovered_count: number;
  callback_count: number;
}> {
  const { data } = await api.get("/config/auto-discovery/status");
  return data;
}

export async function startAutoDiscovery(): Promise<any> {
  const { data } = await api.post("/config/auto-discovery/start");
  return data;
}

export async function stopAutoDiscovery(): Promise<any> {
  const { data } = await api.post("/config/auto-discovery/stop");
  return data;
}

export async function triggerManualDiscovery(): Promise<{
  success: boolean;
  discovered_count: number;
}> {
  const { data} = await api.post("/config/auto-discovery/discover");
  return data;
}

export async function updateJiraConfig(request: {
  jira_config: any;
}): Promise<Git2JiraConfig> {
  const { data } = await api.put("/config/jira", request);
  return data;
}

// Theme API
export interface ThemeSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  author?: string | null;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  author?: string | null;
  version: string;
  colors: Record<string, string>;
  effects: Record<string, string>;
  typography: Record<string, string>;
  gradients: Record<string, string>;
  custom_vars: Record<string, string>;
  custom_css?: string | null;
}

export async function listThemes(category?: string): Promise<ThemeSummary[]> {
  const { data } = await api.get("/themes/", {
    params: category ? { category } : {},
  });
  return data;
}

export async function getTheme(themeId: string): Promise<ThemeDefinition> {
  const { data } = await api.get(`/themes/${themeId}`);
  return data;
}

export async function getThemeCSS(themeId: string): Promise<{ css: string }> {
  const { data } = await api.get(`/themes/${themeId}/css`);
  return data;
}

export async function installCustomTheme(
  themeData: any
): Promise<ThemeDefinition> {
  const { data } = await api.post("/themes/install", themeData);
  return data;
}

export async function deleteCustomTheme(themeId: string): Promise<void> {
  await api.delete(`/themes/${themeId}`);
}

// GitHub Integration API
export async function checkGitHubConnection(): Promise<{
  connected: boolean;
  username?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  error?: string;
}> {
  const { data } = await api.get("/github/health");
  return data;
}

export async function getGitHubIntegrations(): Promise<any[]> {
  const { data } = await api.get("/github/integrations");
  return data;
}

export async function enableGitHubIntegration(request: {
  repo_path: string;
  github_owner?: string;
  github_repo?: string;
  remote_url?: string;
  sync_enabled?: boolean;
}): Promise<any> {
  const { data } = await api.post("/github/enable", request);
  return data;
}

export async function disableGitHubIntegration(repoPath: string): Promise<any> {
  const encodedPath = encodeURIComponent(repoPath);
  const { data } = await api.delete(`/github/disable/${encodedPath}`);
  return data;
}

export async function syncGitHubData(repoPath: string, sinceDays = 30): Promise<{
  success: boolean;
  repo_name: string;
  prs_synced: number;
  commits_synced: number;
  jira_links_created: number;
  error?: string;
  last_synced?: string;
}> {
  const encodedPath = encodeURIComponent(repoPath);
  const { data } = await api.post(`/github/sync/${encodedPath}`, null, {
    params: { since_days: sinceDays },
  });
  return data;
}

export async function getGitHubPRs(repoPath: string, state = "all"): Promise<any[]> {
  const encodedPath = encodeURIComponent(repoPath);
  const { data } = await api.get(`/github/${encodedPath}/prs`, {
    params: { state },
  });
  return data;
}

export async function linkPRToJira(request: {
  repo_path: string;
  pr_number: number;
  jira_key: string;
  add_comment?: boolean;
}): Promise<{
  success: boolean;
  pr_url: string;
  jira_url: string;
  error?: string;
}> {
  const { data } = await api.post("/github/link-pr-to-jira", request);
  return data;
}

// Linear Integration API
export async function checkLinearConnection(): Promise<{
  connected: boolean;
  user_id?: string;
  name?: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  error?: string;
}> {
  const { data } = await api.get("/linear/health");
  return data;
}

export async function getLinearTeams(): Promise<any[]> {
  const { data } = await api.get("/linear/teams");
  return data;
}

export async function getLinearIntegrations(): Promise<any[]> {
  const { data } = await api.get("/linear/integrations");
  return data;
}

export async function enableLinearIntegration(request: {
  team_id: string;
  team_name?: string;
  team_key?: string;
  auto_sync?: boolean;
  sync_interval_minutes?: number;
}): Promise<any> {
  const { data } = await api.post("/linear/enable", request);
  return data;
}

export async function disableLinearIntegration(teamId: string): Promise<any> {
  const { data } = await api.delete(`/linear/disable/${teamId}`);
  return data;
}

export async function syncLinearData(teamId: string, limit = 100): Promise<{
  success: boolean;
  team_name: string;
  issues_synced: number;
  projects_synced: number;
  jira_links_created: number;
  error?: string;
  last_synced?: string;
}> {
  const { data } = await api.post(`/linear/sync/${teamId}`, null, {
    params: { limit },
  });
  return data;
}

export async function getLinearIssues(
  teamId: string,
  state?: string
): Promise<any[]> {
  const { data } = await api.get(`/linear/${teamId}/issues`, {
    params: { state },
  });
  return data;
}

export async function linkLinearToJira(request: {
  linear_issue_id: string;
  jira_key: string;
  add_comment?: boolean;
}): Promise<{
  success: boolean;
  linear_url: string;
  jira_url: string;
  error?: string;
}> {
  const { data} = await api.post("/linear/link-to-jira", request);
  return data;
}

// CodeClimate Integration API
export async function checkCodeClimateConnection(): Promise<{
  connected: boolean;
  orgs_count?: number;
  error?: string;
}> {
  const { data } = await api.get("/codeclimate/health");
  return data;
}

export async function getCodeClimateRepos(orgId?: string): Promise<any[]> {
  const { data } = await api.get("/codeclimate/repos", {
    params: orgId ? { org_id: orgId } : {},
  });
  return data;
}

export async function getCodeClimateIntegrations(): Promise<any[]> {
  const { data } = await api.get("/codeclimate/integrations");
  return data;
}

export async function enableCodeClimateIntegration(request: {
  repo_id: string;
  repo_name?: string;
  repo_slug?: string;
  github_slug?: string;
  auto_sync?: boolean;
  sync_interval_minutes?: number;
}): Promise<any> {
  const { data } = await api.post("/codeclimate/enable", request);
  return data;
}

export async function disableCodeClimateIntegration(repoId: string): Promise<any> {
  const { data } = await api.delete(`/codeclimate/disable/${repoId}`);
  return data;
}

export async function syncCodeClimateData(repoId: string): Promise<{
  success: boolean;
  repo_name: string;
  snapshots_synced: number;
  issues_synced: number;
  error?: string;
  last_synced?: string;
}> {
  const { data } = await api.post(`/codeclimate/sync/${repoId}`);
  return data;
}

export async function getCodeClimateSnapshots(
  repoId: string,
  limit = 10
): Promise<any[]> {
  const { data } = await api.get(`/codeclimate/${repoId}/snapshots`, {
    params: { limit },
  });
  return data;
}

export async function getCodeClimateStats(repoId: string): Promise<{
  repo_id: string;
  maintainability_score?: number;
  maintainability_grade: string;
  test_coverage: number;
  coverage_rating: string;
  lines_of_code: number;
  total_issues: number;
  technical_debt_hours: number;
  last_snapshot_at?: string;
  last_coverage_at?: string;
  error?: string;
}> {
  const { data } = await api.get(`/codeclimate/repos/${repoId}/stats`);
  return data;
}
