export const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const WS_URL = API.replace(/^http/, 'ws') + '/ws';

async function call(path, method) {
  const r = await fetch(API + path, { method: method || 'GET' });
  let data = null;
  try { data = await r.json(); } catch (e) { data = null; }
  if (!r.ok) {
    const err = new Error((data && (data.error || data.message)) || 'Request failed');
    err.status = r.status;
    throw err;
  }
  return data;
}

export const getState = () => call('/state');
export const getRuns = () => call('/runs');
export const getFrames = (id) => call('/frames/' + id);
export const postNormal = (vault) => call('/normal?vault=' + vault, 'POST');
export const postAttack = (type, vault) => call('/attack/' + type + '?vault=' + vault, 'POST');
export const postWar = (vault) => call('/war?vault=' + vault, 'POST');
export const postReset = () => call('/reset', 'POST');

export function friendlyError(e) {
  if (e && e.status === 409) return 'Another test is still running. Wait a moment and try again.';
  if (e && /fetch/i.test(String(e.message))) return 'Cannot reach the demo server. Run start-demo.ps1 (or node server.js inside backend).';
  return (e && e.message) || 'Something went wrong.';
}

const asList = (d, keys) => {
  if (Array.isArray(d)) return d;
  for (const k of keys) if (d && Array.isArray(d[k])) return d[k];
  return [];
};

export function normalizeRun(r) {
  return {
    id: r.id,
    vault: r.vault,
    attack: r.attack,
    outcome: r.outcome,
    reason: r.reason || '',
    movedEth: Number(r.moved_eth != null ? r.moved_eth : r.movedEth) || 0,
    createdAt: r.created_at != null ? r.created_at : r.createdAt,
  };
}
export const normalizeRuns = (d) => asList(d, ['runs', 'rows', 'data']).map(normalizeRun).sort((a, b) => b.id - a.id);

export function normalizeFrame(f) {
  let args = f.args;
  if (args == null && f.args_json) {
    try { args = JSON.parse(f.args_json); } catch (e) { args = {}; }
  }
  let bal = f.balanceAfterEth != null ? f.balanceAfterEth : (f.balance_after != null ? f.balance_after : f.balanceAfter);
  bal = bal == null ? null : Number(bal);
  if (bal != null && bal > 1e9) bal = bal / 1e18;
  return {
    seq: f.seq,
    vault: f.vault,
    block: f.block != null ? f.block : f.block_number,
    txHash: f.txHash || f.tx_hash || '',
    event: f.event,
    args: args || {},
    balance: Number.isFinite(bal) ? bal : null,
  };
}
export const normalizeFrames = (d) => asList(d, ['frames', 'rows', 'data']).map(normalizeFrame).sort((a, b) => a.seq - b.seq);

function pickNumber(o) {
  if (o == null) return null;
  if (typeof o === 'number') return Number.isFinite(o) ? (o > 1e9 ? o / 1e18 : o) : null;
  if (typeof o === 'string') {
    if (/^0x/i.test(o)) return null;
    const n = parseFloat(o);
    return Number.isFinite(n) ? (n > 1e9 ? n / 1e18 : n) : null;
  }
  if (typeof o === 'object') {
    for (const k of Object.keys(o)) {
      if (/balance/i.test(k)) {
        const n = pickNumber(o[k]);
        if (n !== null) return n;
      }
    }
  }
  return null;
}

export function readBalances(state) {
  const out = { v1: null, v2: null };
  if (!state) return out;
  for (const v of ['v1', 'v2']) {
    const spots = [state[v], state.vaults && state.vaults[v], state.balances && state.balances[v]];
    if (Array.isArray(state.vaults)) {
      spots.push(state.vaults.find((x) => x && (x.id === v || x.vault === v || x.key === v)));
    }
    for (const s of spots) {
      const n = pickNumber(s);
      if (n !== null) { out[v] = n; break; }
    }
  }
  return out;
}

export function createBus() {
  const subs = new Set();
  return {
    on(fn) { subs.add(fn); return () => { subs.delete(fn); }; },
    emit(m) { subs.forEach((fn) => fn(m)); },
  };
}

export function openSocket({ onMessage, onStatus }) {
  let ws = null;
  let closed = false;
  let timer = null;
  const connect = () => {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => onStatus('live');
    ws.onclose = () => {
      onStatus('offline');
      if (!closed) timer = setTimeout(connect, 1500);
    };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* ignore */ } };
    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)); } catch (err) { /* ignore bad message */ }
    };
  };
  connect();
  return () => {
    closed = true;
    clearTimeout(timer);
    try { ws.close(); } catch (e) { /* ignore */ }
  };
}