/**
 * Scan Directories Tab
 * Manage scan directory configuration
 */

import { useState, useEffect } from "react";
import {
  Stack,
  StackItem,
  Button,
  Card,
  CardBody,
  Grid,
  GridItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Form,
  FormGroup,
  TextInput,
  Checkbox,
  NumberInput,
  Spinner,
  TreeView,
  TreeViewDataItem,
} from "@patternfly/react-core";
import { PlusIcon, TrashIcon, FolderIcon, FolderOpenIcon } from "@patternfly/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Git2JiraConfig, ScanDirectory } from "../../api/types";
import { addScanDirectory, removeScanDirectory, getDirectoryTree, DirectoryTreeEntry } from "../../api/client";

interface ScanDirectoriesTabProps {
  config: Git2JiraConfig;
}

function buildTreeData(entries: DirectoryTreeEntry[]): TreeViewDataItem[] {
  return entries.map((entry) => ({
    name: (
      <span>
        {entry.name}
        {entry.is_git_repo && (
          <Label color="blue" isCompact style={{ marginLeft: 8 }}>
            git repo
          </Label>
        )}
      </span>
    ),
    id: entry.path,
    icon: entry.is_git_repo ? <FolderOpenIcon /> : <FolderIcon />,
    children: entry.children.length > 0 ? buildTreeData(entry.children) : undefined,
    defaultExpanded: false,
  }));
}

export function ScanDirectoriesTab({ config }: ScanDirectoriesTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newRecursive, setNewRecursive] = useState(true);
  const [newMaxDepth, setNewMaxDepth] = useState(3);
  const [treeData, setTreeData] = useState<TreeViewDataItem[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState("");
  const queryClient = useQueryClient();

  // Debounced directory tree preview
  useEffect(() => {
    if (!newPath || newPath.length < 2) {
      setTreeData([]);
      setTreeError("");
      return;
    }

    const timer = setTimeout(async () => {
      setTreeLoading(true);
      setTreeError("");
      try {
        const result = await getDirectoryTree(newPath, 2);
        setTreeData(buildTreeData(result.children));
      } catch {
        setTreeData([]);
        setTreeError("Directory not found or not accessible");
      } finally {
        setTreeLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newPath]);

  const addMutation = useMutation({
    mutationFn: addScanDirectory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      setIsAddModalOpen(false);
      setNewPath("");
      setNewRecursive(true);
      setNewMaxDepth(3);
      setTreeData([]);
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeScanDirectory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
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
                        {" \u2022 "}
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
                        variant="link"
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
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      >
        <ModalHeader title="Add Scan Directory" />
        <ModalBody>
          <Form>
            <FormGroup label="Directory Path" isRequired fieldId="path">
              <TextInput
                id="path"
                value={newPath}
                onChange={(_e, value) => setNewPath(value)}
                placeholder="~/repos or /path/to/repos"
              />
            </FormGroup>

            {/* Directory Tree Preview */}
            {newPath && (
              <FormGroup label="Directory Contents" fieldId="tree-preview">
                {treeLoading ? (
                  <div style={{ padding: "0.5rem" }}>
                    <Spinner size="md" /> Loading...
                  </div>
                ) : treeError ? (
                  <div style={{ padding: "0.5rem", color: "var(--pf-t--global--color--status--danger--default)", fontSize: "0.875rem" }}>
                    {treeError}
                  </div>
                ) : treeData.length > 0 ? (
                  <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid var(--pf-t--global--border--color--default)", borderRadius: 4, padding: "0.5rem" }}>
                    <TreeView data={treeData} />
                  </div>
                ) : newPath.length >= 2 ? (
                  <div style={{ padding: "0.5rem", color: "var(--pf-t--global--text--color--subtle)", fontSize: "0.875rem" }}>
                    No subdirectories found
                  </div>
                ) : null}
              </FormGroup>
            )}

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
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleAdd}
            isDisabled={!newPath}
            isLoading={addMutation.isPending}
          >
            Add Directory
          </Button>
          <Button variant="link" onClick={() => setIsAddModalOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
