/**
 * Webhook Management Tab
 * Create, edit, delete, and test webhooks
 */

import { useState } from "react";
import {
  Stack,
  StackItem,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  Button,
  Alert,
  AlertActionCloseButton,
  Label,
  Spinner,
  Modal,
  ModalVariant,
  Switch,
  Checkbox,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "../../api/client";

interface WebhookItem {
  id: number;
  url: string;
  events: string[];
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function WebhookTab() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { data: webhooksData, isLoading, error } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data } = await apiClient.get("/webhooks/");
      return data as { webhooks: WebhookItem[] };
    },
    retry: false,
  });

  const { data: eventsData } = useQuery({
    queryKey: ["webhook-events"],
    queryFn: async () => {
      const { data } = await apiClient.get("/webhooks/events");
      return data as { events: string[] };
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/webhooks/", {
        url: newUrl,
        events: selectedEvents,
        description: newDescription || undefined,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setSuccessMessage("Webhook created successfully!");
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || "Failed to create webhook");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await apiClient.put(`/webhooks/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || "Failed to update webhook");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setSuccessMessage("Webhook deleted");
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || "Failed to delete webhook");
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post(`/webhooks/${id}/test`);
      return data;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setSuccessMessage(`Test delivery succeeded (HTTP ${data.response_status})`);
      } else {
        setErrorMessage(`Test delivery failed (HTTP ${data.response_status})`);
      }
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || "Failed to send test");
    },
  });

  const resetForm = () => {
    setNewUrl("");
    setNewDescription("");
    setSelectedEvents([]);
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  };

  if (error) {
    return (
      <Card>
        <CardBody>
          <p style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
            Webhooks require admin privileges. Please contact your organization admin.
          </p>
        </CardBody>
      </Card>
    );
  }

  const webhooks = webhooksData?.webhooks || [];
  const availableEvents = eventsData?.events || [];

  return (
    <Stack hasGutter>
      {/* Alerts */}
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
              actionClose={<AlertActionCloseButton onClose={() => setSuccessMessage("")} />}
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
              actionClose={<AlertActionCloseButton onClose={() => setErrorMessage("")} />}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webhooks List */}
      <StackItem>
        <Card>
          <CardTitle>
            Webhooks
            <Button
              variant="primary"
              style={{ float: "right" }}
              onClick={() => setShowAddModal(true)}
            >
              + Add Webhook
            </Button>
          </CardTitle>
          <CardBody>
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Spinner size="md" />
              </div>
            ) : webhooks.length === 0 ? (
              <p style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
                No webhooks configured. Click "Add Webhook" to send events to external services.
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem" }}>URL</th>
                    <th style={{ padding: "0.75rem" }}>Events</th>
                    <th style={{ padding: "0.75rem" }}>Status</th>
                    <th style={{ padding: "0.75rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((wh) => (
                    <tr key={wh.id} style={{ borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                      <td style={{ padding: "0.75rem" }}>
                        <div>
                          <strong style={{ fontSize: "0.9rem", wordBreak: "break-all" }}>{wh.url}</strong>
                        </div>
                        {wh.description && (
                          <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                            {wh.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          {wh.events.map((e) => (
                            <Label key={e} isCompact color="blue">{e}</Label>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <Switch
                          id={`wh-toggle-${wh.id}`}
                          isChecked={wh.is_active}
                          onChange={(_e, checked) =>
                            toggleMutation.mutate({ id: wh.id, is_active: checked })
                          }
                          label="Active"
                          labelOff="Inactive"
                        />
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => testMutation.mutate(wh.id)}
                            isLoading={testMutation.isPending}
                          >
                            Test
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete webhook ${wh.url}?`)) {
                                deleteMutation.mutate(wh.id);
                              }
                            }}
                            isLoading={deleteMutation.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </StackItem>

      {/* Add Webhook Modal */}
      <Modal
        variant={ModalVariant.medium}
        title="Add Webhook"
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        actions={[
          <Button
            key="create"
            variant="primary"
            onClick={() => createMutation.mutate()}
            isLoading={createMutation.isPending}
            isDisabled={!newUrl || selectedEvents.length === 0}
          >
            Create Webhook
          </Button>,
          <Button
            key="cancel"
            variant="link"
            onClick={() => { setShowAddModal(false); resetForm(); }}
          >
            Cancel
          </Button>,
        ]}
      >
        <Form>
          <FormGroup label="Endpoint URL" isRequired fieldId="webhook-url">
            <TextInput
              id="webhook-url"
              type="url"
              value={newUrl}
              onChange={(_e, val) => setNewUrl(val)}
              placeholder="https://example.com/webhook"
            />
          </FormGroup>

          <FormGroup label="Description" fieldId="webhook-description">
            <TextInput
              id="webhook-description"
              value={newDescription}
              onChange={(_e, val) => setNewDescription(val)}
              placeholder="Optional description"
            />
          </FormGroup>

          <FormGroup
            label="Events"
            isRequired
            fieldId="webhook-events"
            helperText="Select which events should trigger this webhook"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {availableEvents.map((event) => (
                <Checkbox
                  key={event}
                  id={`event-${event}`}
                  label={event}
                  isChecked={selectedEvents.includes(event)}
                  onChange={() => toggleEvent(event)}
                />
              ))}
            </div>
          </FormGroup>
        </Form>
      </Modal>
    </Stack>
  );
}
