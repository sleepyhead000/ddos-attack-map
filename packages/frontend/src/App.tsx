import { useEffect, useRef, useState, useCallback } from "react";
import Globe from "globe.gl";
import type { GlobeInstance } from "globe.gl";
import { AttackEvent } from "@ddos/shared";
import { useAttackStream, ConnectionState } from "./useAttackStream";
import { useSimulatedStream } from "./useSimulatedStream";
import { ArcBuffer } from "./arcBuffer";

const ARC_CAPACITY = 200;
// Static deploys (Vercel/GitHub Pages) can't host the WS backend, so default
// to in-browser simulation. Set VITE_LIVE_WS=1 to force live WebSocket mode
// when a backend is available.
const USE_LIVE_WS = import.meta.env.VITE_LIVE_WS === "1";
const WS_URL = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/events`;

const TYPE_COLORS: Record<string, string> = {
  "SYN flood": "#ff3366",
  "UDP flood": "#ffcc00",
  "HTTP flood": "#33ccff",
  "ICMP flood": "#a855f7",
};

export default function App() {
  const globeRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<GlobeInstance | null>(null);
  const bufferRef = useRef(new ArcBuffer(ARC_CAPACITY));
  const [eventsPerSec, setEventsPerSec] = useState(0);
  const [topCountries, setTopCountries] = useState<{ country: string; count: number }[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<{ type: string; count: number }[]>([]);
  const [ticker, setTicker] = useState<AttackEvent[]>([]);
  const [conn, setConn] = useState<ConnectionState>(USE_LIVE_WS ? "reconnecting" : "connected");

  const handleEvents = useCallback((events: AttackEvent[]) => {
    const buffer = bufferRef.current;
    const arcs: { startLat: number; startLng: number; endLat: number; endLng: number; color: string; event: AttackEvent }[] = [];
    for (const e of events) {
      const evicted = buffer.add({
        id: e.id,
        source_country: e.source_country,
        attack_type: e.attack_type,
      });
      arcs.push({
        startLat: e.source_lat,
        startLng: e.source_lon,
        endLat: e.dest_lat,
        endLng: e.dest_lon,
        color: TYPE_COLORS[e.attack_type] ?? "#ffffff",
        event: e,
      });
    }
    setTicker((prev) => [...prev, ...events].slice(-30));
    setTopCountries(buffer.topCountries(5));
    setTypeBreakdown(buffer.typeBreakdown());
    setEventsPerSec(events.length * 10);
    const g = globeInstanceRef.current;
    if (g) {
      const existing = (g.arcsData() ?? []) as object[];
      g.arcsData([...existing, ...arcs].slice(-ARC_CAPACITY));
    }
  }, []);

  const handleReset = useCallback(() => {
    const buffer = bufferRef.current;
    buffer.clear();
    setTopCountries([]);
    setTypeBreakdown([]);
    setEventsPerSec(0);
    setTicker([]);
    globeInstanceRef.current?.arcsData([]);
  }, []);

  let state: ConnectionState;
  if (USE_LIVE_WS) {
    state = useAttackStream({ url: WS_URL, onEvents: handleEvents, onReset: handleReset });
  } else {
    useSimulatedStream({ onEvents: handleEvents });
    state = "connected";
  }
  useEffect(() => setConn(state), [state]);

  useEffect(() => {
    const el = globeRef.current;
    if (!el) return;
    const globe = new Globe(el)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
      .arcColor((d: any) => [d.color, "#ffffff", d.color])
      .arcAltitude(0.25)
      .arcStroke(0.3)
      .arcDashLength(0.6)
      .arcDashGap(0.3)
      .arcDashAnimateTime(1500)
      .arcsTransitionDuration(1500)
      .backgroundColor("#05070d");
    globeInstanceRef.current = globe;
    return () => {
      globe._destructor?.();
      globeInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="app">
      <div ref={globeRef} className="globe" />
      <ConnectionBadge state={conn} />
      <StatsPanel
        eventsPerSec={eventsPerSec}
        topCountries={topCountries}
        typeBreakdown={typeBreakdown}
      />
      <EventTicker events={ticker} />
      <Legend />
    </div>
  );
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  const label = USE_LIVE_WS
    ? state === "connected"
      ? "LIVE"
      : state === "reconnecting"
        ? "RECONNECTING"
        : "OFFLINE"
    : "SIMULATED";
  const cls = USE_LIVE_WS ? state : "simulated";
  return <div className={`badge badge-${cls}`}>{label}</div>;
}

function StatsPanel({
  eventsPerSec,
  topCountries,
  typeBreakdown,
}: {
  eventsPerSec: number;
  topCountries: { country: string; count: number }[];
  typeBreakdown: { type: string; count: number }[];
}) {
  return (
    <div className="panel stats">
      <h2>ATTACK METRICS</h2>
      <div className="stat-evs">{(eventsPerSec / 10).toFixed(0)} <small>ev/100ms</small></div>
      <h3>TOP SOURCES</h3>
      <ul className="bars">
        {topCountries.map((c) => (
          <li key={c.country}>
            <span className="bar-label">{c.country}</span>
            <span className="bar-track">
              <span
                className="bar-fill"
                style={{ width: `${Math.min(100, (c.count / (topCountries[0]?.count || 1)) * 100)}%` }}
              />
            </span>
            <span className="bar-val">{c.count}</span>
          </li>
        ))}
      </ul>
      <h3>BY TYPE</h3>
      <ul className="types">
        {typeBreakdown.map((t) => (
          <li key={t.type}>
            <span className="swatch" style={{ background: TYPE_COLORS[t.type] ?? "#fff" }} />
            {t.type}
            <span className="bar-val">{t.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventTicker({ events }: { events: AttackEvent[] }) {
  return (
    <div className="ticker">
      {events.map((e) => (
        <span key={e.id} className="ticker-item">
          <span className="swatch" style={{ background: TYPE_COLORS[e.attack_type] ?? "#fff" }} />
          {e.source_country} → {e.dest_country} · {e.attack_type} · {e.volume} pps
        </span>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      {Object.entries(TYPE_COLORS).map(([type, color]) => (
        <span key={type} className="legend-item">
          <span className="swatch" style={{ background: color }} />
          {type}
        </span>
      ))}
    </div>
  );
}
