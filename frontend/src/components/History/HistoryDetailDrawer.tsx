import {
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerActions,
  DrawerCloseButton,
  DrawerPanelContent,
  DrawerPanelBody,
  Title,
  Button,
  Stack,
  StackItem,
  Label,
  Spinner,
} from "@patternfly/react-core";
import { DownloadIcon } from "@patternfly/react-icons";
import { useNavigate } from "react-router-dom";
import type { AnalysisRunDetail } from "../../api/types";
import { setAnalysisResults } from "../../pages/ScanPage";

interface HistoryDetailDrawerProps {
  isOpen: boolean;
  runDetail: AnalysisRunDetail | undefined;
  isLoading: boolean;
  onClose: () => void;
  onRestore: () => void;
}

export function HistoryDetailDrawer({
  isOpen,
  runDetail,
  isLoading,
  onClose,
  onRestore,
}: HistoryDetailDrawerProps) {
  const navigate = useNavigate();

  const handleLoadIntoDashboard = () => {
    if (runDetail) {
      // Convert suggestions to work summaries format
      const workSummaries = runDetail.repos_analyzed.map((repo) => ({
        repo_name: repo,
        repo_path: repo,
        current_branch: "unknown",
        uncommitted: { staged: [], unstaged: [], untracked: [] },
        recent_commits: [],
        branches: [],
        pull_requests: [],
      }));

      setAnalysisResults(workSummaries);
      navigate("/dashboard");
    }
  };

  const panelContent = (
    <DrawerPanelContent>
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          Analysis Details
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        {isLoading && <Spinner aria-label="Loading run details..." />}

        {!isLoading && runDetail && (
          <Stack hasGutter>
            <StackItem>
              <strong>Date:</strong>{" "}
              {new Date(runDetail.timestamp).toLocaleString()}
            </StackItem>

            <StackItem>
              <strong>Project:</strong>{" "}
              {runDetail.project_key ? (
                <Label color="blue">{runDetail.project_key}</Label>
              ) : (
                "None"
              )}
            </StackItem>

            <StackItem>
              <strong>Repositories ({runDetail.repos_analyzed.length}):</strong>
              <ul style={{ marginTop: "var(--pf-t--global--spacer--sm)" }}>
                {runDetail.repos_analyzed.map((repo, idx) => (
                  <li key={idx}>{repo}</li>
                ))}
              </ul>
            </StackItem>

            <StackItem>
              <strong>
                Suggestions ({runDetail.suggestions.length}):{" "}
              </strong>
              <ul style={{ marginTop: "var(--pf-t--global--spacer--sm)" }}>
                {runDetail.suggestions.map((sug) => (
                  <li key={sug.id}>
                    {sug.summary}{" "}
                    {sug.was_created && sug.jira_key && (
                      <Label color="green" isCompact>
                        {sug.jira_key}
                      </Label>
                    )}
                  </li>
                ))}
              </ul>
            </StackItem>

            <StackItem>
              <Stack hasGutter>
                <StackItem>
                  <Button
                    variant="primary"
                    icon={<DownloadIcon />}
                    onClick={onRestore}
                  >
                    Restore Suggestions
                  </Button>
                </StackItem>
                <StackItem>
                  <Button variant="secondary" onClick={handleLoadIntoDashboard}>
                    Load into Dashboard
                  </Button>
                </StackItem>
              </Stack>
            </StackItem>
          </Stack>
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );

  return (
    <Drawer isExpanded={isOpen} onExpand={onClose}>
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{/* Main content here if needed */}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
}
