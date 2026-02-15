/**
 * useWebSocket - Real-time WebSocket hook with reconnection and toast notifications
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface WSMessage {
  type: string;
  message?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface UseWebSocketOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (msg: WSMessage) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = "ws://localhost:9000/ws/notifications",
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    onMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [toasts, setToasts] = useState<WSMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback((index: number) => {
    setToasts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          setLastMessage(msg);

          // Show toast for specific message types
          if (msg.type === "repo_discovered" || msg.type === "scan_complete" || msg.type === "system") {
            if (msg.type !== "heartbeat" && msg.type !== "pong") {
              setToasts((prev) => [...prev.slice(-4), msg]); // keep last 5
              // Auto-dismiss after 8 seconds
              setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t !== msg));
              }, 8000);
            }
          }

          onMessage?.(msg);
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectCountRef.current < maxReconnectAttempts) {
          reconnectCountRef.current += 1;
          reconnectTimerRef.current = setTimeout(connect, reconnectInterval);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      // ignore connection errors
    }
  }, [url, reconnectInterval, maxReconnectAttempts, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    toasts,
    dismissToast,
    sendMessage,
  };
}
