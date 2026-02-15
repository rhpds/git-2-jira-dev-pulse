/**
 * Account Danger Zone
 * Account deletion with confirmation modal
 */

import { useState } from "react";
import {
  Card,
  CardBody,
  CardTitle,
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  TextInput,
  FormGroup,
  Alert,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { useMutation } from "@tanstack/react-query";
import { deleteAccount } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export function AccountDangerZone() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const deleteMutation = useMutation({
    mutationFn: (pwd: string) => deleteAccount(pwd),
    onSuccess: () => {
      logout();
      navigate("/login");
    },
    onError: (error: any) => {
      setErrorMessage(
        error.response?.data?.detail || "Failed to delete account"
      );
    },
  });

  const canDelete =
    password.length > 0 && confirmText === "DELETE";

  return (
    <>
      <Card
        style={{
          borderColor: "var(--pf-t--color--red--40)",
          borderWidth: "1px",
          borderStyle: "solid",
        }}
      >
        <CardTitle>
          <span style={{ color: "var(--pf-t--color--red--40)" }}>
            Danger Zone
          </span>
        </CardTitle>
        <CardBody>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>Delete Account</div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--pf-t--global--text--color--subtle)",
                }}
              >
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </div>
            </div>
            <Button
              variant="danger"
              onClick={() => {
                setIsModalOpen(true);
                setPassword("");
                setConfirmText("");
                setErrorMessage("");
              }}
            >
              Delete Account
            </Button>
          </div>
        </CardBody>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aria-label="Delete account confirmation"
        variant="small"
      >
        <ModalHeader title="Delete Account" />
        <ModalBody>
          <Stack hasGutter>
            <StackItem>
              <Alert
                variant="danger"
                title="This action is permanent and cannot be undone"
                isInline
              >
                <p>
                  Deleting your account will remove all your data including:
                </p>
                <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
                  <li>Your profile and settings</li>
                  <li>All API keys</li>
                  <li>Notification preferences</li>
                  {user?.organization?.role === "owner" && (
                    <li>
                      <strong>
                        Your organization and all its data (you are the owner)
                      </strong>
                    </li>
                  )}
                </ul>
              </Alert>
            </StackItem>

            {errorMessage && (
              <StackItem>
                <Alert variant="danger" title={errorMessage} isInline />
              </StackItem>
            )}

            <StackItem>
              <FormGroup
                label="Enter your password to confirm"
                isRequired
                fieldId="delete-password"
              >
                <TextInput
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(_e, val) => setPassword(val)}
                />
              </FormGroup>
            </StackItem>

            <StackItem>
              <FormGroup
                label='Type "DELETE" to confirm'
                isRequired
                fieldId="delete-confirm"
              >
                <TextInput
                  id="delete-confirm"
                  value={confirmText}
                  onChange={(_e, val) => setConfirmText(val)}
                  placeholder="DELETE"
                />
              </FormGroup>
            </StackItem>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={() => deleteMutation.mutate(password)}
            isLoading={deleteMutation.isPending}
            isDisabled={!canDelete}
          >
            Permanently Delete Account
          </Button>
          <Button variant="link" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
