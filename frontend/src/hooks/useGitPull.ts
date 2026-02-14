import { useState } from "react";
import { getRemoteBranches, gitPull } from "../api/client";
import type { RemoteBranch, RepoInfo } from "../api/types";

interface PullResult {
  success: boolean;
  message: string;
}

export function useGitPull(onSuccess?: () => void) {
  const [pullRepo, setPullRepo] = useState<RepoInfo | null>(null);
  const [remoteBranches, setRemoteBranches] = useState<RemoteBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullResult, setPullResult] = useState<PullResult | null>(null);

  const openPullModal = async (repo: RepoInfo) => {
    setPullRepo(repo);
    setPullResult(null);
    setRemoteBranches([]);
    setLoadingBranches(true);
    try {
      const branches = await getRemoteBranches(repo.path);
      setRemoteBranches(branches);
    } catch {
      setRemoteBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handlePull = async (branch: string) => {
    if (!pullRepo) return;
    setPulling(true);
    setPullResult(null);
    try {
      const result = await gitPull(pullRepo.path, branch);
      if (result.success) {
        setPullResult({
          success: true,
          message: `Pulled ${branch} successfully. Now on: ${result.current_branch}`,
        });
        onSuccess?.();
      } else {
        setPullResult({
          success: false,
          message: result.error || "Pull failed",
        });
      }
    } catch (e) {
      setPullResult({ success: false, message: String(e) });
    } finally {
      setPulling(false);
    }
  };

  const closePullModal = () => setPullRepo(null);

  return {
    pullRepo,
    remoteBranches,
    loadingBranches,
    pulling,
    pullResult,
    openPullModal,
    handlePull,
    closePullModal,
  };
}
