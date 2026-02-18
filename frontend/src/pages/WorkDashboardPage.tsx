import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Title,
} from "@patternfly/react-core";
import { useQuery } from "@tanstack/react-query";
import type { TicketCreateRequest, TicketSuggestion, WorkSummary } from "../api/types";
import { suggestTickets, createBatch, getConfig } from "../api/client";
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
import TicketPreviewPanel from "../components/WorkDashboard/TicketPreviewPanel";
import { getJiraCredentials } from "../api/client";

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

  // Quarter state
  const [quarterMode, setQuarterMode] = useState<QuarterMode>(() => {
    return (localStorage.getItem("quarterMode") as QuarterMode) || "redhat";
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

  // Preview panel state
  const [previewSuggestions, setPreviewSuggestions] = useState<TicketSuggestion[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Error state
  const [createErrorMsg, setCreateErrorMsg] = useState("");

  // Read Jira project from config instead of hardcoding
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const defaultProject = config?.jira?.projects?.find((p) => p.default) ?? config?.jira?.projects?.[0];
  const projectKey = defaultProject?.key ?? "";

  // Read Jira credentials for URL
  const { data: jiraCredentials } = useQuery({
    queryKey: ["jira-credentials"],
    queryFn: getJiraCredentials,
  });

  useEffect(() => {
    setResults(getAnalysisResults());
  }, []);

  // Persist quarter mode
  useEffect(() => {
    localStorage.setItem("quarterMode", quarterMode);
  }, [quarterMode]);

  // Recalculate quarter when mode changes
  const handleToggleMode = () => {
    const newMode = quarterMode === "redhat" ? "calendar" : "redhat";
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
    // Tracked = repos with any Jira refs in commits
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

  // Auto-generate preview suggestions when data changes (debounced)
  useEffect(() => {
    if (!projectKey || filteredSummaries.length === 0) {
      setPreviewSuggestions([]);
      return;
    }
    const activeSummaries = filteredSummaries.filter(
      (s) => s.recent_commits.length > 0 || s.pull_requests.length > 0
    );
    if (activeSummaries.length === 0) {
      setPreviewSuggestions([]);
      return;
    }

    let cancelled = false;
    const debounceTimer = setTimeout(() => {
      setPreviewLoading(true);
      suggestTickets(activeSummaries, projectKey, false)
        .then((suggestions) => {
          if (!cancelled) {
            setPreviewSuggestions(suggestions);
          }
        })
        .catch(() => {
          if (!cancelled) setPreviewSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [filteredSummaries, projectKey]);

  // Ticket creation flow
  const handleOpenDrawer = async () => {
    setDrawerOpen(true);
    // Use preview suggestions if available, otherwise fetch fresh
    if (previewSuggestions.length > 0) {
      setTicketSuggestions(previewSuggestions);
      return;
    }
    setSuggestLoading(true);
    try {
      const activeSummaries = filteredSummaries.filter(
        (s) => s.recent_commits.length > 0 || s.pull_requests.length > 0
      );
      const suggestions = await suggestTickets(activeSummaries, projectKey, true);
      setTicketSuggestions(suggestions);
      setPreviewSuggestions(suggestions);
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
    setCreateErrorMsg("");
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
        source_commits: t.source_commits,
      }));
      const result = await createBatch(reqs);
      setCreatedResults(result);
      setDrawerOpen(false);
      navigate("/results");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create tickets. Please try again.";
      setCreateErrorMsg(message);
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
      projectKey={projectKey}
      projectName={defaultProject?.name}
    />
  ) : undefined;

  return (
    <Drawer isExpanded={drawerOpen} position="end">
      <DrawerContent panelContent={drawerPanel}>
        <DrawerContentBody>
          <Title headingLevel="h1" size="2xl" style={{ marginBottom: 16 }}>
            Work Dashboard
          </Title>

          {createErrorMsg && (
            <Alert
              variant="danger"
              isInline
              title="Ticket creation failed"
              style={{ marginBottom: 16 }}
              actionClose={
                <Button variant="plain" onClick={() => setCreateErrorMsg("")}>
                  Dismiss
                </Button>
              }
            >
              {createErrorMsg}
            </Alert>
          )}

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
            projectKey={projectKey}
            projectName={defaultProject?.name}
          />

          <div style={{ marginTop: 16 }}>
            <QuarterSummaryBar
              repoCount={stats.repoCount}
              commitCount={stats.commitCount}
              prCount={stats.prCount}
              trackedCount={stats.trackedCount}
              needTicketsCount={stats.needTicketsCount}
              onCreateTickets={handleOpenDrawer}
            />
          </div>

          <RepoAccordion
            summaries={filteredSummaries}
            quarter={selectedQuarter}
            selectedWeek={selectedWeek}
            projectKey={projectKey}
          />

          <TicketPreviewPanel
            summaries={filteredSummaries}
            suggestions={previewSuggestions}
            isLoading={previewLoading}
            projectKey={projectKey}
            projectName={defaultProject?.name}
            jiraUrl={jiraCredentials?.jira_url}
            onOpenDrawer={handleOpenDrawer}
          />
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
}
