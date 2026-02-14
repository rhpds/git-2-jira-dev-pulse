/**
 * Login Page
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  LoginPage as PFLoginPage,
  LoginForm,
  ListVariant,
} from "@patternfly/react-core";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      {loginForm}
    </PFLoginPage>
  );
}
