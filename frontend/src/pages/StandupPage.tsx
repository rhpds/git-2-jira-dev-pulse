/**
 * StandupPage - AI Standup & Sprint Report Generator
 * Auto-generates daily standups and sprint reports from git + Jira activity
 */

import { useState } from "react";
import {
  PageSection,
  Title,
  Stack,
  StackItem,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardTitle,
  Button,
  Spinner,
  Label,
  Tabs,
  Tab,
  TabTitleText,
  TextInput,
  ClipboardCopy,
  ToggleGroup,
  ToggleGroupItem,
  EmptyState,
  EmptyStateBody,
} from "@patternfly/react-core";
import { motion } from "framer-motion";

const API_BASE = "http://localhost:9000";

interface StandupEntry {
  repo_name: string;
  branch: string;
  commits: { sha: string; message: string; author: string; date: string; files_changed: number }[];
  uncommitted_files: number;
  jira_refs: string[];
}

interface StandupReport {
  generated_at: string;
  period: string;
  summary: string;
  entries: StandupEntry[];
  total_commits: number;
  total_files_changed: number;
  total_jira_refs: string[];
  in_progress: { repo: string; branch: string; staged: number; unstaged: number; untracked: number }[];
  natural_language: string;
}

interface SprintReport {
  generated_at: string;
  sprint_days: number;
  summary: string;
  repos_touched: number;
  total_commits: number;
  total_files_changed: number;
  total_insertions: number;
  total_deletions: number;
  jira_tickets: string[];
  top_repos: { repo: string; commits: number; files_changed: number }[];
  daily_breakdown: { date: string; commits: number; files: number }[];
  contributors: { author: string; commits: number; files_changed: number; repos_touched: number }[];
  natural_language: string;
}

