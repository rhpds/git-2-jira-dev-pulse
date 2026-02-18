import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Checkbox,
  ExpandableSection,
  Gallery,
  Label,
  Tooltip,
} from "@patternfly/react-core";
import {
  TimesIcon,
  ArrowUpIcon,
  CodeBranchIcon,
  FolderOpenIcon,
} from "@patternfly/react-icons";
import { useQuery } from "@tanstack/react-query";
import type { RepoInfo } from "../../api/types";
import { getConfig } from "../../api/client";
import { GlassCard } from "../GlassCard/GlassCard";
import { RepoIdentityIcon } from "../CustomIcons";

interface RepoGridProps {
  repos: RepoInfo[];
  selected: Set<string>;
  onToggle: (path: string) => void;
  onOpenPullModal: (repo: RepoInfo) => void;
  onHideRepo?: (repoName: string) => void;
}

/**
 * Status badges showing unpushed commits, stale branches, untracked files.
 * Uses color coding: red = uncommitted, orange = unpushed, blue = stale.
 */
function RepoStatusBadges({ repo }: { repo: RepoInfo }) {
  const unpushed = repo.unpushed_count ?? 0;
  const staleBranches = repo.stale_branches ?? [];
  const untracked = repo.untracked_count ?? 0;

  if (unpushed === 0 && staleBranches.length === 0 && untracked === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "0.25rem",
        flexWrap: "wrap",
        alignItems: "center",
        marginTop: "0.25rem",
        fontSize: "0.7rem",
      }}
    >
      {unpushed > 0 && (
        <Tooltip content={`${unpushed} commit${unpushed !== 1 ? "s" : ""} not pushed to remote`}>
          <Label color="orange" isCompact icon={<ArrowUpIcon />}>
            {unpushed} unpushed
          </Label>
        </Tooltip>
      )}
      {staleBranches.length > 0 && (
        <Tooltip
          content={
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Stale branches (30+ days, unmerged):</div>
              {staleBranches.slice(0, 5).map((b) => (
                <div key={b.name}>{b.name} ({b.days_stale}d)</div>
              ))}
              {staleBranches.length > 5 && <div>+{staleBranches.length - 5} more</div>}
            </div>
          }
        >
          <Label color="blue" isCompact icon={<CodeBranchIcon />}>
            {staleBranches.length} stale
          </Label>
        </Tooltip>
      )}
      {untracked > 0 && (
        <Tooltip content={`${untracked} untracked file${untracked !== 1 ? "s" : ""}`}>
          <Label color="grey" isCompact icon={<FolderOpenIcon />}>
            {untracked} untracked
          </Label>
        </Tooltip>
      )}
    </div>
  );
}

