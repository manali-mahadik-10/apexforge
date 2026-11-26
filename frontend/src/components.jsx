import React from 'react';
import { Icon } from './Icons.jsx';
import { ATTACKS, SYSTEMS, inr } from './content.js';

export function StatusPill({ status }) {
  if (status === 'blocked') return <span className="pill tone-good"><Icon name="check" size={12} /> Blocked</span>;
  if (status === 'broken') return <span className="pill tone-bad"><Icon name="x" size={12} /> Robbed</span>;
  return <span className="pill tone-muted">Not tested</span>;
}

export function SystemCard({ id, balance, score, compact }) {
  const sys = SYSTEMS[id];
  return (
    <div className={'syscard sc-' + id + (compact ? ' compact' : '')}>
      <div className="sc-head">
        <div>
          <div className="sc-name"><Icon name={id === 'v1' ? 'unlock' : 'lock'} size={16} /> {sys.name}</div>
          <div className="sc-sub">{sys.code}</div>
        </div>
        <div className="sc-money">{inr(balance)}</div>
      </div>
      <div className="meter-row">
        <span>Safety score</span>
        <b>{score.meter}%</b>
      </div>
      <div className="meter"><i style={{ width: score.meter + '%' }} /></div>
      <ul className="sc-list">
        {ATTACKS.map((a) => (
          <li key={a.id}>
            <span>{a.name}</span>
            <StatusPill status={score.map[a.id]} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FeedList({ feed }) {
  if (!feed.length) {
    return <div className="empty">Nothing yet. Pick a trick and watch each step appear here in plain words.</div>;
  }
  return (
    <ul className="feed">
      {feed.map((f) => (
        <li key={f.key} className={'feed-item tone-' + f.tone}>
          <span className="dot" />
          <div>
            <div className="feed-top">
              <b>{f.label}</b>
              <span className={'chip chip-' + f.vault}>{(SYSTEMS[f.vault] || SYSTEMS.v1).name}</span>
            </div>
            <div className="feed-text">{f.text}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}