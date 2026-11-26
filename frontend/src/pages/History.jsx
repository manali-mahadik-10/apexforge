import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icons.jsx';
import { ATTACKS, SYSTEMS, friendlyReason, inr } from '../content.js';
import { SystemCard } from '../components.jsx';
import { CountUp } from '../Hero3D.jsx';

const claimNo = (r) => 'AF-' + String(r.id).padStart(4, '0');
const trickOf = (r) => ATTACKS.find((a) => a.id === r.attack);
const isHonest = (r) => r.attack === 'normal';
const typeText = (r) => (isHonest(r) ? 'Honest customer claim' : (trickOf(r) ? trickOf(r).name : r.attack));
const sysName = (r) => (SYSTEMS[r.vault] ? SYSTEMS[r.vault].name : r.vault);

function statusText(r) {
  if (isHonest(r)) return 'PAID';
  if (r.outcome === 'broken') return 'FRAUD SUCCEEDED';
  if (r.outcome === 'blocked') return 'FRAUD BLOCKED';
  return 'PAID';
}

function fmtDate(v) {
  if (v == null || v === '') return '-';
  let d;
  if (typeof v === 'number') d = new Date(v < 1e12 ? v * 1000 : v);
  else if (/^\d+$/.test(String(v))) { const n = Number(v); d = new Date(n < 1e12 ? n * 1000 : n); }
  else d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function detail(r) {
  const a = trickOf(r);
  if (isHonest(r)) return 'The customer filed a claim, the manager approved it, and the smart fund paid out automatically.';
  if (r.outcome === 'broken') return a ? a.oldFails : 'The fund was robbed.';
  if (r.outcome === 'blocked') return friendlyReason(r.reason) || (a ? a.fix : 'The attack was refused.');
  return '';
}

function Pill({ r }) {
  if (isHonest(r)) return <span className="pill tone-good"><Icon name="check" size={12} /> Paid</span>;
  if (r.outcome === 'broken') return <span className="pill tone-bad"><Icon name="x" size={12} /> Fraud succeeded</span>;
  if (r.outcome === 'blocked') return <span className="pill tone-good"><Icon name="shield" size={12} /> Fraud blocked</span>;
  return <span className="pill tone-info">Paid</span>;
}

// The page that is only seen when printing or saving as PDF
// The page that is only seen when printing or saving as PDF
function PrintSheet({ job, list }) {
  const one = job.type === 'one';
  const r0 = list[0];
  const paid = list.filter(isHonest).reduce((s, r) => s + r.movedEth, 0);
  const stolen = list.filter((r) => r.outcome === 'broken').reduce((s, r) => s + r.movedEth, 0);
  const blocked = list.filter((r) => r.outcome === 'blocked').length;
  const now = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  let ok = true;
  let headline = '';
  let subline = '';
  if (one) {
    ok = r0.outcome !== 'broken';
    if (isHonest(r0)) {
      headline = 'Claim paid successfully';
      subline = 'paid to the customer by the ' + sysName(r0);
    } else if (r0.outcome === 'broken') {
      headline = 'Funds were stolen';
      subline = 'taken from the ' + sysName(r0) + ' by the ' + typeText(r0);
    } else {
      headline = 'Attack blocked';
      subline = 'stopped on the ' + sysName(r0) + ' (' + typeText(r0) + ')';
    }
  }

  return createPortal(
    <div className={'print-root' + (one ? ' ps-one' : '')}>
      <div className="ps-frame">
        {one ? (
          <>
            <div className={'ps-icon ' + (ok ? 'ps-icon-ok' : 'ps-icon-bad')}>
              <Icon name={ok ? 'check' : 'x'} size={60} />
            </div>
            <h2 className="ps-headline">{headline}</h2>
            <div className="ps-amount">{inr(r0.movedEth)}</div>
            <div className="ps-sub">{subline}</div>
            <table className="ps-rows">
              <tbody>
                <tr><th>Date &amp; time</th><td>{fmtDate(r0.createdAt)}</td></tr>
                <tr><th>Claim ID</th><td>{claimNo(r0)}</td></tr>
                <tr><th>System</th><td>{sysName(r0)}</td></tr>
                <tr><th>Claim type</th><td>{typeText(r0)}</td></tr>
                <tr><th>Status</th><td className={ok ? 'ps-good' : 'ps-bad'}>{statusText(r0)}</td></tr>
              </tbody>
            </table>
            <p className="ps-what">{detail(r0)}</p>
          </>
        ) : (
          <>
            <div className="ps-head">
              <div className="ps-seal ps-seal-lg"><img src="/logo.png" alt="" /></div>
              <div>
                <h1 className="ps-h1">Claims Statement</h1>
                <div className="ps-tag">ApexForge &middot; Blockchain Insurance Claims and Smart Fund Disbursement</div>
              </div>
              <div className="ps-meta">Generated<br /><b>{now}</b></div>
            </div>
            <div className="ps-sum">
              <div><b>{list.length}</b><span>Records</span></div>
              <div><b>{inr(paid)}</b><span>Paid to customers</span></div>
              <div><b>{blocked}</b><span>Frauds blocked</span></div>
              <div><b>{inr(stolen)}</b><span>Lost to fraud</span></div>
            </div>
            <table className="ps-table">
              <thead>
                <tr><th>Claim</th><th>Date</th><th>System</th><th>Type</th><th>Status</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>{claimNo(r)}</td>
                    <td>{fmtDate(r.createdAt)}</td>
                    <td>{sysName(r)}</td>
                    <td>{typeText(r)}</td>
                    <td className={r.outcome === 'broken' ? 'ps-bad' : 'ps-good'}>{statusText(r)}</td>
                    <td>{inr(r.movedEth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="ps-foot">
          <div className="ps-seal"><img src="/logo.png" alt="" /></div>
          <b>Secured by APEXFORGE</b>
          <span>Blockchain insurance, forged under fire</span>
          <small>
            Generated from records saved on the ApexForge practice blockchain network. Amounts are shown at a fixed demo rate of
            {' '}&#8377;1,00,000 per test coin. Test coins have no real value and no real money moves.
          </small>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function History({ app }) {
  const { runs, scores, balances, go } = app;
  const [filter, setFilter] = useState('all');
  const [job, setJob] = useState(null);

  const shown = runs.filter((r) => filter === 'all' || (filter === 'honest' ? isHonest(r) : !isHonest(r)));
  const honest = runs.filter(isHonest);
  const paidTotal = honest.reduce((s, r) => s + r.movedEth, 0);
  const blockedCount = runs.filter((r) => r.outcome === 'blocked').length;
  const stolenTotal = runs.filter((r) => r.outcome === 'broken').reduce((s, r) => s + r.movedEth, 0);

  useEffect(() => {
    if (!job) return undefined;
    const oldTitle = document.title;
    document.title = job.type === 'one' ? 'ApexForge-Claim-' + claimNo(job.run) : 'ApexForge-Claims-Statement';
    const done = () => { document.title = oldTitle; setJob(null); };
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => window.print(), 250);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [job]);

  const FILTERS = [
    { id: 'all', label: 'All records' },
    { id: 'honest', label: 'Honest claims' },
    { id: 'attack', label: 'Attack attempts' },
  ];

  return (
    <div className="page">
      <h1 className="page-h">Claims Ledger</h1>
      <p className="lead">
        Every insurance claim and every attack test is recorded here as a claim. Download the whole statement, or a receipt for any single claim, as a PDF.
      </p>

      <div className="stats ledger-stats">
        <div className="stat"><div className="stat-n"><CountUp value={runs.length} /></div><div className="stat-l">Claims on record</div></div>
        <div className="stat"><div className="stat-n sm">{inr(paidTotal)}</div><div className="stat-l">Paid to honest customers</div></div>
        <div className="stat"><div className="stat-n"><CountUp value={blockedCount} /></div><div className="stat-l">Frauds blocked</div></div>
        <div className="stat"><div className="stat-n sm">{inr(stolenTotal)}</div><div className="stat-l">Lost to fraud</div></div>
      </div>

      <div className="tbar">
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.id} className={'fchip' + (filter === f.id ? ' on' : '')} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <button className="btn btn-primary" disabled={!shown.length} onClick={() => setJob({ type: 'all' })}>
          <Icon name="file" size={16} /> Download statement (PDF)
        </button>
      </div>

      <div className="card">
        {!shown.length ? (
          <div className="empty">No claims yet. Open the Live Lab and run a few tests, then come back here.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Claim</th><th>System</th><th>Type</th><th>Result</th><th>Amount</th><th>What happened</th><th /></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td><b>{claimNo(r)}</b><small className="tech-sm">{fmtDate(r.createdAt)}</small></td>
                    <td><span className={'chip chip-' + r.vault}>{sysName(r)}</span></td>
                    <td>{typeText(r)}{trickOf(r) && <small className="tech-sm">{trickOf(r).tech}</small>}</td>
                    <td><Pill r={r} /></td>
                    <td className={r.outcome === 'broken' ? 'bad-tx' : ''}>{inr(r.movedEth)}</td>
                    <td className="muted">{detail(r)}</td>
                    <td className="acts">
                      <button className="btn btn-ghost sm" onClick={() => setJob({ type: 'one', run: r })}><Icon name="file" size={14} /> PDF</button>
                      <button className="btn btn-ghost sm" onClick={() => go('replay', r.id)}><Icon name="rewind" size={14} /> Replay</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="sec">Safety scores</h2>
      <p className="lead">The safety score is the share of the 5 tricks a system stopped.</p>
      <div className="grid2">
        <SystemCard id="v1" balance={balances.v1} score={scores.v1} />
        <SystemCard id="v2" balance={balances.v2} score={scores.v2} />
      </div>

      {job && <PrintSheet job={job} list={job.type === 'one' ? [job.run] : shown} />}
    </div>
  );
}