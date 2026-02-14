import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Checkbox,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Stack,
  StackItem,
  Grid,
  GridItem,
  ToggleGroup,
  ToggleGroupItem,
} from "@patternfly/react-core";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useFolders } from "../hooks/useFolders";
import { useAnalyzeFolders } from "../hooks/useGitAnalysis";
import { useGitPull } from "../hooks/useGitPull";
import { useRepoFilters } from "../hooks/useRepoFilters";
import { RepoGrid } from "../components/ScanPage/RepoGrid";
import { PullBranchModal } from "../components/ScanPage/PullBranchModal";
import { RepoFilters } from "../components/ScanPage/RepoFilters";
import { setAnalysisResults } from "../utils/sessionStorage";
import { getConfig } from "../api/client";
import { GlassCard } from "../components/GlassCard/GlassCard";
import { PulseIcon, ActivityBurstIcon, StatusIcon, CodeFlowIcon } from "../components/CustomIcons";
import { ActivityHeatmap } from "../components/Visualizations/ActivityHeatmap";
import { RepoStatusPie } from "../components/Visualizations/RepoStatusPie";

type ViewMode = "grid" | "list" | "visualization";

export default function ScanPage() {
  const navigate = useNavigate();
  const { data: repos, isLoading, error, refetch } = useFolders();
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const analyzeMutation = useAnalyzeFolders();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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

  const isGlassmorphic = config?.ui.theme === "glassmorphic";
  const showVisualizations = config?.ui.show_visualizations ?? true;
  const cleanCount = filteredRepos.filter(r => r.status === "clean").length;
  const dirtyCount = filteredRepos.filter(r => r.status === "dirty").length;
  const totalCommits = filteredRepos.reduce((sum, r) => sum + r.recent_commit_count, 0);
  const totalUncommitted = filteredRepos.reduce((sum, r) => sum + r.uncommitted_count, 0);

  const StatCard = isGlassmorphic ? GlassCard : motion.div;

  return (
    <Stack hasGutter>
      {/* Statistics Summary Cards */}
      <StackItem>
        <Grid hasGutter>
          <GridItem span={3}>
            <StatCard variant={isGlassmorphic ? "gradient" : undefined} gradient="primary">
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <PulseIcon size={40} color={isGlassmorphic ? "white" : "var(--pf-t--color--blue--40)"} animate />
                <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: "bold", color: isGlassmorphic ? "white" : undefined }}>
                  {totalCount}
                </div>
                <div style={{ fontSize: "0.875rem", opacity: 0.9, color: isGlassmorphic ? "white" : "var(--pf-t--global--text--color--subtle)" }}>
                  Total Repositories
                </div>
              </div>
            </StatCard>
          </GridItem>

          <GridItem span={3}>
            <StatCard variant={isGlassmorphic ? "border-gradient" : undefined}>
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <ActivityBurstIcon size={40} color="var(--pf-t--color--purple--40)" animate />
                <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: "bold" }}>
                  {totalCommits}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                  Recent Commits
                </div>
              </div>
            </StatCard>
          </GridItem>

          <GridItem span={3}>
            <StatCard variant={isGlassmorphic ? "border-gradient" : undefined}>
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <StatusIcon size={40} color="var(--pf-t--color--orange--40)" animate />
                <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: "bold" }}>
                  {totalUncommitted}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                  Uncommitted Changes
                </div>
              </div>
            </StatCard>
          </GridItem>

          <GridItem span={3}>
            <StatCard variant={isGlassmorphic ? "border-gradient" : undefined}>
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <CodeFlowIcon size={40} color="var(--pf-t--color--green--40)" animate />
                <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: "bold" }}>
                  {cleanCount}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                  Clean Repos
                </div>
              </div>
            </StatCard>
          </GridItem>
        </Grid>
      </StackItem>

      {/* Visualizations Section */}
      {showVisualizations && filteredRepos.length > 0 && (
        <StackItem>
          <Grid hasGutter>
            <GridItem span={8}>
              <ActivityHeatmap repos={filteredRepos} maxRepos={10} />
            </GridItem>
            <GridItem span={4}>
              <RepoStatusPie repos={filteredRepos} />
            </GridItem>
          </Grid>
        </StackItem>
      )}

      {/* Filters */}
      <StackItem>
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
      </StackItem>

      {/* Toolbar with View Mode Toggle */}
      <StackItem>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Checkbox
                id="select-all"
                label={`Select all visible (${filteredCount})`}
                isChecked={
                  filteredRepos.length > 0 &&
                  selected.size === filteredRepos.length
                }
                onChange={(_e, checked) => toggleAll(checked)}
              />
            </ToolbarItem>
            <ToolbarItem>
              <ToggleGroup>
                <ToggleGroupItem
                  text="Grid"
                  isSelected={viewMode === "grid"}
                  onChange={() => setViewMode("grid")}
                />
                <ToggleGroupItem
                  text="List"
                  isSelected={viewMode === "list"}
                  onChange={() => setViewMode("list")}
                />
                <ToggleGroupItem
                  text="Visualization"
                  isSelected={viewMode === "visualization"}
                  onChange={() => setViewMode("visualization")}
                />
              </ToggleGroup>
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
      </StackItem>

      {/* Content Area with Animated Transitions */}
      <StackItem isFilled>
        <AnimatePresence mode="wait">
          {viewMode === "grid" && (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <RepoGrid
                repos={filteredRepos}
                selected={selected}
                onToggle={toggle}
                onOpenPullModal={openPullModal}
              />
            </motion.div>
          )}

          {viewMode === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--pf-t--global--text--color--subtle)" }}>
                List view coming soon...
              </div>
            </motion.div>
          )}

          {viewMode === "visualization" && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Grid hasGutter>
                <GridItem span={12}>
                  <ActivityHeatmap repos={filteredRepos} maxRepos={20} height={400} />
                </GridItem>
                <GridItem span={6}>
                  <RepoStatusPie repos={filteredRepos} />
                </GridItem>
                <GridItem span={6}>
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--pf-t--global--text--color--subtle)" }}>
                    Additional visualizations coming soon...
                  </div>
                </GridItem>
              </Grid>
            </motion.div>
          )}
        </AnimatePresence>
      </StackItem>

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
    </Stack>
  );
}
