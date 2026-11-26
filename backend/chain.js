const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const db = require("./db");

// ---------- Setup ----------
const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "deployments.json"), "utf8"));

function loadAbi(name) {
  const p = path.join(__dirname, "..", "chain", "artifacts", "contracts", `${name}.sol`, `${name}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8")).abi;
}

const provider = new ethers.JsonRpcProvider(dep.chainUrl, undefined, { cacheTimeout: -1, batchMaxCount: 1 });

// Hardhat's default test accounts (same phrase Hardhat uses)
const PHRASE = "test test test test test test test test test test test junk";
function wallet(i) {
  return ethers.HDNodeWallet.fromPhrase(PHRASE, undefined, `m/44'/60'/0'/0/${i}`).connect(provider);
}
const W = { owner: wallet(0), verifier: wallet(1), attacker: wallet(2), user: wallet(3) };

// Always ask the chain for the real nonce (never use a cached one)
for (const w of Object.values(W)) {
  w.getNonce = async () =>
    parseInt(await provider.send("eth_getTransactionCount", [w.address, "pending"]), 16);
}

const vaultAbi = { v1: loadAbi("VulnerableVault"), v2: loadAbi("HardenedVault") };
const atkAbi = loadAbi("AttackerContract");

function makeCtx(key) {
  const d = dep[key];
  return {
    key,
    vaultAddr: d.vault,
    atkAddr: d.attacker,
    vault: new ethers.Contract(d.vault, vaultAbi[key], provider),
    atk: new ethers.Contract(d.attacker, atkAbi, provider),
  };
}
const C = { v1: makeCtx("v1"), v2: makeCtx("v2") };

const ONE_ETH = ethers.parseEther("1");
const TARGET = ethers.parseEther("10"); // every vault is refilled to 10 ETH before a run
const FRAME_DELAY_MS = 150; // pause between live frames (the 3D screen needs time to animate)
const ATTACK_ORDER = ["reentrancy", "access", "replay", "double", "txorigin"];

let broadcaster = () => {};
function setBroadcaster(fn) {
  broadcaster = fn;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (wei) => ethers.formatEther(wei);
let counter = 0;
function newIncident(tag) {
  counter++;
  return ethers.id(`${tag}-${Date.now()}-${counter}`);
}

// ---------- Plain-English explanations ----------
const PLAIN = {
  reentrancy: {
    broken: "The vault sent money BEFORE writing 'paid'. The attacker kept asking again until the vault was empty.",
    blocked: "The vault writes 'paid' first and locks the door (reentrancy guard). The second ask bounced off.",
  },
  access: {
    broken: "Anyone could press 'approve'. The attacker approved their own fake claim and got paid.",
    blocked: "Only people with the VERIFIER role can approve. The attacker is not one, so it reverted.",
  },
  replay: {
    broken: "The signed approval had no number and no expiry. The attacker reused it 5 times.",
    blocked: "Each signature has a nonce and a deadline. After one use it is dead, so the replay reverted.",
  },
  double: {
    broken: "The vault never checked if the same incident was already filed. It paid the same incident twice.",
    blocked: "Each incident can be filed only once, and claims move through fixed steps. The duplicate reverted.",
  },
  txorigin: {
    broken: "The vault checked who STARTED the call (tx.origin). The owner was tricked into starting it, so funds were taken.",
    blocked: "The vault checks who is calling RIGHT NOW (msg.sender). The attacker contract is not the owner, so it reverted.",
  },
  normal: {
    ok: "A normal claim was filed, approved by the verifier and paid. The vault works.",
  },
};
function explain(attack, outcome) {
  return PLAIN[attack]?.[outcome] || "";
}

// ---------- Helpers ----------
function reasonOf(e) {
  return (
    e.reason ||
    e.revert?.args?.[0] ||
    e.revert?.name ||
    e.shortMessage ||
    (e.message ? e.message.split("\n")[0] : "reverted")
  );
}

async function send(txPromise) {
  const tx = await txPromise;
  return tx.wait();
}

// Simulate a call on the live chain. Tells us if it would revert, and why.
async function simulate(fn) {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: reasonOf(e) };
  }
}

async function nextId(c) {
  return await c.vault.claimCount(); // bigint
}

async function topUp(c) {
  const bal = await provider.getBalance(c.vaultAddr);
  if (bal < TARGET) {
    await send(W.owner.sendTransaction({ to: c.vaultAddr, value: TARGET - bal }));
  }
}

function plainArgs(parsed) {
  const out = {};
  parsed.fragment.inputs.forEach((inp, i) => {
    const v = parsed.args[i];
    out[inp.name] = typeof v === "bigint" ? v.toString() : v;
    if (typeof v === "bigint" && inp.name === "amount") out.amountEth = ethers.formatEther(v);
  });
  return out;
}

