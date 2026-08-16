# Live DDoS Attack Map

An interactive 3D world map that visualizes simulated DDoS attack traffic as
animated arcs between country centroids, with a live metrics panel, event
ticker, and per-attack-type color coding.

Built as a self-contained **static site** — the simulation runs entirely in the
browser, so it deploys anywhere (Vercel, GitHub Pages, Netlify) with no server.
It also ships a WebSocket backend for real-time streaming when a host is
available.

## Features

- **3D globe** (Three.js / globe.gl) with animated attack arcs
- **Simulated traffic model**: base rate with periodic surge/lull bursts,
  weighted hot-source countries (CN / US / RU)
- **Live metrics**: events/sec, top source countries (bar chart), attack-type
  breakdown — all O(1) incremental counters
- **Event ticker** streaming recent attacks
- **Dark NOC-style UI** with per-attack-type color legend
- **Dual mode**: in-browser simulation (static) or live WebSocket streaming
  (`VITE_LIVE_WS=1`)

## Architecture

```
packages/
  shared/     AttackEvent contract, country centroids, event generator
  backend/    Express + WebSocket server + event bus (live streaming)
  frontend/   React + Vite + globe.gl (the static deployable)
```

## Run locally

```bash
npm install
npm run dev          # starts backend (:8787) + frontend (:5173)
# open http://localhost:5173
```

Static-only (no backend, simulation in browser):

```bash
npm run dev -w @ddos/frontend
```

## Build static deploy

```bash
npm run build -w @ddos/frontend
# output: packages/frontend/dist — deploy this to any static host
```

## Live WebSocket mode

Set `VITE_LIVE_WS=1` and run the backend to stream real events over WebSocket:

```bash
VITE_LIVE_WS=1 npm run dev -w @ddos/frontend
npm run dev -w @ddos/backend
```

## Tests

```bash
npm test                     # all
npm test -w @ddos/backend    # unit + integration (integration auto-skips without loopback)
npm test -w @ddos/frontend   # UI logic smoke tests
```