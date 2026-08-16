import { AttackType } from "@ddos/shared";

export interface ArcItem {
  id: string;
  source_country: string;
  attack_type: AttackType;
}

/**
 * Incremental running counters over a bounded sample of arcs.
 * Increment on add, decrement on evict — O(1) per event, never a full recount
 * at burst rate. Top-N is a sorted slice of the count map.
 */
export class ArcBuffer {
  private items: ArcItem[] = [];
  private byId = new Map<string, ArcItem>();
  private countryCounts = new Map<string, number>();
  private typeCounts = new Map<string, number>();
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get size(): number {
    return this.items.length;
  }

  get full(): boolean {
    return this.items.length >= this.capacity;
  }

  /** Adds an arc. Returns the evicted item (when over capacity) or null. */
  add(item: ArcItem): ArcItem | null {
    let evicted: ArcItem | null = null;
    if (this.byId.has(item.id)) return null;
    if (this.items.length >= this.capacity) {
      evicted = this.items.shift()!;
      this.byId.delete(evicted.id);
      this.decrement(evicted);
    }
    this.items.push(item);
    this.byId.set(item.id, item);
    this.increment(item);
    return evicted;
  }

  /** Removes all arcs and resets counts. */
  clear(): void {
    this.items = [];
    this.byId.clear();
    this.countryCounts.clear();
    this.typeCounts.clear();
  }

  topCountries(n: number): { country: string; count: number }[] {
    return [...this.countryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([country, count]) => ({ country, count }));
  }

  typeBreakdown(): { type: string; count: number }[] {
    return [...this.typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  }

  private increment(item: ArcItem) {
    this.countryCounts.set(item.source_country, (this.countryCounts.get(item.source_country) ?? 0) + 1);
    this.typeCounts.set(item.attack_type, (this.typeCounts.get(item.attack_type) ?? 0) + 1);
  }

  private decrement(item: ArcItem) {
    const c = this.countryCounts.get(item.source_country) ?? 0;
    if (c <= 1) this.countryCounts.delete(item.source_country);
    else this.countryCounts.set(item.source_country, c - 1);
    const t = this.typeCounts.get(item.attack_type) ?? 0;
    if (t <= 1) this.typeCounts.delete(item.attack_type);
    else this.typeCounts.set(item.attack_type, t - 1);
  }
}
