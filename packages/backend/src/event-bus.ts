import { AttackEvent, isValidAttackEvent } from "@ddos/shared";

export interface EventBusOptions {
  batchWindowMs: number;
}

export const DEFAULT_EVENT_BUS_OPTIONS: EventBusOptions = { batchWindowMs: 100 };

/**
 * Collects events and flushes them once per batch window to all subscribers.
 * Prevents flooding subscribers with one message per event.
 */
export class EventBus {
  private buffer: AttackEvent[] = [];
  private subscribers = new Set<(events: AttackEvent[]) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly batchWindowMs: number;

  constructor(options: Partial<EventBusOptions> = {}) {
    this.batchWindowMs = options.batchWindowMs ?? DEFAULT_EVENT_BUS_OPTIONS.batchWindowMs;
  }

  publish(event: AttackEvent): void {
    if (!isValidAttackEvent(event)) return;
    this.buffer.push(event);
  }

  subscribe(fn: (events: AttackEvent[]) => void): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.batchWindowMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.buffer = [];
  }

  flush(): void {
    if (this.buffer.length === 0) return;
    const batch = this.buffer;
    this.buffer = [];
    for (const fn of this.subscribers) {
      try {
        fn(batch);
      } catch {
        // A failing subscriber must not break delivery to the others.
      }
    }
  }
}
