/**
 * HealthScoresPage - Repo Health Scoring Engine
 * Automated 0-100 health scores per repo with org-wide aggregation
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
  EmptyState,
  EmptyStateBody,
  Progress,
  ProgressMeasureLocation,
} from "@patternfly/react-core";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
} from "recharts";

const API_BASE = "http://localhost:9000";

interface HealthFactor {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

interface RepoHealth {
  repo_name: string;
  overall_score: number;
  grade: string;
  factors: HealthFactor[];
  recommendations: string[];
  branch: string;
  status: string;
  last_commit_date: string | null;
  days_since_last_commit: number | null;
  contributor_count: number;
  branch_count: number;
  stale_branches: number;
  uncommitted_count: number;
}

interface OrgHealth {
  total_repos: number;
  avg_score: number;
  grade_distribution: Record<string, number>;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  top_repos: { repo: string; score: number; grade: string }[];
  bottom_repos: { repo: string; score: number; grade: string }[];
  org_recommendations: string[];
  scores: RepoHealth[];
  trend_data: { week: string; avg_score: number; healthy: number; warning: number; critical: number }[];
}

export default function HealthScoresPage() {
  const [data, setData] = useState<OrgHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);

  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/health-scores/`, { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const gradeColor = (grade: string) => {
    const map: Record<string, string> = { A: "green", B: "blue", C: "gold", D: "orange", F: "red" };
    return (map[grade] || "grey") as "green" | "blue" | "gold" | "orange" | "red";
  };

  const scoreVariant = (score: number): "success" | "warning" | "danger" => {
    if (score >= 70) return "success";
    if (score >= 40) return "warning";
    return "danger";
  };

  const GRADE_COLORS: Record<string, string> = {
    A: "#22c55e", B: "#3b82f6", C: "#eab308", D: "#f97316", F: "#ef4444",
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h1" size="2xl">Repo Health Scores</Title>
          <p style={{ color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.5rem" }}>
            Automated health scoring for every repository — identify issues before they become problems
          </p>
        </StackItem>

        <StackItem>
          <Button variant="primary" onClick={analyze} isLoading={loading} isDisabled={loading}>
            {loading ? "Calculating..." : "Calculate Health Scores"}
          </Button>
        </StackItem>

        {error && (
          <StackItem><Label color="red">{error}</Label></StackItem>
        )}

        {data && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Stack hasGutter>
              {/* Org Summary */}
              <StackItem>
                <Grid hasGutter>
                  <GridItem span={3}>
                    <Card>
                      <CardBody>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "3rem", fontWeight: "bold", color: data.avg_score >= 70 ? "#22c55e" : data.avg_score >= 40 ? "#eab308" : "#ef4444" }}>
                            {Math.round(data.avg_score)}
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>Avg Health Score</div>
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem span={3}>
                    <Card>
                      <CardBody>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#22c55e" }}>{data.healthy_count}</div>
                          <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>Healthy</div>
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem span={3}>
                    <Card>
                      <CardBody>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#eab308" }}>{data.warning_count}</div>
                          <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>Warning</div>
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem span={3}>
                    <Card>
                      <CardBody>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#ef4444" }}>{data.critical_count}</div>
                          <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>Critical</div>
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </StackItem>

              {/* Org Recommendations */}
              {data.org_recommendations.length > 0 && (
                <StackItem>
                  <Card>
                    <CardTitle>Organization Recommendations</CardTitle>
                    <CardBody>
                      {data.org_recommendations.map((rec, i) => (
                        <div key={i} style={{ padding: "0.5rem 0", borderBottom: i < data.org_recommendations.length - 1 ? "1px solid var(--pf-t--global--border--color--default)" : "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ color: "var(--pf-t--color--orange--40)", fontSize: "1.2rem" }}>{"\u26A0"}</span>
                          {rec}
                        </div>
                      ))}
                    </CardBody>
                  </Card>
                </StackItem>
              )}

              <StackItem>
                <Grid hasGutter>
                  {/* Grade Distribution Pie */}
                  <GridItem span={4}>
                    <Card>
                      <CardTitle>Grade Distribution</CardTitle>
                      <CardBody>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={Object.entries(data.grade_distribution).map(([grade, count]) => ({ name: grade, value: count }))}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {Object.entries(data.grade_distribution).map(([grade]) => (
                                <Cell key={grade} fill={GRADE_COLORS[grade] || "#888"} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardBody>
                    </Card>
                  </GridItem>

                  {/* Health Trend */}
                  <GridItem span={8}>
                    <Card>
                      <CardTitle>Health Trend</CardTitle>
                      <CardBody>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={data.trend_data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="avg_score" stroke="#3b82f6" strokeWidth={2} name="Avg Score" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </StackItem>

              {/* Score Bar Chart */}
              <StackItem>
                <Card>
                  <CardTitle>All Repository Scores</CardTitle>
                  <CardBody>
                    <ResponsiveContainer width="100%" height={Math.max(200, data.scores.length * 35)}>
                      <BarChart data={data.scores} layout="vertical" margin={{ left: 120 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis type="category" dataKey="repo_name" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="overall_score" name="Health Score">
                          {data.scores.map((entry) => (
                            <Cell
                              key={entry.repo_name}
                              fill={GRADE_COLORS[entry.grade] || "#888"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>
              </StackItem>

              {/* Detailed Repo Cards */}
              <StackItem>
                <Card>
                  <CardTitle>Detailed Scores</CardTitle>
                  <CardBody>
                    {data.scores.map((repo) => (
                      <motion.div
                        key={repo.repo_name}
                        style={{ padding: "1rem 0", borderBottom: "1px solid var(--pf-t--global--border--color--default)", cursor: "pointer" }}
                        onClick={() => setExpandedRepo(expandedRepo === repo.repo_name ? null : repo.repo_name)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div style={{
                              width: "45px", height: "45px", borderRadius: "50%",
                              background: GRADE_COLORS[repo.grade] || "#888",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "white", fontWeight: "bold", fontSize: "1.2rem",
                            }}>
                              {repo.grade}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{repo.repo_name}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                                {repo.branch} | {repo.status} | {repo.contributor_count} contributors | {repo.branch_count} branches
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <Progress
                              value={repo.overall_score}
                              style={{ width: "150px" }}
                              variant={scoreVariant(repo.overall_score)}
                              measureLocation={ProgressMeasureLocation.inside}
                            />
                            <Label color={gradeColor(repo.grade)}>{repo.overall_score}</Label>
                          </div>
                        </div>

                        {expandedRepo === repo.repo_name && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} style={{ marginTop: "1rem" }}>
                            <Grid hasGutter>
                              <GridItem span={8}>
                                {repo.factors.map((f) => (
                                  <div key={f.name} style={{ marginBottom: "0.75rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                                      <span style={{ fontWeight: 500 }}>{f.name} ({Math.round(f.weight * 100)}%)</span>
                                      <span>{Math.round(f.score)}/100</span>
                                    </div>
                                    <Progress
                                      value={f.score}
                                      variant={scoreVariant(f.score)}
                                      measureLocation={ProgressMeasureLocation.none}
                                    />
                                    <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>{f.detail}</div>
                                  </div>
                                ))}
                              </GridItem>
                              <GridItem span={4}>
                                {repo.recommendations.length > 0 ? (
                                  <div>
                                    <div style={{ fontWeight: 500, marginBottom: "0.5rem" }}>Recommendations</div>
                                    {repo.recommendations.map((rec, i) => (
                                      <div key={i} style={{ fontSize: "0.875rem", padding: "0.5rem", marginBottom: "0.5rem", borderRadius: "6px", background: "var(--pf-t--global--background--color--secondary--default)" }}>
                                        {rec}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ color: "#22c55e", fontWeight: 500 }}>
                                    {"\u2713"} No recommendations — this repo is healthy!
                                  </div>
                                )}
                              </GridItem>
                            </Grid>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </CardBody>
                </Card>
              </StackItem>
            </Stack>
          </motion.div>
        )}

        {!data && !loading && (
          <StackItem>
            <EmptyState titleText="Calculate Health Scores">
              <EmptyStateBody>
                Click "Calculate" to score every repository across 5 health dimensions: Activity, Freshness, Cleanliness, Branch Hygiene, and Bus Factor.
              </EmptyStateBody>
            </EmptyState>
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
}
