import type { WorkSummary } from "../api/types";

export function setAnalysisResults(results: WorkSummary[]) {
  sessionStorage.setItem("analysisResults", JSON.stringify(results));
}

export function getAnalysisResults(): WorkSummary[] | null {
  const stored = sessionStorage.getItem("analysisResults");
  return stored ? JSON.parse(stored) : null;
}
