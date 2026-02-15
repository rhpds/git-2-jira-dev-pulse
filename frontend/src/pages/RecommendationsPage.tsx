/**
 * RecommendationsPage - AI-Powered Recommendations Engine
 * Smart suggestions from repo analysis with actionable insights
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

const API_BASE = "http://localhost:9000";

interface Recommendation {
  id: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  action: string;
  repo: string | null;
  confidence: number;
}

interface RecsData {
  total: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  recommendations: Recommendation[];
  insights: { label: string; value: number }[];
}

export default function RecommendationsPage() {
  const [data, setData] = useState<RecsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/recommendations/`, { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "red";
    if (p === "medium") return "orange";
    return "blue";
  };

  const categoryIcon: Record<string, string> = {
    commit: "\uD83D\uDCDD",
    review: "\uD83D\uDD0D",
    maintenance: "\uD83D\uDD27",
    productivity: "\uD83D\uDCC8",
    jira: "\uD83C\uDFAB",
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h1" size="2xl">AI Recommendations</Title>
          <p style={{ color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.5rem" }}>
            Smart, actionable suggestions generated from your repository analysis
          </p>
        </StackItem>

        <StackItem>
          <Button variant="primary" onClick={analyze} isLoading={loading} isDisabled={loading}>
            {loading ? "Analyzing..." : "Generate Recommendations"}
          </Button>
        </StackItem>

        {error && <StackItem><Label color="red">{error}</Label></StackItem>}

        {data && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Stack hasGutter>
              {/* Insights Grid */}
              <StackItem>
                <Grid hasGutter>
                  {data.insights.map((insight) => (
                    <GridItem key={insight.label} span={2}>
                      <Card isCompact>
                        <CardBody>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>{insight.value}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--pf-t--global--text--color--subtle)" }}>{insight.label}</div>
                          </div>
                        </CardBody>
                      </Card>
                    </GridItem>
                  ))}
                </Grid>
              </StackItem>

              {/* Priority Summary */}
              <StackItem>
                <Grid hasGutter>
                  <GridItem span={4}>
                    <Card>
                      <CardTitle>By Priority</CardTitle>
                      <CardBody>
                        {Object.entries(data.by_priority).map(([p, count]) => (
                          <div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
                            <Label color={priorityColor(p) as "red" | "orange" | "blue"}>{p}</Label>
                            <span style={{ fontWeight: "bold" }}>{count}</span>
                          </div>
                        ))}
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem span={4}>
                    <Card>
                      <CardTitle>By Category</CardTitle>
                      <CardBody>
                        {Object.entries(data.by_category).map(([cat, count]) => (
                          <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
                            <span>{categoryIcon[cat] || "\u2022"} {cat}</span>
                            <span style={{ fontWeight: "bold" }}>{count}</span>
                          </div>
                        ))}
                      </CardBody>
                    </Card>
                  </GridItem>
                  <GridItem span={4}>
                    <Card>
                      <CardTitle>Total Recommendations</CardTitle>
                      <CardBody>
                        <div style={{ textAlign: "center", padding: "1rem" }}>
                          <div style={{ fontSize: "3rem", fontWeight: "bold" }}>{data.total}</div>
                          <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>actionable items</div>
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </StackItem>

              {/* Recommendations List */}
              <StackItem>
                <Card>
                  <CardTitle>Recommendations</CardTitle>
                  <CardBody>
                    {data.recommendations.map((rec) => (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ padding: "1rem 0", borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.2rem" }}>{categoryIcon[rec.category] || "\u2022"}</span>
                            <span style={{ fontWeight: 500 }}>{rec.title}</span>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <Label isCompact color={priorityColor(rec.priority) as "red" | "orange" | "blue"}>{rec.priority}</Label>
                            {rec.repo && <Label isCompact>{rec.repo}</Label>}
                          </div>
                        </div>
                        <p style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", margin: "0 0 0.5rem 1.7rem" }}>
                          {rec.description}
                        </p>
                        <div style={{ marginLeft: "1.7rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--pf-t--color--blue--40)" }}>
                            Action: {rec.action}
                          </span>
                          <Progress
                            value={rec.confidence * 100}
                            style={{ width: "100px" }}
                            measureLocation={ProgressMeasureLocation.none}
                            title={`${Math.round(rec.confidence * 100)}% confidence`}
                          />
                          <span style={{ fontSize: "0.75rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                            {Math.round(rec.confidence * 100)}%
                          </span>
                        </div>
                      </motion.div>
                    ))}
                    {data.recommendations.length === 0 && (
                      <div style={{ padding: "2rem", textAlign: "center", color: "var(--pf-t--global--text--color--subtle)" }}>
                        No recommendations — your repos are in great shape!
                      </div>
                    )}
                  </CardBody>
                </Card>
              </StackItem>
            </Stack>
          </motion.div>
        )}

        {!data && !loading && (
          <StackItem>
            <EmptyState titleText="Generate Recommendations">
              <EmptyStateBody>
                Click "Generate" to get AI-powered suggestions for improving your repos, commit practices, and team workflow.
              </EmptyStateBody>
            </EmptyState>
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
}
