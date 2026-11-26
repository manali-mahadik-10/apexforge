const WebSocket = require("ws");

const ws = new WebSocket("ws://localhost:4000/ws");

ws.on("open", () => console.log("Connected to the ApexForge live feed. Waiting for events...\n"));

ws.on("message", (data) => {
  const m = JSON.parse(data.toString());

  if (m.type === "frame") {
    const f = m.frame;
    console.log(
      `  [${m.vault}] #${String(f.seq).padStart(2, "0")}  ${f.event.padEnd(16)} vault balance: ${f.balanceAfterEth} ETH`
    );
  } else if (m.type === "run_started") {
    console.log(`\n>>> RUN ${m.runId} STARTED: ${m.attack} on ${m.vault}`);
  } else if (m.type === "run_finished") {
    console.log(`<<< RUN ${m.runId} FINISHED: ${m.outcome.toUpperCase()}  (moved ${m.movedEth} ETH)`);
    if (m.reason) console.log(`    revert reason: ${m.reason}`);
    console.log(`    ${m.plainReason}`);
  } else {
    console.log(`[${m.type}]`, m.message || "");
  }
});

ws.on("close", () => console.log("Feed closed."));
ws.on("error", (e) => console.log("Feed error:", e.message));