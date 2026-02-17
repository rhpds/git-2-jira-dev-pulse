/**
 * Jira Settings Tab
 * Manage Jira credentials, project and board configuration
 */

import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  ActionList,
  ActionListItem,
  Label,
  Switch,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Grid,
  GridItem,
  Alert,
  AlertVariant,
  Spinner,
  InputGroup,
  InputGroupItem,
} from '@patternfly/react-core';
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  LockIcon,
  PencilAltIcon,
  ExternalLinkAltIcon,
  PluggedIcon,
} from '@patternfly/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConfig,
  updateJiraConfig,
  getJiraCredentials,
  saveJiraCredentials,
  testJiraConnection,
} from '../../api/client';
import type { JiraCredentialsResponse, JiraTestResult } from '../../api/client';

export interface JiraBoard {
  id: number;
  name: string;
  type: 'kanban' | 'scrum';
}

export interface JiraProject {
  key: string;
  name: string;
  default: boolean;
  boards: JiraBoard[];
  custom_fields: Record<string, string>;
  enabled_issue_types: string[];
}

export interface JiraConfig {
  enabled: boolean;
  projects: JiraProject[];
  auto_link_commits: boolean;
  commit_message_pattern: string;
  auto_transition: boolean;
  transition_rules: Record<string, string>;
}

