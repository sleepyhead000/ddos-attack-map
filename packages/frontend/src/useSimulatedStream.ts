import { useEffect, useRef, useState, useCallback } from "react";
import { AttackEvent, randomAttackEvent } from "@ddos/shared";

export type SimState = "running" | "paused";

export interface UseSimulatedStreamOptions {
  onEvents: (events: AttackEvent[]) => void;
  baseRatePerSec?: number;
  burstIntervalMs?: number;
  burstMultiplier?: number;
  burstDurationMs?: number;
}

/**
 * Generates simulated attack events in the browser so the map runs as a fully
 * static site (Vercel / GitHub Pages) with no backend. Mirrors the server
 * simulator's surge/lull burst pattern.
 */
export function useSimulatedStream({
  onEvents,
  baseRatePerSec = 50,
  burstIntervalMs = 8000,
  burstMultiplier = 4,
  burstDurationMs = 1500,
}: UseSimulatedStreamOptions) {
  const [state, setState] = useState<SimState>("running");
  const onEventsRef = useRef(onEvents);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstRef = useRef(false);
  const burstActiveAtRef = useRef(0);

  useEffect(() => {
    onEventsRef.current = onEvents;
  }, [onEvents]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const rate =
        burstRef.current && now - burstActiveAtRef.current < burstDurationMs
          ? baseRatePerSec * burstMultiplier
          : baseRatePerSec;
      const count = Math.max(1, Math.round(rate / 10));
      const batch: AttackEvent[] = [];
      for (let i = 0; i < count; i++) batch.push(randomAttackEvent());
      onEventsRef.current(batch);
    };

    const scheduleBurst = () => {
      burstRef.current = true;
      burstActiveAtRef.current = Date.now();
      burstTimerRef.current = setTimeout(() => {
        burstRef.current = false;
        burstTimerRef.current = setTimeout(scheduleBurst, burstIntervalMs);
      }, burstDurationMs);
    };

    timerRef.current = setInterval(tick, 100);
    scheduleBurst();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
      timerRef.current = null;
      burstTimerRef.current = null;
      burstRef.current = false;
    };
  }, [baseRatePerSec, burstIntervalMs, burstMultiplier, burstDurationMs]);

  const pause = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setState("paused");
  }, []);

  return { state, pause };
}
