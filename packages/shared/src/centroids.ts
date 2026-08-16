import { GeoPoint } from "./attack-event";

interface Centroid {
  country: string;
  lat: number;
  lon: number;
  weight: number;
}

export const CENTROIDS: Centroid[] = [
  { country: "CN", lat: 35.0, lon: 103.0, weight: 5 },
  { country: "US", lat: 39.8, lon: -98.6, weight: 4 },
  { country: "RU", lat: 61.5, lon: 99.0, weight: 3 },
  { country: "BR", lat: -14.2, lon: -51.9, weight: 3 },
  { country: "IN", lat: 20.6, lon: 78.9, weight: 3 },
  { country: "VN", lat: 16.0, lon: 108.0, weight: 3 },
  { country: "ID", lat: -0.8, lon: 113.9, weight: 2 },
  { country: "KR", lat: 36.0, lon: 128.0, weight: 2 },
  { country: "DE", lat: 51.2, lon: 10.5, weight: 2 },
  { country: "GB", lat: 54.0, lon: -2.0, weight: 2 },
  { country: "FR", lat: 46.6, lon: 2.2, weight: 1 },
  { country: "NL", lat: 52.1, lon: 5.3, weight: 1 },
  { country: "JP", lat: 36.2, lon: 138.2, weight: 2 },
  { country: "UA", lat: 48.4, lon: 31.2, weight: 2 },
  { country: "TH", lat: 15.0, lon: 101.0, weight: 1 },
  { country: "TR", lat: 39.0, lon: 35.2, weight: 1 },
  { country: "PL", lat: 51.9, lon: 19.1, weight: 1 },
  { country: "SE", lat: 60.1, lon: 18.6, weight: 1 },
  { country: "AU", lat: -25.3, lon: 133.8, weight: 1 },
  { country: "ZA", lat: -30.6, lon: 22.9, weight: 1 },
];

export function pickCentroid(weighted: boolean = true): { country: string; point: GeoPoint } {
  const pool = weighted ? CENTROIDS : CENTROIDS.map((c) => ({ ...c, weight: 1 }));
  const total = pool.reduce((sum, c) => sum + c.weight, 0);
  let roll = Math.random() * total;
  for (const c of pool) {
    roll -= c.weight;
    if (roll <= 0) {
      return { country: c.country, point: { lat: c.lat, lon: c.lon } };
    }
  }
  const last = pool[pool.length - 1];
  return { country: last.country, point: { lat: last.lat, lon: last.lon } };
}
