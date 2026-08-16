import { AttackEvent, ATTACK_TYPES, AttackType } from "./attack-event";
import { CENTROIDS } from "./centroids";

export function isAttackType(value: unknown): value is AttackType {
  return typeof value === "string" && (ATTACK_TYPES as readonly string[]).includes(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidLat(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

export function isValidLon(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

export function isValidCountry(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}

export function isValidAttackEvent(value: unknown): value is AttackEvent {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.timestamp === "string" &&
    isValidLat(e.source_lat) &&
    isValidLon(e.source_lon) &&
    isValidCountry(e.source_country) &&
    isValidLat(e.dest_lat) &&
    isValidLon(e.dest_lon) &&
    isValidCountry(e.dest_country) &&
    isAttackType(e.attack_type) &&
    isFiniteNumber(e.volume)
  );
}

export function hasCentroidData(): boolean {
  return CENTROIDS.length > 0;
}
