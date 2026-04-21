import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Spinner, Bullseye } from "@patternfly/react-core";
import AppLayout from "./components/Layout/AppLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

const ScanPage = lazy(() => import("./pages/ScanPage"));
const WorkDashboardPage = lazy(() => import("./pages/WorkDashboardPage"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const OAuthCallbackPage = lazy(() => import("./pages/OAuthCallbackPage"));
const ActivityFeedPage = lazy(() => import("./pages/ActivityFeedPage"));
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"));
const ShortcutsPage = lazy(() => import("./pages/ShortcutsPage"));
const ChangelogPage = lazy(() => import("./pages/ChangelogPage"));
const StandupPage = lazy(() => import("./pages/StandupPage"));
const FlowAnalyticsPage = lazy(() => import("./pages/FlowAnalyticsPage"));
const ImpactGraphPage = lazy(() => import("./pages/ImpactGraphPage"));
const HealthScoresPage = lazy(() => import("./pages/HealthScoresPage"));
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));

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
              <Suspense fallback={<Bullseye><Spinner size="xl" /></Bullseye>}>
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
                    <Route path="/standups" element={<StandupPage />} />
                    <Route path="/flow" element={<FlowAnalyticsPage />} />
                    <Route path="/impact" element={<ImpactGraphPage />} />
                    <Route path="/health" element={<HealthScoresPage />} />
                    <Route path="/recommendations" element={<RecommendationsPage />} />
                    <Route path="/team" element={<TeamPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
