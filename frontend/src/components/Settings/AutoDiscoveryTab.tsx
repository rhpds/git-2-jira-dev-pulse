/**
 * Auto-Discovery Tab
 * Manage auto-discovery watcher settings
 */

import { useState, useEffect } from "react";
import {
  Stack,
  StackItem,
  Card,
  CardBody,
  Switch,
  Button,
  Label,
  Alert,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Git2JiraConfig } from "../../api/types";
import {
  toggleAutoDiscovery,
  getAutoDiscoveryStatus,
  startAutoDiscovery,
  stopAutoDiscovery,
  triggerManualDiscovery,
} from "../../api/client";

interface AutoDiscoveryTabProps {
  config: Git2JiraConfig;
}

export function AutoDiscoveryTab({ config }: AutoDiscoveryTabProps) {
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["auto-discovery-status"],
    queryFn: getAutoDiscoveryStatus,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const toggleMutation = useMutation({
    mutationFn: toggleAutoDiscovery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      queryClient.invalidateQueries({ queryKey: ["auto-discovery-status"] });
    },
  });

  const startMutation = useMutation({
    mutationFn: startAutoDiscovery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-discovery-status"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopAutoDiscovery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-discovery-status"] });
    },
  });

  const discoverMutation = useMutation({
    mutationFn: triggerManualDiscovery,
  });

  return (
    <Stack hasGutter style={{ marginTop: "1rem" }}>
      <StackItem>
        <h3>Auto-Discovery Settings</h3>
        <p style={{ color: "var(--pf-t--global--text--color--subtle)", fontSize: "0.875rem" }}>
          Automatically detect new git repositories in watched directories
        </p>
      </StackItem>

      {/* Status Card */}
      <StackItem>
        <Card>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>Watcher Status</strong>
                    <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                      {status?.running ? "Active and monitoring" : "Not running"}
                    </div>
                  </div>
                  <Label color={status?.running ? "green" : "grey"}>
                    {status?.running ? "● Running" : "○ Stopped"}
                  </Label>
                </div>
              </StackItem>

              {status && (
                <>
                  <StackItem>
                    <div style={{ fontSize: "0.875rem" }}>
                      <strong>Discovered Repositories:</strong> {status.discovered_count}
                    </div>
                  </StackItem>

                  {status.watch_paths.length > 0 && (
                    <StackItem>
                      <div style={{ fontSize: "0.875rem" }}>
                        <strong>Watched Paths:</strong>
                        <ul style={{ marginTop: "0.5rem", marginLeft: "1.5rem" }}>
                          {status.watch_paths.map((path, i) => (
                            <li key={i}>{path}</li>
                          ))}
                        </ul>
                      </div>
                    </StackItem>
                  )}

                  <StackItem>
                    <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                      Scan interval: Every {status.scan_interval_seconds} seconds
                    </div>
                  </StackItem>
                </>
              )}
            </Stack>
          </CardBody>
        </Card>
      </StackItem>

      {/* Enable/Disable */}
      <StackItem>
        <Card>
          <CardBody>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Enable Auto-Discovery</strong>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                  Automatically detect new repositories as they are created
                </div>
              </div>
              <Switch
                id="auto-discovery-toggle"
                isChecked={config.auto_discovery.enabled}
                onChange={(_e, checked) => toggleMutation.mutate(checked)}
                isDisabled={toggleMutation.isPending}
              />
            </div>
          </CardBody>
        </Card>
      </StackItem>

      {/* Actions */}
      <StackItem>
        <Card>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <strong>Actions</strong>
              </StackItem>
              <StackItem>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {!status?.running ? (
                    <Button
                      variant="primary"
                      onClick={() => startMutation.mutate()}
                      isLoading={startMutation.isPending}
                    >
                      Start Watcher
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => stopMutation.mutate()}
                      isLoading={stopMutation.isPending}
                    >
                      Stop Watcher
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    onClick={() => discoverMutation.mutate()}
                    isLoading={discoverMutation.isPending}
                  >
                    Manual Scan Now
                  </Button>
                </div>
              </StackItem>

              {discoverMutation.isSuccess && discoverMutation.data && (
                <StackItem>
                  <Alert
                    variant="success"
                    title={`Discovered ${discoverMutation.data.discovered_count} repositories`}
                    isInline
                  />
                </StackItem>
              )}
            </Stack>
          </CardBody>
        </Card>
      </StackItem>

      {config.auto_discovery.watch_paths.length === 0 && (
        <StackItem>
          <Alert
            variant="warning"
            title="No watch paths configured"
            isInline
          >
            Add scan directories in the "Scan Directories" tab to enable auto-discovery.
            The watcher will monitor those directories for new repositories.
          </Alert>
        </StackItem>
      )}
    </Stack>
  );
}
