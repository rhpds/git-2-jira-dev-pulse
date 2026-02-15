/**
 * Activity Feed Page
 * Real-time activity timeline for the organization
 */

import { useState } from "react";
import {
  PageSection,
  Title,
  Card,
  CardBody,
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Label,
  Button,
  Spinner,
  Pagination,
  Select,
  SelectOption,
  MenuToggle,
} from "@patternfly/react-core";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });
// Re-use auth token from localStorage
const token = localStorage.getItem("dp_access_token");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

interface Activity {
  id: number;
  action: string;
  actor_email: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown> | null;
  icon: string;
  timestamp: string;
}

interface ActivitySummary {
  total_events: number;
  unique_actors: number;
  period_days: number;
  by_action: Record<string, number>;
}

const ACTION_COLORS: Record<string, "blue" | "green" | "red" | "orange" | "purple" | "cyan" | "grey"> = {
  created: "green",
  updated: "blue",
  deleted: "red",
  invited: "purple",
  removed: "orange",
  enabled: "cyan",
  disabled: "grey",
};

const ACTION_ICONS: Record<string, string> = {
  created: "+",
  updated: "~",
  deleted: "x",
  invited: "@",
  removed: "-",
  enabled: "o",
  disabled: ".",
  scanned: ">",
  synced: "<>",
  login: ">>",
};

function getActionColor(action: string): "blue" | "green" | "red" | "orange" | "purple" | "cyan" | "grey" {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.toLowerCase().includes(key)) return color;
  }
  return "blue";
}

function getActionIcon(action: string): string {
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (action.toLowerCase().includes(key)) return icon;
  }
  return "*";
}

function timeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return then.toLocaleDateString();
}

export default function ActivityFeedPage() {
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const perPage = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["activity-feed", page, filterType],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        limit: perPage,
        offset: (page - 1) * perPage,
      };
      if (filterType) params.resource_type = filterType;
      const { data } = await api.get("/activity/feed", { params });
      return data as { activities: Activity[]; total: number };
    },
  });

  const { data: typesData } = useQuery({
    queryKey: ["activity-types"],
    queryFn: async () => {
      const { data } = await api.get("/activity/feed/types");
      return data as { types: string[] };
    },
  });

  const { data: summaryData } = useQuery({
    queryKey: ["activity-summary"],
    queryFn: async () => {
      const { data } = await api.get("/activity/feed/summary", { params: { days: 7 } });
      return data as { summary: ActivitySummary };
    },
  });

  const activities = data?.activities || [];
  const total = data?.total || 0;
  const summary = summaryData?.summary;
  const types = typesData?.types || [];

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
              Activity Feed
            </Title>
            <p style={{ marginTop: "0.5rem", color: "var(--pf-t--global--text--color--subtle)" }}>
              Recent activity across your organization
            </p>
          </StackItem>

          {/* Summary Cards */}
          {summary && (
            <StackItem>
              <Flex spaceItems={{ default: "spaceItemsMd" }}>
                <FlexItem>
                  <Card isCompact>
                    <CardBody>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>
                          {summary.total_events}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                          Events (7d)
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </FlexItem>
                <FlexItem>
                  <Card isCompact>
                    <CardBody>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>
                          {summary.unique_actors}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                          Active Users
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </FlexItem>
                {Object.entries(summary.by_action).slice(0, 3).map(([action, count]) => (
                  <FlexItem key={action}>
                    <Card isCompact>
                      <CardBody>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>
                            {count}
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                            {action}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </FlexItem>
                ))}
              </Flex>
            </StackItem>
          )}

          {/* Filter */}
          <StackItem>
            <Flex alignItems={{ default: "alignItemsCenter" }} spaceItems={{ default: "spaceItemsMd" }}>
              <FlexItem>
                <Select
                  isOpen={filterOpen}
                  onOpenChange={setFilterOpen}
                  onSelect={(_e, val) => {
                    setFilterType(val === "__all__" ? "" : (val as string));
                    setFilterOpen(false);
                    setPage(1);
                  }}
                  selected={filterType || "__all__"}
                  toggle={(toggleRef) => (
                    <MenuToggle ref={toggleRef} onClick={() => setFilterOpen(!filterOpen)} isExpanded={filterOpen}>
                      {filterType || "All Types"}
                    </MenuToggle>
                  )}
                >
                  <SelectOption value="__all__">All Types</SelectOption>
                  {types.map((t) => (
                    <SelectOption key={t} value={t}>
                      {t}
                    </SelectOption>
                  ))}
                </Select>
              </FlexItem>
              <FlexItem>
                <span style={{ fontSize: "0.85rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                  {total} event{total !== 1 ? "s" : ""}
                </span>
              </FlexItem>
            </Flex>
          </StackItem>

          {/* Timeline */}
          <StackItem>
            <Card>
              <CardBody>
                {isLoading ? (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <Spinner size="lg" />
                  </div>
                ) : activities.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                    No activity yet. Actions will appear here as your team uses DevPulse Pro.
                  </div>
                ) : (
                  <div>
                    <AnimatePresence>
                      {activities.map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "1rem",
                              padding: "1rem 0",
                              borderBottom: index < activities.length - 1 ? "1px solid var(--pf-t--global--border--color--default)" : "none",
                            }}
                          >
                            {/* Icon */}
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: "var(--pf-t--global--background--color--secondary--default)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "0.9rem",
                                flexShrink: 0,
                              }}
                            >
                              {getActionIcon(activity.action)}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Flex alignItems={{ default: "alignItemsCenter" }} spaceItems={{ default: "spaceItemsSm" }}>
                                <FlexItem>
                                  <Label color={getActionColor(activity.action)} isCompact>
                                    {activity.action}
                                  </Label>
                                </FlexItem>
                                <FlexItem>
                                  <span style={{ fontWeight: 600 }}>
                                    {activity.resource_type}
                                  </span>
                                </FlexItem>
                                {activity.resource_id && (
                                  <FlexItem>
                                    <span
                                      style={{
                                        fontFamily: "monospace",
                                        fontSize: "0.8rem",
                                        color: "var(--pf-t--global--text--color--subtle)",
                                      }}
                                    >
                                      #{activity.resource_id}
                                    </span>
                                  </FlexItem>
                                )}
                              </Flex>
                              <div
                                style={{
                                  marginTop: "0.25rem",
                                  fontSize: "0.85rem",
                                  color: "var(--pf-t--global--text--color--subtle)",
                                }}
                              >
                                by {activity.actor_email} &middot; {timeAgo(activity.timestamp)}
                              </div>
                              {activity.details && Object.keys(activity.details).length > 0 && (
                                <div
                                  style={{
                                    marginTop: "0.5rem",
                                    fontSize: "0.8rem",
                                    fontFamily: "monospace",
                                    color: "var(--pf-t--global--text--color--subtle)",
                                    background: "var(--pf-t--global--background--color--secondary--default)",
                                    padding: "0.5rem",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {JSON.stringify(activity.details, null, 2).substring(0, 200)}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardBody>
            </Card>
          </StackItem>

          {/* Pagination */}
          {total > perPage && (
            <StackItem>
              <Pagination
                itemCount={total}
                perPage={perPage}
                page={page}
                onSetPage={(_e, p) => setPage(p)}
              />
            </StackItem>
          )}
        </Stack>
      </motion.div>
    </PageSection>
  );
}
