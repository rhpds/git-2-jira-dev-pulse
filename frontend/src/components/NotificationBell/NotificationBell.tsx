/**
 * Notification Bell - dropdown in the masthead showing recent notifications
 */

import { useState } from "react";
import {
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Badge,
  Divider,
  Spinner,
} from "@patternfly/react-core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: countData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const { data } = await apiClient.get("/notifications/unread-count");
      return data as { unread_count: number };
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30s
  });

  const { data: notifData, isLoading } = useQuery({
    queryKey: ["notifications-recent"],
    queryFn: async () => {
      const { data } = await apiClient.get("/notifications/", {
        params: { limit: 8 },
      });
      return data as {
        notifications: NotificationItem[];
        total: number;
        unread_count: number;
      };
    },
    enabled: isAuthenticated && isOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-recent"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-recent"] });
    },
  });

  if (!isAuthenticated) return null;

  const unreadCount = countData?.unread_count || 0;
  const notifications = notifData?.notifications || [];

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      quota_warning: "\u26a0\ufe0f",
      quota_exceeded: "\ud83d\uded1",
      member_joined: "\ud83d\udc64",
      member_removed: "\ud83d\udc64",
      scan_completed: "\u2705",
      ticket_created: "\ud83c\udfab",
      integration_status: "\ud83d\udd17",
      subscription_changed: "\ud83d\udcb3",
      webhook_failure: "\u274c",
      system: "\u2139\ufe0f",
    };
    return icons[type] || "\ud83d\udd14";
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={() => {}}
      onOpenChange={setIsOpen}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          variant="plain"
          style={{ position: "relative" }}
        >
          <span style={{ fontSize: "1.2rem" }}>{"\ud83d\udd14"}</span>
          {unreadCount > 0 && (
            <Badge
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                fontSize: "0.65rem",
                minWidth: "16px",
                height: "16px",
                lineHeight: "16px",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </MenuToggle>
      )}
      popperProps={{ position: "right" }}
    >
      <DropdownList>
        <DropdownItem
          key="header"
          isDisabled
          style={{ fontWeight: "bold", fontSize: "0.85rem" }}
        >
          Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
        </DropdownItem>
        <Divider key="div-top" />

        {isLoading && (
          <DropdownItem key="loading" isDisabled>
            <Spinner size="sm" /> Loading...
          </DropdownItem>
        )}

        {!isLoading && notifications.length === 0 && (
          <DropdownItem key="empty" isDisabled>
            <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>
              No notifications
            </span>
          </DropdownItem>
        )}

        {notifications.map((n) => (
          <DropdownItem
            key={n.id}
            onClick={() => {
              if (!n.is_read) markReadMutation.mutate(n.id);
            }}
            style={{
              opacity: n.is_read ? 0.6 : 1,
              maxWidth: "320px",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <span>{getTypeIcon(n.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: n.is_read ? "normal" : "bold",
                  fontSize: "0.85rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {n.title}
                </div>
                <div style={{
                  fontSize: "0.75rem",
                  color: "var(--pf-t--global--text--color--subtle)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {n.message}
                </div>
                <div style={{
                  fontSize: "0.7rem",
                  color: "var(--pf-t--global--text--color--subtle)",
                  marginTop: "2px",
                }}>
                  {timeAgo(n.created_at)}
                </div>
              </div>
            </div>
          </DropdownItem>
        ))}

        {notifications.length > 0 && (
          <>
            <Divider key="div-bottom" />
            <DropdownItem
              key="mark-all"
              onClick={() => markAllReadMutation.mutate()}
              style={{ fontSize: "0.8rem", textAlign: "center" }}
            >
              Mark all as read
            </DropdownItem>
          </>
        )}
      </DropdownList>
    </Dropdown>
  );
}
