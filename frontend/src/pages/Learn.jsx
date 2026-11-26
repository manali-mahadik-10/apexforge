import React from 'react';
import { Icon } from '../Icons.jsx';
import { ATTACKS } from '../content.js';

export default function Learn({ app }) {
  const tryIt = (id) => {
    app.go('lab');
    setTimeout(() => app.attack(id, 'v1'), 1200);
  };
  return (
    <div className="page">
      <h1 className="page-h">The 5 tricks, explained simply</h1>
      <p className="lead">Each trick has a real-life version you already know. Then see why the Old System falls for it and how the Secured System stops it.</p>
      <div className="learn-list">
        {ATTACKS.map((a, i) => (
          <article className="card learn" key={a.id}>
            <div className="learn-head">
              <span className="learn-n">{i + 1}</span>
              <div>
                <h2>{a.name}</h2>
                <span className="tech">Technical name: {a.tech}</span>
              </div>
              <button className="btn btn-primary" onClick={() => tryIt(a.id)}><Icon name="play" size={16} /> Watch it live</button>
            </div>
            <div className="real"><Icon name={a.icon} size={20} /><p><b>In real life:</b> {a.real}</p></div>
            <p className="learn-thief"><b>What the thief does:</b> {a.thief}</p>
            <div className="grid2">
              <div className="vs vs-old"><div className="vs-h"><Icon name="x" size={16} /> Old System</div><p>{a.oldFails}</p></div>
              <div className="vs vs-new"><div className="vs-h"><Icon name="check" size={16} /> Secured System</div><p>{a.fix}</p></div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}