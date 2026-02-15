/**
 * Audit Log Tab
 * View organization audit logs with filtering
 */

import { useState } from "react";
import {
  Stack,
  StackItem,
  Card,
  CardBody,
  CardTitle,
  Label,
  Spinner,
  Button,
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  Pagination,
} from "@patternfly/react-core";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";

interface AuditLogEntry {
  id: number;
  action: string;
  actor_email: string | null;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

export function AuditLogTab() {
  const [actionFilter, setActionFilter] = useState<string>("");
  const [isActionSelectOpen, setIsActionSelectOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 25;

  const { data: actionsData } = useQuery({
    queryKey: ["audit-actions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/audit-logs/actions");
      return data as { actions: string[] };
    },
    retry: false,
  });

  const { data: logsData, isLoading, error } = useQuery({
    queryKey: ["audit-logs", actionFilter, page],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/audit-logs/", {
        params: {
          action: actionFilter || undefined,
          limit: perPage,
          offset: (page - 1) * perPage,
        },
      });
      return data as {
        logs: AuditLogEntry[];
        total: number;
        limit: number;
        offset: number;
      };
    },
    retry: false,
  });

  const getActionColor = (action: string): string => {
    if (action.includes("created") || action.includes("enabled")) return "green";
    if (action.includes("deleted") || action.includes("disabled") || action.includes("removed")) return "red";
    if (action.includes("updated") || action.includes("changed")) return "blue";
    if (action.includes("invited")) return "purple";
    return "grey";
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  if (error) {
    return (
      <Card>
        <CardBody>
          <p style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
            Audit logs require admin privileges. Please contact your organization admin.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Stack hasGutter>
      {/* Filters */}
      <StackItem>
        <Card>
          <CardTitle>Audit Log</CardTitle>
          <CardBody>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ minWidth: "200px" }}>
                <Select
                  isOpen={isActionSelectOpen}
                  onOpenChange={(isOpen) => setIsActionSelectOpen(isOpen)}
                  onSelect={(_event, selection) => {
                    setActionFilter(selection as string);
                    setIsActionSelectOpen(false);
                    setPage(1);
                  }}
                  selected={actionFilter}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsActionSelectOpen(!isActionSelectOpen)}
                      isExpanded={isActionSelectOpen}
                      style={{ width: "200px" }}
                    >
                      {actionFilter || "All actions"}
                    </MenuToggle>
                  )}
                >
                  <SelectList>
                    <SelectOption value="">All actions</SelectOption>
                    {(actionsData?.actions || []).map((a) => (
                      <SelectOption key={a} value={a}>
                        {a}
                      </SelectOption>
                    ))}
                  </SelectList>
                </Select>
              </div>
              {actionFilter && (
                <Button variant="link" onClick={() => { setActionFilter(""); setPage(1); }}>
                  Clear filters
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </StackItem>

      {/* Log entries */}
      <StackItem>
        <Card>
          <CardBody>
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Spinner size="md" />
              </div>
            ) : (logsData?.logs || []).length === 0 ? (
              <p style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
                No audit log entries found.
              </p>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)", textAlign: "left" }}>
                      <th style={{ padding: "0.75rem" }}>Time</th>
                      <th style={{ padding: "0.75rem" }}>Action</th>
                      <th style={{ padding: "0.75rem" }}>Actor</th>
                      <th style={{ padding: "0.75rem" }}>Resource</th>
                      <th style={{ padding: "0.75rem" }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logsData?.logs || []).map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                        <td style={{ padding: "0.75rem", fontSize: "0.85rem", color: "var(--pf-t--global--text--color--subtle)", whiteSpace: "nowrap" }}>
                          {formatDate(log.created_at)}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <Label isCompact color={getActionColor(log.action)}>
                            {log.action}
                          </Label>
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.85rem" }}>
                          {log.actor_email || "System"}
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.85rem" }}>
                          {log.resource_type && (
                            <span>
                              {log.resource_type}
                              {log.resource_id && ` #${log.resource_id}`}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {log.details ? JSON.stringify(log.details) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {(logsData?.total || 0) > perPage && (
                  <Pagination
                    itemCount={logsData?.total || 0}
                    perPage={perPage}
                    page={page}
                    onSetPage={(_e, p) => setPage(p)}
                    style={{ marginTop: "1rem" }}
                  />
                )}
              </>
            )}
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  );
}
