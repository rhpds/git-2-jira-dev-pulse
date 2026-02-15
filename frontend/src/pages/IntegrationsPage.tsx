/**
 * IntegrationsPage - Integration health dashboard
 * Shows status of all connected integrations (Jira, GitHub, Linear, CodeClimate)
 */

import { useState, useEffect } from "react";
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
  Flex,
  FlexItem,
  Spinner,
} from "@patternfly/react-core";
import { motion } from "framer-motion";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:9000" });
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("access_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

interface Integration {
  name: string;
  status: "healthy" | "error" | "not_configured" | "idle";
  configured: boolean;
  connected: boolean;
  message: string;
  last_synced: string | null;
  item_count: number;
}

interface HealthSummary {
  total: number;
  healthy: number;
  errored: number;
  not_configured: number;
}

const statusColor = (status: string): "green" | "red" | "grey" | "blue" => {
  switch (status) {
    case "healthy": return "green";
    case "error": return "red";
    case "idle": return "blue";
    default: return "grey";
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "healthy": return "Connected";
    case "error": return "Error";
    case "idle": return "Idle";
    case "not_configured": return "Not Configured";
    default: return status;
  }
};

const integrationIcon = (name: string) => {
  switch (name) {
    case "Jira": return "\ud83c\udfab";
    case "GitHub": return "\ud83d\udc19";
    case "Linear": return "\ud83d\udcca";
    case "CodeClimate": return "\ud83c\udf21\ufe0f";
    default: return "\ud83d\udd17";
  }
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await API.get("/api/integrations/health");
        setIntegrations(res.data.integrations || []);
        setSummary(res.data.summary || null);
      } catch {
        setIntegrations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <PageSection>
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <Spinner size="xl" />
        </div>
      </PageSection>
    );
  }

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
              Integration Health
            </Title>
            <p style={{ marginTop: "0.5rem", color: "var(--pf-t--global--text--color--subtle)" }}>
              Monitor the status of all connected integrations
            </p>
          </StackItem>

          {/* Summary Cards */}
          {summary && (
            <StackItem>
              <Grid hasGutter>
                <GridItem span={3}>
                  <Card isCompact>
                    <CardBody>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{summary.total}</div>
                        <div style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Total</div>
                      </div>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem span={3}>
                  <Card isCompact>
                    <CardBody>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--pf-t--color--green--40)" }}>{summary.healthy}</div>
                        <div style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Healthy</div>
                      </div>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem span={3}>
                  <Card isCompact>
                    <CardBody>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--pf-t--color--red--40)" }}>{summary.errored}</div>
                        <div style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Errors</div>
                      </div>
                    </CardBody>
                  </Card>
                </GridItem>
                <GridItem span={3}>
                  <Card isCompact>
                    <CardBody>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{summary.not_configured}</div>
                        <div style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Unconfigured</div>
                      </div>
                    </CardBody>
                  </Card>
                </GridItem>
              </Grid>
            </StackItem>
          )}

          {/* Integration Cards */}
          <StackItem>
            <Grid hasGutter>
              {integrations.map((integration, index) => (
                <GridItem span={6} key={integration.name}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card>
                      <CardTitle>
                        <Flex justifyContent={{ default: "justifyContentSpaceBetween" }} alignItems={{ default: "alignItemsCenter" }}>
                          <FlexItem>
                            <span style={{ fontSize: "1.5rem", marginRight: "0.75rem" }}>
                              {integrationIcon(integration.name)}
                            </span>
                            <strong>{integration.name}</strong>
                          </FlexItem>
                          <FlexItem>
                            <Label color={statusColor(integration.status)} isCompact>
                              {statusLabel(integration.status)}
                            </Label>
                          </FlexItem>
                        </Flex>
                      </CardTitle>
                      <CardBody>
                        <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsSm" }}>
                          <FlexItem>
                            <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Status:</span>{" "}
                            {integration.message}
                          </FlexItem>
                          {integration.item_count > 0 && (
                            <FlexItem>
                              <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Items:</span>{" "}
                              {integration.item_count}
                            </FlexItem>
                          )}
                          <FlexItem>
                            <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>Last synced:</span>{" "}
                            {integration.last_synced
                              ? new Date(integration.last_synced).toLocaleString()
                              : "Never"}
                          </FlexItem>
                        </Flex>
                      </CardBody>
                    </Card>
                  </motion.div>
                </GridItem>
              ))}
            </Grid>
          </StackItem>
        </Stack>
      </motion.div>
    </PageSection>
  );
}
