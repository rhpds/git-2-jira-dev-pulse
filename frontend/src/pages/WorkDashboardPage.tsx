import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Grid,
  GridItem,
  Title,
  ToggleGroup,
  ToggleGroupItem,
} from "@patternfly/react-core";
import { motion, AnimatePresence } from "framer-motion";
import type { TicketCreateRequest, TicketSuggestion, WorkSummary } from "../api/types";
import { suggestTickets, createBatch } from "../api/client";
import {
  getCurrentQuarter,
  getRecentQuarters,
  getWeeksInQuarter,
  filterByDateRange,
} from "../utils/quarterUtils";
import type { Quarter, QuarterMode } from "../utils/quarterUtils";
import DashboardToolbar from "../components/WorkDashboard/DashboardToolbar";
import QuarterSummaryBar from "../components/WorkDashboard/QuarterSummaryBar";
import RepoAccordion from "../components/WorkDashboard/RepoAccordion";
import TicketDrawerPanel from "../components/WorkDashboard/TicketDrawer";
import { CommitActivityChart } from "../components/WorkDashboard/CommitActivityChart";
import { PRStatusChart } from "../components/WorkDashboard/PRStatusChart";
import { JiraCoverageGauge } from "../components/WorkDashboard/JiraCoverageGauge";
import { WeeklyBreakdownChart } from "../components/WorkDashboard/WeeklyBreakdownChart";
import { IntegrationStatusCards } from "../components/WorkDashboard/IntegrationStatusCards";
import { ExportButtons } from "../components/WorkDashboard/ExportButtons";

type DashboardView = "overview" | "charts" | "repos";

function getAnalysisResults(): WorkSummary[] {
  const raw = sessionStorage.getItem("analysisResults");
  return raw ? JSON.parse(raw) : [];
}

function setCreatedResults(data: unknown) {
  sessionStorage.setItem("createdResults", JSON.stringify(data));
}

