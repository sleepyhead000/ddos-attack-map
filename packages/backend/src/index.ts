import { createServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 8787);
const server = createServer({ port: PORT });

server.start().then((p) => {
  console.log(`[ddos-backend] listening on http://0.0.0.0:${p} (ws:///events)`);
});
