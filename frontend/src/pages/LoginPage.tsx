/**
 * Login Page
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  LoginPage as PFLoginPage,
  LoginForm,
  Button,
  Divider,
} from "@patternfly/react-core";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [githubConfigured, setGithubConfigured] = useState(false);

  useEffect(() => {
    api.get("/oauth/github/status").then(({ data }) => {
      setGithubConfigured(data.configured);
    }).catch(() => {});
  }, []);

  const handleLogin = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    try {
      const { data } = await api.get("/oauth/github/authorize");
      window.location.href = data.authorize_url;
    } catch (err: any) {
      setError("Failed to start GitHub login");
    }
  };

  const loginForm = (
    <LoginForm
      showHelperText={!!error}
      helperText={error}
      helperTextIcon={undefined}
      usernameLabel="Email"
      usernameValue={email}
      onChangeUsername={(_e, val) => setEmail(val)}
      isValidUsername={true}
      passwordLabel="Password"
      passwordValue={password}
      onChangePassword={(_e, val) => setPassword(val)}
      isShowPasswordEnabled
      showPasswordAriaLabel="Show password"
      hidePasswordAriaLabel="Hide password"
      isValidPassword={true}
      onLoginButtonClick={handleLogin}
      loginButtonLabel={isLoading ? "Signing in..." : "Sign In"}
      isLoginButtonDisabled={isLoading || !email || !password}
    />
  );

  return (
    <PFLoginPage
      loginTitle="Sign in to DevPulse Pro"
      loginSubtitle="Enter your credentials to access your dashboard"
      signUpForAccountMessage={
        <span>
          Don't have an account?{" "}
          <Link to="/register">Create one</Link>
        </span>
      }
    >
      {githubConfigured && (
        <>
          <Button
            variant="secondary"
            isBlock
            onClick={handleGitHubLogin}
            style={{
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Sign in with GitHub
          </Button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              margin: "1rem 0",
              color: "var(--pf-t--global--text--color--subtle)",
              fontSize: "0.85rem",
            }}
          >
            <Divider style={{ flex: 1 }} />
            <span>or</span>
            <Divider style={{ flex: 1 }} />
          </div>
        </>
      )}
      {loginForm}
    </PFLoginPage>
  );
}
