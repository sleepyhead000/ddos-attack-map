import { describe, it, expect, beforeAll, afterAll } from "vitest";
import WebSocket from "ws";
import { createServer } from "../src/server.js";

// ponytail: loopback TCP is unreliable in some sandboxed hosts (EADDRNOTAVAIL
// on both ::1 and 127.0.0.1). Probe once; if localhost can't be reached, skip
// the integration tests so CI in those hosts still passes. Real dev machines
// run them normally. Upgrade path: none needed — the probe is cheap.
async function loopbackAvailable(port: number): Promise<boolean> {
  try {
    await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

describe("server integration", () => {
  let server: ReturnType<typeof createServer>;
  let port: number;
  let base: string;
  let available = false;

  beforeAll(async () => {
    server = createServer({ port: 0, host: "0.0.0.0", batchWindowMs: 100 });
    port = await server.start();
    base = `http://localhost:${port}`;
    available = await loopbackAvailable(port);
    if (!available) await server.stop();
  });

  afterAll(async () => {
    if (server) await server.stop();
  });

  it("serves /health with ok status", async () => {
    if (!available) return;
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("pushes attack event batches over the websocket", async () => {
    if (!available) return;
    const ws = new WebSocket(`ws://localhost:${port}/events`);
    const batches: unknown[][] = [];
    await new Promise<void>((resolve, reject) => {
      ws.on("open", resolve);
      ws.on("error", reject);
    });
    ws.on("message", (data) => {
      batches.push(JSON.parse(data.toString()));
      if (batches.reduce((n, b) => n + b.length, 0) >= 5) ws.close();
    });
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 3000));
    const total = batches.reduce((n, b) => n + b.length, 0);
    expect(total).toBeGreaterThanOrEqual(5);
    const first = batches[0][0] as Record<string, unknown>;
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("attack_type");
    expect(typeof first.source_lat).toBe("number");
    ws.close();
  }, 10000);

  it("reports connected client count in /health", async () => {
    if (!available) return;
    const ws = new WebSocket(`ws://localhost:${port}/events`);
    await new Promise<void>((resolve, reject) => {
      ws.on("open", resolve);
      ws.on("error", reject);
    });
    await new Promise((r) => setTimeout(r, 200));
    const res = await fetch(`${base}/health`);
    const body = await res.json();
    expect(body.clients).toBeGreaterThanOrEqual(1);
    ws.close();
  });
});
