# PRD: Live DDoS Attack Map

## 1. Overview
A real-time (or simulated) visualization showing attack traffic as animated arcs between source and destination geolocations on a world map, with live stats.

## 2. Goals
- Visualize attack events in real time on a map/globe.
- Show attack metadata: type, volume, source/dest country, timestamp.
- Provide aggregate stats: top attacking countries, attack type distribution, total events/sec.
- Support both live feed and simulated demo mode.

## 3. Non-Goals
- Not an actual DDoS detection or mitigation system.
- Not a production SIEM replacement.

## 4. Users
- Security dashboard viewers (SOC wall display).
- Demo/marketing use (portfolio, NOC screens).

## 5. Functional Requirements
| ID | Requirement |
|----|-------------|
| F1 | Ingest attack events from a data source (log feed, API, or simulator) |
| F2 | Resolve source/destination IP to lat/lon via GeoIP |
| F3 | Stream events to frontend via WebSocket |
| F4 | Render animated arc/line per event on map or globe |
| F5 | Display live event log (scrolling list) |
| F6 | Display aggregate counters: events/sec, top 5 attacker countries, attack type breakdown |
| F7 | Support demo/simulated mode with adjustable event rate |
| F8 | Responsive full-screen display mode |

## 6. Non-Functional Requirements
- Handle at least 50 events/sec without frontend lag.
- WebSocket reconnect on drop.
- Deployable as static frontend + lightweight backend.

## 7. Data Model
```
AttackEvent {
  id: string
  timestamp: ISO8601
  source_ip: string
  source_lat: float
  source_lon: float
  source_country: string
  dest_lat: float
  dest_lon: float
  dest_country: string
  attack_type: string   // e.g. SYN flood, UDP flood, HTTP flood
  volume: number         // pps or bytes/sec
}
```

## 8. Success Metrics
- Map renders smoothly at target event rate (no dropped frames >16ms/frame budget).
- Time from event ingestion to on-screen render < 500ms.

---

# Implementation Plan

## Phase 1: Data Layer
1. **Event source**
   - Demo mode: Node script generating random events at configurable interval (random IP ranges mapped to real country geo-centroids, random attack types/volumes).
   - Live mode (optional, later): tail firewall/IDS logs or poll a threat-intel API; normalize into the AttackEvent schema.
2. **GeoIP resolution**
   - Use MaxMind GeoLite2-City (local DB, free) via a Node/Python lookup library.
   - Cache lookups (IP -> geo) in memory/Redis to avoid repeated DB hits.
3. **Event bus**
   - Backend maintains an in-memory queue; each new event is broadcast immediately.

## Phase 2: Backend Service
1. Node.js + Express + `ws` (or socket.io) server.
2. Endpoints:
   - `GET /health`
   - `WS /events` — pushes AttackEvent JSON to all connected clients
3. Rate limiting / batching: if event rate is high, batch events every 100ms to avoid flooding clients.
4. Config: env vars for demo rate, GeoIP DB path, live feed source (if any).

## Phase 3: Frontend
1. **Map rendering choice**
   - Flat map: D3.js + TopoJSON world map, arcs drawn with `d3.geoInterpolate` + animated stroke-dasharray.
   - 3D globe (more visually striking): Globe.gl (Three.js wrapper) — supports arcs, points, rings out of the box.
2. **WebSocket client**
   - Connect on load, auto-reconnect with backoff.
   - On event received: push to a rolling buffer (last N events), trigger arc animation, update counters.
3. **UI components**
   - Main map/globe canvas (full viewport).
   - Overlay stats panel: events/sec, top countries (bar list), attack-type pie/breakdown.
   - Scrolling live event ticker (bottom or side).
   - Optional dark "NOC" theme.
4. **Performance**
   - Cap max concurrent animated arcs (e.g., 200); drop/queue overflow events.
   - Use requestAnimationFrame-driven animation, not per-event DOM churn.

## Phase 4: Styling / Polish
1. Dark theme, neon accent colors per attack type.
2. Arc animation: fade-in, travel, fade-out (~1.5–2s duration).
3. Pulse effect on destination point when arc lands.
4. Legend for attack type colors.

## Phase 5: Deployment
1. Frontend: static build deployed to Vercel/Netlify/S3+CloudFront.
2. Backend: small VPS (Docker container) or serverless WebSocket (Ably/Pusher channels) if avoiding infra management.
3. Environment separation: demo mode public, live mode restricted/internal if using real log data.

## Phase 6: Stretch Features
- Click event/arc for detail popup.
- Time-range replay (scrub through historical events).
- Filter by attack type or country.
- Export snapshot stats as image/report.

## Suggested Stack Summary
| Layer | Choice |
|-------|--------|
| Frontend | React + Globe.gl (or D3 for flat map) |
| Realtime | WebSocket (`ws` or socket.io) |
| Backend | Node.js + Express |
| GeoIP | MaxMind GeoLite2 |
| Deployment | Vercel (frontend) + small VPS/Docker (backend) |

## Suggested Build Order
1. Simulated event generator (backend) → console log only.
2. WebSocket broadcast of simulated events.
3. Frontend WebSocket client + raw console receipt.
4. Static world map render (no data yet).
5. Wire events to arc animation.
6. Add stats panel + event ticker.
7. Styling pass.
8. (Optional) swap simulator for real log/feed source.