/**
 * Two-Factor Authentication Settings Tab
 * Setup, verify, and manage TOTP-based 2FA
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
  TextInput,
  FormGroup,
  Spinner,
  Label,
  ClipboardCopy,
  ClipboardCopyVariant,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Flex,
  FlexItem,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });
const token = localStorage.getItem("dp_access_token");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

interface TwoFASetup {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

interface TwoFAStatus {
  enabled: boolean;
  has_backup_codes: boolean;
}

export function TwoFactorTab() {
  const queryClient = useQueryClient();
  const [verifyCode, setVerifyCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [setupData, setSetupData] = useState<TwoFASetup | null>(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { data: status, isLoading } = useQuery({
    queryKey: ["2fa-status"],
    queryFn: async () => {
      const { data } = await api.get("/auth/2fa/status");
      return data as TwoFAStatus;
    },
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/auth/2fa/setup");
      return data as TwoFASetup;
    },
    onSuccess: (data) => {
      setSetupData(data);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to start 2FA setup");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post("/auth/2fa/verify", { code });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      setSetupData(null);
      setVerifyCode("");
      setSuccessMessage("Two-factor authentication enabled successfully!");
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Invalid verification code");
    },
  });

  const disableMutation = useMutation({
    mutationFn: async ({ password, code }: { password: string; code: string }) => {
      const { data } = await api.post("/auth/2fa/disable", { password, code });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      setShowDisableModal(false);
      setDisablePassword("");
      setDisableCode("");
      setSuccessMessage("Two-factor authentication disabled");
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || "Failed to disable 2FA");
    },
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const isEnabled = status?.enabled || false;

  return (
    <Stack hasGutter>
      <AnimatePresence>
        {successMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Alert variant="success" title={successMessage} actionClose={<AlertActionCloseButton onClose={() => setSuccessMessage("")} />} />
          </motion.div>
        )}
        {errorMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Alert variant="danger" title={errorMessage} actionClose={<AlertActionCloseButton onClose={() => setErrorMessage("")} />} />
          </motion.div>
        )}
      </AnimatePresence>

      <StackItem>
        <Card>
          <CardTitle>
            <Flex alignItems={{ default: "alignItemsCenter" }} spaceItems={{ default: "spaceItemsMd" }}>
              <FlexItem>Two-Factor Authentication</FlexItem>
              <FlexItem>
                <Label color={isEnabled ? "green" : "grey"} isCompact>
                  {isEnabled ? "Enabled" : "Disabled"}
                </Label>
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            <p style={{ color: "var(--pf-t--global--text--color--subtle)", marginBottom: "1.5rem" }}>
              Add an extra layer of security to your account. You'll need an
              authenticator app like Google Authenticator, Authy, or 1Password to
              generate verification codes.
            </p>

            {!isEnabled && !setupData && (
              <Button
                variant="primary"
                onClick={() => setupMutation.mutate()}
                isLoading={setupMutation.isPending}
              >
                Enable Two-Factor Authentication
              </Button>
            )}

            {isEnabled && (
              <Button
                variant="danger"
                onClick={() => {
                  setShowDisableModal(true);
                  setDisablePassword("");
                  setDisableCode("");
                  setErrorMessage("");
                }}
              >
                Disable Two-Factor Authentication
              </Button>
            )}
          </CardBody>
        </Card>
      </StackItem>

      {/* Setup Flow */}
      {setupData && (
        <StackItem>
          <Card>
            <CardTitle>Setup Two-Factor Authentication</CardTitle>
            <CardBody>
              <Stack hasGutter>
                <StackItem>
                  <h4 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                    Step 1: Scan the QR code
                  </h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--pf-t--global--text--color--subtle)", marginBottom: "1rem" }}>
                    Open your authenticator app and scan this QR code to add DevPulse Pro.
                  </p>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "1rem",
                      background: "white",
                      borderRadius: "8px",
                      border: "1px solid var(--pf-t--global--border--color--default)",
                    }}
                  >
                    <img
                      src={setupData.qr_code}
                      alt="2FA QR Code"
                      style={{ width: "200px", height: "200px" }}
                    />
                  </div>
                  <div style={{ marginTop: "0.75rem" }}>
                    <p style={{ fontSize: "0.85rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                      Or enter this code manually:
                    </p>
                    <ClipboardCopy isReadOnly variant={ClipboardCopyVariant.inline}>
                      {setupData.secret}
                    </ClipboardCopy>
                  </div>
                </StackItem>

                <StackItem>
                  <h4 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                    Step 2: Save backup codes
                  </h4>
                  <Alert variant="warning" title="Save these codes in a safe place" isInline>
                    <p>If you lose access to your authenticator app, you can use one of these codes to log in. Each code can only be used once.</p>
                  </Alert>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "0.5rem",
                      marginTop: "1rem",
                      maxWidth: "400px",
                    }}
                  >
                    {setupData.backup_codes.map((code, i) => (
                      <code
                        key={i}
                        style={{
                          padding: "0.5rem",
                          background: "var(--pf-t--global--background--color--secondary--default)",
                          borderRadius: "4px",
                          textAlign: "center",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                        }}
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                </StackItem>

                <StackItem>
                  <h4 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                    Step 3: Verify
                  </h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--pf-t--global--text--color--subtle)", marginBottom: "0.75rem" }}>
                    Enter the 6-digit code from your authenticator app to verify setup.
                  </p>
                  <Flex alignItems={{ default: "alignItemsFlexEnd" }} spaceItems={{ default: "spaceItemsSm" }}>
                    <FlexItem>
                      <FormGroup label="Verification Code" fieldId="verify-code">
                        <TextInput
                          id="verify-code"
                          value={verifyCode}
                          onChange={(_e, val) => setVerifyCode(val)}
                          placeholder="000000"
                          style={{ maxWidth: "150px", fontFamily: "monospace", fontSize: "1.2rem", textAlign: "center" }}
                        />
                      </FormGroup>
                    </FlexItem>
                    <FlexItem>
                      <Button
                        variant="primary"
                        onClick={() => verifyMutation.mutate(verifyCode)}
                        isLoading={verifyMutation.isPending}
                        isDisabled={verifyCode.length < 6}
                      >
                        Verify & Enable
                      </Button>
                    </FlexItem>
                    <FlexItem>
                      <Button variant="link" onClick={() => setSetupData(null)}>
                        Cancel
                      </Button>
                    </FlexItem>
                  </Flex>
                </StackItem>
              </Stack>
            </CardBody>
          </Card>
        </StackItem>
      )}

      {/* Disable Modal */}
      <Modal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        aria-label="Disable 2FA"
        variant="small"
      >
        <ModalHeader title="Disable Two-Factor Authentication" />
        <ModalBody>
          <Stack hasGutter>
            <StackItem>
              <Alert variant="warning" title="This will reduce the security of your account" isInline />
            </StackItem>
            <StackItem>
              <FormGroup label="Password" isRequired fieldId="disable-pwd">
                <TextInput
                  id="disable-pwd"
                  type="password"
                  value={disablePassword}
                  onChange={(_e, val) => setDisablePassword(val)}
                />
              </FormGroup>
            </StackItem>
            <StackItem>
              <FormGroup label="Authenticator Code (or backup code)" isRequired fieldId="disable-code">
                <TextInput
                  id="disable-code"
                  value={disableCode}
                  onChange={(_e, val) => setDisableCode(val)}
                  placeholder="000000"
                />
              </FormGroup>
            </StackItem>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={() => disableMutation.mutate({ password: disablePassword, code: disableCode })}
            isLoading={disableMutation.isPending}
            isDisabled={!disablePassword || !disableCode}
          >
            Disable 2FA
          </Button>
          <Button variant="link" onClick={() => setShowDisableModal(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </Stack>
  );
}
