/**
 * FlowAnalyticsPage - Developer Flow State Analytics
 * Detects deep work patterns, time-of-day productivity, interruption tracking
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
  Label,
  TextInput,
  ToggleGroup,
  ToggleGroupItem,
  EmptyState,
  EmptyStateBody,
} from "@patternfly/react-core";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

const API_BASE = "http://localhost:9000";

interface FlowSession {
  start: string;
  end: string;
  duration_minutes: number;
  commits: number;
  repos: string[];
  intensity: string;
}

interface FlowReport {
  period_days: number;
  total_commits: number;
  total_flow_sessions: number;
  total_deep_work_hours: number;
  avg_session_duration_minutes: number;
  most_productive_hour: number;
  most_productive_day: string;
  longest_flow_session_minutes: number;
  flow_sessions: FlowSession[];
  hourly_productivity: { hour: number; commits: number; files_changed: number }[];
  daily_patterns: { day: string; commits: number; flow_sessions: number; avg_session_minutes: number }[];
  weekly_insights: { week_start: string; commits: number; flow_sessions: number; deep_work_hours: number; most_productive_day: string }[];
  interruption_score: number;
  focus_score: number;
}

export default function FlowAnalyticsPage() {
  const [report, setReport] = useState<FlowReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [authorFilter, setAuthorFilter] = useState("");

  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (authorFilter) params.set("author", authorFilter);
      const res = await fetch(`${API_BASE}/api/flow-analytics/?${params}`, { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setReport(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const intensityColor = (i: string) => {
    if (i === "deep") return "var(--pf-t--color--green--40)";
    if (i === "moderate") return "var(--pf-t--color--blue--40)";
    return "var(--pf-t--color--orange--40)";
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return "green";
    if (score >= 40) return "gold";
    return "red";
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h1" size="2xl">Flow State Analytics</Title>
          <p style={{ color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.5rem" }}>
            Understand your deep work patterns and optimize productivity
          </p>
        </StackItem>

        <StackItem>
          <Grid hasGutter>
            <GridItem span={4}>
              <TextInput
                id="flow-author"
                value={authorFilter}
                onChange={(_e, v) => setAuthorFilter(v)}
                placeholder="Filter by author..."
                aria-label="Author filter"
              />
            </GridItem>
            <GridItem span={4}>
              <ToggleGroup>
                <ToggleGroupItem text="7 days" isSelected={days === 7} onChange={() => setDays(7)} />
                <ToggleGroupItem text="30 days" isSelected={days === 30} onChange={() => setDays(30)} />
                <ToggleGroupItem text="90 days" isSelected={days === 90} onChange={() => setDays(90)} />
              </ToggleGroup>
            </GridItem>
            <GridItem span={4}>
              <Button variant="primary" onClick={analyze} isLoading={loading} isDisabled={loading}>
                {loading ? "Analyzing..." : "Analyze Flow Patterns"}
              </Button>
            </GridItem>
          </Grid>
        </StackItem>

        {error && (
          <StackItem><Label color="red">{error}</Label></StackItem>
        )}

        {report && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Stack hasGutter>
              {/* Score Cards */}
              <StackItem>
                <Grid hasGutter>
                  <GridItem span={2}>
                    <Card isCompact>
                      <CardBody>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: scoreColor(report.focus_score) }}>{Math.round(report.focus_score)}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>Focus Score</div>
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem span={2}>
                    <Card isCompact>
                      <CardBody>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: scoreColor(report.interruption_score) }}>{Math.round(report.interruption_score)}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>Interruption Score</div>
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem span={2}>
                    <Card isCompact>
                      <CardBody>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{report.total_flow_sessions}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>Flow Sessions</div>
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem span={2}>
                    <Card isCompact>
                      <CardBody>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{report.total_deep_work_hours}h</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>Deep Work</div>
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem span={2}>
                    <Card isCompact>
                      <CardBody>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{report.most_productive_hour}:00</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>Peak Hour</div>
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem span={2}>
                    <Card isCompact>
                      <CardBody>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{report.most_productive_day}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>Peak Day</div>
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </StackItem>

              {/* Hourly Productivity Chart */}
              <StackItem>
                <Card>
                  <CardTitle>Hourly Productivity</CardTitle>
                  <CardBody>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={report.hourly_productivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" tickFormatter={(h: number) => `${h}:00`} />
                        <YAxis />
                        <Tooltip labelFormatter={(h: number) => `${h}:00`} />
                        <Bar dataKey="commits" fill="var(--pf-t--color--blue--40)" name="Commits" />
                        <Bar dataKey="files_changed" fill="var(--pf-t--color--purple--30)" name="Files Changed" opacity={0.5} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>
              </StackItem>

              <StackItem>
                <Grid hasGutter>
                  {/* Daily Pattern Radar */}
                  <GridItem span={6}>
                    <Card>
                      <CardTitle>Weekly Pattern</CardTitle>
                      <CardBody>
                        <ResponsiveContainer width="100%" height={300}>
                          <RadarChart data={report.daily_patterns}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="day" />
                            <PolarRadiusAxis />
                            <Radar name="Commits" dataKey="commits" stroke="var(--pf-t--color--blue--40)" fill="var(--pf-t--color--blue--40)" fillOpacity={0.3} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </CardBody>
                    </Card>
                  </GridItem>

                  {/* Flow Sessions */}
                  <GridItem span={6}>
                    <Card>
                      <CardTitle>Recent Flow Sessions</CardTitle>
                      <CardBody style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {report.flow_sessions.slice(0, 15).map((s, i) => {
                          const start = new Date(s.start);
                          return (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                              <div>
                                <div style={{ fontWeight: 500 }}>{start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>{s.repos.join(", ")}</div>
                              </div>
                              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <span>{s.duration_minutes}m</span>
                                <span>{s.commits} commits</span>
                                <Label isCompact style={{ color: intensityColor(s.intensity) }}>{s.intensity}</Label>
                              </div>
                            </div>
                          );
                        })}
                        {report.flow_sessions.length === 0 && (
                          <div style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
                            No flow sessions detected
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </StackItem>

              {/* Weekly Insights */}
              {report.weekly_insights.length > 0 && (
                <StackItem>
                  <Card>
                    <CardTitle>Weekly Insights</CardTitle>
                    <CardBody>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
                        {report.weekly_insights.map((w) => (
                          <div key={w.week_start} style={{ padding: "1rem", borderRadius: "8px", background: "var(--pf-t--global--background--color--secondary--default)" }}>
                            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Week of {w.week_start}</div>
                            <div>{w.commits} commits</div>
                            <div>{w.flow_sessions} flow sessions</div>
                            <div>{w.deep_work_hours}h deep work</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>Peak: {w.most_productive_day}</div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                </StackItem>
              )}
            </Stack>
          </motion.div>
        )}

        {!report && !loading && (
          <StackItem>
            <EmptyState titleText="Analyze Flow Patterns">
              <EmptyStateBody>
                Click "Analyze" to detect your deep work patterns, peak productivity hours, and flow state sessions.
              </EmptyStateBody>
            </EmptyState>
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
}
