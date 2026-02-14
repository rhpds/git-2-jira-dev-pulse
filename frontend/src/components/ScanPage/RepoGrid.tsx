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
}

export function RepoGrid({
  repos,
  selected,
  onToggle,
  onOpenPullModal,
}: RepoGridProps) {
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const isGlassmorphic = config?.ui.theme === "glassmorphic";

  const CardComponent = isGlassmorphic ? GlassCard : Card;

  return (
    <Gallery
      hasGutter
      minWidths={{ default: "340px" }}
      style={{ marginTop: 16 }}
    >
      {repos.map((repo) => {
        const isSelected = selected.has(repo.path);
        const statusColor = repo.status === "clean" ? "var(--pf-t--color--green--40)" : "var(--pf-t--color--orange--40)";

        if (isGlassmorphic) {
          return (
            <GlassCard
              key={repo.path}
              variant={isSelected ? "border-gradient" : "default"}
              hover
              onClick={() => onToggle(repo.path)}
              style={{ cursor: "pointer" }}
            >
              <div style={{ padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <RepoIdentityIcon size={32} color={statusColor} animate />
                  <Checkbox
                    id={`cb-${repo.name}`}
                    isChecked={isSelected}
                    onChange={() => onToggle(repo.path)}
                    label={<strong>{repo.name}</strong>}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--pf-t--global--spacer--sm)",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <Label color="blue">{repo.current_branch}</Label>
                  <Label color={repo.status === "clean" ? "green" : "orange"}>
                    {repo.status === "clean" ? "Clean" : `${repo.uncommitted_count} changes`}
                  </Label>
                  {repo.recent_commit_count > 0 && (
                    <Label color="purple">{repo.recent_commit_count} commits</Label>
                  )}
                  {repo.has_remote && (
                    <Button
                      variant="link"
                      isSmall
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPullModal(repo);
                      }}
                      style={{ padding: "0 4px" }}
                    >
                      Pull branch...
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
            isSelectable
            isSelected={isSelected}
            onClick={() => onToggle(repo.path)}
            style={{ cursor: "pointer" }}
          >
            <CardTitle>
              <Checkbox
                id={`cb-${repo.name}`}
                isChecked={isSelected}
                onChange={() => onToggle(repo.path)}
                label={repo.name}
                onClick={(e) => e.stopPropagation()}
              />
            </CardTitle>
            <CardBody>
              <div
                style={{
                  display: "flex",
                  gap: "var(--pf-t--global--spacer--sm)",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <Label color="blue">{repo.current_branch}</Label>
                <Label color={repo.status === "clean" ? "green" : "orange"}>
                  {repo.status === "clean" ? "Clean" : `${repo.uncommitted_count} changes`}
                </Label>
                {repo.recent_commit_count > 0 && (
                  <Label color="purple">{repo.recent_commit_count} commits</Label>
                )}
                {repo.has_remote && (
                  <Button
                    variant="link"
                    isSmall
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPullModal(repo);
                    }}
                    style={{ padding: "0 4px" }}
                  >
                    Pull branch...
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
