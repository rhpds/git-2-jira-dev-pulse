import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAnalysisHistory,
  getAnalysisRun,
  deleteAnalysisRun,
  restoreAnalysisRun,
} from "../api/client";

export function useAnalysisHistory(limit = 50, projectKey?: string) {
  return useQuery({
    queryKey: ["analysisHistory", limit, projectKey],
    queryFn: () => getAnalysisHistory(limit, projectKey),
  });
}

export function useAnalysisRun(runId: number | null) {
  return useQuery({
    queryKey: ["analysisRun", runId],
    queryFn: () => getAnalysisRun(runId!),
    enabled: runId !== null,
  });
}

export function useDeleteAnalysisRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAnalysisRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysisHistory"] });
    },
  });
}

export function useRestoreAnalysisRun() {
  return useMutation({
    mutationFn: restoreAnalysisRun,
  });
}
