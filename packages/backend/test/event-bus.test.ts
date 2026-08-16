import { describe, it, expect, vi } from "vitest";
import { EventBus } from "../src/event-bus.js";
import { AttackEvent } from "@ddos/shared";

const makeEvent = (id: string): AttackEvent => ({
  id,
  timestamp: "2026-01-01T00:00:00.000Z",
  source_lat: 35,
  source_lon: 103,
  source_country: "CN",
  dest_lat: 39.8,
  dest_lon: -98.6,
  dest_country: "US",
  attack_type: "SYN flood",
  volume: 500,
});

describe("EventBus", () => {
  it("does not flush when empty", () => {
    vi.useFakeTimers();
    const bus = new EventBus({ batchWindowMs: 100 });
    const fn = vi.fn();
    bus.subscribe(fn);
    bus.start();
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
    bus.stop();
    vi.useRealTimers();
  });

  it("batches events and flushes once per window", () => {
    vi.useFakeTimers();
    const bus = new EventBus({ batchWindowMs: 100 });
    const fn = vi.fn();
    bus.subscribe(fn);
    bus.start();
    bus.publish(makeEvent("a"));
    bus.publish(makeEvent("b"));
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith([makeEvent("a"), makeEvent("b")]);
    bus.stop();
    vi.useRealTimers();
  });

  it("delivers to all subscribers", () => {
    vi.useFakeTimers();
    const bus = new EventBus({ batchWindowMs: 100 });
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    bus.subscribe(fn1);
    bus.subscribe(fn2);
    bus.start();
    bus.publish(makeEvent("a"));
    vi.advanceTimersByTime(100);
    expect(fn1).toHaveBeenCalled();
    expect(fn2).toHaveBeenCalled();
    bus.stop();
    vi.useRealTimers();
  });

  it("ignores invalid events at publish", () => {
    const bus = new EventBus({ batchWindowMs: 100 });
    const fn = vi.fn();
    bus.subscribe(fn);
    bus.publish({ ...makeEvent("a"), source_lat: 999 } as unknown as AttackEvent);
    bus.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it("a failing subscriber does not block others", () => {
    vi.useFakeTimers();
    const bus = new EventBus({ batchWindowMs: 100 });
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    bus.subscribe(bad);
    bus.subscribe(good);
    bus.start();
    bus.publish(makeEvent("a"));
    vi.advanceTimersByTime(100);
    expect(good).toHaveBeenCalled();
    bus.stop();
    vi.useRealTimers();
  });

  it("unsubscribe removes a subscriber", () => {
    vi.useFakeTimers();
    const bus = new EventBus({ batchWindowMs: 100 });
    const fn = vi.fn();
    const unsub = bus.subscribe(fn);
    unsub();
    bus.start();
    bus.publish(makeEvent("a"));
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
    bus.stop();
    vi.useRealTimers();
  });
});
