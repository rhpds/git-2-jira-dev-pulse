/**
 * Jira Settings Tab
 * Manage Jira project and board configuration
 */

import { useState } from 'react';
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
  ModalVariant,
  Grid,
  GridItem,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { PlusIcon, TrashIcon, CheckIcon } from '@patternfly/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConfig, updateJiraConfig } from '../../api/client';

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
      default: config.jira.projects.length === 0, // First project is default
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

  const jiraConfig = config?.jira;

  return (
    <>
      <Grid hasGutter>
        <GridItem>
          <Alert
            variant={AlertVariant.info}
            title="Jira Integration"
            style={{ marginBottom: '1rem' }}
          >
            Configure your Jira projects and boards for seamless ticket creation and tracking.
          </Alert>
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
                  {jiraConfig.projects.map((project) => (
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
                  ))}
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
        title="Add Jira Project"
        isOpen={isAddProjectModalOpen}
        onClose={() => {
          setIsAddProjectModalOpen(false);
          resetForm();
        }}
        actions={[
          <Button
            key="add"
            variant="primary"
            onClick={handleAddProject}
            isDisabled={!projectKey || !projectName}
          >
            Add Project
          </Button>,
          <Button
            key="cancel"
            variant="link"
            onClick={() => {
              setIsAddProjectModalOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>,
        ]}
      >
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
      </Modal>
    </>
  );
}
