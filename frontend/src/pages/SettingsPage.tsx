/**
 * Settings Page
 * Complete configuration UI with tabs for:
 * - Scan Directories
 * - Auto-Discovery
 * - Visual Preferences
 * - Advanced Settings
 */

import { useState } from "react";
import {
  PageSection,
  Tabs,
  Tab,
  TabTitleText,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ScanDirectoriesTab } from "../components/Settings/ScanDirectoriesTab";
import { AutoDiscoveryTab } from "../components/Settings/AutoDiscoveryTab";
import { VisualPreferencesTab } from "../components/Settings/VisualPreferencesTab";
import { AdvancedTab } from "../components/Settings/AdvancedTab";
import { getConfig } from "../api/client";

type SettingsTabKey = "directories" | "discovery" | "visual" | "advanced";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("directories");
  const queryClient = useQueryClient();

  // Fetch current configuration
  const { data: config, isLoading, error } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
  });

  if (isLoading) {
    return (
      <PageSection>
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--pf-t--global--text--color--regular)" }}>
          Loading configuration...
        </div>
      </PageSection>
    );
  }

  if (error) {
    return (
      <PageSection>
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--pf-t--color--red--40)" }}>
          Error loading configuration: {String(error)}
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h1" size="2xl">
              Settings
            </Title>
            <p style={{ marginTop: "0.5rem", color: "var(--pf-t--global--text--color--subtle)" }}>
              Configure scan directories, auto-discovery, and visual preferences
            </p>
          </StackItem>

          <StackItem>
            <Tabs
              activeKey={activeTab}
              onSelect={(_event, tabKey) => setActiveTab(tabKey as SettingsTabKey)}
            >
              <Tab
                eventKey="directories"
                title={<TabTitleText>📁 Scan Directories</TabTitleText>}
              >
                {activeTab === "directories" && config && (
                  <ScanDirectoriesTab config={config} />
                )}
              </Tab>

              <Tab
                eventKey="discovery"
                title={<TabTitleText>🔍 Auto-Discovery</TabTitleText>}
              >
                {activeTab === "discovery" && config && (
                  <AutoDiscoveryTab config={config} />
                )}
              </Tab>

              <Tab
                eventKey="visual"
                title={<TabTitleText>🎨 Visual Preferences</TabTitleText>}
              >
                {activeTab === "visual" && config && (
                  <VisualPreferencesTab config={config} />
                )}
              </Tab>

              <Tab
                eventKey="advanced"
                title={<TabTitleText>⚙️ Advanced</TabTitleText>}
              >
                {activeTab === "advanced" && config && (
                  <AdvancedTab config={config} />
                )}
              </Tab>
            </Tabs>
          </StackItem>
        </Stack>
      </motion.div>
    </PageSection>
  );
}
