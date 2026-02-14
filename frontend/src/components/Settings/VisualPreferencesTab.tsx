/**
 * Visual Preferences Tab
 * Compact, easy-to-use theme and visual settings
 */

import { useState } from "react";
import {
  Stack,
  StackItem,
  Card,
  CardBody,
  Switch,
  Form,
  FormGroup,
  Grid,
  GridItem,
  Button,
  Modal,
  ModalVariant,
  TextArea,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { CheckCircleIcon, UploadIcon } from "@patternfly/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Git2JiraConfig, UIPreferences } from "../../api/types";
import { updateUIPreferences, listThemes, type ThemeSummary } from "../../api/client";
import { useTheme } from "../../context/ThemeContext";

interface VisualPreferencesTabProps {
  config: Git2JiraConfig;
}

export function VisualPreferencesTab({ config }: VisualPreferencesTabProps) {
  const queryClient = useQueryClient();
  const { currentTheme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<UIPreferences>(config.ui);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [customThemeYAML, setCustomThemeYAML] = useState("");

  // Load all themes
  const { data: themes = [] } = useQuery({
    queryKey: ["themes"],
    queryFn: () => listThemes(),
  });

  const updateMutation = useMutation({
    mutationFn: updateUIPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });

  const handleUpdate = (updates: Partial<UIPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    updateMutation.mutate(newPreferences);
  };

  const handleThemeSelect = async (themeId: string) => {
    // setTheme already updates the config, so we don't need handleUpdate
    await setTheme(themeId);
    // Invalidate config query to refresh UI
    queryClient.invalidateQueries({ queryKey: ["config"] });
  };

  // Compact theme card component
  const ThemeCard = ({ theme }: { theme: ThemeSummary }) => {
    const isSelected = currentTheme === theme.id;

    return (
      <Card
        isCompact
        isClickable
        isSelected={isSelected}
        onClick={() => handleThemeSelect(theme.id)}
        style={{
          border: isSelected ? "2px solid var(--pf-t--global--color--brand--default)" : undefined,
          cursor: "pointer",
          minHeight: "80px",
        }}
      >
        <CardBody>
          <Flex direction={{ default: "column" }} spaceItems={{ default: "spaceItemsNone" }}>
            <FlexItem>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {isSelected && <CheckCircleIcon color="var(--pf-t--global--color--brand--default)" size="sm" />}
                <strong style={{ fontSize: "0.875rem" }}>{theme.name}</strong>
              </div>
            </FlexItem>
            <FlexItem>
              <div style={{
                fontSize: "0.75rem",
                color: "var(--pf-t--global--text--color--subtle)",
                marginTop: "0.25rem",
                lineHeight: "1.2"
              }}>
                {theme.description}
              </div>
            </FlexItem>
          </Flex>
        </CardBody>
      </Card>
    );
  };

  return (
    <Stack hasGutter style={{ marginTop: "1rem", maxWidth: "1200px" }}>
      {/* Quick Settings at top */}
      <StackItem>
        <Card isCompact>
          <CardBody>
            <Grid hasGutter>
              <GridItem span={4}>
                <Flex alignItems={{ default: "alignItemsCenter" }} spaceItems={{ default: "spaceItemsSm" }}>
                  <FlexItem>
                    <Switch
                      id="animations-toggle"
                      isChecked={preferences.animations_enabled}
                      onChange={(_e, checked) => handleUpdate({ animations_enabled: checked })}
                      isDisabled={updateMutation.isPending}
                      aria-label="Enable animations"
                    />
                  </FlexItem>
                  <FlexItem>
                    <strong>Animations</strong>
                  </FlexItem>
                </Flex>
              </GridItem>
              <GridItem span={4}>
                <Flex alignItems={{ default: "alignItemsCenter" }} spaceItems={{ default: "spaceItemsSm" }}>
                  <FlexItem>
                    <Switch
                      id="visualizations-toggle"
                      isChecked={preferences.show_visualizations}
                      onChange={(_e, checked) => handleUpdate({ show_visualizations: checked })}
                      isDisabled={updateMutation.isPending}
                      aria-label="Show visualizations"
                    />
                  </FlexItem>
                  <FlexItem>
                    <strong>Data Visualizations</strong>
                  </FlexItem>
                </Flex>
              </GridItem>
              <GridItem span={4} style={{ textAlign: "right" }}>
                <Button
                  variant="link"
                  icon={<UploadIcon />}
                  onClick={() => setShowUploadModal(true)}
                  isSmall
                >
                  Upload Custom
                </Button>
              </GridItem>
            </Grid>
          </CardBody>
        </Card>
      </StackItem>

      {/* Theme Gallery - All themes in one compact grid */}
      <StackItem>
        <div style={{ marginBottom: "0.5rem" }}>
          <strong>Choose Theme</strong>
          <span style={{
            fontSize: "0.875rem",
            color: "var(--pf-t--global--text--color--subtle",
            marginLeft: "0.5rem"
          }}>
            ({themes.length} available)
          </span>
        </div>
        <Grid hasGutter>
          {themes.map((theme) => (
            <GridItem key={theme.id} span={6} sm={4} md={3} lg={2}>
              <ThemeCard theme={theme} />
            </GridItem>
          ))}
        </Grid>
      </StackItem>

      {/* Upload Custom Theme Modal */}
      <Modal
        variant={ModalVariant.medium}
        title="Upload Custom Theme"
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        actions={[
          <Button key="upload" variant="primary" onClick={() => {
            // TODO: Implement theme upload
            console.log("Upload theme:", customThemeYAML);
            setShowUploadModal(false);
          }}>
            Install Theme
          </Button>,
          <Button key="cancel" variant="link" onClick={() => setShowUploadModal(false)}>
            Cancel
          </Button>,
        ]}
      >
        <Stack hasGutter>
          <StackItem>
            <p>
              Paste your custom theme YAML definition below. See the{" "}
              <a href="https://github.com/rhpds/git-2-jira-dev-pulse/blob/main/THEMES.md" target="_blank" rel="noopener noreferrer">
                theme documentation
              </a>{" "}
              for examples and schema reference.
            </p>
          </StackItem>
          <StackItem>
            <Form>
              <FormGroup label="Theme YAML">
                <TextArea
                  value={customThemeYAML}
                  onChange={(_e, value) => setCustomThemeYAML(value)}
                  rows={15}
                  style={{ fontFamily: "monospace", fontSize: "0.875rem" }}
                  placeholder={`id: my-custom-theme
name: My Custom Theme
description: A beautiful custom theme
category: custom
author: Your Name
version: "1.0"
colors:
  background: "#ffffff"
  surface: "#f5f5f5"
  ...`}
                  aria-label="Custom theme YAML"
                />
              </FormGroup>
            </Form>
          </StackItem>
        </Stack>
      </Modal>
    </Stack>
  );
}
