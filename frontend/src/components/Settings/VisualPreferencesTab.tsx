/**
 * Visual Preferences Tab
 * Manage UI theme and visual settings
 */

import { useState } from "react";
import {
  Stack,
  StackItem,
  Card,
  CardBody,
  Switch,
  Radio,
  Form,
  FormGroup,
} from "@patternfly/react-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Git2JiraConfig, UIPreferences } from "../../api/types";
import { updateUIPreferences } from "../../api/client";
import { GlassCard } from "../GlassCard/GlassCard";
import { PulseIcon, CodeFlowIcon } from "../CustomIcons";

interface VisualPreferencesTabProps {
  config: Git2JiraConfig;
}

export function VisualPreferencesTab({ config }: VisualPreferencesTabProps) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<UIPreferences>(config.ui);

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

  const isGlassmorphic = preferences.theme === "glassmorphic";

  return (
    <Stack hasGutter style={{ marginTop: "1rem" }}>
      <StackItem>
        <h3>Visual Preferences</h3>
        <p style={{ color: "var(--pf-t--global--text--color--subtle)", fontSize: "0.875rem" }}>
          Customize the appearance and visual effects of the application
        </p>
      </StackItem>

      {/* Theme Selection */}
      <StackItem>
        <Card>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <strong>Theme</strong>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                  Choose between standard PatternFly design or modern glassmorphic style
                </div>
              </StackItem>

              <StackItem>
                <Form>
                  <FormGroup role="radiogroup">
                    <Radio
                      id="theme-standard"
                      name="theme"
                      label="Standard"
                      description="Classic PatternFly design with solid cards"
                      isChecked={preferences.theme === "standard"}
                      onChange={() => handleUpdate({ theme: "standard" })}
                    />
                    <Radio
                      id="theme-glassmorphic"
                      name="theme"
                      label="Glassmorphic"
                      description="Modern frosted glass effect with gradients and blur"
                      isChecked={preferences.theme === "glassmorphic"}
                      onChange={() => handleUpdate({ theme: "glassmorphic" })}
                    />
                  </FormGroup>
                </Form>
              </StackItem>
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

      {/* Default View */}
      <StackItem>
        <Card>
          <CardBody>
            <Stack hasGutter>
              <StackItem>
                <strong>Default View</strong>
                <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.25rem" }}>
                  Choose the initial view mode for the scan page
                </div>
              </StackItem>

              <StackItem>
                <Form>
                  <FormGroup role="radiogroup">
                    <Radio
                      id="view-grid"
                      name="default-view"
                      label="Grid View"
                      description="Repository cards in a responsive grid layout"
                      isChecked={preferences.default_view === "grid"}
                      onChange={() => handleUpdate({ default_view: "grid" })}
                    />
                    <Radio
                      id="view-list"
                      name="default-view"
                      label="List View"
                      description="Compact list with repository details"
                      isChecked={preferences.default_view === "list"}
                      onChange={() => handleUpdate({ default_view: "list" })}
                    />
                    <Radio
                      id="view-visualization"
                      name="default-view"
                      label="Visualization View"
                      description="Focus on charts and data insights"
                      isChecked={preferences.default_view === "visualization"}
                      onChange={() => handleUpdate({ default_view: "visualization" })}
                    />
                  </FormGroup>
                </Form>
              </StackItem>
            </Stack>
          </CardBody>
        </Card>
      </StackItem>

      {/* Live Preview */}
      <StackItem>
        <div style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>
          Live Preview
        </div>
        {isGlassmorphic ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <GlassCard variant="gradient" gradient="primary" hover>
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <PulseIcon size={48} color="white" animate />
                <div style={{ marginTop: "0.5rem", fontWeight: 500 }}>Gradient Card</div>
              </div>
            </GlassCard>
            <GlassCard variant="border-gradient" hover>
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <CodeFlowIcon size={48} color="var(--pf-t--global--text--color--regular)" animate />
                <div style={{ marginTop: "0.5rem", fontWeight: 500 }}>Border Gradient</div>
              </div>
            </GlassCard>
            <GlassCard variant="default" hover pulse>
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem" }}>✨</div>
                <div style={{ marginTop: "0.5rem", fontWeight: 500 }}>Pulse Effect</div>
              </div>
            </GlassCard>
          </div>
        ) : (
          <Card>
            <CardBody style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{ fontSize: "0.875rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                Standard PatternFly card design
              </div>
            </CardBody>
          </Card>
        )}
      </StackItem>
    </Stack>
  );
}