export function JiraSettingsTab() {
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig });
  const queryClient = useQueryClient();

  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<JiraProject | null>(null);

  // Form state for new/edit project
  const [projectKey, setProjectKey] = useState('');
  const [projectName, setProjectName] = useState('');

  // Credentials state
  const { data: savedCredentials, refetch: refetchCredentials } = useQuery({
    queryKey: ['jira-credentials'],
    queryFn: getJiraCredentials,
  });
  const [credUrl, setCredUrl] = useState('');
  const [credToken, setCredToken] = useState('');
  const [credEmail, setCredEmail] = useState('');
  const [credEditing, setCredEditing] = useState(false);
  const [credTestResult, setCredTestResult] = useState<JiraTestResult | null>(null);
  const [credSaving, setCredSaving] = useState(false);
  const [credTesting, setCredTesting] = useState(false);

  // Populate credential fields from saved data
  useEffect(() => {
    if (savedCredentials && !credEditing) {
      setCredUrl(savedCredentials.jira_url || '');
      setCredToken(savedCredentials.has_token ? savedCredentials.jira_api_token_masked : '');
      setCredEmail(savedCredentials.jira_email || '');
    }
  }, [savedCredentials, credEditing]);

  const updateJiraMutation = useMutation({
    mutationFn: updateJiraConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      setIsAddProjectModalOpen(false);
      setEditingProject(null);
      resetForm();
    },
  });

  const resetForm = () => {
    setProjectKey('');
    setProjectName('');
  };

  const handleAddProject = () => {
    if (!config || !projectKey || !projectName) return;

    const newProject: JiraProject = {
      key: projectKey.toUpperCase(),
      name: projectName,
      default: config.jira.projects.length === 0,
      boards: [],
      custom_fields: {},
      enabled_issue_types: ['Story', 'Task', 'Bug', 'Epic'],
    };

    const updatedJiraConfig = {
      ...config.jira,
      projects: [...config.jira.projects, newProject],
    };

    updateJiraMutation.mutate({ jira_config: updatedJiraConfig });
  };

  const handleRemoveProject = (projectKey: string) => {
    if (!config) return;

    const updatedJiraConfig = {
      ...config.jira,
      projects: config.jira.projects.filter((p) => p.key !== projectKey),
    };

    updateJiraMutation.mutate({ jira_config: updatedJiraConfig });
  };

  const handleSetDefault = (projectKey: string) => {
    if (!config) return;

    const updatedJiraConfig = {
      ...config.jira,
      projects: config.jira.projects.map((p) => ({
        ...p,
        default: p.key === projectKey,
      })),
    };

    updateJiraMutation.mutate({ jira_config: updatedJiraConfig });
  };

  const handleToggleEnabled = (enabled: boolean) => {
    if (!config) return;

    const updatedJiraConfig = {
      ...config.jira,
      enabled,
    };

    updateJiraMutation.mutate({ jira_config: updatedJiraConfig });
  };

  const handleStartEditing = () => {
    setCredEditing(true);
    setCredToken(''); // Clear masked token so user can type new one
    setCredTestResult(null);
  };

  const handleCancelEditing = () => {
    setCredEditing(false);
    setCredTestResult(null);
    // Reset to saved values
    if (savedCredentials) {
      setCredUrl(savedCredentials.jira_url || '');
      setCredToken(savedCredentials.has_token ? savedCredentials.jira_api_token_masked : '');
      setCredEmail(savedCredentials.jira_email || '');
    }
  };

  const handleSaveCredentials = async () => {
    setCredSaving(true);
    setCredTestResult(null);
    try {
      const result = await saveJiraCredentials({
        jira_url: credUrl,
        jira_api_token: credToken,
        jira_email: credEmail,
      });
      setCredTestResult(result.test_result);
      setCredEditing(false);
      refetchCredentials();
      // Refresh health status
      queryClient.invalidateQueries({ queryKey: ['health'] });
    } catch (err: any) {
      setCredTestResult({
        connected: false,
        user: '',
        email: '',
        server: credUrl,
        error: err?.message || 'Failed to save credentials',
      });
    } finally {
      setCredSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setCredTesting(true);
    setCredTestResult(null);
    try {
      const result = await testJiraConnection({
        jira_url: credUrl,
        jira_api_token: credToken,
        jira_email: credEmail,
      });
      setCredTestResult(result);
    } catch (err: any) {
      setCredTestResult({
        connected: false,
        user: '',
        email: '',
        server: credUrl,
        error: err?.message || 'Connection test failed',
      });
    } finally {
      setCredTesting(false);
    }
  };

  const jiraConfig = config?.jira;

  const buildJiraProjectUrl = (project: JiraProject) => {
    const baseUrl = savedCredentials?.jira_url || credUrl;
    if (!baseUrl) return null;
    return `${baseUrl}/projects/${project.key}/board`;
  };

  return (
    <>
      <Grid hasGutter>
        <GridItem>
          <Alert
            variant={AlertVariant.info}
            title="Jira Integration"
            style={{ marginBottom: '1rem' }}
          >
            Configure your Jira credentials and projects for seamless ticket creation and tracking.
          </Alert>
        </GridItem>

        {/* Jira Credentials Card */}
        <GridItem>
          <Card>
            <CardTitle>
              Jira Credentials
              {!credEditing && savedCredentials?.has_token && (
                <Button
                  variant="link"
                  icon={<PencilAltIcon />}
                  onClick={handleStartEditing}
                  style={{ float: 'right' }}
                >
                  Edit Credentials
                </Button>
              )}
            </CardTitle>
            <CardBody>
              <Form>
                <FormGroup label="Jira Server URL" isRequired fieldId="jira-url">
                  <TextInput
                    id="jira-url"
                    value={credUrl}
                    onChange={(_event, value) => setCredUrl(value)}
                    placeholder="https://issues.redhat.com"
                    isDisabled={!credEditing && savedCredentials?.has_token}
                  />
                </FormGroup>

                <FormGroup label="Email / Username" fieldId="jira-email">
                  <TextInput
                    id="jira-email"
                    value={credEmail}
                    onChange={(_event, value) => setCredEmail(value)}
                    placeholder="you@example.com"
                    isDisabled={!credEditing && savedCredentials?.has_token}
                  />
                </FormGroup>

                <FormGroup label="API Token" isRequired fieldId="jira-token">
                  <InputGroup>
                    <InputGroupItem isFill>
                      <TextInput
                        id="jira-token"
                        value={credToken}
                        onChange={(_event, value) => setCredToken(value)}
                        placeholder={credEditing ? 'Enter your Jira API token' : ''}
                        type={credEditing ? 'text' : 'password'}
                        isDisabled={!credEditing && savedCredentials?.has_token}
                      />
                    </InputGroupItem>
                    {!credEditing && savedCredentials?.has_token && (
                      <InputGroupItem>
                        <Button variant="plain" aria-label="Token is locked">
                          <LockIcon />
                        </Button>
                      </InputGroupItem>
                    )}
                  </InputGroup>
                  {!credEditing && savedCredentials?.has_token && (
                    <div style={{ marginTop: 4, fontSize: '0.85rem', color: 'var(--pf-t--global--text--color--subtle)' }}>
                      Token is stored securely in ~/.rh-jira-mcp.env (owner-only permissions)
                    </div>
                  )}
                </FormGroup>

                {/* Connection test result */}
                {credTestResult && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {credTestResult.connected ? (
                      <Alert variant={AlertVariant.success} title="Connection successful" isInline>
                        Connected as <strong>{credTestResult.user}</strong>
                        {credTestResult.email && <> ({credTestResult.email})</>}
                        {' '}to {credTestResult.server}
                      </Alert>
                    ) : (
                      <Alert variant={AlertVariant.danger} title="Connection failed" isInline>
                        {credTestResult.error || 'Unable to connect to Jira'}
                      </Alert>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  {credEditing ? (
                    <>
                      <Button
                        variant="primary"
                        onClick={handleSaveCredentials}
                        isLoading={credSaving}
                        isDisabled={!credUrl || !credToken || credSaving}
                      >
                        Save &amp; Test Connection
                      </Button>
                      <Button
                        variant="secondary"
                        icon={<PluggedIcon />}
                        onClick={handleTestConnection}
                        isLoading={credTesting}
                        isDisabled={!credUrl || !credToken || credTesting}
                      >
                        Test Only
                      </Button>
                      <Button variant="link" onClick={handleCancelEditing}>
                        Cancel
                      </Button>
                    </>
                  ) : !savedCredentials?.has_token ? (
                    <>
                      <Button
                        variant="primary"
                        onClick={handleSaveCredentials}
                        isLoading={credSaving}
                        isDisabled={!credUrl || !credToken || credSaving}
                      >
                        Save &amp; Test Connection
                      </Button>
                      <Button
                        variant="secondary"
                        icon={<PluggedIcon />}
                        onClick={handleTestConnection}
                        isLoading={credTesting}
                        isDisabled={!credUrl || !credToken || credTesting}
                      >
                        Test Only
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      icon={<PluggedIcon />}
                      onClick={handleTestConnection}
                      isLoading={credTesting}
                    >
                      Test Connection
                    </Button>
                  )}
                </div>
              </Form>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardTitle>General Settings</CardTitle>
            <CardBody>
              <Form>
                <FormGroup label="Enable Jira Integration">
                  <Switch
                    id="jira-enabled"
                    label="Enabled"
                    labelOff="Disabled"
                    isChecked={jiraConfig?.enabled ?? true}
                    onChange={(_event, enabled) => handleToggleEnabled(enabled)}
                  />
                </FormGroup>

                <FormGroup label="Auto-link Commits">
                  <Switch
                    id="auto-link-commits"
                    label="Automatically link commits with PROJ-123 to Jira tickets"
                    isChecked={jiraConfig?.auto_link_commits ?? true}
                    onChange={(_event, enabled) => {
                      if (config) {
                        updateJiraMutation.mutate({
                          jira_config: { ...config.jira, auto_link_commits: enabled },
                        });
                      }
                    }}
                  />
                </FormGroup>
              </Form>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardTitle>
              Jira Projects
              <Button
                variant="primary"
                icon={<PlusIcon />}
                onClick={() => setIsAddProjectModalOpen(true)}
                style={{ float: 'right' }}
              >
                Add Project
              </Button>
            </CardTitle>
            <CardBody>
              {jiraConfig?.projects && jiraConfig.projects.length > 0 ? (
                <ActionList>
                  {jiraConfig.projects.map((project) => {
                    const projectUrl = buildJiraProjectUrl(project);
                    return (
                      <ActionListItem key={project.key}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong>{project.key}</strong>
                              {project.default && (
                                <Label color="blue" icon={<CheckIcon />}>
                                  Default
                                </Label>
                              )}
                              {projectUrl && (
                                <a
                                  href={projectUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}
                                >
                                  Open in Jira <ExternalLinkAltIcon />
                                </a>
                              )}
                            </div>
                            <div style={{ color: 'var(--pf-t--global--text--color--subtle)', fontSize: '0.875rem' }}>
                              {project.name}
                            </div>
                            {project.boards.length > 0 && (
                              <div style={{ marginTop: '0.5rem' }}>
                                {project.boards.map((board) => (
                                  <Label key={board.id} color="purple" isCompact style={{ marginRight: '0.5rem' }}>
                                    {board.name} ({board.type})
                                  </Label>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {!project.default && (
                              <Button variant="link" onClick={() => handleSetDefault(project.key)}>
                                Set as Default
                              </Button>
                            )}
                            <Button
                              variant="link"
                              isDanger
                              icon={<TrashIcon />}
                              onClick={() => handleRemoveProject(project.key)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </ActionListItem>
                    );
                  })}
                </ActionList>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--pf-t--global--text--color--subtle)' }}>
                  No Jira projects configured. Click "Add Project" to get started.
                </div>
              )}
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Add Project Modal */}
      <Modal
        variant={ModalVariant.small}
        isOpen={isAddProjectModalOpen}
        onClose={() => {
          setIsAddProjectModalOpen(false);
          resetForm();
        }}
      >
        <ModalHeader title="Add Jira Project" />
        <ModalBody>
          <Form>
            <FormGroup label="Project Key" isRequired fieldId="project-key">
              <TextInput
                id="project-key"
                value={projectKey}
                onChange={(_event, value) => setProjectKey(value)}
                placeholder="e.g., TEAM, DEV, OPS"
              />
            </FormGroup>

            <FormGroup label="Project Name" isRequired fieldId="project-name">
              <TextInput
                id="project-name"
                value={projectName}
                onChange={(_event, value) => setProjectName(value)}
                placeholder="e.g., Team Project, Development"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleAddProject}
            isDisabled={!projectKey || !projectName}
          >
            Add Project
          </Button>
          <Button
            variant="link"
            onClick={() => {
              setIsAddProjectModalOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
