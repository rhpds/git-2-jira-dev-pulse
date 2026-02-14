/**
 * Registration Page
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  PageSection,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  Button,
  Alert,
  Stack,
  StackItem,
  Title,
  ActionGroup,
} from "@patternfly/react-core";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, fullName, orgName || undefined);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageSection
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ width: "100%", maxWidth: "480px" }}
      >
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h1" size="2xl" style={{ textAlign: "center" }}>
              Create your DevPulse Pro account
            </Title>
            <p
              style={{
                textAlign: "center",
                marginTop: "0.5rem",
                color: "var(--pf-t--global--text--color--subtle)",
              }}
            >
              Start your free trial with 5 repositories
            </p>
          </StackItem>

          <StackItem>
            <Card>
              <CardBody>
                {error && (
                  <Alert
                    variant="danger"
                    title={error}
                    isInline
                    style={{ marginBottom: "1rem" }}
                  />
                )}

                <Form>
                  <FormGroup label="Full Name" isRequired fieldId="full-name">
                    <TextInput
                      id="full-name"
                      value={fullName}
                      onChange={(_e, val) => setFullName(val)}
                      isRequired
                      placeholder="John Doe"
                    />
                  </FormGroup>

                  <FormGroup label="Email" isRequired fieldId="email">
                    <TextInput
                      id="email"
                      type="email"
                      value={email}
                      onChange={(_e, val) => setEmail(val)}
                      isRequired
                      placeholder="john@example.com"
                    />
                  </FormGroup>

                  <FormGroup label="Password" isRequired fieldId="password">
                    <TextInput
                      id="password"
                      type="password"
                      value={password}
                      onChange={(_e, val) => setPassword(val)}
                      isRequired
                      placeholder="Minimum 8 characters"
                    />
                  </FormGroup>

                  <FormGroup
                    label="Confirm Password"
                    isRequired
                    fieldId="confirm-password"
                  >
                    <TextInput
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(_e, val) => setConfirmPassword(val)}
                      isRequired
                    />
                  </FormGroup>

                  <FormGroup
                    label="Organization Name"
                    fieldId="org-name"
                    helperText="Optional. A workspace will be created for you."
                  >
                    <TextInput
                      id="org-name"
                      value={orgName}
                      onChange={(_e, val) => setOrgName(val)}
                      placeholder="My Team"
                    />
                  </FormGroup>

                  <ActionGroup>
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      isLoading={isLoading}
                      isDisabled={
                        isLoading || !email || !password || !fullName
                      }
                      isBlock
                    >
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </ActionGroup>
                </Form>

                <p
                  style={{
                    textAlign: "center",
                    marginTop: "1.5rem",
                    color: "var(--pf-t--global--text--color--subtle)",
                  }}
                >
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
              </CardBody>
            </Card>
          </StackItem>
        </Stack>
      </motion.div>
    </PageSection>
  );
}
