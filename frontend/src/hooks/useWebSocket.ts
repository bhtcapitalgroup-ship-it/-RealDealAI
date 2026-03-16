import { useEffect, useRef, useState, useCallback } from 'react';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
}

export interface DealAlertPayload {
  id: string;
  address: string;
  price: number;
  score: number;
  cap_rate?: number;
  cash_flow?: number;
  image_url?: string;
}

type MessageHandler = (msg: WsMessage) => void;

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const MAX_RETRIES = 8;
const BASE_DELAY = 1000;

export function useWebSocket(onMessage?: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    const token = localStorage.getItem('rd_token');
    if (!token) {
      setStatus('disconnected');
      return;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const url = `${WS_BASE}/ws/alerts?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      retriesRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data: WsMessage = JSON.parse(event.data);
        onMessageRef.current?.(data);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      setStatus('disconnected');
      if (retriesRef.current < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retriesRef.current);
        retriesRef.current += 1;
        setStatus('reconnecting');
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimerRef.current);
    retriesRef.current = MAX_RETRIES;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const send = useCallback((msg: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => { disconnect(); };
  }, [connect, disconnect]);

  return { status, send, disconnect, reconnect: connect };
}
