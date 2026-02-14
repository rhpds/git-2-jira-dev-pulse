/**
 * Visual Preferences Tab
 * Manage UI theme and visual settings with theme gallery
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
  TextInput,
  TextArea,
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
    await setTheme(themeId);
    handleUpdate({ theme: themeId });
  };

  // Group themes by category
  const builtInThemes = themes.filter((t) => t.category === "built-in");
  const darkThemes = themes.filter((t) => t.category === "dark");
  const lightThemes = themes.filter((t) => ["light", "accessibility"].includes(t.category));
  const customThemes = themes.filter((t) => t.category === "custom");

  const ThemeCard = ({ theme }: { theme: ThemeSummary }) => {
    const isSelected = currentTheme === theme.id;

    return (
      <Card
        isClickable
        isSelected={isSelected}
        onClick={() => handleThemeSelect(theme.id)}
        style={{
          border: isSelected ? "2px solid var(--pf-t--global--color--brand--default)" : undefined,
          cursor: "pointer",
          position: "relative",
        }}
      >
        <CardBody>
          <Stack hasGutter>
            <StackItem>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <strong>{theme.name}</strong>
                {isSelected && <CheckCircleIcon color="var(--pf-t--global--color--brand--default)" />}
              </div>
            </StackItem>
            <StackItem>
              <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                {theme.description}
              </div>
            </StackItem>
            {theme.author && (
              <StackItem>
                <div style={{ fontSize: "0.75rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                  by {theme.author}
                </div>
              </StackItem>
            )}
            {/* Theme preview badge */}
            <StackItem>
              <div style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 500,
                backgroundColor: "var(--pf-t--global--background--color--secondary)",
                display: "inline-block",
              }}>
                {theme.category.toUpperCase()}
              </div>
            </StackItem>
          </Stack>
        </CardBody>
      </Card>
    );
  };

  return (
    <Stack hasGutter style={{ marginTop: "1rem" }}>
      <StackItem>
        <h3>Visual Preferences</h3>
        <p style={{ color: "var(--pf-t--global--text--color--subtle)", fontSize: "0.875rem" }}>
          Customize the appearance and visual effects of the application
        </p>
      </StackItem>

      {/* Theme Gallery */}
      <StackItem>
        <Card>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>Theme Gallery</strong>
                    <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                      Choose from 10 built-in themes or upload your own
                    </div>
                  </div>
                  <Button variant="secondary" icon={<UploadIcon />} onClick={() => setShowUploadModal(true)}>
                    Upload Custom Theme
                  </Button>
                </div>
              </StackItem>

              {/* Built-in Themes */}
              {builtInThemes.length > 0 && (
                <StackItem>
                  <h4 style={{ marginBottom: "0.5rem" }}>Built-in Themes</h4>
                  <Grid hasGutter>
                    {builtInThemes.map((theme) => (
                      <GridItem key={theme.id} span={4}>
                        <ThemeCard theme={theme} />
                      </GridItem>
                    ))}
                  </Grid>
                </StackItem>
              )}

              {/* Dark Themes */}
              {darkThemes.length > 0 && (
                <StackItem>
                  <h4 style={{ marginBottom: "0.5rem" }}>Dark Themes</h4>
                  <Grid hasGutter>
                    {darkThemes.map((theme) => (
                      <GridItem key={theme.id} span={4}>
                        <ThemeCard theme={theme} />
                      </GridItem>
                    ))}
                  </Grid>
                </StackItem>
              )}

              {/* Light & Accessibility Themes */}
              {lightThemes.length > 0 && (
                <StackItem>
                  <h4 style={{ marginBottom: "0.5rem" }}>Light & Accessibility Themes</h4>
                  <Grid hasGutter>
                    {lightThemes.map((theme) => (
                      <GridItem key={theme.id} span={4}>
                        <ThemeCard theme={theme} />
                      </GridItem>
                    ))}
                  </Grid>
                </StackItem>
              )}

              {/* Custom Themes */}
              {customThemes.length > 0 && (
                <StackItem>
                  <h4 style={{ marginBottom: "0.5rem" }}>Custom Themes</h4>
                  <Grid hasGutter>
                    {customThemes.map((theme) => (
                      <GridItem key={theme.id} span={4}>
                        <ThemeCard theme={theme} />
                      </GridItem>
                    ))}
                  </Grid>
                </StackItem>
              )}
            </Stack>
          </CardBody>
        </Card>
      </StackItem>

      {/* Animations */}
      <StackItem>
        <Card>
          <CardBody>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Enable Animations</strong>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                  Smooth transitions and motion effects throughout the UI
                </div>
              </div>
              <Switch
                id="animations-toggle"
                isChecked={preferences.animations_enabled}
                onChange={(_e, checked) => handleUpdate({ animations_enabled: checked })}
                isDisabled={updateMutation.isPending}
              />
            </div>
          </CardBody>
        </Card>
      </StackItem>

      {/* Visualizations */}
      <StackItem>
        <Card>
          <CardBody>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Show Data Visualizations</strong>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                  Display interactive charts and graphs on the scan page
                </div>
              </div>
              <Switch
                id="visualizations-toggle"
                isChecked={preferences.show_visualizations}
                onChange={(_e, checked) => handleUpdate({ show_visualizations: checked })}
                isDisabled={updateMutation.isPending}
              />
            </div>
          </CardBody>
        </Card>
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
                />
              </FormGroup>
            </Form>
          </StackItem>
        </Stack>
      </Modal>
    </Stack>
  );
}
