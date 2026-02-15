/**
 * OAuth Callback Page
 * Handles the redirect from OAuth providers (GitHub)
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PageSection,
  Spinner,
  Alert,
  Button,
  Stack,
  StackItem,
} from "@patternfly/react-core";
import { setAuthToken } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (accessToken && refreshToken) {
      // Store tokens
      localStorage.setItem("dp_access_token", accessToken);
      localStorage.setItem("dp_refresh_token", refreshToken);
      setAuthToken(accessToken);

      // Refresh user profile and redirect
      refreshUser()
        .then(() => navigate("/"))
        .catch(() => {
          setError("Failed to load profile after login");
        });
    } else {
      setError("OAuth callback missing tokens");
    }
  }, [searchParams, navigate, refreshUser]);

  if (error) {
    return (
      <PageSection>
        <Stack hasGutter>
          <StackItem>
            <Alert variant="danger" title="Authentication Error">
              {error}
            </Alert>
          </StackItem>
          <StackItem>
            <Button variant="primary" onClick={() => navigate("/login")}>
              Back to Login
            </Button>
          </StackItem>
        </Stack>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <div style={{ textAlign: "center", padding: "4rem 0" }}>
        <Spinner size="xl" />
        <p style={{ marginTop: "1rem", color: "var(--pf-t--global--text--color--subtle)" }}>
          Completing sign in...
        </p>
      </div>
    </PageSection>
  );
}
