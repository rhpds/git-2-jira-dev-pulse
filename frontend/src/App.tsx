import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./components/Layout/AppLayout";
import ScanPage from "./pages/ScanPage";
import WorkDashboardPage from "./pages/WorkDashboardPage";
import ResultsPage from "./pages/ResultsPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import OnboardingPage from "./pages/OnboardingPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import ActivityFeedPage from "./pages/ActivityFeedPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import ShortcutsPage from "./pages/ShortcutsPage";
import ChangelogPage from "./pages/ChangelogPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <BrowserRouter>
              <Routes>
                {/* Auth routes (no layout) */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

                {/* App routes */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<ScanPage />} />
                  <Route path="/dashboard" element={<WorkDashboardPage />} />
                  <Route path="/results" element={<ResultsPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/activity" element={<ActivityFeedPage />} />
                  <Route path="/integrations" element={<IntegrationsPage />} />
                  <Route path="/shortcuts" element={<ShortcutsPage />} />
                  <Route path="/changelog" element={<ChangelogPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
