import { useState, useMemo } from "react";
import type { RepoInfo } from "../api/types";

type ActivityFilter = "all" | "active" | "inactive";
type StatusFilter = "all" | "clean" | "dirty";

export function useRepoFilters(repos: RepoInfo[] | undefined) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Get unique branches
  const branches = useMemo(() => {
    if (!repos) return [];
    const uniqueBranches = new Set(repos.map((r) => r.current_branch));
    return Array.from(uniqueBranches).sort();
  }, [repos]);

  // Apply filters
  const filteredRepos = useMemo(() => {
    if (!repos) return [];

    return repos.filter((repo) => {
      // Search filter
      if (searchTerm && !repo.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Activity filter
      if (activityFilter === "active" && repo.uncommitted_count === 0 && repo.recent_commit_count === 0) {
        return false;
      }
      if (activityFilter === "inactive" && (repo.uncommitted_count > 0 || repo.recent_commit_count > 0)) {
        return false;
      }

      // Status filter
      if (statusFilter === "clean" && repo.status !== "clean") {
        return false;
      }
      if (statusFilter === "dirty" && repo.status !== "dirty") {
        return false;
      }

      // Branch filter
      if (selectedBranch !== "all" && repo.current_branch !== selectedBranch) {
        return false;
      }

      return true;
    });
  }, [repos, searchTerm, activityFilter, statusFilter, selectedBranch]);

  const clearFilters = () => {
    setSearchTerm("");
    setActivityFilter("all");
    setStatusFilter("all");
    setSelectedBranch("all");
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    activityFilter !== "all" ||
    statusFilter !== "all" ||
    selectedBranch !== "all";

  return {
    searchTerm,
    setSearchTerm,
    activityFilter,
    setActivityFilter,
    statusFilter,
    setStatusFilter,
    selectedBranch,
    setSelectedBranch,
    branches,
    filteredRepos,
    clearFilters,
    hasActiveFilters,
    totalCount: repos?.length ?? 0,
    filteredCount: filteredRepos.length,
  };
}
