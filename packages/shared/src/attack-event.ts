export const ATTACK_TYPES = ["SYN flood", "UDP flood", "HTTP flood", "ICMP flood"] as const;

export type AttackType = (typeof ATTACK_TYPES)[number];

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface AttackEvent {
  id: string;
  timestamp: string;
  source_lat: number;
  source_lon: number;
  source_country: string;
  dest_lat: number;
  dest_lon: number;
  dest_country: string;
  attack_type: AttackType;
  volume: number;
}

export type ClientEvent = AttackEvent;
