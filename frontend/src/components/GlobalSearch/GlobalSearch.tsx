/**
 * Global Search - Search bar in the masthead with dropdown results
 * Supports Cmd+K keyboard shortcut
 */

import { useState, useEffect, useRef } from "react";
import {
  TextInput,
  Label,
  Spinner,
} from "@patternfly/react-core";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

interface SearchResult {
  type: string;
  id: number;
  title: string;
  description: string;
  timestamp: string | null;
  link: string | null;
}

export function GlobalSearch() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: searchData, isLoading } = useQuery({
    queryKey: ["global-search", query],
    queryFn: async () => {
      const { data } = await apiClient.get("/search/", { params: { q: query } });
      return data as { query: string; results: SearchResult[]; total: number };
    },
    enabled: isAuthenticated && query.length >= 2,
  });

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isAuthenticated) return null;

  const results = searchData?.results || [];

  const typeColors: Record<string, string> = {
    audit_log: "purple",
    member: "blue",
    webhook: "orange",
    notification: "green",
  };

  const typeIcons: Record<string, string> = {
    audit_log: "\ud83d\udccb",
    member: "\ud83d\udc64",
    webhook: "\ud83d\udd17",
    notification: "\ud83d\udd14",
  };

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    if (result.link) {
      navigate(result.link);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <TextInput
        ref={inputRef}
        type="search"
        aria-label="Global search"
        placeholder="Search... (\u2318K)"
        value={query}
        onChange={(_e, val) => {
          setQuery(val);
          if (val.length >= 2) setIsOpen(true);
        }}
        onFocus={() => {
          if (query.length >= 2) setIsOpen(true);
        }}
        style={{
          width: "220px",
          fontSize: "0.85rem",
        }}
      />

      {/* Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "4px",
            width: "360px",
            maxHeight: "400px",
            overflowY: "auto",
            background: "var(--pf-t--global--background--color--primary--default)",
            border: "1px solid var(--pf-t--global--border--color--default)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          {isLoading && (
            <div style={{ padding: "1rem", textAlign: "center" }}>
              <Spinner size="sm" /> Searching...
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div style={{
              padding: "1.5rem",
              textAlign: "center",
              color: "var(--pf-t--global--text--color--subtle)",
              fontSize: "0.85rem",
            }}>
              No results for "{query}"
            </div>
          )}

          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              style={{
                padding: "0.75rem 1rem",
                cursor: "pointer",
                borderBottom: "1px solid var(--pf-t--global--border--color--default)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "var(--pf-t--global--background--color--secondary--default)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <span>{typeIcons[result.type] || "\ud83d\udd0d"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{
                      fontWeight: "bold",
                      fontSize: "0.85rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}>
                      {result.title}
                    </span>
                    <Label isCompact color={typeColors[result.type] || "grey"}>
                      {result.type.replace("_", " ")}
                    </Label>
                  </div>
                  <div style={{
                    fontSize: "0.75rem",
                    color: "var(--pf-t--global--text--color--subtle)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: "2px",
                  }}>
                    {result.description}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {results.length > 0 && (
            <div style={{
              padding: "0.5rem 1rem",
              fontSize: "0.75rem",
              color: "var(--pf-t--global--text--color--subtle)",
              textAlign: "center",
            }}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
