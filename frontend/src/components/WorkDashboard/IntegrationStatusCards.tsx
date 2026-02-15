/**
 * Integration Status Cards
 * Shows connected integration status on the dashboard
 */

import { motion } from "framer-motion";
import { Label, Spinner } from "@patternfly/react-core";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "../GlassCard/GlassCard";
import { apiClient } from "../../api/client";

interface IntegrationItem {
  id: number;
  label: string;
  last_synced?: string | null;
}

interface IntegrationInfo {
  name: string;
  connected: boolean;
  count: number;
  items: IntegrationItem[];
}

interface IntegrationStatusResponse {
  github: IntegrationInfo;
  linear: IntegrationInfo;
  codeclimate: IntegrationInfo;
  total_integrations: number;
}

async function fetchIntegrationStatus(): Promise<IntegrationStatusResponse> {
  const { data } = await apiClient.get("/api/analytics/integrations");
  return data;
}

const INTEGRATION_META: Record<
  string,
  { icon: string; color: string; gradient: string }
> = {
  github: { icon: "\u{1F4BB}", color: "#38ef7d", gradient: "success" },
  linear: { icon: "\u{1F4CA}", color: "#667eea", gradient: "primary" },
  codeclimate: { icon: "\u{1F9EA}", color: "#f093fb", gradient: "accent" },
};

export function IntegrationStatusCards() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["integration-status"],
    queryFn: fetchIntegrationStatus,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <GlassCard>
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <Spinner size="md" />
          <p
            style={{
              color: "var(--pf-t--global--text--color--subtle)",
              marginTop: "0.5rem",
              fontSize: "0.85rem",
            }}
          >
            Loading integrations...
          </p>
        </div>
      </GlassCard>
    );
  }

  if (error || !data) {
    return null;
  }

  const integrations = [
    { key: "github", info: data.github },
    { key: "linear", info: data.linear },
    { key: "codeclimate", info: data.codeclimate },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <GlassCard variant="border-gradient" gradient="info">
        <div style={{ marginBottom: "0.75rem" }}>
          <h3
            style={{
              color: "var(--pf-t--global--text--color--regular)",
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: "0.25rem",
            }}
          >
            Integrations
          </h3>
          <p
            style={{
              color: "var(--pf-t--global--text--color--subtle)",
              fontSize: "0.8rem",
            }}
          >
            {data.total_integrations} connected
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {integrations.map(({ key, info }) => {
            const meta = INTEGRATION_META[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + integrations.indexOf({ key, info } as any) * 0.1 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.6rem 0.75rem",
                  background: info.connected
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.02)",
                  borderRadius: "8px",
                  border: `1px solid ${
                    info.connected
                      ? `${meta.color}33`
                      : "rgba(255,255,255,0.06)"
                  }`,
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{meta.icon}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: "var(--pf-t--global--text--color--regular)",
                    }}
                  >
                    {info.name}
                  </div>
                  {info.connected && info.items.length > 0 && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--pf-t--global--text--color--subtle)",
                        marginTop: "0.1rem",
                      }}
                    >
                      {info.items.map((i) => i.label).join(", ")}
                    </div>
                  )}
                </div>
                <Label
                  color={info.connected ? "green" : "grey"}
                  isCompact
                >
                  {info.connected ? `${info.count} active` : "Not connected"}
                </Label>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>
    </motion.div>
  );
}
