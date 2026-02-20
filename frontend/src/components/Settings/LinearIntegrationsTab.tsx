/**
 * Linear Integrations Tab
 * Manage Linear integration settings for teams
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
  getLinearTeams,
  getLinearIntegrations,
  enableLinearIntegration,
  disableLinearIntegration,
  syncLinearData,
  checkLinearConnection,
} from "../../api/client";

export function LinearIntegrationsTab() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(30);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isTeamSelectOpen, setIsTeamSelectOpen] = useState(false);

  // Fetch Linear integrations
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ["linear-integrations"],
    queryFn: getLinearIntegrations,
  });

  // Check Linear connection
  const { data: connectionStatus, isLoading: connectionLoading } = useQuery({
    queryKey: ["linear-health"],
    queryFn: checkLinearConnection,
    retry: false,
  });

  // Fetch teams (only when connected)
  const { data: teams = [] } = useQuery({
    queryKey: ["linear-teams"],
    queryFn: getLinearTeams,
    enabled: !!connectionStatus?.connected,
    retry: false,
  });

  // Enable integration mutation
  const enableMutation = useMutation({
    mutationFn: enableLinearIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linear-integrations"] });
      setSuccessMessage("Linear integration enabled successfully!");
      setShowAddModal(false);
      resetForm();
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to enable Linear integration");
    },
  });

  // Disable integration mutation
  const disableMutation = useMutation({
    mutationFn: disableLinearIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linear-integrations"] });
      setSuccessMessage("Linear integration disabled successfully!");
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to disable Linear integration");
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: syncLinearData,
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["linear-integrations"] });
      setSuccessMessage(
        `Synced ${result.issues_synced} issues for ${result.team_name}`
      );
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to sync Linear data");
    },
  });

  const resetForm = () => {
    setSelectedTeamId("");
    setAutoSync(true);
    setSyncInterval(30);
  };

  const handleEnable = () => {
    if (!selectedTeamId) {
      setErrorMessage("Please select a team");
      return;
    }

    const selectedTeam = teams.find((t: any) => t.id === selectedTeamId);
    enableMutation.mutate({
      team_id: selectedTeamId,
      team_name: selectedTeam?.name,
      team_key: selectedTeam?.key,
      auto_sync: autoSync,
      sync_interval_minutes: syncInterval,
    });
  };

  const handleDisable = (teamId: string, teamName: string) => {
    if (confirm(`Disable Linear integration for ${teamName}?`)) {
      disableMutation.mutate(teamId);
    }
  };

  const handleSync = (teamId: string) => {
    syncMutation.mutate(teamId);
  };

  if (connectionLoading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Spinner size="lg" />
        <p style={{ marginTop: "1rem", color: "var(--pf-t--global--text--color--subtle)" }}>
          Checking Linear connection...
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
          <CardTitle>🔗 Linear Connection Status</CardTitle>
          <CardBody>
            {connectionStatus?.connected ? (
              <Alert variant="success" title="Linear Connected" isInline>
                <p>
                  Connected as <strong>{connectionStatus.display_name || connectionStatus.name}</strong> ({connectionStatus.email})
                </p>
              </Alert>
            ) : (
              <Alert variant="warning" title="Linear Not Connected" isInline>
                <p>
                  Set LINEAR_API_KEY environment variable to enable Linear integration.
                </p>
                <p style={{ marginTop: "0.5rem", fontSize: "0.9em" }}>
                  Get your API key from: <a href="https://linear.app/settings/api" target="_blank" rel="noopener noreferrer">linear.app/settings/api</a>
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
            📋 Enabled Linear Integrations
            <Button
              variant="primary"
              style={{ float: "right" }}
              onClick={() => setShowAddModal(true)}
              isDisabled={!connectionStatus?.connected}
            >
              + Add Team
            </Button>
          </CardTitle>
          <CardBody>
            {integrationsLoading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Spinner size="md" />
              </div>
            ) : integrations.length === 0 ? (
              <p style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
                No Linear integrations configured. Click "Add Team" to get started.
              </p>
            ) : (
              <List isPlain isBordered>
                {integrations.map((integration: any) => (
                  <ListItem key={integration.id}>
                    <Stack hasGutter>
                      <StackItem>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong>{integration.team_name}</strong>
                            <Label color="blue" style={{ marginLeft: "0.5rem" }}>
                              {integration.team_key}
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
                              onClick={() => handleSync(integration.team_id)}
                              isLoading={syncMutation.isPending}
                            >
                              🔄 Sync
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDisable(integration.team_id, integration.team_name)}
                              isLoading={disableMutation.isPending}
                            >
                              Disable
                            </Button>
                          </div>
                        </div>
                      </StackItem>
                      <StackItem>
                        <div style={{ fontSize: "0.9em", color: "var(--pf-t--global--text--color--subtle)" }}>
                          <p>Team ID: {integration.team_id}</p>
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
        title="Add Linear Integration"
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
            isDisabled={!selectedTeamId}
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
          <FormGroup label="Select Team" isRequired fieldId="team-select">
            <Select
              id="team-select"
              isOpen={isTeamSelectOpen}
              selected={selectedTeamId}
              onSelect={(_event, value) => {
                setSelectedTeamId(value as string);
                setIsTeamSelectOpen(false);
              }}
              onOpenChange={(isOpen) => setIsTeamSelectOpen(isOpen)}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsTeamSelectOpen(!isTeamSelectOpen)}
                  isExpanded={isTeamSelectOpen}
                  style={{ width: "100%" }}
                >
                  {selectedTeamId
                    ? teams.find((t: any) => t.id === selectedTeamId)?.name || selectedTeamId
                    : "Choose a team"}
                </MenuToggle>
              )}
            >
              <SelectList>
                {teams.map((team: any) => (
                  <SelectOption key={team.id} value={team.id}>
                    {team.name} ({team.key})
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
              helperText="How often to sync issues from Linear"
            >
              <input
                type="number"
                id="sync-interval"
                value={syncInterval}
                onChange={(e) => setSyncInterval(parseInt(e.target.value) || 30)}
                min="5"
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
