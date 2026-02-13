import { useMutation } from "@tanstack/react-query";
import { analyzeFolders } from "../api/client";

export function useAnalyzeFolders() {
  return useMutation({
    mutationFn: (paths: string[]) => analyzeFolders(paths),
  });
}
