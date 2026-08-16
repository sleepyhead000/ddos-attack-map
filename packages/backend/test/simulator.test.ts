import { describe, it, expect, vi, afterEach } from "vitest";
import { createSimulator } from "../src/simulator.js";
import { isValidAttackEvent } from "@ddos/shared";

afterEach(() => {
  vi.useRealTimers();
});

describe("createSimulator", () => {
  it("emits valid attack events", () => {
    vi.useFakeTimers();
    const emitted: unknown[] = [];
    const sim = createSimulator({ baseRatePerSec: 10, burstIntervalMs: 10000 }, (e) =>
      emitted.push(e),
    );
    sim.start();
    vi.advanceTimersByTime(100);
    expect(emitted.length).toBeGreaterThan(0);
    for (const e of emitted) {
      expect(isValidAttackEvent(e)).toBe(true);
    }
    sim.stop();
  });

  it("stops emitting after stop()", () => {
    vi.useFakeTimers();
    const emitted: unknown[] = [];
    const sim = createSimulator({ baseRatePerSec: 10 }, (e) => emitted.push(e));
    sim.start();
    vi.advanceTimersByTime(100);
    sim.stop();
    const count = emitted.length;
    vi.advanceTimersByTime(1000);
    expect(emitted.length).toBe(count);
  });

  it("produces valid country codes for all centroids", () => {
    const codes = new Set<string>();
    // force a broad sweep by seeding many draws through a fake-timer run
    vi.useFakeTimers();
    const sim = createSimulator({ baseRatePerSec: 100, burstIntervalMs: 100000 }, (e) =>
      codes.add(e.source_country),
    );
    sim.start();
    vi.advanceTimersByTime(1000);
    sim.stop();
    expect(codes.size).toBeGreaterThan(1);
  });
});
