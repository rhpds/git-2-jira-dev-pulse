/**
 * ToastNotifications - Floating toast notifications from WebSocket events
 */

import { motion, AnimatePresence } from "framer-motion";

interface Toast {
  type: string;
  message?: string;
  timestamp?: string;
}

interface ToastNotificationsProps {
  toasts: Toast[];
  onDismiss: (index: number) => void;
}

export function ToastNotifications({ toasts, onDismiss }: ToastNotificationsProps) {
  if (toasts.length === 0) return null;

  const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
    repo_discovered: { bg: "var(--pf-t--color--green--10)", border: "var(--pf-t--color--green--40)", icon: "\u2728" },
    scan_complete: { bg: "var(--pf-t--color--blue--10)", border: "var(--pf-t--color--blue--40)", icon: "\u2705" },
    system: { bg: "var(--pf-t--global--background--color--secondary--default)", border: "var(--pf-t--global--border--color--default)", icon: "\u2139\uFE0F" },
  };

  return (
    <div style={{
      position: "fixed",
      top: "70px",
      right: "16px",
      zIndex: 9990,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      maxWidth: "400px",
    }}>
      <AnimatePresence>
        {toasts.map((toast, i) => {
          const style = typeStyles[toast.type] || typeStyles.system;
          return (
            <motion.div
              key={`${toast.timestamp}-${i}`}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                background: style.bg,
                border: `1px solid ${style.border}`,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
              onClick={() => onDismiss(i)}
            >
              <span style={{ fontSize: "1.2rem" }}>{style.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                  {toast.message || toast.type}
                </div>
                {toast.timestamp && (
                  <div style={{ fontSize: "0.75rem", color: "var(--pf-t--global--text--color--subtle)", marginTop: "2px" }}>
                    {new Date(toast.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
              <span style={{ opacity: 0.5, fontSize: "0.8rem" }}>{"\u2715"}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
