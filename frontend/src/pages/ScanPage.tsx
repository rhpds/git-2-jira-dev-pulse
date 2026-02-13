import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Checkbox,
  EmptyState,
  EmptyStateBody,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { useFolders } from "../hooks/useFolders";
import { useAnalyzeFolders } from "../hooks/useGitAnalysis";
import { getRemoteBranches, gitPull } from "../api/client";
import type { RemoteBranch } from "../api/client";
import type { RepoInfo, WorkSummary } from "../api/types";

export function setAnalysisResults(results: WorkSummary[]) {
  sessionStorage.setItem("analysisResults", JSON.stringify(results));
}

export default function ScanPage() {
  const navigate = useNavigate();
  const { data: repos, isLoading, error, refetch } = useFolders();
  const analyzeMutation = useAnalyzeFolders();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Pull modal state
  const [pullRepo, setPullRepo] = useState<RepoInfo | null>(null);
  const [remoteBranches, setRemoteBranches] = useState<RemoteBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullResult, setPullResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const toggleAll = (checked: boolean) => {
    if (checked && repos) {
      setSelected(new Set(repos.map((r) => r.path)));
    } else {
      setSelected(new Set());
    }
  };

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleAnalyze = async () => {
    const paths = Array.from(selected);
    const results = await analyzeMutation.mutateAsync(paths);
    setAnalysisResults(results);
    navigate("/dashboard");
  };

  const openPullModal = async (repo: RepoInfo) => {
    setPullRepo(repo);
    setPullResult(null);
    setRemoteBranches([]);
    setLoadingBranches(true);
    try {
      const branches = await getRemoteBranches(repo.path);
      setRemoteBranches(branches);
    } catch {
      setRemoteBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handlePull = async (branch: string) => {
    if (!pullRepo) return;
    setPulling(true);
    setPullResult(null);
    try {
      const result = await gitPull(pullRepo.path, branch);
      if (result.success) {
        setPullResult({
          success: true,
          message: `Pulled ${branch} successfully. Now on: ${result.current_branch}`,
        });
        refetch();
      } else {
        setPullResult({
          success: false,
          message: result.error || "Pull failed",
        });
      }
    } catch (e) {
      setPullResult({ success: false, message: String(e) });
    } finally {
      setPulling(false);
    }
  };

  if (isLoading) return <Spinner aria-label="Loading repos..." />;
  if (error)
    return (
      <EmptyState>
        <Title headingLevel="h2" size="lg">
          Error loading repositories
        </Title>
        <EmptyStateBody>{String(error)}</EmptyStateBody>
      </EmptyState>
    );

  return (
    <>
      <Title headingLevel="h1" size="2xl" style={{ marginBottom: 16 }}>
        Select Repositories to Analyze
      </Title>

      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Checkbox
              id="select-all"
              label={`Select all (${repos?.length ?? 0})`}
              isChecked={
                repos
                  ? selected.size === repos.length && repos.length > 0
                  : false
              }
              onChange={(_e, checked) => toggleAll(checked)}
            />
          </ToolbarItem>
          <ToolbarItem align={{ default: "alignEnd" }}>
            <Button
              variant="primary"
              isDisabled={selected.size === 0 || analyzeMutation.isPending}
              isLoading={analyzeMutation.isPending}
              onClick={handleAnalyze}
            >
              Analyze Selected ({selected.size})
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {repos?.map((repo) => (
          <Card
            key={repo.path}
            isSelectable
            isSelected={selected.has(repo.path)}
            onClick={() => toggle(repo.path)}
            style={{ cursor: "pointer" }}
          >
            <CardTitle>
              <Checkbox
                id={`cb-${repo.name}`}
                isChecked={selected.has(repo.path)}
                onChange={() => toggle(repo.path)}
                label={repo.name}
                onClick={(e) => e.stopPropagation()}
              />
            </CardTitle>
            <CardBody>
              <div
                style={{
                  display: "flex",
                  gap: 8,
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
                      openPullModal(repo);
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
      </div>

      {/* Pull Branch Modal */}
      <Modal
        isOpen={!!pullRepo}
        onClose={() => setPullRepo(null)}
        variant="medium"
      >
        <ModalHeader
          title={`Pull Branch — ${pullRepo?.name ?? ""}`}
          description="Select a branch to checkout and pull. Showing branches with your PRs."
        />
        <ModalBody>
          {loadingBranches && <Spinner aria-label="Loading branches..." />}

          {!loadingBranches && remoteBranches.length === 0 && (
            <p>No rhjcd branches with PRs found for this repo.</p>
          )}

          {!loadingBranches &&
            remoteBranches.map((rb) => (
              <div
                key={rb.branch}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom:
                    "1px solid var(--pf-t--global--border--color--default)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong>{rb.branch}</strong>
                  <div style={{ fontSize: "0.85em", color: "#666" }}>
                    PR #{rb.pr_number}: {rb.pr_title}
                  </div>
                </div>
                <Label
                  color={
                    rb.pr_state === "MERGED"
                      ? "green"
                      : rb.pr_state === "OPEN"
                        ? "blue"
                        : rb.pr_state === "DEFAULT"
                          ? "purple"
                          : "grey"
                  }
                  isCompact
                >
                  {rb.pr_state === "DEFAULT" ? "base" : rb.pr_state}
                </Label>
                <Button
                  variant="secondary"
                  isSmall
                  isLoading={pulling}
                  isDisabled={pulling}
                  onClick={() => handlePull(rb.branch)}
                >
                  Pull
                </Button>
              </div>
            ))}

          {pullResult && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 4,
                background: pullResult.success
                  ? "var(--pf-t--global--color--status--success--default)"
                  : "var(--pf-t--global--color--status--danger--default)",
                color: "#fff",
              }}
            >
              {pullResult.message}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="link" onClick={() => setPullRepo(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
