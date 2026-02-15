/**
 * Settings Page
 * Complete configuration UI with tabs for all settings
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
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ScanDirectoriesTab } from "../components/Settings/ScanDirectoriesTab";
import { AutoDiscoveryTab } from "../components/Settings/AutoDiscoveryTab";
import { VisualPreferencesTab } from "../components/Settings/VisualPreferencesTab";
import { AdvancedTab } from "../components/Settings/AdvancedTab";
import { JiraSettingsTab } from "../components/Settings/JiraSettingsTab";
import { GitHubIntegrationsTab } from "../components/Settings/GitHubIntegrationsTab";
import { LinearIntegrationsTab } from "../components/Settings/LinearIntegrationsTab";
import { CodeClimateIntegrationsTab } from "../components/Settings/CodeClimateIntegrationsTab";
import { BillingTab } from "../components/Settings/BillingTab";
import { TeamTab } from "../components/Settings/TeamTab";
import { ProfileTab } from "../components/Settings/ProfileTab";
import { AuditLogTab } from "../components/Settings/AuditLogTab";
import { WebhookTab } from "../components/Settings/WebhookTab";
import { NotificationPreferencesTab } from "../components/Settings/NotificationPreferencesTab";
import { AccountDangerZone } from "../components/Settings/AccountDangerZone";
import { TwoFactorTab } from "../components/Settings/TwoFactorTab";
import { SessionsTab } from "../components/Settings/SessionsTab";
import { ScheduleTab } from "../components/Settings/ScheduleTab";
import { getConfig } from "../api/client";

type SettingsTabKey = "profile" | "team" | "directories" | "discovery" | "jira" | "github" | "linear" | "codeclimate" | "billing" | "visual" | "advanced" | "audit" | "webhooks" | "notifications" | "security" | "sessions" | "schedules" | "account";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("profile");

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
              Manage your profile, team, integrations, and preferences
            </p>
          </StackItem>

          <StackItem>
            <Tabs
              activeKey={activeTab}
              onSelect={(_event, tabKey) => setActiveTab(tabKey as SettingsTabKey)}
            >
              <Tab
                eventKey="profile"
                title={<TabTitleText>Profile</TabTitleText>}
              >
                {activeTab === "profile" && (
                  <ProfileTab />
                )}
              </Tab>

              <Tab
                eventKey="team"
                title={<TabTitleText>Team</TabTitleText>}
              >
                {activeTab === "team" && (
                  <TeamTab />
                )}
              </Tab>

              <Tab
                eventKey="billing"
                title={<TabTitleText>Billing</TabTitleText>}
              >
                {activeTab === "billing" && (
                  <BillingTab />
                )}
              </Tab>

              <Tab
                eventKey="directories"
                title={<TabTitleText>Directories</TabTitleText>}
              >
                {activeTab === "directories" && config && (
                  <ScanDirectoriesTab config={config} />
                )}
              </Tab>

              <Tab
                eventKey="discovery"
                title={<TabTitleText>Auto-Discovery</TabTitleText>}
              >
                {activeTab === "discovery" && config && (
                  <AutoDiscoveryTab config={config} />
                )}
              </Tab>

              <Tab
                eventKey="jira"
                title={<TabTitleText>Jira</TabTitleText>}
              >
                {activeTab === "jira" && config && (
                  <JiraSettingsTab />
                )}
              </Tab>

              <Tab
                eventKey="github"
                title={<TabTitleText>GitHub</TabTitleText>}
              >
                {activeTab === "github" && (
                  <GitHubIntegrationsTab />
                )}
              </Tab>

              <Tab
                eventKey="linear"
                title={<TabTitleText>Linear</TabTitleText>}
              >
                {activeTab === "linear" && (
                  <LinearIntegrationsTab />
                )}
              </Tab>

              <Tab
                eventKey="codeclimate"
                title={<TabTitleText>CodeClimate</TabTitleText>}
              >
                {activeTab === "codeclimate" && (
                  <CodeClimateIntegrationsTab />
                )}
              </Tab>

              <Tab
                eventKey="audit"
                title={<TabTitleText>Audit Log</TabTitleText>}
              >
                {activeTab === "audit" && (
                  <AuditLogTab />
                )}
              </Tab>

              <Tab
                eventKey="webhooks"
                title={<TabTitleText>Webhooks</TabTitleText>}
              >
                {activeTab === "webhooks" && (
                  <WebhookTab />
                )}
              </Tab>

              <Tab
                eventKey="notifications"
                title={<TabTitleText>Notifications</TabTitleText>}
              >
                {activeTab === "notifications" && (
                  <NotificationPreferencesTab />
                )}
              </Tab>

              <Tab
                eventKey="security"
                title={<TabTitleText>Security</TabTitleText>}
              >
                {activeTab === "security" && (
                  <TwoFactorTab />
                )}
              </Tab>

              <Tab
                eventKey="sessions"
                title={<TabTitleText>Sessions</TabTitleText>}
              >
                {activeTab === "sessions" && (
                  <SessionsTab />
                )}
              </Tab>

              <Tab
                eventKey="schedules"
                title={<TabTitleText>Schedules</TabTitleText>}
              >
                {activeTab === "schedules" && (
                  <ScheduleTab />
                )}
              </Tab>

              <Tab
                eventKey="visual"
                title={<TabTitleText>Visual</TabTitleText>}
              >
                {activeTab === "visual" && config && (
                  <VisualPreferencesTab config={config} />
                )}
              </Tab>

              <Tab
                eventKey="advanced"
                title={<TabTitleText>Advanced</TabTitleText>}
              >
                {activeTab === "advanced" && config && (
                  <AdvancedTab config={config} />
                )}
              </Tab>

              <Tab
                eventKey="account"
                title={<TabTitleText>Account</TabTitleText>}
              >
                {activeTab === "account" && (
                  <div style={{ paddingTop: "1rem" }}>
                    <AccountDangerZone />
                  </div>
                )}
              </Tab>
            </Tabs>
          </StackItem>
        </Stack>
      </motion.div>
    </PageSection>
  );
}
