import { useState } from "react";
import { Badge, Label } from "@patternfly/react-core";
import type { WorkSummary, RepoJiraTicket } from "../../api/types";
import type { Quarter } from "../../utils/quarterUtils";
import { useRepoTickets } from "../../hooks/useJiraTickets";
import { filterByDateRange } from "../../utils/quarterUtils";
import RepoDetailTabs from "./RepoDetailTabs";

interface RepoAccordionProps {
  summaries: WorkSummary[];
  quarter: Quarter;
  selectedWeek: number | null;
  projectKey: string;
}

export default function RepoAccordion({
  summaries,
  quarter,
  selectedWeek,
  projectKey,
}: RepoAccordionProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (repoName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(repoName)) next.delete(repoName);
      else next.add(repoName);
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {summaries.map((summary) => {
        const filteredCommits = filterByDateRange(
          summary.recent_commits,
          (c) => new Date(c.date),
          quarter.start,
          quarter.end
        );
        const filteredPRs = filterByDateRange(
          summary.pull_requests,
          (pr) => pr.created_at ? new Date(pr.created_at) : null,
          quarter.start,
          quarter.end
        );
        const isOpen = expanded.has(summary.repo_name);

        return (
          <RepoRow
            key={summary.repo_path}
            summary={summary}
            filteredCommitCount={filteredCommits.length}
            filteredPRCount={filteredPRs.length}
            isOpen={isOpen}
            onToggle={() => toggle(summary.repo_name)}
            quarter={quarter}
            selectedWeek={selectedWeek}
            projectKey={projectKey}
            filteredCommits={filteredCommits}
            filteredPRs={filteredPRs}
          />
        );
      })}
    </div>
  );
}

function RepoRow({
  summary,
  filteredCommitCount,
  filteredPRCount,
  isOpen,
  onToggle,
  quarter,
  selectedWeek,
  projectKey,
  filteredCommits,
  filteredPRs,
}: {
  summary: WorkSummary;
  filteredCommitCount: number;
  filteredPRCount: number;
  isOpen: boolean;
  onToggle: () => void;
  quarter: Quarter;
  selectedWeek: number | null;
  projectKey: string;
  filteredCommits: WorkSummary["recent_commits"];
  filteredPRs: WorkSummary["pull_requests"];
}) {
  const sinceDate = quarter.start.toISOString().split("T")[0];
  const { data: jiraTickets = [], isLoading: jiraLoading } = useRepoTickets(
    isOpen ? projectKey : "",
    isOpen ? summary.repo_name : "",
    sinceDate
  );

  // Skip repos with no activity in the quarter
  if (filteredCommitCount === 0 && filteredPRCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        border: "1px solid var(--pf-t--global--border--color--default)",
        borderRadius: 4,
      }}
    >
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          cursor: "pointer",
          background: isOpen
            ? "var(--pf-t--global--background--color--secondary--default)"
            : undefined,
        }}
      >
        <span style={{ width: 16 }}>{isOpen ? "▼" : "▶"}</span>
        <strong style={{ flex: 1 }}>{summary.repo_name}</strong>
        <Label color="blue" isCompact>{summary.current_branch}</Label>
        <Badge isRead>{filteredCommitCount} commits</Badge>
        <Badge isRead>{filteredPRCount} PRs</Badge>
        <Badge isRead>{jiraTickets.length} Jira</Badge>
        {filteredCommits.filter((c) => c.jira_refs.length > 0).length > 0 && (
          <Badge isRead>
            {filteredCommits.filter((c) => c.jira_refs.length > 0).length} refs
          </Badge>
        )}
      </div>

      {isOpen && (
        <div style={{ padding: "0 12px 12px" }}>
          <RepoDetailTabs
            commits={filteredCommits}
            pullRequests={filteredPRs}
            jiraTickets={jiraTickets}
            jiraLoading={jiraLoading}
            quarter={quarter}
            selectedWeek={selectedWeek}
          />
        </div>
      )}
    </div>
  );
}
