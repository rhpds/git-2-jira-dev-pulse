/**
 * Notification Preferences Tab
 * Manage per-type notification preferences
 */

import { useState } from "react";
import {
  Stack,
  StackItem,
  Card,
  CardBody,
  CardTitle,
  Switch,
  Button,
  Alert,
  AlertActionCloseButton,
  Spinner,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../../api/auth";

const TYPE_LABELS: Record<string, { label: string; description: string }> = {
  quota_warning: {
    label: "Quota Warnings",
    description: "When you're approaching usage limits",
  },
  quota_exceeded: {
    label: "Quota Exceeded",
    description: "When you've exceeded plan limits",
  },
  member_joined: {
    label: "Member Joined",
    description: "When a new team member joins your organization",
  },
  member_removed: {
    label: "Member Removed",
    description: "When a team member is removed",
  },
  scan_completed: {
    label: "Scan Completed",
    description: "When a repository scan finishes",
  },
  ticket_created: {
    label: "Ticket Created",
    description: "When a Jira ticket is created from a suggestion",
  },
  integration_status: {
    label: "Integration Status",
    description: "When integrations connect, disconnect, or have issues",
  },
  subscription_changed: {
    label: "Subscription Changes",
    description: "When your plan or billing changes",
  },
  webhook_failure: {
    label: "Webhook Failures",
    description: "When a webhook delivery fails",
  },
  system: {
    label: "System Notifications",
    description: "Important system announcements and updates",
  },
};

export function NotificationPreferencesTab() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean> | null>(
    null
  );

  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: getNotificationPreferences,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (data: any) => {
      if (!localPrefs) {
        setLocalPrefs(data.preferences);
      }
    },
  } as any);

  const prefs = localPrefs || data?.preferences || {};
  const isDirty =
    data?.preferences && JSON.stringify(prefs) !== JSON.stringify(data.preferences);

  const saveMutation = useMutation({
    mutationFn: (preferences: Record<string, boolean>) =>
      updateNotificationPreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      setSuccessMessage("Notification preferences saved");
    },
    onError: (error: any) => {
      setErrorMessage(
        error.response?.data?.detail || "Failed to save preferences"
      );
    },
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Stack hasGutter>
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
              actionClose={
                <AlertActionCloseButton
                  onClose={() => setSuccessMessage("")}
                />
              }
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
              actionClose={
                <AlertActionCloseButton
                  onClose={() => setErrorMessage("")}
                />
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      <StackItem>
        <Card>
          <CardTitle>Notification Preferences</CardTitle>
          <CardBody>
            <p
              style={{
                color: "var(--pf-t--global--text--color--subtle)",
                marginBottom: "1.5rem",
              }}
            >
              Choose which notifications you'd like to receive. Disabled
              notifications will not appear in your notification center.
            </p>
            <Stack hasGutter>
              {Object.entries(prefs).map(([type, enabled]) => {
                const meta = TYPE_LABELS[type] || {
                  label: type,
                  description: "",
                };
                return (
                  <StackItem key={type}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem 0",
                        borderBottom:
                          "1px solid var(--pf-t--global--border--color--default)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{meta.label}</div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--pf-t--global--text--color--subtle)",
                          }}
                        >
                          {meta.description}
                        </div>
                      </div>
                      <Switch
                        id={`pref-${type}`}
                        label={meta.label}
                        isChecked={enabled as boolean}
                        onChange={(_e, checked) =>
                          setLocalPrefs((prev) => ({
                            ...prev,
                            [type]: checked,
                          }))
                        }
                      />
                    </div>
                  </StackItem>
                );
              })}
            </Stack>
            <div style={{ marginTop: "1.5rem" }}>
              <Button
                variant="primary"
                onClick={() => saveMutation.mutate(prefs)}
                isLoading={saveMutation.isPending}
                isDisabled={!isDirty}
              >
                Save Preferences
              </Button>
            </div>
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  );
}
