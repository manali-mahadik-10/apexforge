import React from 'react';
import { Icon } from '../Icons.jsx';
import { FLOW, GLOSSARY, STORY } from '../content.js';
import { CountUp, HeroOrbit, TiltCard } from '../Hero3D.jsx';

export default function Home({ app }) {
  const { scores, runs, go } = app;
  const tried = runs.filter((r) => r.attack !== 'normal');
  const blocked = tried.filter((r) => r.outcome === 'blocked').length;
  const robbed = tried.filter((r) => r.outcome === 'broken').length;

  const isRef = tried.length === 0;
  const stats = [
    { n: isRef ? 10 : tried.length, s: '', label: 'Attacks tried' },
    { n: isRef ? 5 : blocked, s: '', label: 'Attacks blocked' },
    { n: isRef ? 5 : robbed, s: '', label: 'Successful robberies' },
    { n: isRef ? 100 : scores.v2.meter, s: '%', label: 'Secured system safety' },
  ];

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-tx">
          <div className="pills">
            <span className="tpill">Blockchain Insurance</span>
            <span className="tpill tpill-blue">Smart fund disbursement</span>
            <span className="tpill">Live attacks</span>
          </div>
          <h1>
            Break it. Forge it.
            <br />
            <em>Make it unbreakable.</em>
          </h1>
          <p>
            ApexForge builds two copies of the same insurance payout fund. One has hidden weak spots.
            The other is armoured. Then five thieves attack both, live, while you watch what happens to the money.
          </p>
          <div className="row-btns">
            <button className="btn btn-primary big" onClick={() => go('lab')}><Icon name="play" size={18} /> Start the live demo</button>
            <button className="btn btn-ghost big" onClick={() => go('learn')}><Icon name="book" size={18} /> Learn the 5 tricks</button>
          </div>
          <div className="note">
            Amounts are shown in rupees to keep things simple. Behind the scenes it runs on a practice network with test coins, so no real money ever moves.
          </div>
        </div>
        <HeroOrbit />
      </section>

      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat-n"><CountUp value={s.n} suffix={s.s} /></div>
            <div className="stat-l">{s.label}</div>
          </div>
        ))}
      </div>
      {isRef && (
        <div className="note">Reference results from a full showdown. Run the live demo to see your own numbers.</div>
      )}

      <h2 className="sec">The story in 3 steps</h2>
      <div className="grid3">
        {STORY.map((s, i) => (
          <TiltCard className="story" key={s.title}>
            <div className="story-ic"><Icon name={s.icon} size={24} /></div>
            <div className="story-n">0{i + 1}</div>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </TiltCard>
        ))}
      </div>

      <h2 className="sec">How a payout works</h2>
      <div className="flow">
        {FLOW.map((f, i) => (
          <React.Fragment key={f.title}>
            <TiltCard className="flow-step">
              <div className="story-ic"><Icon name={f.icon} size={22} /></div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </TiltCard>
            {i < FLOW.length - 1 && <div className="flow-arrow"><Icon name="arrow" size={26} /></div>}
          </React.Fragment>
        ))}
      </div>

      <h2 className="sec">Blockchain words in plain English</h2>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Word you may hear</th><th>What it really means</th><th>Where you see it here</th></tr></thead>
          <tbody>
            {GLOSSARY.map((g) => (
              <tr key={g.term}><td><b>{g.term}</b></td><td>{g.plain}</td><td className="muted">{g.where}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card callout">
        <Icon name="alert" size={22} />
        <p>
          <b>Why this matters in real life:</b> in 2016, a famous blockchain fund called The DAO lost tens of millions of dollars to the very first
          trick in this project, the repeat-withdrawal trick. Fixing it takes a few lines of code, if you know to look for it.
        </p>
      </div>
    </div>
  );
}