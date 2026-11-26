import React, { useEffect, useRef, useState } from 'react';
import Scene3D from '../Scene3D.jsx';
import { Icon } from '../Icons.jsx';
import { getFrames, normalizeFrames } from '../api.js';
import { ATTACKS, EVENT_LABEL, SYSTEMS, describeFrame } from '../content.js';

const trickName = (id) => {
  const a = ATTACKS.find((x) => x.id === id);
  return a ? a.name : 'Honest customer claim';
};

export default function Replay({ app }) {
  const { runs } = app;
  const scene = useRef(null);
  const [runId, setRunId] = useState(app.replayId != null ? String(app.replayId) : '');
  const [frames, setFrames] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState('');

  const run = runs.find((r) => String(r.id) === String(runId));

  useEffect(() => {
    if (!runId && runs.length) setRunId(String(runs[0].id));
  }, [runs, runId]);

  useEffect(() => {
    if (!runId) return undefined;
    let dead = false;
    setPlaying(false);
    setIdx(-1);
    setErr('');
    setFrames([]);
    const r = runs.find((x) => String(x.id) === String(runId));
    if (scene.current) {
      scene.current.reset();
      scene.current.setMode(r && r.attack !== 'normal' ? 'attack' : 'normal', true);
    }
    getFrames(runId)
      .then((d) => { if (!dead) setFrames(normalizeFrames(d)); })
      .catch(() => { if (!dead) setErr('Could not load this run.'); });
    return () => { dead = true; };
  }, [runId]);

  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    if (idx < 0 || !frames.length) { s.setBalances({ v1: 10, v2: 10 }, true); return; }
    const f = frames[Math.min(idx, frames.length - 1)];
    const vault = (run && run.vault) || f.vault;
    let bal = 10;
    for (let j = idx; j >= 0; j--) {
      if (frames[j].balance != null) { bal = frames[j].balance; break; }
    }
    s.setBalances({ [vault]: bal }, false);
    s.playFrame({ ...f, vault });
  }, [idx, frames]);

  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => setIdx((i) => Math.min(i + 1, frames.length - 1)), 1100);
    return () => clearInterval(t);
  }, [playing, frames]);

  useEffect(() => {
    if (playing && frames.length && idx >= frames.length - 1) setPlaying(false);
  }, [idx, playing, frames]);

  const last = frames.length - 1;
  const cur = idx >= 0 ? frames[Math.min(idx, last)] : null;
  const desc = cur ? describeFrame({ ...cur, vault: (run && run.vault) || cur.vault }, run && run.attack) : null;

  const togglePlay = () => {
    if (!frames.length) return;
    if (playing) { setPlaying(false); return; }
    if (idx >= last) {
      setIdx(-1);
      if (scene.current) scene.current.reset();
    }
    setPlaying(true);
  };

  return (
    <div className="lab">
      <div className="lab-stage">
        <Scene3D ref={scene} />
        <div className={'hud hud-narr tone-' + (desc ? desc.tone : 'info')}>
          <Icon name="rewind" size={18} />
          <span>{desc ? desc.text : (runs.length ? 'Press play, or drag the slider, to watch this run again step by step.' : 'No saved runs yet. Go to the Live Lab and run a test first.')}</span>
        </div>
      </div>

      <aside className="lab-side">
        <section className="panel">
          <h3 className="panel-title"><Icon name="rewind" size={16} /> Pick a saved run</h3>
          <select className="select" value={runId} onChange={(e) => setRunId(e.target.value)}>
            {!runs.length && <option value="">No runs yet</option>}
            {runs.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {'#' + r.id + '  ' + (SYSTEMS[r.vault] ? SYSTEMS[r.vault].name : r.vault) + '  -  ' + trickName(r.attack) + '  -  ' + (r.outcome === 'broken' ? 'Robbed' : r.outcome === 'blocked' ? 'Blocked' : 'Paid')}
              </option>
            ))}
          </select>
          {err && <div className="empty">{err}</div>}
        </section>

        <section className="panel">
          <h3 className="panel-title">Playback</h3>
          <div className="rp-bar">
            <button className="icon-btn" onClick={() => setIdx((i) => Math.max(-1, i - 1))} disabled={!frames.length} aria-label="Previous"><Icon name="prev" size={18} /></button>
            <button className="btn btn-primary" onClick={togglePlay} disabled={!frames.length}>
              <Icon name={playing ? 'pause' : 'play'} size={16} /> {playing ? 'Pause' : 'Play'}
            </button>
            <button className="icon-btn" onClick={() => setIdx((i) => Math.min(last, i + 1))} disabled={!frames.length} aria-label="Next"><Icon name="next" size={18} /></button>
            <button className="icon-btn" onClick={() => { setPlaying(false); setIdx(-1); if (scene.current) scene.current.reset(); }} disabled={!frames.length} aria-label="Restart"><Icon name="reset" size={18} /></button>
          </div>
          <input
            className="range" type="range" min="0" max={Math.max(frames.length, 0)}
            value={idx + 1} disabled={!frames.length}
            onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value) - 1); }}
          />
          <div className="rp-count">{idx < 0 ? 'Before the attack' : 'Step ' + (idx + 1) + ' of ' + frames.length}</div>
        </section>

        <section className="panel">
          <h3 className="panel-title">Every step of this run</h3>
          {!frames.length && <div className="empty">Pick a run to see its steps.</div>}
          <ul className="steps">
            {frames.map((f, i) => (
              <li key={i} className={'step-row' + (i === idx ? ' on' : '') + (i < idx ? ' done' : '')} onClick={() => { setPlaying(false); setIdx(i); }}>
                <span className="step-n">{i + 1}</span>
                <div>
                  <b>{EVENT_LABEL[f.event] || f.event}</b>
                  <small>{f.block != null ? 'Block ' + f.block : ''}{f.txHash ? '  -  ' + f.txHash.slice(0, 10) + '...' : ''}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}