import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';
import Home from './pages/Home.jsx';
import Lab from './pages/Lab.jsx';
import Learn from './pages/Learn.jsx';
import Replay from './pages/Replay.jsx';
import History from './pages/History.jsx';
import {
  createBus, friendlyError, getRuns, getState, normalizeFrame, normalizeRuns, openSocket,
  postAttack, postNormal, postReset, postWar, readBalances,
} from './api.js';
import { computeScores, describeFrame, EVENT_LABEL } from './content.js';

const PAGES = [
  { id: 'home', label: 'Start Here', icon: 'home' },
  { id: 'lab', label: 'Live Lab', icon: 'flask' },
  { id: 'learn', label: 'The 5 Tricks', icon: 'book' },
  { id: 'replay', label: 'Replay', icon: 'rewind' },
  { id: 'history', label: 'Claims Ledger', icon: 'list' },
];
const WAR_ORDER = ['reentrancy', 'access', 'replay', 'double', 'txorigin'];
const readHash = () => {
  const h = (window.location.hash || '').replace('#/', '');
  return PAGES.some((p) => p.id === h) ? h : 'home';
};

export default function App() {
  const [page, setPage] = useState(readHash());
  const [replayId, setReplayId] = useState(null);
  const [conn, setConn] = useState('connecting');
  const [balances, setBalances] = useState({ v1: 10, v2: 10 });
  const [runs, setRuns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState([]);
  const [narration, setNarration] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const bus = useMemo(() => createBus(), []);
  const attackRef = useRef(null);
  const warIdx = useRef(0);
  const warOn = useRef(false);
  const busyRef = useRef(false);
  const keyRef = useRef(0);

  const go = useCallback((p, id) => {
    if (id != null) setReplayId(id);
    window.location.hash = '/' + p;
    setPage(p);
  }, []);

  useEffect(() => {
    const on = () => setPage(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const refresh = useCallback(async (showResult) => {
    const [st, rr] = await Promise.all([getState().catch(() => null), getRuns().catch(() => null)]);
    const b = readBalances(st);
    setBalances((cur) => ({ v1: b.v1 != null ? b.v1 : cur.v1, v2: b.v2 != null ? b.v2 : cur.v2 }));
    if (rr) {
      const list = normalizeRuns(rr);
      setRuns(list);
      if (showResult && list.length) setResult(list[0]);
    }
  }, []);

  useEffect(() => {
    refresh(false);
    const close = openSocket({
      onStatus: (s) => { setConn(s); if (s === 'live') refresh(false); },
      onMessage: (m) => {
        if (m.type === 'run_started') {
          const a = m.attack || (m.summary && m.summary.attack) || (m.run && m.run.attack) || null;
          if (a) attackRef.current = a;
          else if (warOn.current) { attackRef.current = WAR_ORDER[warIdx.current % 5]; warIdx.current += 1; }
          setResult(null);
        } else if (m.type === 'frame') {
          const f = normalizeFrame(m.frame || m);
          if (!f.vault && m.vault) f.vault = m.vault;
          if (f.balance != null) setBalances((c) => ({ ...c, [f.vault]: f.balance }));
          const d = describeFrame(f, attackRef.current);
          setNarration({ ...d, vault: f.vault });
          keyRef.current += 1;
          const item = { key: keyRef.current, vault: f.vault, label: EVENT_LABEL[f.event] || f.event, text: d.text, tone: d.tone };
          setFeed((cur) => [item, ...cur].slice(0, 60));
          bus.emit({ kind: 'frame', frame: f });
        } else if (m.type === 'run_finished') {
          refresh(true);
        } else if (m.type === 'run_error') {
          setError(m.error || m.message || 'Something went wrong while running the test.');
        } else if (m.type === 'reset') {
          setFeed([]); setNarration(null); setResult(null);
          bus.emit({ kind: 'reset' });
          refresh(false);
        }
      },
    });
    return close;
  }, [bus, refresh]);

  const run = useCallback(async (fn, attack, war) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    attackRef.current = attack;
    warOn.current = !!war;
    warIdx.current = 0;
    try { await fn(); } catch (e) { setError(friendlyError(e)); }
    busyRef.current = false;
    warOn.current = false;
    setBusy(false);
    refresh(true);
  }, [refresh]);

  const actions = {
    attack: (type, v) => run(() => postAttack(type, v), type, false),
    normal: (v) => run(() => postNormal(v), 'normal', false),
    war: (v) => run(() => postWar(v), null, true),
    duel: () => run(async () => { await postWar('v1'); warIdx.current = 0; await postWar('v2'); }, null, true),
    reset: () => run(async () => {
      await postReset();
      setFeed([]); setNarration(null); setResult(null);
      bus.emit({ kind: 'reset' });
    }, null, false),
  };

  const scores = useMemo(() => computeScores(runs), [runs]);
  const app = {
    page, go, conn, balances, runs, scores, busy, feed, narration, result, error, bus, replayId, ...actions,
  };

  return (
    <div className="app">
      <header className="hdr">
        <button className="brand" onClick={() => go('home')}>
          <span className="brand-mark"><img src="/logo.png" alt="ApexForge" /></span>
          <span className="brand-tx"><b>ApexForge</b><small>Blockchain insurance, forged under fire</small></span>
        </button>
        <nav className="nav">
          {PAGES.map((p) => (
            <button key={p.id} className={'nav-btn' + (page === p.id ? ' on' : '')} onClick={() => go(p.id)}>
              <Icon name={p.icon} size={16} /> <span>{p.label}</span>
            </button>
          ))}
        </nav>
        <div className="hdr-right">
          <span className="mini mini-old" title="Old System safety score">Old <b>{scores.v1.meter}%</b></span>
          <span className="mini mini-new" title="Secured System safety score">Secured <b>{scores.v2.meter}%</b></span>
          <span className={'conn conn-' + conn}><i />{conn === 'live' ? 'Live' : conn === 'offline' ? 'Offline' : 'Connecting'}</span>
        </div>
      </header>

      <main className={'main page-' + page}>
        {page === 'home' && <Home app={app} />}
        {page === 'lab' && <Lab app={app} />}
        {page === 'learn' && <Learn app={app} />}
        {page === 'replay' && <Replay app={app} />}
        {page === 'history' && <History app={app} />}
      </main>

      {error && (
        <div className="toast">
          <Icon name="alert" size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss"><Icon name="x" size={14} /></button>
        </div>
      )}
    </div>
  );
}