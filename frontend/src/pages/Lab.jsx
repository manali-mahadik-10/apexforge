import React, { useEffect, useRef, useState } from 'react';
import Scene3D from '../Scene3D.jsx';
import { Icon } from '../Icons.jsx';
import { ATTACKS, SYSTEMS, friendlyReason, inr } from '../content.js';
import { FeedList, SystemCard } from '../components.jsx';

export default function Lab({ app }) {
  const { balances, scores, busy, feed, narration, result, bus } = app;
  const [sel, setSel] = useState('v1');
  const scene = useRef(null);

  useEffect(() => { if (scene.current) scene.current.setBalances(balances, true); }, []);
  useEffect(() => { if (scene.current) scene.current.setBalances(balances, false); }, [balances]);
  useEffect(() => bus.on((m) => {
    const s = scene.current;
    if (!s) return;
    if (m.kind === 'frame') s.playFrame(m.frame);
    if (m.kind === 'reset') s.reset();
  }), [bus]);

  const rAttack = result && ATTACKS.find((a) => a.id === result.attack);
  const rSys = result && SYSTEMS[result.vault];
  let rTitle = '';
  let rText = '';
  if (result && rSys) {
    if (result.outcome === 'broken') {
      rTitle = rSys.name + ' was robbed of ' + inr(result.movedEth);
      rText = rAttack ? rAttack.oldFails : '';
    } else if (result.outcome === 'blocked') {
      rTitle = rSys.name + ' blocked the attack. Money lost: \u20B90';
      rText = friendlyReason(result.reason) || (rAttack ? rAttack.fix : '');
    } else {
      rTitle = 'Honest customer paid ' + inr(result.movedEth);
      rText = 'A normal claim: filed, approved, paid. No problems.';
    }
  }

  return (
    <div className="lab">
      <div className="lab-stage">
        <Scene3D ref={scene} />
        <div className="hud hud-legend">
          <span><i className="lg lg-bad" /> Thief</span>
          <span><i className="lg lg-good" /> Honest customer</span>
          <span><i className="lg lg-new" /> Shield = strong locks</span>
          <span className="hint">Drag to rotate, scroll to zoom</span>
        </div>
        {result && (
          <div className={'hud hud-result ' + (result.outcome === 'broken' ? 'is-bad' : 'is-good')}>
            <div className="result-top">
              <Icon name={result.outcome === 'broken' ? 'alert' : 'shield'} size={18} />
              <b>{rTitle}</b>
            </div>
            {rAttack && result.outcome !== 'ok' && <div className="result-trick">{rAttack.name} <em>{rAttack.tech}</em></div>}
            <p>{rText}</p>
          </div>
        )}
        <div className={'hud hud-narr tone-' + (narration ? narration.tone : 'info')}>
          <Icon name={busy ? 'pulse' : 'info'} size={18} />
          <span>
            {narration
              ? narration.text
              : 'Pick a system on the right, then send a thief. The story appears here in plain words.'}
          </span>
        </div>
      </div>

      <aside className="lab-side">
        <section className="panel">
          <h3 className="panel-title"><span className="step">1</span> Pick a system to test</h3>
          <div className="sys-toggle">
            {['v1', 'v2'].map((id) => (
              <button key={id} className={'sys-btn sys-' + id + (sel === id ? ' on' : '')} onClick={() => setSel(id)}>
                <Icon name={id === 'v1' ? 'unlock' : 'lock'} size={18} />
                <span><b>{SYSTEMS[id].name}</b><small>{id === 'v1' ? 'Has hidden weak spots' : 'Rebuilt with safety fixes'}</small></span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3 className="panel-title"><span className="step">2</span> Send a thief</h3>
          <div className="tricks">
            {ATTACKS.map((a) => (
              <button key={a.id} className="trick" disabled={busy} onClick={() => app.attack(a.id, sel)}>
                <span className="trick-ic"><Icon name={a.icon} size={18} /></span>
                <span className="trick-tx"><b>{a.name}</b><small>{a.short}</small></span>
              </button>
            ))}
          </div>
          <div className="row-btns">
            <button className="btn btn-primary" disabled={busy} onClick={() => app.war(sel)}><Icon name="bolt" size={16} /> Run all 5</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => app.normal(sel)}><Icon name="users" size={16} /> Honest customer</button>
          </div>
          <button className="btn btn-glow wide" disabled={busy} onClick={() => app.duel()}>
            <Icon name="target" size={16} /> Full showdown: Old vs Secured
          </button>
        </section>

        <section className="panel">
          <h3 className="panel-title">Scoreboard</h3>
          <div className="score-grid">
            <SystemCard id="v1" balance={balances.v1} score={scores.v1} compact />
            <SystemCard id="v2" balance={balances.v2} score={scores.v2} compact />
          </div>
        </section>

        <section className="panel">
          <h3 className="panel-title"><Icon name="pulse" size={16} /> What is happening</h3>
          <FeedList feed={feed} />
        </section>

        <button className="btn btn-ghost wide" disabled={busy} onClick={() => app.reset()}>
          <Icon name="reset" size={16} /> Reset demo (clears saved runs)
        </button>
      </aside>
    </div>
  );
}