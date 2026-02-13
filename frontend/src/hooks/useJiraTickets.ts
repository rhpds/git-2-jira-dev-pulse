import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createBatch,
  getProjects,
  getRepoTickets,
  suggestTickets,
} from "../api/client";
import type { TicketCreateRequest, WorkSummary } from "../api/types";

export function useProjects() {
  return useQuery({
    queryKey: ["jira-projects"],
    queryFn: getProjects,
  });
}

export function useSuggestTickets() {
  return useMutation({
    mutationFn: ({
      summaries,
      projectKey,
    }: {
      summaries: WorkSummary[];
      projectKey: string;
    }) => suggestTickets(summaries, projectKey),
  });
}

export function useCreateBatch() {
  return useMutation({
    mutationFn: (tickets: TicketCreateRequest[]) => createBatch(tickets),
  });
}

export function useRepoTickets(
  projectKey: string,
  repoName: string,
  since?: string
) {
  return useQuery({
    queryKey: ["repo-tickets", projectKey, repoName, since],
    queryFn: () => getRepoTickets(projectKey, repoName, since),
    enabled: !!projectKey && !!repoName,
    staleTime: 5 * 60 * 1000,
  });
}
