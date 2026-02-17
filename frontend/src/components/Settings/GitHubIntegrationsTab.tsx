/**
 * GitHub Integrations Tab
 * Manage GitHub integration settings for repositories
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
  TextInput,
  Button,
  Alert,
  AlertActionCloseButton,
  Switch,
  Label,
  List,
  ListItem,
  Spinner,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  getGitHubIntegrations,
  enableGitHubIntegration,
  disableGitHubIntegration,
  syncGitHubData,
  checkGitHubConnection,
} from "../../api/client";

export function GitHubIntegrationsTab() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [repoPath, setRepoPath] = useState("");
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [autoDetect, setAutoDetect] = useState(true);
  const [githubToken, setGithubToken] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch GitHub integrations
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ["github-integrations"],
    queryFn: getGitHubIntegrations,
  });

  // Check GitHub connection
  const { data: connectionStatus, isLoading: connectionLoading } = useQuery({
    queryKey: ["github-health"],
    queryFn: checkGitHubConnection,
    retry: false,
  });

  // Enable integration mutation
  const enableMutation = useMutation({
    mutationFn: enableGitHubIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-integrations"] });
      setSuccessMessage("GitHub integration enabled successfully!");
      setShowAddModal(false);
      resetForm();
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to enable GitHub integration");
    },
  });

  // Disable integration mutation
  const disableMutation = useMutation({
    mutationFn: disableGitHubIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-integrations"] });
      setSuccessMessage("GitHub integration disabled successfully!");
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to disable GitHub integration");
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: syncGitHubData,
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["github-integrations"] });
      setSuccessMessage(
        `Synced ${result.prs_synced} PRs for ${result.repo_name}`
      );
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to sync GitHub data");
    },
  });

  const resetForm = () => {
    setRepoPath("");
    setGithubOwner("");
    setGithubRepo("");
    setAutoDetect(true);
  };

  const handleEnable = () => {
    const request: any = {
      repo_path: repoPath,
      sync_enabled: true,
    };

    if (!autoDetect) {
      request.github_owner = githubOwner;
      request.github_repo = githubRepo;
    }

    enableMutation.mutate(request);
  };

  const handleDisable = (repoPath: string) => {
    if (confirm(`Disable GitHub integration for ${repoPath}?`)) {
      disableMutation.mutate(repoPath);
    }
  };

  const handleSync = (repoPath: string) => {
    syncMutation.mutate(repoPath);
  };

  if (connectionLoading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Spinner size="lg" />
        <p style={{ marginTop: "1rem", color: "var(--pf-t--global--text--color--subtle)" }}>
          Checking GitHub connection...
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
          <CardTitle>🔗 GitHub Connection Status</CardTitle>
          <CardBody>
            {connectionStatus?.connected ? (
              <Alert variant="success" title="GitHub Connected" isInline>
                <p>
                  Connected as <strong>{connectionStatus.username}</strong> ({connectionStatus.email})
                </p>
              </Alert>
            ) : (
              <>
                <Alert variant="warning" title="GitHub Not Connected" isInline>
                  <p>
                    A GitHub personal access token is required to enable GitHub integration.
                  </p>
                  {connectionStatus?.error && (
                    <p style={{ marginTop: "0.5rem", fontSize: "0.9em" }}>
                      Error: {connectionStatus.error}
                    </p>
                  )}
                </Alert>
                <Form style={{ marginTop: "1rem" }}>
                  <FormGroup label="GitHub Token" fieldId="github-token">
                    <TextInput
                      id="github-token"
                      type="password"
                      value={githubToken}
                      onChange={(_event, value) => setGithubToken(value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    />
                    <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                      Set GITHUB_TOKEN in your environment or ~/.git2jira.env to persist across restarts.
                    </div>
                  </FormGroup>
                </Form>
              </>
            )}
          </CardBody>
        </Card>
      </StackItem>

      {/* Enabled Integrations */}
      <StackItem>
        <Card>
          <CardTitle>
            📦 Enabled GitHub Integrations
            <Button
              variant="primary"
              style={{ float: "right" }}
              onClick={() => setShowAddModal(true)}
              isDisabled={!connectionStatus?.connected}
            >
              Link Repository
            </Button>
          </CardTitle>
          <CardBody>
            {integrationsLoading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Spinner size="md" />
              </div>
            ) : integrations.length === 0 ? (
              <p style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
                No GitHub integrations configured. Click "Link Repository" to get started.
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
                            {integration.github_owner && integration.github_repo && (
                              <Label color="blue" style={{ marginLeft: "0.5rem" }}>
                                {integration.github_owner}/{integration.github_repo}
                              </Label>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleSync(integration.repo_path)}
                              isLoading={syncMutation.isPending}
                            >
                              🔄 Sync
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDisable(integration.repo_path)}
                              isLoading={disableMutation.isPending}
                            >
                              Disable
                            </Button>
                          </div>
                        </div>
                      </StackItem>
                      <StackItem>
                        <div style={{ fontSize: "0.9em", color: "var(--pf-t--global--text--color--subtle)" }}>
                          <p>Path: {integration.repo_path}</p>
                          {integration.last_synced && (
                            <p>Last synced: {new Date(integration.last_synced).toLocaleString()}</p>
                          )}
                          {integration.metadata?.stars !== undefined && (
                            <p>⭐ {integration.metadata.stars} stars • 🍴 {integration.metadata.forks} forks</p>
                          )}
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

      {/* Link Repository Modal */}
      <Modal
        variant={ModalVariant.medium}
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <ModalHeader title="Link Local Repository to GitHub" />
        <ModalBody>
          <Form>
            <FormGroup label="Repository Path" isRequired fieldId="repo-path">
              <TextInput
                id="repo-path"
                value={repoPath}
                onChange={(_event, value) => setRepoPath(value)}
                placeholder="/path/to/your/repo"
              />
            </FormGroup>

            <FormGroup fieldId="auto-detect">
              <Switch
                id="auto-detect"
                label="Auto-detect GitHub repository from git remote"
                isChecked={autoDetect}
                onChange={(_event, checked) => setAutoDetect(checked)}
              />
            </FormGroup>

            {!autoDetect && (
              <>
                <FormGroup label="GitHub Owner" isRequired fieldId="github-owner">
                  <TextInput
                    id="github-owner"
                    value={githubOwner}
                    onChange={(_event, value) => setGithubOwner(value)}
                    placeholder="octocat"
                  />
                </FormGroup>

                <FormGroup label="GitHub Repository" isRequired fieldId="github-repo">
                  <TextInput
                    id="github-repo"
                    value={githubRepo}
                    onChange={(_event, value) => setGithubRepo(value)}
                    placeholder="hello-world"
                  />
                </FormGroup>
              </>
            )}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleEnable}
            isLoading={enableMutation.isPending}
          >
            Link Repository
          </Button>
          <Button
            variant="link"
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </Stack>
  );
}
