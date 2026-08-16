import { useEffect, useRef, useState, useCallback } from "react";
import { AttackEvent, isValidAttackEvent } from "@ddos/shared";

export type ConnectionState = "connected" | "reconnecting" | "offline";

export interface UseAttackStreamOptions {
  url: string;
  /** Called with a batch of validated attack events. */
  onEvents: (events: AttackEvent[]) => void;
  /** Called when the arc buffer/UI should clear (e.g. reconnect). */
  onReset?: () => void;
  maxRetries?: number;
}

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

/**
 * Maintains a WebSocket to the attack event stream with exponential backoff
 * reconnect and a connection-state indicator. A wall display must never freeze
 * silently on a dropped socket.
 */
export function useAttackStream({ url, onEvents, onReset, maxRetries = Infinity }: UseAttackStreamOptions) {
  const [state, setState] = useState<ConnectionState>("reconnecting");
  const onEventsRef = useRef(onEvents);
  const onResetRef = useRef(onReset);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const aliveRef = useRef(true);

  useEffect(() => {
    onEventsRef.current = onEvents;
    onResetRef.current = onReset;
  }, [onEvents, onReset]);

  const connect = useCallback(() => {
    if (!aliveRef.current) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      setState("offline");
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      setState("connected");
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data as string);
        if (Array.isArray(data)) {
          const events = data.filter(isValidAttackEvent);
          if (events.length > 0) onEventsRef.current(events);
        } else if (isValidAttackEvent(data)) {
          onEventsRef.current([data]);
        }
      } catch {
        // Ignore malformed frames; keep the stream alive.
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
      if (!aliveRef.current) return;
      retriesRef.current += 1;
      if (retriesRef.current > maxRetries) {
        setState("offline");
        return;
      }
      setState("reconnecting");
      const delay = Math.min(BASE_DELAY_MS * 2 ** (retriesRef.current - 1), MAX_DELAY_MS);
      onResetRef.current?.();
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  }, [url, maxRetries]);

  useEffect(() => {
    aliveRef.current = true;
    connect();
    return () => {
      aliveRef.current = false;
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [connect]);

  return state;
}
