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
    const code = searchParams.get("code");

    if (code) {
      fetch("/api/oauth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Code exchange failed");
          return res.json();
        })
        .then((data) => {
          localStorage.setItem("dp_access_token", data.access_token);
          localStorage.setItem("dp_refresh_token", data.refresh_token);
          setAuthToken(data.access_token);
          return refreshUser();
        })
        .then(() => navigate("/"))
        .catch(() => setError("OAuth login failed"));
    } else {
      setError("OAuth callback missing authorization code");
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