export function RepoGrid({
  repos,
  selected,
  onToggle,
  onOpenPullModal,
  onHideRepo,
}: RepoGridProps) {
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const isGlassmorphic = config?.ui.theme === "glassmorphic";
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());

  const toggleExpanded = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const CardComponent = isGlassmorphic ? GlassCard : Card;

  return (
    <Gallery
      hasGutter
      minWidths={{ default: "260px", md: "280px", lg: "300px", xl: "240px" }}
      maxWidths={{ default: "320px" }}
      style={{ marginTop: 12 }}
    >
      {repos.map((repo) => {
        const isSelected = selected.has(repo.path);
        const isExpanded = expandedRepos.has(repo.path);
        const statusColor = repo.status === "clean" ? "var(--pf-t--color--green--40)" : "var(--pf-t--color--orange--40)";
        const hasWorkItems =
          (repo.unpushed_count ?? 0) > 0 ||
          (repo.stale_branches ?? []).length > 0 ||
          (repo.untracked_count ?? 0) > 0;

        if (isGlassmorphic) {
          return (
            <GlassCard
              key={repo.path}
              variant={isSelected ? "border-gradient" : "default"}
              onClick={() => onToggle(repo.path)}
              style={{ cursor: "pointer", position: "relative" }}
            >
              {onHideRepo && (
                <Tooltip content="Hide this repo">
                  <Button
                    variant="plain"
                    size="sm"
                    aria-label={`Hide ${repo.name}`}
                    onClick={(e) => { e.stopPropagation(); onHideRepo(repo.name); }}
                    style={{ position: "absolute", top: "0.25rem", right: "0.25rem", padding: "0.15rem" }}
                  >
                    <TimesIcon />
                  </Button>
                </Tooltip>
              )}
              <div style={{ padding: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <RepoIdentityIcon size={24} color={statusColor} animate />
                  <Checkbox
                    id={`cb-${repo.name}`}
                    isChecked={isSelected}
                    onChange={() => onToggle(repo.path)}
                    label={<strong style={{ fontSize: "0.875rem" }}>{repo.name}</strong>}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "0.25rem",
                    flexWrap: "wrap",
                    alignItems: "center",
                    fontSize: "0.75rem"
                  }}
                >
                  <Label color="blue" isCompact>{repo.current_branch}</Label>
                  <Label color={repo.status === "clean" ? "green" : "orange"} isCompact>
                    {repo.status === "clean" ? "Clean" : `${repo.uncommitted_count} ch`}
                  </Label>
                  {repo.recent_commit_count > 0 && (
                    <Label color="purple" isCompact>{repo.recent_commit_count} cm</Label>
                  )}
                  {repo.has_remote && repo.status !== "clean" && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPullModal(repo);
                      }}
                      style={{ padding: "0", fontSize: "0.75rem" }}
                    >
                      Pull
                    </Button>
                  )}
                </div>
                <RepoStatusBadges repo={repo} />
                {hasWorkItems && (
                  <div onClick={(e) => toggleExpanded(repo.path, e)}>
                    <ExpandableSection
                      toggleText={isExpanded ? "Hide details" : "Show hanging work"}
                      isExpanded={isExpanded}
                      onToggle={() => {}}
                      style={{ marginTop: "0.25rem", fontSize: "0.7rem" }}
                    >
                      <RepoExpandedDetails repo={repo} />
                    </ExpandableSection>
                  </div>
                )}
              </div>
            </GlassCard>
          );
        }

        return (
          <Card
            key={repo.path}
            isCompact
            isSelectable
            isSelected={isSelected}
            onClick={() => onToggle(repo.path)}
            style={{ cursor: "pointer", position: "relative" }}
          >
            {onHideRepo && (
              <Tooltip content="Hide this repo">
                <Button
                  variant="plain"
                  size="sm"
                  aria-label={`Hide ${repo.name}`}
                  onClick={(e) => { e.stopPropagation(); onHideRepo(repo.name); }}
                  style={{ position: "absolute", top: "0.25rem", right: "0.25rem", padding: "0.15rem" }}
                >
                  <TimesIcon />
                </Button>
              </Tooltip>
            )}
            <CardTitle>
              <Checkbox
                id={`cb-${repo.name}`}
                isChecked={isSelected}
                onChange={() => onToggle(repo.path)}
                label={<span style={{ fontSize: "0.875rem" }}>{repo.name}</span>}
                onClick={(e) => e.stopPropagation()}
              />
            </CardTitle>
            <CardBody>
              <div
                style={{
                  display: "flex",
                  gap: "0.25rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                  fontSize: "0.75rem"
                }}
              >
                <Label color="blue" isCompact>{repo.current_branch}</Label>
                <Label color={repo.status === "clean" ? "green" : "orange"} isCompact>
                  {repo.status === "clean" ? "Clean" : `${repo.uncommitted_count} ch`}
                </Label>
                {repo.recent_commit_count > 0 && (
                  <Label color="purple" isCompact>{repo.recent_commit_count} cm</Label>
                )}
                {repo.has_remote && repo.status !== "clean" && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPullModal(repo);
                    }}
                    style={{ padding: "0", fontSize: "0.75rem" }}
                  >
                    Pull
                  </Button>
                )}
              </div>
              <RepoStatusBadges repo={repo} />
              {hasWorkItems && (
                <div onClick={(e) => toggleExpanded(repo.path, e)}>
                  <ExpandableSection
                    toggleText={isExpanded ? "Hide details" : "Show hanging work"}
                    isExpanded={isExpanded}
                    onToggle={() => {}}
                    style={{ marginTop: "0.25rem", fontSize: "0.7rem" }}
                  >
                    <RepoExpandedDetails repo={repo} />
                  </ExpandableSection>
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </Gallery>
  );
}

/**
 * Expanded details for a repo card showing hanging work items.
 */
function RepoExpandedDetails({ repo }: { repo: RepoInfo }) {
  const unpushed = repo.unpushed_count ?? 0;
  const staleBranches = repo.stale_branches ?? [];
  const untracked = repo.untracked_count ?? 0;

  return (
    <div
      style={{
        fontSize: "0.75rem",
        padding: "0.5rem 0",
        color: "var(--pf-t--global--text--color--subtle)",
      }}
    >
      {unpushed > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontWeight: 600, color: "var(--pf-t--color--orange--40)" }}>
            <ArrowUpIcon /> {unpushed} unpushed commit{unpushed !== 1 ? "s" : ""}
          </div>
          <div style={{ marginLeft: 16, marginTop: 2 }}>
            Commits on <code>{repo.current_branch}</code> ahead of remote tracking branch.
          </div>
        </div>
      )}

      {staleBranches.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontWeight: 600, color: "var(--pf-t--color--blue--40)" }}>
            <CodeBranchIcon /> {staleBranches.length} stale branch{staleBranches.length !== 1 ? "es" : ""}
          </div>
          <div style={{ marginLeft: 16, marginTop: 2 }}>
            {staleBranches.slice(0, 3).map((b) => (
              <div key={b.name} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <code>{b.name}</code>
                <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>
                  -- {b.days_stale} days old, not merged
                </span>
              </div>
            ))}
            {staleBranches.length > 3 && (
              <div>+{staleBranches.length - 3} more stale branches</div>
            )}
          </div>
        </div>
      )}

      {untracked > 0 && (
        <div>
          <div style={{ fontWeight: 600, color: "var(--pf-t--global--text--color--subtle)" }}>
            <FolderOpenIcon /> {untracked} untracked file{untracked !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
