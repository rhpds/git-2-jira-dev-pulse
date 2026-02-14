import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Checkbox,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "@patternfly/react-core";
import { useFolders } from "../hooks/useFolders";
import { useAnalyzeFolders } from "../hooks/useGitAnalysis";
import { useGitPull } from "../hooks/useGitPull";
import { useRepoFilters } from "../hooks/useRepoFilters";
import { RepoGrid } from "../components/ScanPage/RepoGrid";
import { PullBranchModal } from "../components/ScanPage/PullBranchModal";
import { RepoFilters } from "../components/ScanPage/RepoFilters";
import type { WorkSummary } from "../api/types";

export function setAnalysisResults(results: WorkSummary[]) {
  sessionStorage.setItem("analysisResults", JSON.stringify(results));
}

export default function ScanPage() {
  const navigate = useNavigate();
  const { data: repos, isLoading, error, refetch } = useFolders();
  const analyzeMutation = useAnalyzeFolders();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    pullRepo,
    remoteBranches,
    loadingBranches,
    pulling,
    pullResult,
    openPullModal,
    handlePull,
    closePullModal,
  } = useGitPull(refetch);

  const {
    searchTerm,
    setSearchTerm,
    activityFilter,
    setActivityFilter,
    statusFilter,
    setStatusFilter,
    selectedBranch,
    setSelectedBranch,
    branches,
    filteredRepos,
    clearFilters,
    hasActiveFilters,
    filteredCount,
    totalCount,
  } = useRepoFilters(repos);

  const toggleAll = (checked: boolean) => {
    if (checked && filteredRepos) {
      setSelected(new Set(filteredRepos.map((r) => r.path)));
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

  if (isLoading) return <Spinner aria-label="Loading repos..." />;
  if (error)
    return (
      <EmptyState titleText="Error loading repositories" status="danger">
        <EmptyStateBody>{String(error)}</EmptyStateBody>
      </EmptyState>
    );

  return (
    <>
      <Title headingLevel="h1" size="2xl" style={{ marginBlockEnd: "var(--pf-t--global--spacer--md)" }}>
        Select Repositories to Analyze
      </Title>

      <RepoFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activityFilter={activityFilter}
        onActivityFilterChange={setActivityFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        branches={branches}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        filteredCount={filteredCount}
        totalCount={totalCount}
      />

      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Checkbox
              id="select-all"
              label={`Select all (${filteredCount})`}
              isChecked={
                filteredRepos.length > 0 &&
                selected.size === filteredRepos.length
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

      <RepoGrid
        repos={filteredRepos}
        selected={selected}
        onToggle={toggle}
        onOpenPullModal={openPullModal}
      />

      <PullBranchModal
        pullRepo={pullRepo}
        remoteBranches={remoteBranches}
        loadingBranches={loadingBranches}
        pulling={pulling}
        pullResult={pullResult}
        onClose={closePullModal}
        onPull={handlePull}
        onClearResult={closePullModal}
      />
    </>
  );
}
