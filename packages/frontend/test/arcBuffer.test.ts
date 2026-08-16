import { describe, it, expect } from "vitest";
import { ArcBuffer } from "../src/arcBuffer";

const item = (id: string, country = "CN", type: string = "SYN flood") => ({
  id,
  source_country: country,
  attack_type: type as any,
});

describe("ArcBuffer", () => {
  it("tracks size and evicts oldest past capacity", () => {
    const buf = new ArcBuffer(2);
    buf.add(item("a"));
    buf.add(item("b"));
    expect(buf.size).toBe(2);
    const evicted = buf.add(item("c"));
    expect(evicted).toEqual(item("a"));
    expect(buf.size).toBe(2);
  });

  it("ignores duplicate ids", () => {
    const buf = new ArcBuffer(10);
    buf.add(item("a"));
    buf.add(item("a"));
    expect(buf.size).toBe(1);
  });

  it("derives topCountries from the current sample", () => {
    const buf = new ArcBuffer(100);
    buf.add(item("1", "CN"));
    buf.add(item("2", "US"));
    buf.add(item("3", "US"));
    expect(buf.topCountries(2)).toEqual([
      { country: "US", count: 2 },
      { country: "CN", count: 1 },
    ]);
  });

  it("decrements counts on eviction", () => {
    const buf = new ArcBuffer(2);
    buf.add(item("1", "US"));
    buf.add(item("2", "US"));
    buf.add(item("3", "CN")); // evicts "1" US
    expect(buf.topCountries(2)).toEqual([
      { country: "US", count: 1 },
      { country: "CN", count: 1 },
    ]);
  });

  it("removes a country entirely at zero", () => {
    const buf = new ArcBuffer(2);
    buf.add(item("1", "US"));
    buf.add(item("2", "US"));
    buf.add(item("3", "US")); // evicts "1", still US
    buf.add(item("4", "US")); // evicts "2", US count now 1 (from 3,4)
    expect(buf.topCountries(5)).toEqual([{ country: "US", count: 2 }]);
  });

  it("tracks type breakdown", () => {
    const buf = new ArcBuffer(100);
    buf.add(item("1", "CN", "SYN flood"));
    buf.add(item("2", "US", "UDP flood"));
    buf.add(item("3", "RU", "SYN flood"));
    const breakdown = buf.typeBreakdown();
    expect(breakdown[0]).toEqual({ type: "SYN flood", count: 2 });
    expect(breakdown[1]).toEqual({ type: "UDP flood", count: 1 });
  });

  it("clear resets everything", () => {
    const buf = new ArcBuffer(100);
    buf.add(item("1", "CN", "SYN flood"));
    buf.clear();
    expect(buf.size).toBe(0);
    expect(buf.topCountries(5)).toEqual([]);
    expect(buf.typeBreakdown()).toEqual([]);
  });
});
