import { AttackEvent, AttackType, ATTACK_TYPES } from "./attack-event";
import { CENTROIDS, pickCentroid } from "./centroids";

let seq = 0;

function simpleId(): string {
  // Deterministic-ish id that works in any JS runtime (browser + node).
  return `${Date.now().toString(36)}-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const HOT_SOURCES = ["CN", "US", "RU"];

/** Returns a weighted source country: hot countries dominate the rest. */
export function weightedSourceCountry(): string {
  const hot = HOT_SOURCES.filter((c) => CENTROIDS.some((x) => x.country === c));
  if (hot.length > 0 && Math.random() < 0.6) {
    return hot[Math.floor(Math.random() * hot.length)];
  }
  return pickCentroid(true).country;
}

function centroidFor(country: string) {
  const found = CENTROIDS.find((c) => c.country === country);
  return found ?? CENTROIDS[0];
}

/** Generates a single random AttackEvent. Pure — usable in browser or node. */
export function randomAttackEvent(): AttackEvent {
  const srcCountry = weightedSourceCountry();
  const dest = pickCentroid(true);
  const src = centroidFor(srcCountry);
  return {
    id: simpleId(),
    timestamp: new Date().toISOString(),
    source_lat: src.lat,
    source_lon: src.lon,
    source_country: src.country,
    dest_lat: dest.point.lat,
    dest_lon: dest.point.lon,
    dest_country: dest.country,
    attack_type: ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)] as AttackType,
    volume: Math.floor(Math.random() * 900) + 100,
  };
}
