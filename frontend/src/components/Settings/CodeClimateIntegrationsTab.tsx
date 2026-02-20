/**
 * CodeClimate Integrations Tab
 * Manage CodeClimate integration settings for repositories
 */

import { useState } from "react";
import {
  Stack,
  StackItem,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  Button,
  Alert,
  AlertActionCloseButton,
  Switch,
  Label,
  List,
  ListItem,
  Spinner,
  Modal,
  ModalVariant,
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCodeClimateRepos,
  getCodeClimateIntegrations,
  enableCodeClimateIntegration,
  disableCodeClimateIntegration,
  syncCodeClimateData,
  checkCodeClimateConnection,
} from "../../api/client";

export function CodeClimateIntegrationsTab() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(60);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isRepoSelectOpen, setIsRepoSelectOpen] = useState(false);

  // Fetch CodeClimate integrations
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ["codeclimate-integrations"],
    queryFn: getCodeClimateIntegrations,
  });

  // Check CodeClimate connection
  const { data: connectionStatus, isLoading: connectionLoading } = useQuery({
    queryKey: ["codeclimate-health"],
    queryFn: checkCodeClimateConnection,
    retry: false,
  });

  // Fetch repositories (only when connected)
  const { data: repos = [] } = useQuery({
    queryKey: ["codeclimate-repos"],
    queryFn: () => getCodeClimateRepos(),
    enabled: !!connectionStatus?.connected,
    retry: false,
  });

  // Enable integration mutation
  const enableMutation = useMutation({
    mutationFn: enableCodeClimateIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["codeclimate-integrations"] });
      setSuccessMessage("CodeClimate integration enabled successfully!");
      setShowAddModal(false);
      resetForm();
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to enable CodeClimate integration");
    },
  });

  // Disable integration mutation
  const disableMutation = useMutation({
    mutationFn: disableCodeClimateIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["codeclimate-integrations"] });
      setSuccessMessage("CodeClimate integration disabled successfully!");
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to disable CodeClimate integration");
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: syncCodeClimateData,
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["codeclimate-integrations"] });
      setSuccessMessage(
        `Synced ${result.snapshots_synced} snapshots for ${result.repo_name}`
      );
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to sync CodeClimate data");
    },
  });

  const resetForm = () => {
    setSelectedRepoId("");
    setAutoSync(true);
    setSyncInterval(60);
  };

  const handleEnable = () => {
    if (!selectedRepoId) {
      setErrorMessage("Please select a repository");
      return;
    }

    const selectedRepo = repos.find((r: any) => r.id === selectedRepoId);
    enableMutation.mutate({
      repo_id: selectedRepoId,
      repo_name: selectedRepo?.name,
      repo_slug: selectedRepo?.slug,
      github_slug: selectedRepo?.github_slug,
      auto_sync: autoSync,
      sync_interval_minutes: syncInterval,
    });
  };

  const handleDisable = (repoId: string, repoName: string) => {
    if (confirm(`Disable CodeClimate integration for ${repoName}?`)) {
      disableMutation.mutate(repoId);
    }
  };

  const handleSync = (repoId: string) => {
    syncMutation.mutate(repoId);
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: "green",
      B: "blue",
      C: "orange",
      D: "red",
      F: "red",
    };
    return colors[grade] || "grey";
  };

  if (connectionLoading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Spinner size="lg" />
        <p style={{ marginTop: "1rem", color: "var(--pf-t--global--text--color--subtle)" }}>
          Checking CodeClimate connection...
        </p>
      </div>
    );
  }

  return (
    <Stack hasGutter>
      {/* Success/Error Alerts */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert
              variant="success"
              title={successMessage}
              actionClose={<AlertActionCloseButton onClose={() => setSuccessMessage("")} />}
            />
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert
              variant="danger"
              title={errorMessage}
              actionClose={<AlertActionCloseButton onClose={() => setErrorMessage("")} />}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Status */}
      <StackItem>
        <Card>
          <CardTitle>🔗 CodeClimate Connection Status</CardTitle>
          <CardBody>
            {connectionStatus?.connected ? (
              <Alert variant="success" title="CodeClimate Connected" isInline>
                <p>
                  Connected successfully. {connectionStatus.orgs_count} organization(s) accessible.
                </p>
              </Alert>
            ) : (
              <Alert variant="warning" title="CodeClimate Not Connected" isInline>
                <p>
                  Set CODECLIMATE_API_TOKEN environment variable to enable CodeClimate integration.
                </p>
                <p style={{ marginTop: "0.5rem", fontSize: "0.9em" }}>
                  Get your API token from: <a href="https://codeclimate.com/profile/tokens" target="_blank" rel="noopener noreferrer">codeclimate.com/profile/tokens</a>
                </p>
                {connectionStatus?.error && (
                  <p style={{ marginTop: "0.5rem", fontSize: "0.9em" }}>
                    Error: {connectionStatus.error}
                  </p>
                )}
              </Alert>
            )}
          </CardBody>
        </Card>
      </StackItem>

      {/* Enabled Integrations */}
      <StackItem>
        <Card>
          <CardTitle>
            📊 Enabled CodeClimate Integrations
            <Button
              variant="primary"
              style={{ float: "right" }}
              onClick={() => setShowAddModal(true)}
              isDisabled={!connectionStatus?.connected}
            >
              + Add Repository
            </Button>
          </CardTitle>
          <CardBody>
            {integrationsLoading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Spinner size="md" />
              </div>
            ) : integrations.length === 0 ? (
              <p style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
                No CodeClimate integrations configured. Click "Add Repository" to get started.
              </p>
            ) : (
              <List isPlain isBordered>
                {integrations.map((integration: any) => (
                  <ListItem key={integration.id}>
                    <Stack hasGutter>
                      <StackItem>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong>{integration.repo_name}</strong>
                            <Label color="blue" style={{ marginLeft: "0.5rem" }}>
                              {integration.repo_slug}
                            </Label>
                            {integration.auto_sync && (
                              <Label color="green" style={{ marginLeft: "0.5rem" }}>
                                Auto-sync
                              </Label>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleSync(integration.repo_id)}
                              isLoading={syncMutation.isPending}
                            >
                              🔄 Sync
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDisable(integration.repo_id, integration.repo_name)}
                              isLoading={disableMutation.isPending}
                            >
                              Disable
                            </Button>
                          </div>
                        </div>
                      </StackItem>
                      <StackItem>
                        <div style={{ fontSize: "0.9em", color: "var(--pf-t--global--text--color--subtle)" }}>
                          <p>Repository ID: {integration.repo_id}</p>
                          {integration.github_slug && <p>GitHub: {integration.github_slug}</p>}
                          {integration.last_synced && (
                            <p>Last synced: {new Date(integration.last_synced).toLocaleString()}</p>
                          )}
                          <p>Sync interval: {integration.sync_interval_minutes} minutes</p>
                        </div>
                      </StackItem>
                    </Stack>
                  </ListItem>
                ))}
              </List>
            )}
          </CardBody>
        </Card>
      </StackItem>

      {/* Add Integration Modal */}
      <Modal
        variant={ModalVariant.medium}
        title="Add CodeClimate Integration"
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        actions={[
          <Button
            key="add"
            variant="primary"
            onClick={handleEnable}
            isLoading={enableMutation.isPending}
            isDisabled={!selectedRepoId}
          >
            Enable Integration
          </Button>,
          <Button
            key="cancel"
            variant="link"
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>,
        ]}
      >
        <Form>
          <FormGroup label="Select Repository" isRequired fieldId="repo-select">
            <Select
              id="repo-select"
              isOpen={isRepoSelectOpen}
              selected={selectedRepoId}
              onSelect={(_event, value) => {
                setSelectedRepoId(value as string);
                setIsRepoSelectOpen(false);
              }}
              onOpenChange={(isOpen) => setIsRepoSelectOpen(isOpen)}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsRepoSelectOpen(!isRepoSelectOpen)}
                  isExpanded={isRepoSelectOpen}
                  style={{ width: "100%" }}
                >
                  {selectedRepoId
                    ? repos.find((r: any) => r.id === selectedRepoId)?.name || selectedRepoId
                    : "Choose a repository"}
                </MenuToggle>
              )}
            >
              <SelectList>
                {repos.map((repo: any) => (
                  <SelectOption key={repo.id} value={repo.id}>
                    {repo.name} ({repo.slug})
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>

          <FormGroup fieldId="auto-sync">
            <Switch
              id="auto-sync"
              label="Enable automatic syncing"
              isChecked={autoSync}
              onChange={(_event, checked) => setAutoSync(checked)}
            />
          </FormGroup>

          {autoSync && (
            <FormGroup
              label="Sync Interval (minutes)"
              fieldId="sync-interval"
              helperText="How often to sync quality metrics from CodeClimate"
            >
              <input
                type="number"
                id="sync-interval"
                value={syncInterval}
                onChange={(e) => setSyncInterval(parseInt(e.target.value) || 60)}
                min="15"
                max="1440"
                className="pf-v6-c-form-control"
              />
            </FormGroup>
          )}
        </Form>
      </Modal>
    </Stack>
  );
}
