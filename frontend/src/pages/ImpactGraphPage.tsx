/**
 * ImpactGraphPage - Cross-Repo Impact Intelligence
 * Dependency/impact graph showing how changes ripple across repos
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
} from "@patternfly/react-core";
import { motion } from "framer-motion";

const API_BASE = "http://localhost:9000";

interface RepoNode {
  name: string;
  path: string;
  language: string;
  dependencies: { name: string; dep_type: string }[];
  dependents: string[];
  recent_changes: number;
  jira_refs: string[];
}

interface ImpactEdge {
  source: string;
  target: string;
  shared_deps: string[];
  impact_type: string;
  weight: number;
}

interface ImpactData {
  total_repos: number;
  total_edges: number;
  nodes: RepoNode[];
  edges: ImpactEdge[];
  recent_impacts: { repo: string; change_summary: string; affected_repos: string[]; jira_refs: string[] }[];
  shared_dependency_clusters: { dependency: string; repos: string[]; count: number }[];
  risk_hotspots: { repo: string; dependents: number; recent_changes: number; risk_score: number; language: string }[];
}

export default function ImpactGraphPage() {
  const [data, setData] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/impact-graph/`, { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const langColor = (lang: string) => {
    const map: Record<string, string> = {
      javascript: "blue", python: "green", go: "cyan", mixed: "orange", unknown: "grey",
    };
    return (map[lang] || "grey") as "blue" | "green" | "cyan" | "orange" | "grey";
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h1" size="2xl">Cross-Repo Impact Intelligence</Title>
          <p style={{ color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.5rem" }}>
            Visualize dependencies and understand how changes ripple across your repositories
          </p>
        </StackItem>

        <StackItem>
          <Button variant="primary" onClick={analyze} isLoading={loading} isDisabled={loading}>
            {loading ? "Scanning..." : "Scan Dependencies"}
          </Button>
        </StackItem>

        {error && (
          <StackItem><Label color="red">{error}</Label></StackItem>
        )}

        {data && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Stack hasGutter>
              {/* Summary Cards */}
              <StackItem>
                <Grid hasGutter>
                  {[
                    { label: "Repositories", value: data.total_repos },
                    { label: "Connections", value: data.total_edges },
                    { label: "Risk Hotspots", value: data.risk_hotspots.length },
                    { label: "Shared Clusters", value: data.shared_dependency_clusters.length },
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

              {/* Risk Hotspots */}
              {data.risk_hotspots.length > 0 && (
                <StackItem>
                  <Card>
                    <CardTitle>Risk Hotspots</CardTitle>
                    <CardBody>
                      <p style={{ color: "var(--pf-t--global--text--color--subtle)", marginBottom: "1rem", fontSize: "0.875rem" }}>
                        Repos with many dependents AND recent changes — changes here have the widest blast radius
                      </p>
                      {data.risk_hotspots.map((h) => (
                        <div key={h.repo} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{
                              width: "40px", height: "40px", borderRadius: "50%",
                              background: `rgba(${Math.min(255, h.risk_score * 5)}, ${Math.max(0, 200 - h.risk_score * 3)}, 50, 0.2)`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: "bold", fontSize: "0.8rem",
                            }}>
                              {h.risk_score}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{h.repo}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                                {h.dependents} dependents, {h.recent_changes} recent changes
                              </div>
                            </div>
                          </div>
                          <Label isCompact color={langColor(h.language)}>{h.language}</Label>
                        </div>
                      ))}
                    </CardBody>
                  </Card>
                </StackItem>
              )}

              {/* Recent Impacts */}
              {data.recent_impacts.length > 0 && (
                <StackItem>
                  <Card>
                    <CardTitle>Recent Impacts</CardTitle>
                    <CardBody>
                      {data.recent_impacts.map((imp) => (
                        <div key={imp.repo} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                          <div style={{ fontWeight: 500 }}>{imp.repo}</div>
                          <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                            {imp.change_summary}
                          </div>
                          <div style={{ marginTop: "0.25rem", display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                            {imp.affected_repos.map((r) => (
                              <Label key={r} isCompact color="orange">{r}</Label>
                            ))}
                          </div>
                          {imp.jira_refs.length > 0 && (
                            <div style={{ marginTop: "0.25rem", display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                              {imp.jira_refs.map((ref) => (
                                <Label key={ref} isCompact color="purple">{ref}</Label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardBody>
                  </Card>
                </StackItem>
              )}

              <StackItem>
                <Grid hasGutter>
                  {/* Shared Dependency Clusters */}
                  <GridItem span={6}>
                    <Card>
                      <CardTitle>Shared Dependency Clusters</CardTitle>
                      <CardBody style={{ maxHeight: "400px", overflowY: "auto" }}>
                        {data.shared_dependency_clusters.slice(0, 15).map((cluster) => (
                          <div key={cluster.dependency} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <code style={{ fontWeight: 500 }}>{cluster.dependency}</code>
                              <Label isCompact>{cluster.count} repos</Label>
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                              {cluster.repos.join(", ")}
                            </div>
                          </div>
                        ))}
                        {data.shared_dependency_clusters.length === 0 && (
                          <div style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
                            No shared dependencies found
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </GridItem>

                  {/* Dependency Graph - Visual Node Map */}
                  <GridItem span={6}>
                    <Card>
                      <CardTitle>Repository Network</CardTitle>
                      <CardBody>
                        <div style={{ position: "relative", height: "400px", overflow: "hidden" }}>
                          {data.nodes.slice(0, 20).map((node, i) => {
                            const angle = (i / Math.min(data.nodes.length, 20)) * 2 * Math.PI;
                            const radius = 150;
                            const cx = 200 + radius * Math.cos(angle);
                            const cy = 200 + radius * Math.sin(angle);
                            const size = Math.max(30, Math.min(60, 30 + node.dependents.length * 10));
                            return (
                              <motion.div
                                key={node.name}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: i * 0.05 }}
                                title={`${node.name}\n${node.dependencies.length} deps, ${node.dependents.length} dependents\n${node.language}`}
                                style={{
                                  position: "absolute",
                                  left: `${cx - size / 2}px`,
                                  top: `${cy - size / 2}px`,
                                  width: `${size}px`,
                                  height: `${size}px`,
                                  borderRadius: "50%",
                                  background: node.recent_changes > 5
                                    ? "var(--pf-t--color--red--30)"
                                    : node.recent_changes > 0
                                    ? "var(--pf-t--color--blue--30)"
                                    : "var(--pf-t--color--green--30)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.6rem",
                                  fontWeight: "bold",
                                  color: "white",
                                  cursor: "pointer",
                                  border: node.dependents.length > 0
                                    ? "2px solid var(--pf-t--color--orange--40)"
                                    : "1px solid rgba(255,255,255,0.3)",
                                  textOverflow: "ellipsis",
                                  overflow: "hidden",
                                  whiteSpace: "nowrap",
                                  padding: "2px",
                                }}
                              >
                                {node.name.slice(0, 8)}
                              </motion.div>
                            );
                          })}
                        </div>
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>
              </StackItem>

              {/* All Repos Table */}
              <StackItem>
                <Card>
                  <CardTitle>All Repositories ({data.nodes.length})</CardTitle>
                  <CardBody style={{ maxHeight: "400px", overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--pf-t--global--border--color--default)", textAlign: "left" }}>
                          <th style={{ padding: "0.5rem" }}>Repo</th>
                          <th style={{ padding: "0.5rem" }}>Language</th>
                          <th style={{ padding: "0.5rem" }}>Dependencies</th>
                          <th style={{ padding: "0.5rem" }}>Dependents</th>
                          <th style={{ padding: "0.5rem" }}>Recent Changes</th>
                          <th style={{ padding: "0.5rem" }}>Jira</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.nodes.map((node) => (
                          <tr key={node.name} style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                            <td style={{ padding: "0.5rem", fontWeight: 500 }}>{node.name}</td>
                            <td style={{ padding: "0.5rem" }}><Label isCompact color={langColor(node.language)}>{node.language}</Label></td>
                            <td style={{ padding: "0.5rem" }}>{node.dependencies.length}</td>
                            <td style={{ padding: "0.5rem" }}>{node.dependents.length > 0 ? <Label isCompact color="orange">{node.dependents.length}</Label> : "0"}</td>
                            <td style={{ padding: "0.5rem" }}>{node.recent_changes}</td>
                            <td style={{ padding: "0.5rem" }}>{node.jira_refs.length > 0 ? node.jira_refs.slice(0, 3).join(", ") : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardBody>
                </Card>
              </StackItem>
            </Stack>
          </motion.div>
        )}

        {!data && !loading && (
          <StackItem>
            <EmptyState titleText="Scan Dependencies">
              <EmptyStateBody>
                Click "Scan Dependencies" to map cross-repo relationships, detect shared packages, and identify impact hotspots.
              </EmptyStateBody>
            </EmptyState>
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
}
