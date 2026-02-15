/**
 * SessionsTab - Active sessions management
 * View and revoke login sessions across devices
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardTitle,
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Button,
  Label,
  EmptyState,
  EmptyStateBody,
  Spinner,
} from "@patternfly/react-core";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:9000" });
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("access_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

interface SessionInfo {
  id: number;
  device_name: string;
  ip_address: string;
  user_agent: string;
  is_current: boolean;
  last_active: string | null;
  created_at: string | null;
}

export function SessionsTab() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/auth/sessions/");
      setSessions(res.data.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const revokeSession = async (id: number) => {
    setRevoking(id);
    try {
      await API.delete(`/api/auth/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOther = async () => {
    setRevokingAll(true);
    try {
      await API.post("/api/auth/sessions/revoke-all");
      await fetchSessions();
    } catch {
      // ignore
    } finally {
      setRevokingAll(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Unknown";
    return new Date(iso).toLocaleString();
  };

  const deviceIcon = (name: string) => {
    if (name.includes("iPhone") || name.includes("Android") || name.includes("Mobile")) return "\u{1F4F1}";
    if (name.includes("Mac")) return "\u{1F4BB}";
    if (name.includes("Windows")) return "\u{1F5A5}";
    if (name.includes("Linux")) return "\u{1F427}";
    if (name.includes("API")) return "\u{1F517}";
    return "\u{1F4BB}";
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "1rem" }}>
      <Stack hasGutter>
        <StackItem>
          <Flex justifyContent={{ default: "justifyContentSpaceBetween" }} alignItems={{ default: "alignItemsCenter" }}>
            <FlexItem>
              <strong>Active Sessions</strong>
              <span style={{ marginLeft: "0.5rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                ({sessions.length} total)
              </span>
            </FlexItem>
            {sessions.length > 1 && (
              <FlexItem>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={revokeAllOther}
                  isLoading={revokingAll}
                  isDisabled={revokingAll}
                >
                  Revoke All Other Sessions
                </Button>
              </FlexItem>
            )}
          </Flex>
        </StackItem>

        {sessions.length === 0 ? (
          <StackItem>
            <EmptyState>
              <EmptyStateBody>No active sessions found.</EmptyStateBody>
            </EmptyState>
          </StackItem>
        ) : (
          sessions.map((session) => (
            <StackItem key={session.id}>
              <Card isCompact>
                <CardTitle>
                  <Flex justifyContent={{ default: "justifyContentSpaceBetween" }} alignItems={{ default: "alignItemsCenter" }}>
                    <FlexItem>
                      <span style={{ fontSize: "1.2rem", marginRight: "0.5rem" }}>
                        {deviceIcon(session.device_name)}
                      </span>
                      {session.device_name}
                      {session.is_current && (
                        <Label color="green" isCompact style={{ marginLeft: "0.5rem" }}>
                          Current
                        </Label>
                      )}
                    </FlexItem>
                    {!session.is_current && (
                      <FlexItem>
                        <Button
                          variant="secondary"
                          isDanger
                          size="sm"
                          onClick={() => revokeSession(session.id)}
                          isLoading={revoking === session.id}
                          isDisabled={revoking === session.id}
                        >
                          Revoke
                        </Button>
                      </FlexItem>
                    )}
                  </Flex>
                </CardTitle>
                <CardBody>
                  <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsXs" }}>
                    <FlexItem>
                      <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>IP:</span>{" "}
                      {session.ip_address || "Unknown"}
                    </FlexItem>
                    <FlexItem>
                      <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Last active:</span>{" "}
                      {formatDate(session.last_active)}
                    </FlexItem>
                    <FlexItem>
                      <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Created:</span>{" "}
                      {formatDate(session.created_at)}
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>
            </StackItem>
          ))
        )}
      </Stack>
    </div>
  );
}