// Build the verifier's signature for the replay attack (v1 plain, v2 typed)
async function signPayout(c, id) {
  const claim = await c.vault.claims(id);
  if (c.key === "v1") {
    const hash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "address", "uint256"],
      [c.vaultAddr, id, claim.claimant, claim.amount]
    );
    return W.verifier.signMessage(ethers.getBytes(hash));
  }
  const nonce = await c.vault.nonces(id);
  const net = await provider.getNetwork();
  const domain = {
    name: "ApexForgeVault",
    version: "1",
    chainId: net.chainId,
    verifyingContract: c.vaultAddr,
  };
  const types = {
    Payout: [
      { name: "claimId", type: "uint256" },
      { name: "claimant", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  const value = {
    claimId: id,
    claimant: claim.claimant,
    amount: claim.amount,
    nonce,
    deadline: claim.deadline,
  };
  return W.verifier.signTypedData(domain, types, value);
}

// ---------- The 5 attacks ----------
// Each one returns { outcome: "broken" | "blocked", reason }.
// Blocked attacks are simulated on the live chain state, which gives the exact revert reason.
const ATTACKS = {
  async reentrancy(c) {
    const atk = c.atk.connect(W.attacker);
    const id = await nextId(c);
    await send(atk.fileLegitClaim(ONE_ETH, newIncident("reent")));
    await send(c.vault.connect(W.verifier).approveClaim(id));
    const sim = await simulate(() => atk.attackReentrancy.staticCall(id));
    if (!sim.ok) return { outcome: "blocked", reason: sim.reason };
    await send(atk.attackReentrancy(id));
    return { outcome: "broken" };
  },

  async access(c) {
    const atk = c.atk.connect(W.attacker);
    const args = [ethers.parseEther("5"), newIncident("access")];
    const sim = await simulate(() => atk.attackAccessBypass.staticCall(...args));
    if (!sim.ok) return { outcome: "blocked", reason: sim.reason };
    await send(atk.attackAccessBypass(...args));
    return { outcome: "broken" };
  },

  async replay(c) {
    const atk = c.atk.connect(W.attacker);
    const id = await nextId(c);
    await send(atk.fileLegitClaim(ONE_ETH, newIncident("replay")));
    const sig = await signPayout(c, id);
    const sim = await simulate(() => atk.attackReplay.staticCall(id, sig, 5));
    if (!sim.ok) return { outcome: "blocked", reason: sim.reason };
    await send(atk.attackReplay(id, sig, 5));
    return { outcome: "broken" };
  },

  async double(c) {
    const atk = c.atk.connect(W.attacker);
    const id1 = await nextId(c);
    const args = [ONE_ETH, newIncident("double")];
    const sim = await simulate(() => atk.fileTwice.staticCall(...args));
    if (!sim.ok) return { outcome: "blocked", reason: sim.reason };
    await send(atk.fileTwice(...args));
    await send(c.vault.connect(W.verifier).approveClaim(id1));
    await send(c.vault.connect(W.verifier).approveClaim(id1 + 1n));
    await send(atk.attackDoubleClaim());
    return { outcome: "broken" };
  },

  async txorigin(c) {
    const atk = c.atk.connect(W.owner); // the OWNER is tricked into calling it
    const sim = await simulate(() => atk.claimFreeReward.staticCall());
    if (!sim.ok) return { outcome: "blocked", reason: sim.reason };
    await send(atk.claimFreeReward());
    return { outcome: "broken" };
  },
};

async function normalBody(c) {
  const id = await nextId(c);
  await send(c.vault.connect(W.user).fileClaim(ONE_ETH, newIncident("normal")));
  await send(c.vault.connect(W.verifier).approveClaim(id));
  await send(c.vault.connect(W.user).claim(id));
  return { outcome: "ok" };
}

// ---------- The run tracker: runs a body, reads events, builds frames, saves, streams ----------
async function trackedRun(vaultKey, attack, body) {
  const c = C[vaultKey];
  const runId = db.createRun(vaultKey, attack);
  broadcaster({ type: "run_started", runId, vault: vaultKey, attack });

  let seq = 0;
  async function pushFrame(f) {
    const frame = { seq: seq++, vault: vaultKey, ...f };
    db.addFrame(runId, frame);
    broadcaster({ type: "frame", runId, vault: vaultKey, frame });
    await sleep(FRAME_DELAY_MS);
  }

  try {
    await topUp(c);
    const startBlock = await provider.getBlockNumber();
    const startBal = await provider.getBalance(c.vaultAddr);
    await pushFrame({ event: "AttackLaunched", args: { attack }, balanceAfterEth: fmt(startBal) });

    const result = await body(c);

    // Read the real blockchain events that happened during this run
    const endBlock = await provider.getBlockNumber();
    let bal = startBal;
    if (endBlock > startBlock) {
      const logs = await provider.getLogs({
        address: [c.vaultAddr, c.atkAddr],
        fromBlock: startBlock + 1,
        toBlock: endBlock,
      });
      for (const log of logs) {
        const isVault = log.address.toLowerCase() === c.vaultAddr.toLowerCase();
        const iface = isVault ? c.vault.interface : c.atk.interface;
        let parsed = null;
        try {
          parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
        } catch (e) {
          parsed = null;
        }
        if (!parsed) continue;

        const args = plainArgs(parsed);
        if (isVault) {
          if (parsed.name === "ClaimPaid" || parsed.name === "EmergencyWithdraw") bal -= BigInt(args.amount);
          if (parsed.name === "Funded") bal += BigInt(args.amount);
        }
        await pushFrame({
          block: log.blockNumber,
          logIndex: log.index,
          txHash: log.transactionHash,
          event: parsed.name,
          args,
          balanceAfterEth: fmt(bal),
        });
      }
    }

    const endBal = await provider.getBalance(c.vaultAddr);
    const moved = startBal > endBal ? startBal - endBal : 0n;
    const { outcome, reason } = result;
    const plainReason = explain(attack, outcome);

    const finalEvent =
      outcome === "blocked" ? "AttackBlocked" : outcome === "broken" ? "VaultBroken" : "NormalClaimDone";
    await pushFrame({
      block: endBlock,
      event: finalEvent,
      args: { reason: reason || null, plainReason, movedEth: fmt(moved) },
      balanceAfterEth: fmt(endBal),
    });

    db.finishRun(runId, outcome, reason, plainReason, fmt(moved));
    const summary = {
      runId,
      vault: vaultKey,
      attack,
      outcome,
      reason: reason || null,
      plainReason,
      movedEth: fmt(moved),
      balanceEth: fmt(endBal),
    };
    broadcaster({ type: "run_finished", ...summary, scores: db.scores() });
    return summary;
  } catch (e) {
    db.finishRun(runId, "error", reasonOf(e), null, "0");
    broadcaster({ type: "run_error", runId, error: reasonOf(e) });
    throw e;
  }
}

// ---------- Public actions ----------
async function doNormal(vaultKey) {
  return trackedRun(vaultKey, "normal", normalBody);
}

async function doAttack(vaultKey, type) {
  return trackedRun(vaultKey, type, ATTACKS[type]);
}

async function doWar(vaultKey) {
  const results = [];
  for (const t of ATTACK_ORDER) {
    const r = await doAttack(vaultKey, t);
    results.push({ attack: r.attack, outcome: r.outcome, reason: r.reason, movedEth: r.movedEth });
    await sleep(500);
  }
  return { vault: vaultKey, results, scores: db.scores() };
}

// ---------- Reset Demo (snapshot / revert) ----------
let snapshotId = null;
async function takeSnapshot() {
  snapshotId = await provider.send("evm_snapshot", []);
}

async function doReset() {
  if (snapshotId) await provider.send("evm_revert", [snapshotId]);
  await takeSnapshot();
  db.resetAll();
  broadcaster({ type: "reset" });
  return getState();
}

async function getState() {
  const [b1, b2, block] = await Promise.all([
    provider.getBalance(C.v1.vaultAddr),
    provider.getBalance(C.v2.vaultAddr),
    provider.getBlockNumber(),
  ]);
  return {
    block,
    vaults: {
      v1: { address: C.v1.vaultAddr, balanceEth: fmt(b1) },
      v2: { address: C.v2.vaultAddr, balanceEth: fmt(b2) },
    },
    scores: db.scores(),
  };
}

async function init() {
  const code = await provider.getCode(C.v1.vaultAddr);
  if (code === "0x") {
    throw new Error(
      "Contracts not found on the chain. Start 'npx hardhat node' and run the deploy script first."
    );
  }
  await takeSnapshot();
}

// ---------- One run at a time (stops two clicks from clashing) ----------
let busy = false;
async function exclusive(fn) {
  if (busy) {
    const err = new Error("Another run is in progress. Wait for it to finish.");
    err.status = 409;
    throw err;
  }
  busy = true;
  try {
    return await fn();
  } finally {
    busy = false;
  }
}

module.exports = {
  init,
  setBroadcaster,
  getState,
  runNormal: (v) => exclusive(() => doNormal(v)),
  runAttack: (v, t) => exclusive(() => doAttack(v, t)),
  runWar: (v) => exclusive(() => doWar(v)),
  resetDemo: () => exclusive(() => doReset()),
};

