/**
 * CommandPalette - Keyboard-driven command palette (Cmd+K / Ctrl+K)
 * Quick navigation and actions across the app
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Command {
  id: string;
  label: string;
  description: string;
  category: "navigation" | "action" | "settings";
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands: Command[] = [
    // Navigation
    { id: "nav-repos", label: "Go to Repositories", description: "View and scan repositories", category: "navigation", shortcut: "G R", action: () => navigate("/") },
    { id: "nav-dashboard", label: "Go to Dashboard", description: "View work dashboard", category: "navigation", shortcut: "G D", action: () => navigate("/dashboard") },
    { id: "nav-activity", label: "Go to Activity Feed", description: "View recent activity", category: "navigation", shortcut: "G A", action: () => navigate("/activity") },
    { id: "nav-results", label: "Go to Results", description: "View analysis results", category: "navigation", action: () => navigate("/results") },
    { id: "nav-history", label: "Go to History", description: "View scan history", category: "navigation", action: () => navigate("/history") },
    { id: "nav-settings", label: "Go to Settings", description: "Manage configuration", category: "navigation", shortcut: "G S", action: () => navigate("/settings") },
    { id: "nav-integrations", label: "Go to Integrations", description: "Integration health dashboard", category: "navigation", shortcut: "G I", action: () => navigate("/integrations") },
    { id: "nav-admin", label: "Go to Admin", description: "Admin dashboard", category: "navigation", action: () => navigate("/admin") },
    { id: "nav-shortcuts", label: "Keyboard Shortcuts", description: "View all keyboard shortcuts", category: "navigation", shortcut: "?", action: () => navigate("/shortcuts") },
    { id: "nav-changelog", label: "What's New", description: "View changelog and release notes", category: "navigation", action: () => navigate("/changelog") },
    // Actions
    { id: "act-scan", label: "Start New Scan", description: "Scan all repositories", category: "action", action: () => navigate("/") },
    { id: "act-report", label: "Download Report", description: "Generate organization report", category: "action", action: () => { downloadReport(); } },
    { id: "act-logout", label: "Sign Out", description: "Log out of your account", category: "action", action: () => { localStorage.removeItem("access_token"); navigate("/login"); } },
    // Settings
    { id: "set-profile", label: "Edit Profile", description: "Update your profile settings", category: "settings", action: () => navigate("/settings") },
    { id: "set-security", label: "Security Settings", description: "Manage 2FA and sessions", category: "settings", action: () => navigate("/settings") },
    { id: "set-billing", label: "Billing", description: "Manage subscription and billing", category: "settings", action: () => navigate("/settings") },
    { id: "set-schedules", label: "Scan Schedules", description: "Manage automated scans", category: "settings", action: () => navigate("/settings") },
  ];

  const downloadReport = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://localhost:9000/api/reports/organization?format=text", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `devpulse_report_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    }
  };

  const filtered = query.trim()
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const execute = useCallback(
    (cmd: Command) => {
      close();
      cmd.action();
    },
    [close]
  );

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      execute(filtered[selectedIndex]);
    }
  };

  const categoryIcon = (cat: string) => {
    if (cat === "navigation") return "\u{2192}";
    if (cat === "action") return "\u{26A1}";
    return "\u{2699}";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 9998,
            }}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              top: "20%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(600px, 90vw)",
              background: "var(--pf-t--global--background--color--primary--default)",
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
              border: "1px solid var(--pf-t--global--border--color--default)",
              zIndex: 9999,
              overflow: "hidden",
            }}
          >
            {/* Search Input */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--pf-t--global--border--color--default)",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "16px",
                  color: "var(--pf-t--global--text--color--regular)",
                  padding: "4px 0",
                }}
              />
            </div>

            {/* Results */}
            <div style={{ maxHeight: "400px", overflowY: "auto", padding: "8px 0" }}>
              {filtered.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "var(--pf-t--global--text--color--subtle)",
                  }}
                >
                  No commands found
                </div>
              ) : (
                filtered.map((cmd, i) => (
                  <div
                    key={cmd.id}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      cursor: "pointer",
                      background:
                        i === selectedIndex
                          ? "var(--pf-t--global--background--color--action--plain--hover)"
                          : "transparent",
                      transition: "background 0.1s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "14px", opacity: 0.6 }}>
                        {categoryIcon(cmd.category)}
                      </span>
                      <div>
                        <div
                          style={{
                            fontWeight: 500,
                            color: "var(--pf-t--global--text--color--regular)",
                          }}
                        >
                          {cmd.label}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--pf-t--global--text--color--subtle)",
                          }}
                        >
                          {cmd.description}
                        </div>
                      </div>
                    </div>
                    {cmd.shortcut && (
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "var(--pf-t--global--background--color--secondary--default)",
                          color: "var(--pf-t--global--text--color--subtle)",
                          fontFamily: "monospace",
                        }}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "8px 16px",
                borderTop: "1px solid var(--pf-t--global--border--color--default)",
                display: "flex",
                gap: "16px",
                fontSize: "11px",
                color: "var(--pf-t--global--text--color--subtle)",
              }}
            >
              <span>
                <kbd style={{ padding: "1px 4px", borderRadius: "3px", background: "var(--pf-t--global--background--color--secondary--default)" }}>
                  {"\u2191\u2193"}
                </kbd>{" "}
                navigate
              </span>
              <span>
                <kbd style={{ padding: "1px 4px", borderRadius: "3px", background: "var(--pf-t--global--background--color--secondary--default)" }}>
                  {"\u23CE"}
                </kbd>{" "}
                select
              </span>
              <span>
                <kbd style={{ padding: "1px 4px", borderRadius: "3px", background: "var(--pf-t--global--background--color--secondary--default)" }}>
                  esc
                </kbd>{" "}
                close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
