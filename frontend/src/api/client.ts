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
} from "./types";

const api = axios.create({ baseURL: "/api" });

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
