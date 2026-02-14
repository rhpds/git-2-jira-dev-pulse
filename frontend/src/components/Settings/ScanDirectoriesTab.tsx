/**
 * Scan Directories Tab
 * Manage scan directory configuration
 */

import { useState } from "react";
import {
  Stack,
  StackItem,
  Button,
  Card,
  CardBody,
  Grid,
  GridItem,
  Switch,
  Label,
  Modal,
  ModalVariant,
  Form,
  FormGroup,
  TextInput,
  Checkbox,
  NumberInput,
} from "@patternfly/react-core";
import { PlusIcon, TrashIcon } from "@patternfly/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Git2JiraConfig, ScanDirectory } from "../../api/types";
import { addScanDirectory, removeScanDirectory } from "../../api/client";

interface ScanDirectoriesTabProps {
  config: Git2JiraConfig;
}

export function ScanDirectoriesTab({ config }: ScanDirectoriesTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newRecursive, setNewRecursive] = useState(false);
  const [newMaxDepth, setNewMaxDepth] = useState(3);
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: addScanDirectory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      setIsAddModalOpen(false);
      setNewPath("");
      setNewRecursive(false);
      setNewMaxDepth(3);
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeScanDirectory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });

  const handleAdd = () => {
    const scanDir: ScanDirectory = {
      path: newPath,
      enabled: true,
      recursive: newRecursive,
      max_depth: newMaxDepth,
      exclude_patterns: ["node_modules", ".venv", ".git", "__pycache__"],
      exclude_folders: [],
    };
    addMutation.mutate(scanDir);
  };

  return (
    <>
      <Stack hasGutter style={{ marginTop: "1rem" }}>
        <StackItem>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3>Scan Directories ({config.scan_directories.length})</h3>
              <p style={{ color: "var(--pf-t--global--text--color--subtle)", fontSize: "0.875rem" }}>
                Configure directories to scan for git repositories
              </p>
            </div>
            <Button
              variant="primary"
              icon={<PlusIcon />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Directory
            </Button>
          </div>
        </StackItem>

        {config.scan_directories.map((dir, index) => (
          <StackItem key={index}>
            <Card>
              <CardBody>
                <Grid hasGutter>
                  <GridItem span={8}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: "0.5rem" }}>
                        {dir.path}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                        {dir.recursive ? `Recursive (depth: ${dir.max_depth})` : "Non-recursive"}
                        {" • "}
                        {dir.exclude_patterns.length} exclusion patterns
                      </div>
                    </div>
                  </GridItem>
                  <GridItem span={4} style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", alignItems: "center" }}>
                      <Label color={dir.enabled ? "green" : "grey"}>
                        {dir.enabled ? "Enabled" : "Disabled"}
                      </Label>
                      <Button
                        variant="danger"
                        isDanger
                        icon={<TrashIcon />}
                        onClick={() => removeMutation.mutate(dir.path)}
                        isLoading={removeMutation.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  </GridItem>
                </Grid>
              </CardBody>
            </Card>
          </StackItem>
        ))}

        {config.scan_directories.length === 0 && (
          <StackItem>
            <Card>
              <CardBody style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--pf-t--global--text--color--subtle)" }}>
                  No scan directories configured. Add one to get started.
                </p>
              </CardBody>
            </Card>
          </StackItem>
        )}
      </Stack>

      {/* Add Directory Modal */}
      <Modal
        variant={ModalVariant.medium}
        title="Add Scan Directory"
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        actions={[
          <Button
            key="add"
            variant="primary"
            onClick={handleAdd}
            isDisabled={!newPath}
            isLoading={addMutation.isPending}
          >
            Add Directory
          </Button>,
          <Button key="cancel" variant="link" onClick={() => setIsAddModalOpen(false)}>
            Cancel
          </Button>,
        ]}
      >
        <Form>
          <FormGroup label="Directory Path" isRequired fieldId="path">
            <TextInput
              id="path"
              value={newPath}
              onChange={(_e, value) => setNewPath(value)}
              placeholder="~/repos or /path/to/repos"
            />
          </FormGroup>

          <FormGroup label="Scan Settings" fieldId="recursive">
            <Checkbox
              id="recursive"
              label="Recursive scanning"
              isChecked={newRecursive}
              onChange={(_e, checked) => setNewRecursive(checked)}
            />
          </FormGroup>

          {newRecursive && (
            <FormGroup label="Maximum Depth" fieldId="max-depth">
              <NumberInput
                value={newMaxDepth}
                min={1}
                max={10}
                onMinus={() => setNewMaxDepth(Math.max(1, newMaxDepth - 1))}
                onPlus={() => setNewMaxDepth(Math.min(10, newMaxDepth + 1))}
                onChange={(e) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  if (!isNaN(val)) setNewMaxDepth(Math.min(10, Math.max(1, val)));
                }}
                inputName="max-depth"
                inputAriaLabel="maximum depth"
                minusBtnAriaLabel="minus"
                plusBtnAriaLabel="plus"
              />
            </FormGroup>
          )}
        </Form>
      </Modal>
    </>
  );
}
