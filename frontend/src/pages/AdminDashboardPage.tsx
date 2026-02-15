/**
 * Admin Dashboard - Superadmin system overview
 * Shows system stats, usage trends, orgs, users, and feature flags
 */

import { useState } from "react";
import {
  PageSection,
  Stack,
  StackItem,
  Title,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardTitle,
  Label,
  Spinner,
  Switch,
  Alert,
  Tabs,
  Tab,
  TabTitleText,
  Pagination,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { GlassCard } from "../components/GlassCard/GlassCard";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

type AdminTab = "overview" | "orgs" | "users" | "flags";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [orgPage, setOrgPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const perPage = 25;

  const isSuperAdmin = user?.role === "superadmin";

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/stats");
      return data;
    },
    enabled: isSuperAdmin,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["admin-trends"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/usage-trends", {
        params: { days: 30 },
      });
      return data;
    },
    enabled: isSuperAdmin,
  });

  const { data: orgsData } = useQuery({
    queryKey: ["admin-orgs", orgPage],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/orgs", {
        params: { limit: perPage, offset: (orgPage - 1) * perPage },
      });
      return data;
    },
    enabled: isSuperAdmin && activeTab === "orgs",
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users", userPage],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/users", {
        params: { limit: perPage, offset: (userPage - 1) * perPage },
      });
      return data;
    },
    enabled: isSuperAdmin && activeTab === "users",
  });

  const { data: flagsData } = useQuery({
    queryKey: ["admin-flags"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/feature-flags");
      return data;
    },
    enabled: isSuperAdmin && activeTab === "flags",
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      await apiClient.put(`/admin/feature-flags/${key}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flags"] });
    },
  });

  if (!isSuperAdmin) {
    return (
      <PageSection>
        <Alert variant="danger" title="Access Denied">
          This page requires superadmin privileges.
        </Alert>
      </PageSection>
    );
  }

  const planColors: Record<string, string> = {
    free: "#6a6e73",
    pro: "#06c",
    team: "#5752d1",
    business: "#f0ab00",
    enterprise: "#c9190b",
  };

  const planDistribution = stats?.subscriptions?.plan_distribution
    ? Object.entries(stats.subscriptions.plan_distribution).map(
        ([name, value]) => ({ name, value, color: planColors[name] || "#999" })
      )
    : [];

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.users.total, sub: `${stats.users.active} active`, gradient: "primary" as const },
        { label: "Organizations", value: stats.organizations, sub: `${stats.subscriptions.active} with subscriptions`, gradient: "info" as const },
        { label: "Scans This Month", value: stats.scans_this_month, sub: "analysis runs", gradient: "success" as const },
        { label: "Integrations", value: stats.integrations.total, sub: `GH: ${stats.integrations.github} / LN: ${stats.integrations.linear} / CC: ${stats.integrations.codeclimate}`, gradient: "accent" as const },
        { label: "Events Today", value: stats.audit_events_today, sub: "audit log entries", gradient: "warning" as const },
        { label: "Active Webhooks", value: stats.active_webhooks, sub: "registered endpoints", gradient: "dark" as const },
      ]
    : [];

  return (
    <PageSection>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h1" size="2xl">
              Admin Dashboard
            </Title>
            <p style={{ marginTop: "0.5rem", color: "var(--pf-t--global--text--color--subtle)" }}>
              System overview and management
            </p>
          </StackItem>

          <StackItem>
            <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as AdminTab)}>
              {/* ── Overview Tab ── */}
              <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
                {statsLoading ? (
                  <div style={{ textAlign: "center", padding: "3rem" }}><Spinner size="lg" /></div>
                ) : (
                  <Stack hasGutter style={{ marginTop: "1rem" }}>
                    {/* Stat Cards */}
                    <StackItem>
                      <Grid hasGutter>
                        {statCards.map((card) => (
                          <GridItem key={card.label} span={4} md={4} sm={6}>
                            <GlassCard variant="gradient" gradient={card.gradient} enableHover>
                              <div style={{ padding: "1.5rem" }}>
                                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff" }}>
                                  {card.value}
                                </div>
                                <div style={{ fontSize: "1rem", color: "rgba(255,255,255,0.9)", marginTop: "0.25rem" }}>
                                  {card.label}
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.65)", marginTop: "0.25rem" }}>
                                  {card.sub}
                                </div>
                              </div>
                            </GlassCard>
                          </GridItem>
                        ))}
                      </Grid>
                    </StackItem>

                    {/* Charts Row */}
                    <StackItem>
                      <Grid hasGutter>
                        {/* Usage Trends */}
                        <GridItem span={8}>
                          <Card>
                            <CardTitle>Usage Trends (30 days)</CardTitle>
                            <CardBody>
                              {trendsLoading ? (
                                <div style={{ textAlign: "center", padding: "2rem" }}><Spinner size="md" /></div>
                              ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                  <AreaChart data={trends?.scans || []}>
                                    <defs>
                                      <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5752d1" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#5752d1" stopOpacity={0.1} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis
                                      dataKey="date"
                                      tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                      style={{ fontSize: "0.75rem" }}
                                    />
                                    <YAxis style={{ fontSize: "0.75rem" }} />
                                    <Tooltip
                                      labelFormatter={(d) => new Date(d).toLocaleDateString()}
                                      contentStyle={{ borderRadius: "8px" }}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="count"
                                      name="Scans"
                                      stroke="#5752d1"
                                      fill="url(#scanGrad)"
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              )}
                            </CardBody>
                          </Card>
                        </GridItem>

                        {/* Plan Distribution */}
                        <GridItem span={4}>
                          <Card>
                            <CardTitle>Plan Distribution</CardTitle>
                            <CardBody>
                              {planDistribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                  <PieChart>
                                    <Pie
                                      data={planDistribution}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={100}
                                      dataKey="value"
                                      nameKey="name"
                                      paddingAngle={3}
                                    >
                                      {planDistribution.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Legend />
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              ) : (
                                <p style={{ textAlign: "center", color: "var(--pf-t--global--text--color--subtle)", padding: "2rem" }}>
                                  No subscription data
                                </p>
                              )}
                            </CardBody>
                          </Card>
                        </GridItem>
                      </Grid>
                    </StackItem>
                  </Stack>
                )}
              </Tab>

              {/* ── Organizations Tab ── */}
              <Tab eventKey="orgs" title={<TabTitleText>Organizations</TabTitleText>}>
                <Card style={{ marginTop: "1rem" }}>
                  <CardBody>
                    {!orgsData ? (
                      <div style={{ textAlign: "center", padding: "2rem" }}><Spinner size="md" /></div>
                    ) : (
                      <>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)", textAlign: "left" }}>
                              <th style={{ padding: "0.75rem" }}>Organization</th>
                              <th style={{ padding: "0.75rem" }}>Plan</th>
                              <th style={{ padding: "0.75rem" }}>Members</th>
                              <th style={{ padding: "0.75rem" }}>Status</th>
                              <th style={{ padding: "0.75rem" }}>Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(orgsData.organizations || []).map((org: any) => (
                              <tr key={org.id} style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                                <td style={{ padding: "0.75rem" }}>
                                  <strong>{org.name}</strong>
                                  <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>{org.slug}</div>
                                </td>
                                <td style={{ padding: "0.75rem" }}>
                                  <Label color={
                                    org.plan === "enterprise" ? "red" :
                                    org.plan === "business" ? "orange" :
                                    org.plan === "team" ? "purple" :
                                    org.plan === "pro" ? "blue" : "grey"
                                  }>
                                    {org.plan}
                                  </Label>
                                </td>
                                <td style={{ padding: "0.75rem" }}>{org.member_count}</td>
                                <td style={{ padding: "0.75rem" }}>
                                  <Label isCompact color={org.subscription_status === "active" ? "green" : "grey"}>
                                    {org.subscription_status}
                                  </Label>
                                </td>
                                <td style={{ padding: "0.75rem", fontSize: "0.85rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                                  {org.created_at ? new Date(org.created_at).toLocaleDateString() : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(orgsData.total || 0) > perPage && (
                          <Pagination
                            itemCount={orgsData.total}
                            perPage={perPage}
                            page={orgPage}
                            onSetPage={(_e, p) => setOrgPage(p)}
                            style={{ marginTop: "1rem" }}
                          />
                        )}
                      </>
                    )}
                  </CardBody>
                </Card>
              </Tab>

              {/* ── Users Tab ── */}
              <Tab eventKey="users" title={<TabTitleText>Users</TabTitleText>}>
                <Card style={{ marginTop: "1rem" }}>
                  <CardBody>
                    {!usersData ? (
                      <div style={{ textAlign: "center", padding: "2rem" }}><Spinner size="md" /></div>
                    ) : (
                      <>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)", textAlign: "left" }}>
                              <th style={{ padding: "0.75rem" }}>Name</th>
                              <th style={{ padding: "0.75rem" }}>Email</th>
                              <th style={{ padding: "0.75rem" }}>Role</th>
                              <th style={{ padding: "0.75rem" }}>Status</th>
                              <th style={{ padding: "0.75rem" }}>Last Login</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(usersData.users || []).map((u: any) => (
                              <tr key={u.id} style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                                <td style={{ padding: "0.75rem" }}><strong>{u.full_name}</strong></td>
                                <td style={{ padding: "0.75rem", color: "var(--pf-t--global--text--color--subtle)" }}>{u.email}</td>
                                <td style={{ padding: "0.75rem" }}>
                                  <Label isCompact color={u.role === "superadmin" ? "red" : u.role === "admin" ? "purple" : "blue"}>
                                    {u.role}
                                  </Label>
                                </td>
                                <td style={{ padding: "0.75rem" }}>
                                  <Label isCompact color={u.is_active ? "green" : "grey"}>
                                    {u.is_active ? "Active" : "Inactive"}
                                  </Label>
                                </td>
                                <td style={{ padding: "0.75rem", fontSize: "0.85rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                                  {u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(usersData.total || 0) > perPage && (
                          <Pagination
                            itemCount={usersData.total}
                            perPage={perPage}
                            page={userPage}
                            onSetPage={(_e, p) => setUserPage(p)}
                            style={{ marginTop: "1rem" }}
                          />
                        )}
                      </>
                    )}
                  </CardBody>
                </Card>
              </Tab>

              {/* ── Feature Flags Tab ── */}
              <Tab eventKey="flags" title={<TabTitleText>Feature Flags</TabTitleText>}>
                <Card style={{ marginTop: "1rem" }}>
                  <CardBody>
                    {!flagsData ? (
                      <div style={{ textAlign: "center", padding: "2rem" }}><Spinner size="md" /></div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)", textAlign: "left" }}>
                            <th style={{ padding: "0.75rem" }}>Feature</th>
                            <th style={{ padding: "0.75rem" }}>Key</th>
                            <th style={{ padding: "0.75rem" }}>Min Plan</th>
                            <th style={{ padding: "0.75rem" }}>Enabled</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(flagsData.flags || []).map((flag: any) => (
                            <tr key={flag.key} style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                              <td style={{ padding: "0.75rem" }}><strong>{flag.name}</strong></td>
                              <td style={{ padding: "0.75rem" }}>
                                <code style={{ fontSize: "0.85rem", background: "var(--pf-t--global--background--color--secondary--default)", padding: "2px 6px", borderRadius: "3px" }}>
                                  {flag.key}
                                </code>
                              </td>
                              <td style={{ padding: "0.75rem" }}>
                                <Label isCompact color={
                                  flag.min_plan === "enterprise" ? "red" :
                                  flag.min_plan === "business" ? "orange" :
                                  flag.min_plan === "team" ? "purple" :
                                  flag.min_plan === "pro" ? "blue" : "grey"
                                }>
                                  {flag.min_plan}
                                </Label>
                              </td>
                              <td style={{ padding: "0.75rem" }}>
                                <Switch
                                  id={`flag-${flag.key}`}
                                  isChecked={flag.enabled}
                                  onChange={(_e, checked) =>
                                    toggleFlagMutation.mutate({ key: flag.key, enabled: checked })
                                  }
                                  label="On"
                                  labelOff="Off"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardBody>
                </Card>
              </Tab>
            </Tabs>
          </StackItem>
        </Stack>
      </motion.div>
    </PageSection>
  );
}
