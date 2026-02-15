/**
 * useFavorites - Hook for managing repository favorites
 */

import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:9000" });
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("access_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

interface Favorite {
  id: number;
  repo_path: string;
  repo_name: string;
  created_at: string | null;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesList, setFavoritesList] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await API.get("/api/favorites/");
      const favs: Favorite[] = res.data.favorites || [];
      setFavoritesList(favs);
      setFavorites(new Set(favs.map((f) => f.repo_path)));
    } catch {
      // Not authenticated or error - just use empty set
      setFavorites(new Set());
      setFavoritesList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(
    async (repoPath: string, repoName?: string) => {
      const isFav = favorites.has(repoPath);
      // Optimistic update
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(repoPath);
        else next.add(repoPath);
        return next;
      });

      try {
        if (isFav) {
          await API.delete(`/api/favorites/${encodeURIComponent(repoPath)}`);
        } else {
          await API.post("/api/favorites/", {
            repo_path: repoPath,
            repo_name: repoName,
          });
        }
      } catch {
        // Revert on error
        setFavorites((prev) => {
          const next = new Set(prev);
          if (isFav) next.add(repoPath);
          else next.delete(repoPath);
          return next;
        });
      }
    },
    [favorites]
  );

  const isFavorite = useCallback(
    (repoPath: string) => favorites.has(repoPath),
    [favorites]
  );

  return {
    favorites,
    favoritesList,
    loading,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
