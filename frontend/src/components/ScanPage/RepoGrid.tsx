import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Checkbox,
  Gallery,
  Label,
} from "@patternfly/react-core";
import type { RepoInfo } from "../../api/types";

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
  return (
    <Gallery
      hasGutter
      minWidths={{ default: "340px" }}
      style={{ marginTop: 16 }}
    >
      {repos.map((repo) => (
        <Card
          key={repo.path}
          isSelectable
          isSelected={selected.has(repo.path)}
          onClick={() => onToggle(repo.path)}
          style={{ cursor: "pointer" }}
        >
          <CardTitle>
            <Checkbox
              id={`cb-${repo.name}`}
              isChecked={selected.has(repo.path)}
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
      ))}
    </Gallery>
  );
}
