import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertActionCloseButton,
  AlertActionLink,
  Button,
  Checkbox,
  EmptyState,
  EmptyStateBody,
  Label,
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
  Tooltip,
} from "@patternfly/react-core";
import {
  EyeSlashIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  CodeBranchIcon,
} from "@patternfly/react-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useFolders } from "../hooks/useFolders";
import { useAnalyzeFolders } from "../hooks/useGitAnalysis";
import { useGitPull } from "../hooks/useGitPull";
import { useRepoFilters } from "../hooks/useRepoFilters";
import { RepoGrid } from "../components/ScanPage/RepoGrid";
import { PullBranchModal } from "../components/ScanPage/PullBranchModal";
import { RepoFilters } from "../components/ScanPage/RepoFilters";
import { setAnalysisResults } from "../utils/sessionStorage";
import { getConfig, getHiddenRepos, hideRepo, unhideRepo } from "../api/client";
import { GlassCard } from "../components/GlassCard/GlassCard";
import { PulseIcon, ActivityBurstIcon, StatusIcon, CodeFlowIcon } from "../components/CustomIcons";
import { ActivityHeatmap } from "../components/Visualizations/ActivityHeatmap";
import { RepoStatusPie } from "../components/Visualizations/RepoStatusPie";

type ViewMode = "grid" | "list" | "visualization";

