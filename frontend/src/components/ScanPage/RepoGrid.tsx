import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Checkbox,
  Gallery,
  Label,
} from "@patternfly/react-core";
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
  favorites?: Set<string>;
  onToggleFavorite?: (repoPath: string, repoName: string) => void;
}

export function RepoGrid({
  repos,
  selected,
  onToggle,
  onOpenPullModal,
  favorites,
  onToggleFavorite,
}: RepoGridProps) {
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const isGlassmorphic = config?.ui.theme === "glassmorphic";

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
        const isFav = favorites?.has(repo.path) ?? false;
        const statusColor = repo.status === "clean" ? "var(--pf-t--color--green--40)" : "var(--pf-t--color--orange--40)";

        const starBtn = onToggleFavorite ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(repo.path, repo.name); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onToggleFavorite(repo.path, repo.name); } }}
            style={{ cursor: "pointer", fontSize: "1rem", lineHeight: 1, userSelect: "none" }}
            title={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            {isFav ? "\u2605" : "\u2606"}
          </span>
        ) : null;

        if (isGlassmorphic) {
          return (
            <GlassCard
              key={repo.path}
              variant={isSelected ? "border-gradient" : "default"}
              onClick={() => onToggle(repo.path)}
              style={{ cursor: "pointer" }}
            >
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
                  <span style={{ marginLeft: "auto" }}>{starBtn}</span>
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
            style={{ cursor: "pointer" }}
          >
            <CardTitle>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Checkbox
                  id={`cb-${repo.name}`}
                  isChecked={isSelected}
                  onChange={() => onToggle(repo.path)}
                  label={<span style={{ fontSize: "0.875rem" }}>{repo.name}</span>}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ marginLeft: "auto" }}>{starBtn}</span>
              </div>
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
            </CardBody>
          </Card>
        );
      })}
    </Gallery>
  );
}
