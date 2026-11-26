const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const chain = require("./chain");
const db = require("./db");

const PORT = 4000;
const VAULTS = ["v1", "v2"];
const ATTACKS = ["reentrancy", "access", "replay", "double", "txorigin"];

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

function broadcast(msg) {
  const text = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(text);
  }
}
chain.setBroadcaster(broadcast);

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "hello", message: "ApexForge live feed connected" }));
});

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function vaultOf(req) {
  const v = req.query.vault || "v1";
  if (!VAULTS.includes(v)) throw httpError(400, "vault must be v1 or v2");
  return v;
}

const wrap = (fn) => async (req, res) => {
  try {
    res.json(await fn(req));
  } catch (e) {
    console.error("Error:", e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
};

app.get("/health", wrap(async () => ({ ok: true, ...(await chain.getState()) })));
app.get("/state", wrap(() => chain.getState()));
app.get("/scores", wrap(async () => db.scores()));
app.get("/runs", wrap(async () => db.getRuns(50)));
app.get("/frames/:runId", wrap(async (req) => db.getFrames(Number(req.params.runId))));

app.post("/normal", wrap((req) => chain.runNormal(vaultOf(req))));

app.post(
  "/attack/:type",
  wrap((req) => {
    if (!ATTACKS.includes(req.params.type)) {
      throw httpError(400, "attack must be one of: " + ATTACKS.join(", "));
    }
    return chain.runAttack(vaultOf(req), req.params.type);
  })
);

app.post("/war", wrap((req) => chain.runWar(vaultOf(req))));
app.post("/reset", wrap(() => chain.resetDemo()));

chain
  .init()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`ApexForge backend running on http://localhost:${PORT}`);
      console.log(`Live feed on ws://localhost:${PORT}/ws`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err.message);
    process.exit(1);
  });