import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { AttackEvent } from "@ddos/shared";
import { createSimulator } from "./simulator.js";
import { EventBus } from "./event-bus.js";

export interface ServerOptions {
  port: number;
  host?: string;
  batchWindowMs?: number;
}

export function createServer(options: ServerOptions) {
  const { port, host = "0.0.0.0", batchWindowMs = 100 } = options;

  const app = express();

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/events" });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", clients: wss.clients.size });
  });

  const bus = new EventBus({ batchWindowMs });
  bus.start();

  wss.on("connection", (ws) => {
    ws.on("error", () => {
      try {
        ws.close();
      } catch {
        // already closed
      }
    });
  });

  // Broadcast each batch to every connected client. Drop sockets that are
  // closed or broken instead of letting them accumulate.
  const unsubscribe = bus.subscribe((batch: AttackEvent[]) => {
    const payload = JSON.stringify(batch);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch {
          client.terminate();
        }
      }
    }
  });

  const simulator = createSimulator({}, (event) => bus.publish(event));

  return {
    start(): Promise<number> {
      return new Promise((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(port, host, () => {
          simulator.start();
          resolve(port);
        });
      });
    },
    async stop(): Promise<void> {
      simulator.stop();
      bus.stop();
      unsubscribe();
      for (const client of wss.clients) {
        try {
          client.terminate();
        } catch {
          // ignore
        }
      }
      wss.close();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
    get clientCount(): number {
      return wss.clients.size;
    },
  };
}
