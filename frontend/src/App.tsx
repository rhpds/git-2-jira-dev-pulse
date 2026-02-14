import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./components/Layout/AppLayout";
import ScanPage from "./pages/ScanPage";
import WorkDashboardPage from "./pages/WorkDashboardPage";
import ResultsPage from "./pages/ResultsPage";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<ScanPage />} />
              <Route path="/dashboard" element={<WorkDashboardPage />} />
              <Route path="/results" element={<ResultsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
