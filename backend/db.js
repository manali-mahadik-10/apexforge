const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "apexforge.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS attack_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vault TEXT NOT NULL,
  attack TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reason TEXT,
  plain_reason TEXT,
  moved_eth TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS frames (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  vault TEXT NOT NULL,
  block_number INTEGER,
  log_index INTEGER,
  tx_hash TEXT,
  event TEXT NOT NULL,
  args_json TEXT,
  balance_after TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const ATTACK_TYPES = ["reentrancy", "access", "replay", "double", "txorigin"];

function createRun(vault, attack) {
  const info = db
    .prepare("INSERT INTO attack_runs (vault, attack, outcome) VALUES (?, ?, 'running')")
    .run(vault, attack);
  return Number(info.lastInsertRowid);
}

function finishRun(id, outcome, reason, plainReason, movedEth) {
  db.prepare(
    "UPDATE attack_runs SET outcome = ?, reason = ?, plain_reason = ?, moved_eth = ? WHERE id = ?"
  ).run(outcome, reason || null, plainReason || null, movedEth || "0", id);
}

function addFrame(runId, f) {
  db.prepare(
    `INSERT INTO frames (run_id, seq, vault, block_number, log_index, tx_hash, event, args_json, balance_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    runId,
    f.seq,
    f.vault,
    f.block ?? null,
    f.logIndex ?? null,
    f.txHash ?? null,
    f.event,
    JSON.stringify(f.args || {}),
    f.balanceAfterEth ?? null
  );
}

function getRuns(limit = 50) {
  return db.prepare("SELECT * FROM attack_runs ORDER BY id DESC LIMIT ?").all(limit);
}

function getFrames(runId) {
  return db
    .prepare("SELECT * FROM frames WHERE run_id = ? ORDER BY seq")
    .all(runId)
    .map((r) => ({ ...r, args: JSON.parse(r.args_json || "{}") }));
}

// Forge Meter: for each vault, look at the LATEST result of each attack type.
function scores() {
  const result = {};
  for (const v of ["v1", "v2"]) {
    const rows = db
      .prepare(
        "SELECT attack, outcome FROM attack_runs WHERE vault = ? AND attack != 'normal' AND outcome IN ('broken','blocked') ORDER BY id"
      )
      .all(v);
    const latest = {};
    for (const r of rows) latest[r.attack] = r.outcome;
    const blocked = ATTACK_TYPES.filter((a) => latest[a] === "blocked").length;
    const broken = ATTACK_TYPES.filter((a) => latest[a] === "broken").length;
    result[v] = {
      blocked,
      broken,
      total: ATTACK_TYPES.length,
      latest,
      forgeMeter: Math.round((blocked / ATTACK_TYPES.length) * 100),
    };
  }
  return result;
}

function resetAll() {
  db.exec(
    "DELETE FROM frames; DELETE FROM attack_runs; DELETE FROM sqlite_sequence WHERE name IN ('frames','attack_runs');"
  );
}

module.exports = { createRun, finishRun, addFrame, getRuns, getFrames, scores, resetAll };