export default function ScanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: repos, isLoading, error, refetch } = useFolders();
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const { data: hiddenData } = useQuery({ queryKey: ["hiddenRepos"], queryFn: getHiddenRepos });
  const analyzeMutation = useAnalyzeFolders();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showHidden, setShowHidden] = useState(false);

  const hideMutation = useMutation({
    mutationFn: hideRepo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["hiddenRepos"] });
    },
  });

  const unhideMutation = useMutation({
    mutationFn: unhideRepo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["hiddenRepos"] });
    },
  });

  const hiddenRepos = hiddenData?.hidden_repos ?? [];

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

  // Compute stats from selected repos when selection active, otherwise from filtered
  const selectedRepos = filteredRepos.filter(r => selected.has(r.path));
  const hasSelection = selected.size > 0;
  const displayRepos = hasSelection ? selectedRepos : filteredRepos;
  const displayCount = hasSelection ? selected.size : totalCount;
  const displayCommits = displayRepos.reduce((sum, r) => sum + r.recent_commit_count, 0);
  const displayUncommitted = displayRepos.reduce((sum, r) => sum + r.uncommitted_count, 0);
  const displayClean = displayRepos.filter(r => r.status === "clean").length;

  // Work discovery stats
  const reposWithUnpushed = filteredRepos.filter((r) => (r.unpushed_count ?? 0) > 0);
  const reposWithUncommitted = filteredRepos.filter((r) => r.status === "dirty");
  const reposWithStaleBranches = filteredRepos.filter(
    (r) => (r.stale_branches ?? []).length > 0
  );
  const totalUnpushed = filteredRepos.reduce(
    (sum, r) => sum + (r.unpushed_count ?? 0), 0
  );
  const totalStaleBranches = filteredRepos.reduce(
    (sum, r) => sum + (r.stale_branches ?? []).length, 0
  );
  const hasHangingWork =
    reposWithUnpushed.length > 0 ||
    reposWithUncommitted.length > 0 ||
    reposWithStaleBranches.length > 0;

  // Wrapper that conditionally renders GlassCard or motion.div,
  // filtering GlassCard-specific props when rendering motion.div.
  const StatCard = ({
    variant,
    gradient,
    children,
    ...rest
  }: {
    variant?: string;
    gradient?: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: () => void;
  }) => {
    if (isGlassmorphic) {
      return (
        <GlassCard variant={variant as any} gradient={gradient as any} {...rest}>
          {children}
        </GlassCard>
      );
    }
    // motion.div does not need variant/gradient props
    return <motion.div {...rest}>{children}</motion.div>;
  };

  return (
    <Stack hasGutter>
      {/* Statistics Summary Cards — dynamic based on selection */}
      <StackItem>
        {hasSelection && (
          <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)", marginBottom: "0.5rem" }}>
            Showing stats for {selected.size} selected repo{selected.size !== 1 ? "s" : ""} (of {totalCount} total)
          </div>
        )}
        <Grid hasGutter>
          <GridItem span={3}>
            <StatCard
              variant={isGlassmorphic ? "gradient" : undefined}
              gradient="primary"
              style={{ cursor: "pointer" }}
              onClick={() => { clearFilters(); setSelected(new Set()); }}
            >
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <PulseIcon size={40} color={isGlassmorphic ? "white" : "var(--pf-t--color--blue--40)"} animate />
                <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: "bold", color: isGlassmorphic ? "white" : undefined }}>
                  {displayCount}
                </div>
                <div style={{ fontSize: "0.875rem", opacity: 0.9, color: isGlassmorphic ? "white" : "var(--pf-t--global--text--color--subtle)" }}>
                  {hasSelection ? "Selected" : "Total"} Repositories
                </div>
              </div>
            </StatCard>
          </GridItem>

          <GridItem span={3}>
            <StatCard
              variant={isGlassmorphic ? "border-gradient" : undefined}
              style={{ cursor: "pointer" }}
              onClick={() => setActivityFilter("active")}
            >
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <ActivityBurstIcon size={40} color="var(--pf-t--color--purple--40)" animate />
                <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: "bold" }}>
                  {displayCommits}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                  Recent Commits
                </div>
              </div>
            </StatCard>
          </GridItem>

          <GridItem span={3}>
            <StatCard
              variant={isGlassmorphic ? "border-gradient" : undefined}
              style={{ cursor: "pointer" }}
              onClick={() => setStatusFilter("dirty")}
            >
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <StatusIcon size={40} color="var(--pf-t--color--orange--40)" animate />
                <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: "bold" }}>
                  {displayUncommitted}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                  Uncommitted Changes
                </div>
              </div>
            </StatCard>
          </GridItem>

          <GridItem span={3}>
            <StatCard
              variant={isGlassmorphic ? "border-gradient" : undefined}
              style={{ cursor: "pointer" }}
              onClick={() => setStatusFilter("clean")}
            >
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <CodeFlowIcon size={40} color="var(--pf-t--color--green--40)" animate />
                <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: "bold" }}>
                  {displayClean}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                  Clean Repos
                </div>
              </div>
            </StatCard>
          </GridItem>
        </Grid>
      </StackItem>

      {/* Work Discovery Banner */}
      {hasHangingWork && (
        <StackItem>
          <Alert
            variant="warning"
            isInline
            title={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <ExclamationTriangleIcon />
                Work items need attention
              </span>
            }
          >
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
              {reposWithUncommitted.length > 0 && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    padding: "4px 10px",
                    borderRadius: 4,
                    background: "var(--pf-t--color--red--10)",
                    color: "#1b1d21",
                  }}
                  onClick={() => setStatusFilter("dirty")}
                >
                  <span style={{ color: "var(--pf-t--color--red--40)", fontWeight: 600 }}>
                    {reposWithUncommitted.length}
                  </span>
                  <span> repo{reposWithUncommitted.length !== 1 ? "s" : ""} with uncommitted changes</span>
                </div>
              )}
              {reposWithUnpushed.length > 0 && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    padding: "4px 10px",
                    borderRadius: 4,
                    background: "var(--pf-t--color--orange--10)",
                    color: "#1b1d21",
                  }}
                  onClick={() => setActivityFilter("active")}
                >
                  <ArrowUpIcon style={{ color: "var(--pf-t--color--orange--40)" }} />
                  <span style={{ color: "var(--pf-t--color--orange--40)", fontWeight: 600 }}>
                    {totalUnpushed}
                  </span>
                  <span> unpushed commit{totalUnpushed !== 1 ? "s" : ""} across {reposWithUnpushed.length} repo{reposWithUnpushed.length !== 1 ? "s" : ""}</span>
                </div>
              )}
              {reposWithStaleBranches.length > 0 && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 4,
                    background: "var(--pf-t--color--blue--10)",
                    color: "#1b1d21",
                  }}
                >
                  <CodeBranchIcon style={{ color: "var(--pf-t--color--blue--40)" }} />
                  <span style={{ color: "var(--pf-t--color--blue--40)", fontWeight: 600 }}>
                    {totalStaleBranches}
                  </span>
                  <span> stale branch{totalStaleBranches !== 1 ? "es" : ""} in {reposWithStaleBranches.length} repo{reposWithStaleBranches.length !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          </Alert>
        </StackItem>
      )}

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
                  filteredRepos.every((r) => selected.has(r.path))
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
                <Tooltip content="Coming soon">
                  <ToggleGroupItem
                    text="List"
                    isSelected={viewMode === "list"}
                    onChange={() => {}}
                    isDisabled
                  />
                </Tooltip>
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

      {/* Hidden Repos Banner */}
      {hiddenRepos.length > 0 && (
        <StackItem>
          <Alert
            variant="info"
            isInline
            isPlain
            title={
              <span>
                <EyeSlashIcon /> {hiddenRepos.length} hidden repo{hiddenRepos.length !== 1 ? "s" : ""}
              </span>
            }
            actionLinks={
              <AlertActionLink onClick={() => setShowHidden(!showHidden)}>
                {showHidden ? "Hide list" : "Show hidden"}
              </AlertActionLink>
            }
          />
          {showHidden && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", padding: "0.5rem 0" }}>
              {hiddenRepos.map((name) => (
                <Label
                  key={name}
                  color="gray"
                  onClose={() => unhideMutation.mutate(name)}
                >
                  {name}
                </Label>
              ))}
            </div>
          )}
        </StackItem>
      )}

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
                onHideRepo={(name) => hideMutation.mutate(name)}
              />
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
