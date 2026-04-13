import { useState, useEffect, useRef, useCallback } from 'react';

const WS_BASE = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL?.replace(/^http/, 'ws') || 'ws://localhost:8000';
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;

/**
 * useWebSocketChat — real-time chat hook for invoice rooms.
 *
 * @param {string} invoiceId  - The invoice UUID to connect to
 * @param {object} options
 * @param {boolean} options.enabled   - Connect only when true (e.g. chat tab active)
 * @param {function} options.getToken - Clerk getToken() function
 * @param {function} options.onMessage - Called with each incoming message object
 * @returns {{ connected: boolean, sendMessage: function }}
 */
export function useWebSocketChat(invoiceId, { enabled, getToken, onMessage }) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const connect = useCallback(async () => {
    if (!isMountedRef.current || !invoiceId) return;

    try {
      const token = await getToken();
      if (!token || !isMountedRef.current) return;

      const url = `${WS_BASE}/api/v1/ws/chat/${invoiceId}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) { ws.close(); return; }
        retryCountRef.current = 0;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) return; // server-side error frame, ignore
          onMessage?.(msg);
        } catch {
          // malformed frame — ignore
        }
      };

      ws.onerror = () => {
        // onerror is always followed by onclose — handle reconnect there
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) return;
        setConnected(false);
        wsRef.current = null;

        // Don't reconnect on auth errors (4001, 4003, 4004)
        if (event.code >= 4001 && event.code <= 4004) return;

        if (retryCountRef.current < MAX_RETRIES) {
          const delay = BASE_BACKOFF_MS * Math.pow(2, retryCountRef.current);
          retryCountRef.current += 1;
          retryTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) connect();
          }, delay);
        }
      };
    } catch {
      // getToken failed — don't retry
    }
  }, [invoiceId, getToken, onMessage]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled && invoiceId) {
      retryCountRef.current = 0;
      connect();
    }

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [enabled, invoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback((content, fileUrl = null, fileName = null) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ content, file_url: fileUrl, file_name: fileName }));
    }
  }, []);

  return { connected, sendMessage };
}