export default function WorkDashboardPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState<WorkSummary[]>([]);
  const [viewMode, setViewMode] = useState<DashboardView>("overview");

  // Quarter state
  const [quarterMode, setQuarterMode] = useState<QuarterMode>(() => {
    return (localStorage.getItem("quarterMode") as QuarterMode) || "fiscal";
  });
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>(() =>
    getCurrentQuarter(quarterMode)
  );
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ticketSuggestions, setTicketSuggestions] = useState<TicketSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const projectKey = "MYPROJECT";

  useEffect(() => {
    setResults(getAnalysisResults());
  }, []);

  // Persist quarter mode
  useEffect(() => {
    localStorage.setItem("quarterMode", quarterMode);
  }, [quarterMode]);

  // Recalculate quarter when mode changes
  const handleToggleMode = () => {
    const newMode = quarterMode === "fiscal" ? "calendar" : "fiscal";
    setQuarterMode(newMode);
    setSelectedQuarter(getCurrentQuarter(newMode));
    setSelectedWeek(null);
  };

  const quarters = useMemo(() => getRecentQuarters(4, quarterMode), [quarterMode]);
  const weeks = useMemo(() => getWeeksInQuarter(selectedQuarter), [selectedQuarter]);

  // Filter all data by selected quarter
  const filteredSummaries = useMemo(() => {
    return results.map((summary) => {
      const commits = filterByDateRange(
        summary.recent_commits,
        (c) => new Date(c.date),
        selectedQuarter.start,
        selectedQuarter.end
      );
      const prs = filterByDateRange(
        summary.pull_requests,
        (pr) => (pr.created_at ? new Date(pr.created_at) : null),
        selectedQuarter.start,
        selectedQuarter.end
      );
      return { ...summary, recent_commits: commits, pull_requests: prs };
    });
  }, [results, selectedQuarter]);

  // Summary stats
  const stats = useMemo(() => {
    const activeRepos = filteredSummaries.filter(
      (s) => s.recent_commits.length > 0 || s.pull_requests.length > 0
    );
    const commitCount = filteredSummaries.reduce(
      (s, r) => s + r.recent_commits.length,
      0
    );
    const prCount = filteredSummaries.reduce(
      (s, r) => s + r.pull_requests.length,
      0
    );
    const trackedCount = filteredSummaries.filter((s) =>
      s.recent_commits.some((c) => c.jira_refs.length > 0)
    ).length;
    const needTicketsCount = activeRepos.length - trackedCount;

    return {
      repoCount: activeRepos.length,
      commitCount,
      prCount,
      trackedCount: Math.max(0, trackedCount),
      needTicketsCount: Math.max(0, needTicketsCount),
    };
  }, [filteredSummaries]);

  // Aggregate data for charts
  const allCommits = useMemo(
    () => filteredSummaries.flatMap((s) => s.recent_commits),
    [filteredSummaries]
  );
  const allPRs = useMemo(
    () => filteredSummaries.flatMap((s) => s.pull_requests),
    [filteredSummaries]
  );

  // Ticket creation flow
  const handleOpenDrawer = async () => {
    setDrawerOpen(true);
    setSuggestLoading(true);
    try {
      const activeSummaries = filteredSummaries.filter(
        (s) => s.recent_commits.length > 0 || s.pull_requests.length > 0
      );
      const suggestions = await suggestTickets(activeSummaries, projectKey);
      setTicketSuggestions(suggestions);
    } catch {
      setTicketSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleUpdateTicket = (id: string, updates: Partial<TicketSuggestion>) => {
    setTicketSuggestions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const handleCreateTickets = async () => {
    const selected = ticketSuggestions.filter((t) => t.selected);
    if (selected.length === 0) return;

    setCreateLoading(true);
    try {
      const reqs: TicketCreateRequest[] = selected.map((t) => ({
        project_key: projectKey,
        summary: t.summary,
        description: t.description,
        issue_type: t.issue_type,
        priority: t.priority,
        labels: t.labels,
        assignee: t.assignee,
        pr_urls: t.pr_urls,
      }));
      const result = await createBatch(reqs);
      setCreatedResults(result);
      setDrawerOpen(false);
      navigate("/results");
    } catch {
      // Stay on page
    } finally {
      setCreateLoading(false);
    }
  };

  if (results.length === 0) {
    return (
      <EmptyState titleText="No analysis results">
        <EmptyStateBody>
          Go back to Step 1 and select repos to analyze.
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" onClick={() => navigate("/")}>
              Back to Select Repos
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  const drawerPanel = drawerOpen ? (
    <TicketDrawerPanel
      tickets={ticketSuggestions}
      onUpdateTicket={handleUpdateTicket}
      onClose={() => setDrawerOpen(false)}
      onCreateTickets={handleCreateTickets}
      isLoading={suggestLoading}
      isCreating={createLoading}
    />
  ) : undefined;

  return (
    <Drawer isExpanded={drawerOpen} position="end">
      <DrawerContent panelContent={drawerPanel}>
        <DrawerContentBody>
          {/* Header Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <Title headingLevel="h1" size="2xl">
              Work Dashboard
            </Title>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <ToggleGroup aria-label="Dashboard view">
                <ToggleGroupItem
                  text="Overview"
                  isSelected={viewMode === "overview"}
                  onChange={() => setViewMode("overview")}
                />
                <ToggleGroupItem
                  text="Charts"
                  isSelected={viewMode === "charts"}
                  onChange={() => setViewMode("charts")}
                />
                <ToggleGroupItem
                  text="Repos"
                  isSelected={viewMode === "repos"}
                  onChange={() => setViewMode("repos")}
                />
              </ToggleGroup>
              <ExportButtons
                workSummaries={filteredSummaries}
                variant="work-summaries"
              />
            </div>
          </div>

          <DashboardToolbar
            quarters={quarters}
            selectedQuarter={selectedQuarter}
            onSelectQuarter={(q) => {
              setSelectedQuarter(q);
              setSelectedWeek(null);
            }}
            quarterMode={quarterMode}
            onToggleMode={handleToggleMode}
            weeks={weeks}
            selectedWeek={selectedWeek}
            onSelectWeek={setSelectedWeek}
            onCreateTickets={handleOpenDrawer}
            ticketCount={stats.needTicketsCount}
          />

          <div style={{ marginTop: 16 }}>
            <QuarterSummaryBar
              repoCount={stats.repoCount}
              commitCount={stats.commitCount}
              prCount={stats.prCount}
              trackedCount={stats.trackedCount}
              needTicketsCount={stats.needTicketsCount}
            />
          </div>

          <AnimatePresence mode="wait">
            {/* Overview: Charts + Repos */}
            {viewMode === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {/* Visualization Row */}
                <Grid hasGutter style={{ marginBottom: "1.5rem" }}>
                  <GridItem span={12} lg={5}>
                    <CommitActivityChart
                      commits={allCommits}
                      quarter={selectedQuarter}
                    />
                  </GridItem>
                  <GridItem span={12} lg={4}>
                    <PRStatusChart pullRequests={allPRs} />
                  </GridItem>
                  <GridItem span={12} lg={3}>
                    <JiraCoverageGauge
                      trackedCount={stats.trackedCount}
                      totalCount={stats.repoCount}
                    />
                  </GridItem>
                </Grid>

                {/* Integration Status */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <IntegrationStatusCards />
                </div>

                {/* Repo Accordion */}
                <RepoAccordion
                  summaries={filteredSummaries}
                  quarter={selectedQuarter}
                  selectedWeek={selectedWeek}
                  projectKey={projectKey}
                />
              </motion.div>
            )}

            {/* Charts Only */}
            {viewMode === "charts" && (
              <motion.div
                key="charts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Grid hasGutter>
                  <GridItem span={12} lg={8}>
                    <CommitActivityChart
                      commits={allCommits}
                      quarter={selectedQuarter}
                      height={350}
                    />
                  </GridItem>
                  <GridItem span={12} lg={4}>
                    <JiraCoverageGauge
                      trackedCount={stats.trackedCount}
                      totalCount={stats.repoCount}
                      height={300}
                    />
                  </GridItem>
                  <GridItem span={12} lg={8}>
                    <WeeklyBreakdownChart
                      summaries={filteredSummaries}
                      quarter={selectedQuarter}
                      height={350}
                    />
                  </GridItem>
                  <GridItem span={12} lg={4}>
                    <PRStatusChart pullRequests={allPRs} height={300} />
                  </GridItem>
                </Grid>

                <div style={{ marginTop: "1.5rem" }}>
                  <IntegrationStatusCards />
                </div>
              </motion.div>
            )}

            {/* Repos Only */}
            {viewMode === "repos" && (
              <motion.div
                key="repos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <RepoAccordion
                  summaries={filteredSummaries}
                  quarter={selectedQuarter}
                  selectedWeek={selectedWeek}
                  projectKey={projectKey}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
}
