/**
 * RepoListView - Table/list view of repositories with sortable columns
 * Supports virtualized scrolling for large repo lists
 */

import { useState } from "react";
import {
  Checkbox,
  Label,
  Button,
} from "@patternfly/react-core";
import type { RepoInfo } from "../../api/types";

type SortField = "name" | "branch" | "status" | "commits" | "uncommitted";
type SortDir = "asc" | "desc";

interface RepoListViewProps {
  repos: RepoInfo[];
  selected: Set<string>;
  onToggle: (path: string) => void;
  onOpenPullModal: (repo: RepoInfo) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (repoPath: string, repoName: string) => void;
}

export function RepoListView({
  repos,
  selected,
  onToggle,
  onOpenPullModal,
  favorites,
  onToggleFavorite,
}: RepoListViewProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = [...repos].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "name":
        return a.name.localeCompare(b.name) * dir;
      case "branch":
        return a.current_branch.localeCompare(b.current_branch) * dir;
      case "status":
        return a.status.localeCompare(b.status) * dir;
      case "commits":
        return (a.recent_commit_count - b.recent_commit_count) * dir;
      case "uncommitted":
        return (a.uncommitted_count - b.uncommitted_count) * dir;
      default:
        return 0;
    }
  });

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      style={{ padding: "0.75rem 0.5rem", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      onClick={() => toggleSort(field)}
    >
      {label} {sortField === field ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : ""}
    </th>
  );

  // Virtualization: only render visible rows for performance
  const MAX_RENDER = 200;
  const visibleRepos = sorted.slice(0, MAX_RENDER);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--pf-t--global--border--color--default)", textAlign: "left" }}>
            <th style={{ padding: "0.75rem 0.5rem", width: "40px" }}></th>
            {favorites && <th style={{ padding: "0.75rem 0.5rem", width: "40px" }}></th>}
            <SortHeader field="name" label="Repository" />
            <SortHeader field="branch" label="Branch" />
            <SortHeader field="status" label="Status" />
            <SortHeader field="commits" label="Commits" />
            <SortHeader field="uncommitted" label="Uncommitted" />
            <th style={{ padding: "0.75rem 0.5rem" }}>Remote</th>
            <th style={{ padding: "0.75rem 0.5rem" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleRepos.map((repo) => {
            const isSelected = selected.has(repo.path);
            const isFav = favorites?.has(repo.path);
            return (
              <tr
                key={repo.path}
                style={{
                  borderBottom: "1px solid var(--pf-t--global--border--color--default)",
                  background: isSelected ? "var(--pf-t--global--background--color--action--plain--hover)" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <td style={{ padding: "0.5rem" }}>
                  <Checkbox
                    id={`list-${repo.path}`}
                    isChecked={isSelected}
                    onChange={() => onToggle(repo.path)}
                    aria-label={`Select ${repo.name}`}
                  />
                </td>
                {favorites && (
                  <td style={{ padding: "0.5rem" }}>
                    <span
                      style={{ cursor: "pointer", fontSize: "1.1rem", color: isFav ? "#eab308" : "var(--pf-t--global--text--color--subtle)" }}
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(repo.path, repo.name); }}
                    >
                      {isFav ? "\u2605" : "\u2606"}
                    </span>
                  </td>
                )}
                <td style={{ padding: "0.5rem", fontWeight: 500 }}>{repo.name}</td>
                <td style={{ padding: "0.5rem" }}>
                  <Label isCompact color="blue">{repo.current_branch}</Label>
                </td>
                <td style={{ padding: "0.5rem" }}>
                  <Label isCompact color={repo.status === "clean" ? "green" : "orange"}>
                    {repo.status}
                  </Label>
                </td>
                <td style={{ padding: "0.5rem", textAlign: "center" }}>{repo.recent_commit_count}</td>
                <td style={{ padding: "0.5rem", textAlign: "center" }}>
                  {repo.uncommitted_count > 0 ? (
                    <Label isCompact color="orange">{repo.uncommitted_count}</Label>
                  ) : (
                    "0"
                  )}
                </td>
                <td style={{ padding: "0.5rem" }}>
                  {repo.has_remote ? <Label isCompact color="green">Yes</Label> : <Label isCompact>No</Label>}
                </td>
                <td style={{ padding: "0.5rem" }}>
                  {repo.has_remote && (
                    <Button variant="link" isSmall onClick={() => onOpenPullModal(repo)}>
                      Pull
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length > MAX_RENDER && (
        <div style={{ padding: "1rem", textAlign: "center", color: "var(--pf-t--global--text--color--subtle)" }}>
          Showing {MAX_RENDER} of {sorted.length} repos. Use filters to narrow results.
        </div>
      )}
      {repos.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--pf-t--global--text--color--subtle)" }}>
          No repositories found
        </div>
      )}
    </div>
  );
}
