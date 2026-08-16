import { describe, it, expect } from "vitest";
import { isValidAttackEvent, ATTACK_TYPES } from "@ddos/shared";

const valid = {
  id: "1",
  timestamp: "2026-01-01T00:00:00.000Z",
  source_lat: 35,
  source_lon: 103,
  source_country: "CN",
  dest_lat: 39.8,
  dest_lon: -98.6,
  dest_country: "US",
  attack_type: "SYN flood",
  volume: 500,
};

describe("isValidAttackEvent", () => {
  it("accepts a valid event", () => {
    expect(isValidAttackEvent(valid)).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(isValidAttackEvent(null)).toBe(false);
    expect(isValidAttackEvent("x")).toBe(false);
    expect(isValidAttackEvent(42)).toBe(false);
  });

  it("rejects lat/lon out of range", () => {
    expect(isValidAttackEvent({ ...valid, source_lat: 91 })).toBe(false);
    expect(isValidAttackEvent({ ...valid, source_lat: -91 })).toBe(false);
    expect(isValidAttackEvent({ ...valid, source_lon: 181 })).toBe(false);
    expect(isValidAttackEvent({ ...valid, source_lon: -181 })).toBe(false);
    expect(isValidAttackEvent({ ...valid, dest_lat: 90 })).toBe(true);
  });

  it("rejects NaN/Infinity volume and coords", () => {
    expect(isValidAttackEvent({ ...valid, volume: NaN })).toBe(false);
    expect(isValidAttackEvent({ ...valid, volume: Infinity })).toBe(false);
  });

  it("rejects bad country codes", () => {
    expect(isValidAttackEvent({ ...valid, source_country: "cn" })).toBe(false);
    expect(isValidAttackEvent({ ...valid, source_country: "USA" })).toBe(false);
    expect(isValidAttackEvent({ ...valid, source_country: "" })).toBe(false);
  });

  it("rejects unknown attack types", () => {
    expect(isValidAttackEvent({ ...valid, attack_type: "nuke" })).toBe(false);
  });

  it("accepts every declared attack type", () => {
    for (const t of ATTACK_TYPES) {
      expect(isValidAttackEvent({ ...valid, attack_type: t })).toBe(true);
    }
  });
});
