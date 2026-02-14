import type { TicketSuggestion, WorkSummary } from "../api/types";

/**
 * Export data to CSV format and trigger download.
 */
export function exportToCSV(data: any[], filename: string, headers: string[]) {
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header.toLowerCase().replace(/ /g, "_")];
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value ?? "").replace(/"/g, '""');
          return escaped.includes(",") ? `"${escaped}"` : escaped;
        })
        .join(",")
    ),
  ];

  const csvContent = csvRows.join("\n");
  downloadFile(csvContent, filename, "text/csv");
}

/**
 * Export data to JSON format and trigger download.
 */
export function exportToJSON(data: any, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, "application/json");
}

/**
 * Export ticket suggestions to CSV.
 */
export function exportSuggestionsToCSV(suggestions: TicketSuggestion[]) {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `ticket_suggestions_${timestamp}.csv`;

  const headers = [
    "Summary",
    "Issue Type",
    "Priority",
    "Source Repo",
    "Source Branch",
    "Labels",
    "Already Tracked",
  ];

  const data = suggestions.map((s) => ({
    summary: s.summary,
    issue_type: s.issue_type,
    priority: s.priority,
    source_repo: s.source_repo,
    source_branch: s.source_branch,
    labels: s.labels.join("; "),
    already_tracked: s.already_tracked ? "Yes" : "No",
  }));

  exportToCSV(data, filename, headers);
}

/**
 * Export ticket suggestions to JSON.
 */
export function exportSuggestionsToJSON(suggestions: TicketSuggestion[]) {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `ticket_suggestions_${timestamp}.json`;
  exportToJSON(suggestions, filename);
}

/**
 * Export work summaries to CSV.
 */
export function exportWorkSummariesToCSV(summaries: WorkSummary[]) {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `work_summary_${timestamp}.csv`;

  const headers = [
    "Repo Name",
    "Current Branch",
    "Uncommitted Files",
    "Recent Commits",
    "Branches",
    "Pull Requests",
  ];

  const data = summaries.map((s) => ({
    repo_name: s.repo_name,
    current_branch: s.current_branch,
    uncommitted_files:
      s.uncommitted.staged.length +
      s.uncommitted.unstaged.length +
      s.uncommitted.untracked.length,
    recent_commits: s.recent_commits.length,
    branches: s.branches.length,
    pull_requests: s.pull_requests.length,
  }));

  exportToCSV(data, filename, headers);
}

/**
 * Export work summaries to JSON.
 */
export function exportWorkSummariesToJSON(summaries: WorkSummary[]) {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `work_summary_${timestamp}.json`;
  exportToJSON(summaries, filename);
}

/**
 * Trigger file download in browser.
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
