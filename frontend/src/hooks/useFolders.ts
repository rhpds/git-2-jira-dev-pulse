import { useQuery } from "@tanstack/react-query";
import { getFolders } from "../api/client";

export function useFolders() {
  return useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
  });
}
