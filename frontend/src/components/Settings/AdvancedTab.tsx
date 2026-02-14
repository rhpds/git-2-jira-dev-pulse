/**
 * Advanced Tab
 * Manage performance tuning and advanced configuration
 */

import { useState } from "react";
import {
  Stack,
  StackItem,
  Card,
  CardBody,
  Button,
  NumberInput,
  Alert,
  Form,
  FormGroup,
} from "@patternfly/react-core";
import { Git2JiraConfig } from "../../api/types";

interface AdvancedTabProps {
  config: Git2JiraConfig;
}

export function AdvancedTab({ config }: AdvancedTabProps) {
  const [maxParallelScans, setMaxParallelScans] = useState(config.performance.max_parallel_scans);
  const [cacheTTL, setCacheTTL] = useState(config.performance.cache_ttl_seconds);
  const [showExportSuccess, setShowExportSuccess] = useState(false);

  const handleExportConfig = () => {
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `git2jira-config-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3000);
  };

  return (
    <Stack hasGutter style={{ marginTop: "1rem" }}>
      <StackItem>
        <h3>Advanced Settings</h3>
        <p style={{ color: "var(--pf-t--global--text--color--subtle)", fontSize: "0.875rem" }}>
          Performance tuning and advanced configuration options
        </p>
      </StackItem>

      {/* Performance Settings */}
      <StackItem>
        <Card>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <strong>Performance Tuning</strong>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                  Adjust scanning performance and caching behavior
                </div>
              </StackItem>

              <StackItem>
                <Form>
                  <FormGroup label="Maximum Parallel Scans" fieldId="max-parallel-scans">
                    <NumberInput
                      value={maxParallelScans}
                      min={1}
                      max={50}
                      onMinus={() => setMaxParallelScans(Math.max(1, maxParallelScans - 1))}
                      onPlus={() => setMaxParallelScans(Math.min(50, maxParallelScans + 1))}
                      onChange={(e) => {
                        const val = Number((e.target as HTMLInputElement).value);
                        if (!isNaN(val)) setMaxParallelScans(Math.min(50, Math.max(1, val)));
                      }}
                      inputName="max-parallel-scans"
                      inputAriaLabel="maximum parallel scans"
                      minusBtnAriaLabel="minus"
                      plusBtnAriaLabel="plus"
                    />
                    <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.5rem" }}>
                      Higher values scan faster but use more system resources. Recommended: 10-20
                    </div>
                  </FormGroup>

                  <FormGroup label="Cache Time-To-Live (seconds)" fieldId="cache-ttl">
                    <NumberInput
                      value={cacheTTL}
                      min={0}
                      max={3600}
                      onMinus={() => setCacheTTL(Math.max(0, cacheTTL - 60))}
                      onPlus={() => setCacheTTL(Math.min(3600, cacheTTL + 60))}
                      onChange={(e) => {
                        const val = Number((e.target as HTMLInputElement).value);
                        if (!isNaN(val)) setCacheTTL(Math.min(3600, Math.max(0, val)));
                      }}
                      inputName="cache-ttl"
                      inputAriaLabel="cache time to live"
                      minusBtnAriaLabel="minus"
                      plusBtnAriaLabel="plus"
                    />
                    <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.5rem" }}>
                      How long to cache scan results. Set to 0 to disable caching. Recommended: 300 seconds (5 minutes)
                    </div>
                  </FormGroup>
                </Form>
              </StackItem>

              <StackItem>
                <Alert
                  variant="info"
                  title="Performance tuning note"
                  isInline
                >
                  Changes to performance settings will take effect on the next scan. These settings are stored in your configuration file.
                </Alert>
              </StackItem>
            </Stack>
          </CardBody>
        </Card>
      </StackItem>

      {/* Configuration Management */}
      <StackItem>
        <Card>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <strong>Configuration Management</strong>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                  Export or backup your configuration
                </div>
              </StackItem>

              <StackItem>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <Button variant="secondary" onClick={handleExportConfig}>
                    Export Configuration
                  </Button>
                  <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                    Download current config as JSON
                  </div>
                </div>
              </StackItem>

              {showExportSuccess && (
                <StackItem>
                  <Alert
                    variant="success"
                    title="Configuration exported successfully"
                    isInline
                  />
                </StackItem>
              )}
            </Stack>
          </CardBody>
        </Card>
      </StackItem>

      {/* Configuration File Info */}
      <StackItem>
        <Card>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <strong>Configuration File Location</strong>
              </StackItem>
              <StackItem>
                <div style={{
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  padding: "0.5rem",
                  backgroundColor: "var(--pf-t--global--background--color--secondary--default)",
                  borderRadius: "4px"
                }}>
                  ~/.git2jira.config.yaml
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.5rem" }}>
                  Version: {config.version}
                </div>
              </StackItem>
            </Stack>
          </CardBody>
        </Card>
      </StackItem>

      {/* System Information */}
      <StackItem>
        <Card>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <strong>Current Configuration</strong>
              </StackItem>
              <StackItem>
                <div style={{ fontSize: "0.875rem" }}>
                  <div><strong>Scan Directories:</strong> {config.scan_directories.length}</div>
                  <div><strong>Auto-Discovery:</strong> {config.auto_discovery.enabled ? "Enabled" : "Disabled"}</div>
                  <div><strong>Watch Paths:</strong> {config.auto_discovery.watch_paths.length}</div>
                  <div><strong>Theme:</strong> {config.ui.theme}</div>
                  <div><strong>Max Parallel Scans:</strong> {config.performance.max_parallel_scans}</div>
                  <div><strong>Cache TTL:</strong> {config.performance.cache_ttl_seconds}s</div>
                </div>
              </StackItem>
            </Stack>
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  );
}