export default function StandupPage() {
  const [activeTab, setActiveTab] = useState<string>("daily");
  const [standup, setStandup] = useState<StandupReport | null>(null);
  const [sprint, setSprint] = useState<SprintReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorFilter, setAuthorFilter] = useState("");
  const [sprintDays, setSprintDays] = useState<number>(14);

  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const generateStandup = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (authorFilter) params.set("author", authorFilter);
      const res = await fetch(`${API_BASE}/api/standups/daily?${params}`, { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setStandup(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const generateSprint = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(sprintDays) });
      if (authorFilter) params.set("author", authorFilter);
      const res = await fetch(`${API_BASE}/api/standups/sprint?${params}`, { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setSprint(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h1" size="2xl">Standup & Sprint Reports</Title>
          <p style={{ color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.5rem" }}>
            Auto-generate daily standups and sprint summaries from git activity
          </p>
        </StackItem>

        <StackItem>
          <Grid hasGutter>
            <GridItem span={4}>
              <TextInput
                id="author-filter"
                value={authorFilter}
                onChange={(_e, v) => setAuthorFilter(v)}
                placeholder="Filter by author name..."
                aria-label="Author filter"
              />
            </GridItem>
            <GridItem span={4}>
              <ToggleGroup>
                <ToggleGroupItem text="7 days" isSelected={sprintDays === 7} onChange={() => setSprintDays(7)} />
                <ToggleGroupItem text="14 days" isSelected={sprintDays === 14} onChange={() => setSprintDays(14)} />
                <ToggleGroupItem text="30 days" isSelected={sprintDays === 30} onChange={() => setSprintDays(30)} />
              </ToggleGroup>
            </GridItem>
          </Grid>
        </StackItem>

        <StackItem>
          <Tabs activeKey={activeTab} onSelect={(_e, k) => setActiveTab(String(k))}>
            <Tab eventKey="daily" title={<TabTitleText>Daily Standup</TabTitleText>} />
            <Tab eventKey="sprint" title={<TabTitleText>Sprint Report</TabTitleText>} />
          </Tabs>
        </StackItem>

        <StackItem>
          <Button
            variant="primary"
            onClick={activeTab === "daily" ? generateStandup : generateSprint}
            isLoading={loading}
            isDisabled={loading}
          >
            {loading ? "Generating..." : `Generate ${activeTab === "daily" ? "Standup" : "Sprint Report"}`}
          </Button>
        </StackItem>

        {error && (
          <StackItem>
            <Label color="red">{error}</Label>
          </StackItem>
        )}

        {activeTab === "daily" && standup && (
          <StackItem>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Stack hasGutter>
                {/* Summary */}
                <StackItem>
                  <Grid hasGutter>
                    <GridItem span={3}>
                      <Card isCompact>
                        <CardBody>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{standup.total_commits}</div>
                            <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>Commits</div>
                          </div>
                        </CardBody>
                      </Card>
                    </GridItem>
                    <GridItem span={3}>
                      <Card isCompact>
                        <CardBody>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{standup.entries.length}</div>
                            <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>Repos</div>
                          </div>
                        </CardBody>
                      </Card>
                    </GridItem>
                    <GridItem span={3}>
                      <Card isCompact>
                        <CardBody>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{standup.total_jira_refs.length}</div>
                            <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>Jira Tickets</div>
                          </div>
                        </CardBody>
                      </Card>
                    </GridItem>
                    <GridItem span={3}>
                      <Card isCompact>
                        <CardBody>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{standup.in_progress.length}</div>
                            <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>In Progress</div>
                          </div>
                        </CardBody>
                      </Card>
                    </GridItem>
                  </Grid>
                </StackItem>

                {/* Natural Language Output */}
                <StackItem>
                  <Card>
                    <CardTitle>Standup Summary</CardTitle>
                    <CardBody>
                      <ClipboardCopy isCode variant="expansion" isReadOnly>
                        {standup.natural_language}
                      </ClipboardCopy>
                    </CardBody>
                  </Card>
                </StackItem>

                {/* Per-repo entries */}
                {standup.entries.map((entry) => (
                  <StackItem key={entry.repo_name}>
                    <Card isCompact>
                      <CardTitle>
                        {entry.repo_name}
                        <Label isCompact color="blue" style={{ marginLeft: "0.5rem" }}>{entry.branch}</Label>
                        {entry.jira_refs.map((ref) => (
                          <Label key={ref} isCompact color="purple" style={{ marginLeft: "0.25rem" }}>{ref}</Label>
                        ))}
                      </CardTitle>
                      <CardBody>
                        {entry.commits.length > 0 && (
                          <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                            {entry.commits.slice(0, 5).map((c) => (
                              <li key={c.sha} style={{ marginBottom: "0.25rem" }}>
                                <code style={{ fontSize: "0.75rem" }}>{c.sha}</code>{" "}
                                {c.message}
                                <span style={{ color: "var(--pf-t--global--text--color--subtle)", fontSize: "0.8rem" }}>
                                  {" "}({c.files_changed} files)
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {entry.uncommitted_files > 0 && (
                          <div style={{ marginTop: "0.5rem", color: "var(--pf-t--color--orange--40)" }}>
                            {entry.uncommitted_files} uncommitted changes in progress
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </StackItem>
                ))}

                {standup.entries.length === 0 && (
                  <StackItem>
                    <EmptyState titleText="No activity found">
                      <EmptyStateBody>No git activity found in the specified time window. Try adjusting the author filter or time range.</EmptyStateBody>
                    </EmptyState>
                  </StackItem>
                )}
              </Stack>
            </motion.div>
          </StackItem>
        )}

        {activeTab === "sprint" && sprint && (
          <StackItem>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Stack hasGutter>
                {/* Sprint Summary Cards */}
                <StackItem>
                  <Grid hasGutter>
                    {[
                      { label: "Commits", value: sprint.total_commits },
                      { label: "Repos", value: sprint.repos_touched },
                      { label: "Files Changed", value: sprint.total_files_changed },
                      { label: "Jira Tickets", value: sprint.jira_tickets.length },
                    ].map((stat) => (
                      <GridItem key={stat.label} span={3}>
                        <Card isCompact>
                          <CardBody>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{stat.value}</div>
                              <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>{stat.label}</div>
                            </div>
                          </CardBody>
                        </Card>
                      </GridItem>
                    ))}
                  </Grid>
                </StackItem>

                {/* Natural Language */}
                <StackItem>
                  <Card>
                    <CardTitle>Sprint Summary</CardTitle>
                    <CardBody>
                      <ClipboardCopy isCode variant="expansion" isReadOnly>
                        {sprint.natural_language}
                      </ClipboardCopy>
                    </CardBody>
                  </Card>
                </StackItem>

                {/* Top Repos */}
                <StackItem>
                  <Card>
                    <CardTitle>Top Repositories</CardTitle>
                    <CardBody>
                      {sprint.top_repos.map((r, i) => (
                        <div key={r.repo} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                          <span>#{i + 1} {r.repo}</span>
                          <span>{r.commits} commits, {r.files_changed} files</span>
                        </div>
                      ))}
                    </CardBody>
                  </Card>
                </StackItem>

                {/* Contributors */}
                {sprint.contributors.length > 0 && (
                  <StackItem>
                    <Card>
                      <CardTitle>Contributors</CardTitle>
                      <CardBody>
                        {sprint.contributors.map((c) => (
                          <div key={c.author} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                            <span style={{ fontWeight: 500 }}>{c.author}</span>
                            <span>{c.commits} commits across {c.repos_touched} repos</span>
                          </div>
                        ))}
                      </CardBody>
                    </Card>
                  </StackItem>
                )}
              </Stack>
            </motion.div>
          </StackItem>
        )}

        {!standup && !sprint && !loading && (
          <StackItem>
            <EmptyState titleText="Generate a Report">
              <EmptyStateBody>
                Click "Generate" to create a standup or sprint report from your git activity across all repositories.
              </EmptyStateBody>
            </EmptyState>
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
}
