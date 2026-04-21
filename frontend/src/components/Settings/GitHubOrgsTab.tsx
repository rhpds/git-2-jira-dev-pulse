/**
 * GitHub Orgs Tab
 * Browse GitHub organizations and add repositories from them
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
  Label,
  Spinner,
  DataList,
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  DataListCell,
  DataListAction,
  Modal,
  ModalVariant,
  List,
  ListItem,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  listGitHubOrgs,
  addGitHubOrg,
  removeGitHubOrg,
  listOrgRepos,
  addRepoFromGitHub,
  type GitHubOrgInfo,
  type GitHubOrgRepo,
} from "../../api/client";

export function GitHubOrgsTab() {
  const queryClient = useQueryClient();
  const [orgInput, setOrgInput] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [showReposModal, setShowReposModal] = useState(false);

  // Fetch tracked orgs
  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["github-orgs"],
    queryFn: listGitHubOrgs,
  });

  // Fetch repos for selected org
  const { data: orgRepos = [], isLoading: reposLoading } = useQuery({
    queryKey: ["org-repos", selectedOrg],
    queryFn: () => listOrgRepos(selectedOrg!),
    enabled: !!selectedOrg,
  });

  // Add org mutation
  const addOrgMutation = useMutation({
    mutationFn: addGitHubOrg,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["github-orgs"] });
      setSuccessMessage(`Added organization: ${data.org_login}`);
      setOrgInput("");
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to add GitHub organization");
    },
  });

  // Add repo mutation
  const addRepoMutation = useMutation({
    mutationFn: ({ owner, repo }: { owner: string; repo: string }) =>
      addRepoFromGitHub(owner, repo),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["org-repos", selectedOrg] });
      queryClient.invalidateQueries({ queryKey: ["github-integrations"] });
      setSuccessMessage(`Added repository: ${data.full_name}`);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to add repository");
    },
  });

  // Remove org mutation
  const removeOrgMutation = useMutation({
    mutationFn: removeGitHubOrg,
    onSuccess: (_, orgLogin) => {
      queryClient.invalidateQueries({ queryKey: ["github-orgs"] });
      setSuccessMessage(`Removed organization: ${orgLogin}`);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to remove organization");
    },
  });

  const handleAdd = () => {
    if (!orgInput.trim()) return;

    // Strip https://github.com/ prefix if present
    let cleaned = orgInput.trim();
    if (cleaned.startsWith("https://github.com/")) {
      cleaned = cleaned.replace("https://github.com/", "");
    }
    if (cleaned.startsWith("http://github.com/")) {
      cleaned = cleaned.replace("http://github.com/", "");
    }

    // If it contains /, treat as owner/repo
    if (cleaned.includes("/")) {
      const [owner, repo] = cleaned.split("/");
      if (owner && repo) {
        addRepoMutation.mutate({ owner, repo });
      } else {
        setErrorMessage("Invalid repository format. Use: owner/repo");
      }
    } else {
      // Treat as org name
      addOrgMutation.mutate(cleaned);
    }
  };

  const handleBrowseRepos = (orgLogin: string) => {
    setSelectedOrg(orgLogin);
    setShowReposModal(true);
  };

  const handleAddRepoFromModal = (repo: GitHubOrgRepo) => {
    const [owner, name] = repo.full_name.split("/");
    addRepoMutation.mutate({ owner, name });
  };

  const handleRemoveOrg = (orgLogin: string) => {
    if (confirm(`Remove organization ${orgLogin} from tracking?`)) {
      removeOrgMutation.mutate(orgLogin);
    }
  };

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

      {/* Info Alert */}
      <StackItem>
        <Alert variant="info" title="GitHub Organization Discovery" isInline>
          <p>
            Track GitHub organizations or add individual repositories. Enter an org name (e.g., "rhpds")
            or a repository path (e.g., "redhat-cop/agnosticd").
          </p>
        </Alert>
      </StackItem>

      {/* Add Org/Repo Form */}
      <StackItem>
        <Card>
          <CardTitle>Add Organization or Repository</CardTitle>
          <CardBody>
            <Form>
              <FormGroup label="Organization or Repository" fieldId="org-input">
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <TextInput
                    id="org-input"
                    value={orgInput}
                    onChange={(_event, value) => setOrgInput(value)}
                    placeholder="rhpds or owner/repo"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAdd();
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    onClick={handleAdd}
                    isLoading={addOrgMutation.isPending || addRepoMutation.isPending}
                    isDisabled={!orgInput.trim()}
                  >
                    Add
                  </Button>
                </div>
              </FormGroup>
            </Form>
          </CardBody>
        </Card>
      </StackItem>

      {/* Tracked Organizations */}
      <StackItem>
        <Card>
          <CardTitle>Tracked Organizations</CardTitle>
          <CardBody>
            {orgsLoading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Spinner size="md" />
              </div>
            ) : orgs.length === 0 ? (
              <p style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
                No organizations tracked yet. Add one above to browse its repositories.
              </p>
            ) : (
              <DataList aria-label="Tracked GitHub organizations">
                {orgs.map((org: GitHubOrgInfo) => (
                  <DataListItem key={org.id} aria-labelledby={`org-${org.id}`}>
                    <DataListItemRow>
                      <DataListItemCells
                        dataListCells={[
                          <DataListCell key="primary">
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                              {org.avatar_url && (
                                <img
                                  src={org.avatar_url}
                                  alt={org.org_login}
                                  style={{ width: "40px", height: "40px", borderRadius: "4px" }}
                                />
                              )}
                              <div>
                                <div>
                                  <strong>{org.display_name || org.org_login}</strong>
                                  {org.org_login !== org.display_name && (
                                    <Label color="grey" style={{ marginLeft: "0.5rem" }}>
                                      @{org.org_login}
                                    </Label>
                                  )}
                                </div>
                                {org.description && (
                                  <div style={{ fontSize: "0.9em", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                                    {org.description}
                                  </div>
                                )}
                                <div style={{ fontSize: "0.85em", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                                  {org.public_repos !== null && `${org.public_repos} public repos`}
                                  {org.last_synced && ` • Last synced: ${new Date(org.last_synced).toLocaleString()}`}
                                </div>
                              </div>
                            </div>
                          </DataListCell>,
                        ]}
                      />
                      <DataListAction
                        id={`actions-${org.id}`}
                        aria-labelledby={`org-${org.id} actions-${org.id}`}
                        aria-label="Actions"
                      >
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleBrowseRepos(org.org_login)}
                          >
                            Browse Repos
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveOrg(org.org_login)}
                            isLoading={removeOrgMutation.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                      </DataListAction>
                    </DataListItemRow>
                  </DataListItem>
                ))}
              </DataList>
            )}
          </CardBody>
        </Card>
      </StackItem>

      {/* Browse Repos Modal */}
      <Modal
        variant={ModalVariant.large}
        title={`Browse Repositories - ${selectedOrg}`}
        isOpen={showReposModal}
        onClose={() => {
          setShowReposModal(false);
          setSelectedOrg(null);
        }}
      >
        {reposLoading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <Spinner size="lg" />
            <p style={{ marginTop: "1rem", color: "var(--pf-t--global--text--color--subtle)" }}>
              Loading repositories...
            </p>
          </div>
        ) : orgRepos.length === 0 ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--pf-t--global--text--color--subtle)" }}>
            No repositories found for this organization.
          </p>
        ) : (
          <List isPlain isBordered>
            {orgRepos.map((repo: GitHubOrgRepo) => (
              <ListItem key={repo.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div>
                      <strong>{repo.name}</strong>
                      {repo.private && (
                        <Label color="gold" style={{ marginLeft: "0.5rem" }}>
                          Private
                        </Label>
                      )}
                      {repo.is_added && (
                        <Label color="green" style={{ marginLeft: "0.5rem" }}>
                          Added
                        </Label>
                      )}
                    </div>
                    {repo.description && (
                      <div style={{ fontSize: "0.9em", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                        {repo.description}
                      </div>
                    )}
                    <div style={{ fontSize: "0.85em", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                      {repo.language && `${repo.language} • `}
                      {repo.stars} stars • {repo.forks} forks • {repo.open_issues} issues
                      {repo.pushed_at && ` • Updated ${new Date(repo.pushed_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAddRepoFromModal(repo)}
                    isLoading={addRepoMutation.isPending}
                    isDisabled={repo.is_added}
                  >
                    {repo.is_added ? "Added" : "Add"}
                  </Button>
                </div>
              </ListItem>
            ))}
          </List>
        )}
      </Modal>
    </Stack>
  );
}
