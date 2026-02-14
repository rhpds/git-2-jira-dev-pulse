/**
 * Profile Management Tab
 * Edit profile, change password, manage API keys
 */

import { useState } from "react";
import {
  Stack,
  StackItem,
  Card,
  CardBody,
  CardTitle,
  Button,
  Alert,
  AlertActionCloseButton,
  Form,
  FormGroup,
  TextInput,
  Label,
  Spinner,
  ClipboardCopy,
  ClipboardCopyVariant,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  updateProfile,
  changePassword,
  createAPIKey,
  listAPIKeys,
  revokeAPIKey,
  type APIKeyInfo,
} from "../../api/auth";
import { useAuth } from "../../context/AuthContext";

export function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [apiKeyName, setApiKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { data: apiKeys = [], isLoading: keysLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: listAPIKeys,
  });

  const profileMutation = useMutation({
    mutationFn: (updates: { full_name?: string }) => updateProfile(updates),
    onSuccess: () => {
      refreshUser();
      setSuccessMessage("Profile updated");
    },
    onError: (error: any) => {
      setErrorMessage(
        error.response?.data?.detail || "Failed to update profile"
      );
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({
      current,
      newPwd,
    }: {
      current: string;
      newPwd: string;
    }) => changePassword(current, newPwd),
    onSuccess: () => {
      setSuccessMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      setErrorMessage(
        error.response?.data?.detail || "Failed to change password"
      );
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: (name: string) => createAPIKey(name),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setNewKeyValue(result.key || "");
      setApiKeyName("");
      setSuccessMessage("API key created. Copy it now — it won't be shown again.");
    },
    onError: (error: any) => {
      setErrorMessage(
        error.response?.data?.detail || "Failed to create API key"
      );
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (keyId: number) => revokeAPIKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setSuccessMessage("API key revoked");
    },
    onError: (error: any) => {
      setErrorMessage(
        error.response?.data?.detail || "Failed to revoke API key"
      );
    },
  });

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters");
      return;
    }
    passwordMutation.mutate({ current: currentPassword, newPwd: newPassword });
  };

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

      {/* Profile Info */}
      <StackItem>
        <Card>
          <CardTitle>Profile</CardTitle>
          <CardBody>
            <Form>
              <FormGroup label="Email" fieldId="email">
                <TextInput
                  id="email"
                  value={user?.email || ""}
                  isDisabled
                />
              </FormGroup>
              <FormGroup label="Full Name" fieldId="full-name">
                <TextInput
                  id="full-name"
                  value={fullName}
                  onChange={(_e, val) => setFullName(val)}
                />
              </FormGroup>
              <FormGroup label="Role" fieldId="role">
                <div style={{ paddingTop: "0.5rem" }}>
                  <Label color="blue">{user?.role}</Label>
                  {user?.organization && (
                    <Label
                      color="green"
                      style={{ marginLeft: "0.5rem" }}
                    >
                      {user.organization.role} @ {user.organization.name}
                    </Label>
                  )}
                </div>
              </FormGroup>
              <Button
                variant="primary"
                onClick={() =>
                  profileMutation.mutate({ full_name: fullName })
                }
                isLoading={profileMutation.isPending}
                isDisabled={fullName === user?.full_name}
              >
                Save Profile
              </Button>
            </Form>
          </CardBody>
        </Card>
      </StackItem>

      {/* Change Password */}
      <StackItem>
        <Card>
          <CardTitle>Change Password</CardTitle>
          <CardBody>
            <Form>
              <FormGroup
                label="Current Password"
                isRequired
                fieldId="current-pwd"
              >
                <TextInput
                  id="current-pwd"
                  type="password"
                  value={currentPassword}
                  onChange={(_e, val) => setCurrentPassword(val)}
                />
              </FormGroup>
              <FormGroup
                label="New Password"
                isRequired
                fieldId="new-pwd"
              >
                <TextInput
                  id="new-pwd"
                  type="password"
                  value={newPassword}
                  onChange={(_e, val) => setNewPassword(val)}
                  placeholder="Minimum 8 characters"
                />
              </FormGroup>
              <FormGroup
                label="Confirm New Password"
                isRequired
                fieldId="confirm-pwd"
              >
                <TextInput
                  id="confirm-pwd"
                  type="password"
                  value={confirmPassword}
                  onChange={(_e, val) => setConfirmPassword(val)}
                />
              </FormGroup>
              <Button
                variant="primary"
                onClick={handlePasswordChange}
                isLoading={passwordMutation.isPending}
                isDisabled={
                  !currentPassword || !newPassword || !confirmPassword
                }
              >
                Change Password
              </Button>
            </Form>
          </CardBody>
        </Card>
      </StackItem>

      {/* API Keys */}
      <StackItem>
        <Card>
          <CardTitle>API Keys</CardTitle>
          <CardBody>
            {/* New key display */}
            {newKeyValue && (
              <Alert
                variant="warning"
                title="Save this key — it won't be shown again"
                isInline
                style={{ marginBottom: "1rem" }}
              >
                <ClipboardCopy
                  isReadOnly
                  variant={ClipboardCopyVariant.expansion}
                >
                  {newKeyValue}
                </ClipboardCopy>
              </Alert>
            )}

            {/* Create new key */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <TextInput
                value={apiKeyName}
                onChange={(_e, val) => setApiKeyName(val)}
                placeholder="Key name (e.g., CI/CD Pipeline)"
                style={{ maxWidth: "300px" }}
              />
              <Button
                variant="primary"
                onClick={() => createKeyMutation.mutate(apiKeyName)}
                isLoading={createKeyMutation.isPending}
                isDisabled={!apiKeyName}
              >
                Create Key
              </Button>
            </div>

            {/* Keys list */}
            {keysLoading ? (
              <Spinner size="md" />
            ) : apiKeys.length === 0 ? (
              <p
                style={{
                  color: "var(--pf-t--global--text--color--subtle)",
                }}
              >
                No API keys created yet.
              </p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom:
                        "1px solid var(--pf-t--global--border--color--default)",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "0.75rem" }}>Name</th>
                    <th style={{ padding: "0.75rem" }}>Key</th>
                    <th style={{ padding: "0.75rem" }}>Created</th>
                    <th style={{ padding: "0.75rem" }}>Last Used</th>
                    <th style={{ padding: "0.75rem" }}>Status</th>
                    <th style={{ padding: "0.75rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key: APIKeyInfo) => (
                    <tr
                      key={key.id}
                      style={{
                        borderBottom:
                          "1px solid var(--pf-t--global--border--color--default)",
                        opacity: key.is_active ? 1 : 0.5,
                      }}
                    >
                      <td style={{ padding: "0.75rem" }}>
                        {key.name}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          fontFamily: "monospace",
                          color:
                            "var(--pf-t--global--text--color--subtle)",
                        }}
                      >
                        {key.prefix}...
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          color:
                            "var(--pf-t--global--text--color--subtle)",
                        }}
                      >
                        {new Date(key.created_at).toLocaleDateString()}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          color:
                            "var(--pf-t--global--text--color--subtle)",
                        }}
                      >
                        {key.last_used
                          ? new Date(key.last_used).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <Label
                          color={key.is_active ? "green" : "red"}
                          isCompact
                        >
                          {key.is_active ? "Active" : "Revoked"}
                        </Label>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        {key.is_active && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              if (
                                confirm(
                                  `Revoke API key "${key.name}"?`
                                )
                              ) {
                                revokeKeyMutation.mutate(key.id);
                              }
                            }}
                            isLoading={revokeKeyMutation.isPending}
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  );
}
