// ---------- MONEY: 1 test coin is shown as Rs 1,00,000 ----------
export const ETH_TO_INR = 100000;
const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export const inr = (eth) => '\u20B9' + nf.format(Math.round((Number(eth) || 0) * ETH_TO_INR));

// ---------- THE TWO SYSTEMS ----------
export const SYSTEMS = {
  v1: { id: 'v1', name: 'Old System', code: 'Raw Iron', color: '#ff7a45', metal: 0x4a3027, line: 'Weak locks', tagline: 'The first version. Quick to build, easy to fool.' },
  v2: { id: 'v2', name: 'Secured System', code: 'Apex Steel', color: '#2ee6c8', metal: 0x25363f, line: 'Strong locks', tagline: 'Same job, rebuilt with five safety fixes.' },
};

// ---------- THE FIVE TRICKS ----------
export const ATTACKS = [
  {
    id: 'reentrancy', name: 'Repeat-Withdrawal Trick', tech: 'Reentrancy', icon: 'repeat',
    short: 'Asks for the same money again and again',
    real: 'A cashier hands you cash first and writes it in the ledger afterwards. You ask again before the ledger is updated, so they pay you again.',
    thief: 'The thief files one small genuine claim. While the fund is paying it, the thief asks again and again before the fund updates its notes.',
    oldFails: 'The Old System sends the money first and updates its records after, so every repeat request still looks valid.',
    fix: 'The Secured System updates its records first, then pays, and locks the counter while serving someone (a "reentrancy guard").',
    launch: 'The thief files a small claim and gets ready to ask for the money again and again...',
    broken: 'The fund kept paying before it updated its notes. The thief emptied the whole fund.',
    blocked: 'The counter was locked during the first payment, so the repeat request was refused.',
  },
  {
    id: 'access', name: 'Fake-Approval Trick', tech: 'Broken access control', icon: 'approve',
    short: 'Approves their own claim without being the manager',
    real: 'An office where anyone can stamp APPROVED on their own form.',
    thief: 'The thief files a claim and then approves it themselves, even though only the manager is allowed to.',
    oldFails: 'The Old System never checks who is pressing the Approve button.',
    fix: 'The Secured System only accepts approvals from the verifier (the manager). Everyone else is refused.',
    launch: 'The thief files a claim and tries to stamp APPROVED on it personally...',
    broken: 'Nobody checked who approved. The thief approved their own claim and took the money.',
    blocked: 'The system checked the thief\'s role and refused: only the real manager can approve.',
  },
  {
    id: 'replay', name: 'Photocopied-Cheque Trick', tech: 'Signature replay', icon: 'copy',
    short: 'Reuses one signed payout slip many times',
    real: 'A signed cheque that never expires. Photocopy it and cash it again and again.',
    thief: 'The thief takes one genuine signed payout slip and submits it over and over.',
    oldFails: 'The Old System\'s slips have no serial number and no expiry date, so a copy looks as good as the original.',
    fix: 'Each Secured System slip has a one-time serial number (a nonce) and an expiry date. After one use it is dead.',
    launch: 'The thief photocopies a signed payout slip and hands in the copies...',
    broken: 'Every copy was accepted as genuine. The fund paid the same slip many times.',
    blocked: 'The slip was already used once, so every copy was rejected.',
  },
  {
    id: 'double', name: 'Same-Accident Trick', tech: 'Double claim', icon: 'file',
    short: 'Claims twice for the same incident',
    real: 'Claiming insurance twice for the same car accident.',
    thief: 'The thief files two claims that carry the same incident number.',
    oldFails: 'The Old System does not remember which incidents it has already paid.',
    fix: 'The Secured System records every incident number. One accident, one payout.',
    launch: 'The thief files two claims for the very same accident...',
    broken: 'The fund paid twice for one accident because it forgot the first claim.',
    blocked: 'The fund remembered that accident was already paid and refused the second claim.',
  },
  {
    id: 'txorigin', name: 'Fake-Identity Trick', tech: 'tx.origin phishing', icon: 'mail',
    short: 'Borrows the owner\'s identity through a middleman',
    real: 'A bank that checks who started the errand, not who is standing at the counter. A scammer gets the real owner to start an errand, then walks in using that identity.',
    thief: 'The thief tricks the real owner into touching a booby-trapped program, which then calls the fund pretending to be the owner.',
    oldFails: 'The Old System checks who started the whole chain of actions (tx.origin), not who is directly asking.',
    fix: 'The Secured System checks who is directly asking (msg.sender), so a middleman cannot borrow the owner\'s identity.',
    launch: 'The thief sets a trap so the owner\'s identity gets used without the owner knowing...',
    broken: 'The fund trusted the owner\'s name on the errand and let the thief empty it.',
    blocked: 'The fund checked who was really asking, saw an impostor, and refused.',
  },
];

// ---------- WHY A TRICK FAILED (backend reason -> plain words) ----------
const REASONS = {
  'transfer failed': 'The fund locked its counter, so the repeat request was refused.',
  'not a verifier': 'Only the real manager (verifier) can approve claims.',
  'bad signature or nonce used': 'That payout slip was already used once, so it was rejected.',
  'incident already claimed': 'That accident was already paid, so a second claim was refused.',
  'not owner': 'Only the real owner can empty the fund.',
};
export const friendlyReason = (r) => {
  if (!r || r === '-') return '';
  return REASONS[String(r).toLowerCase()] || String(r);
};

// ---------- SCORES (worked out from the saved runs) ----------
export function computeScores(runs) {
  const out = {
    v1: { map: {}, blocked: 0, broken: 0, meter: 0 },
    v2: { map: {}, blocked: 0, broken: 0, meter: 0 },
  };
  for (const r of runs) {
    if (r.attack === 'normal' || !out[r.vault]) continue;
    if (out[r.vault].map[r.attack]) continue; // runs are newest first, keep the latest
    out[r.vault].map[r.attack] = r.outcome;
  }
  for (const v of ['v1', 'v2']) {
    const vals = Object.values(out[v].map);
    out[v].blocked = vals.filter((x) => x === 'blocked').length;
    out[v].broken = vals.filter((x) => x === 'broken').length;
    out[v].meter = Math.round((out[v].blocked / 5) * 100);
  }
  return out;
}

// ---------- EVENTS IN PLAIN ENGLISH ----------
export const EVENT_LABEL = {
  AttackLaunched: 'Thief arrives',
  ClaimFiled: 'Claim filed',
  ClaimApproved: 'Claim approved',
  ClaimPaid: 'Payout sent',
  EmergencyWithdraw: 'Emergency withdrawal',
  Funded: 'Fund topped up',
  VaultBroken: 'ROBBED',
  AttackBlocked: 'BLOCKED',
  NormalClaimDone: 'Customer paid',
};

export function frameEth(f) {
  const a = f && f.args ? f.args : {};
  const raw = a.amount != null ? a.amount : (a.value != null ? a.value : a.amountEth);
  if (raw == null) return null;
  let n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n)) return null;
  if (typeof raw === 'string' && /^\d{10,}$/.test(raw)) n = n / 1e18;
  else if (n > 1e9) n = n / 1e18;
  return n;
}

export function describeFrame(f, attackId) {
  const a = ATTACKS.find((x) => x.id === attackId);
  const sys = (SYSTEMS[f.vault] || SYSTEMS.v1).name;
  const eth = frameEth(f);
  const attacking = !!a;
  switch (f.event) {
    case 'AttackLaunched':
      return { tone: 'warn', text: a ? a.launch : 'A thief is trying a trick on the ' + sys + '...' };
    case 'VaultBroken':
      return { tone: 'bad', text: a ? a.broken : 'The ' + sys + ' was robbed.' };
    case 'AttackBlocked':
      return { tone: 'good', text: a ? a.blocked : 'The ' + sys + ' stopped the attack.' };
    case 'NormalClaimDone':
      return { tone: 'good', text: 'An honest customer was paid smoothly: file the claim, manager approves, fund pays.' };
    case 'ClaimFiled':
      return { tone: 'info', text: 'A claim was filed, like handing in a form at the counter.' };
    case 'ClaimApproved':
      return { tone: 'info', text: 'The claim was approved.' };
    case 'ClaimPaid':
      return { tone: attacking ? 'bad' : 'info', text: (eth ? inr(eth) : 'Money') + (attacking ? ' just left the fund.' : ' was paid out to the customer.') };
    case 'EmergencyWithdraw':
      return { tone: 'bad', text: 'The owner\'s emergency exit was used' + (eth ? ' and ' + inr(eth) + ' left the fund.' : '.') };
    case 'Funded':
      return { tone: 'info', text: 'The fund was topped up with money.' };
    default:
      return { tone: 'info', text: String(f.event || 'Something happened').replace(/([a-z])([A-Z])/g, '$1 $2') + '.' };
  }
}

// ---------- TEXT FOR THE PAGES ----------
export const FLOW = [
  { icon: 'file', title: 'Customer files a claim', text: 'Like submitting an insurance form after an accident.' },
  { icon: 'approve', title: 'Manager approves it', text: 'Only the real manager is allowed to stamp APPROVED.' },
  { icon: 'rupee', title: 'Fund pays out', text: 'The fund sends the money automatically, no clerk needed.' },
];

export const STORY = [
  { icon: 'vault', title: 'The fund', text: 'A fictional insurance company keeps \u20B910,00,000 in a payout fund. Two copies exist: the Old System and the Secured System.' },
  { icon: 'mask', title: 'The thieves', text: 'Five different thieves each try one cunning trick on both copies, live, while you watch in 3D.' },
  { icon: 'shield', title: 'The result', text: 'The Old System gets robbed. The Secured System stops every trick. The scoreboard keeps count.' },
];

export const GLOSSARY = [
  { term: 'Blockchain', plain: 'A shared notebook that everyone can read and nobody can erase. Every money move is written on a new page.', where: 'The practice network running on this laptop' },
  { term: 'Smart contract', plain: 'A self-running rulebook. It pays money automatically when its rules are met, with no clerk.', where: 'The Old System and the Secured System' },
  { term: 'Transaction', plain: 'One recorded action, like filing a claim or sending a payout.', where: 'Each line in the live feed' },
  { term: 'Block', plain: 'One page of the notebook, holding a batch of transactions.', where: 'The "block" number in Replay' },
  { term: 'Wallet', plain: 'An account number plus a secret key that proves it is really you.', where: 'The thief, customer and manager accounts' },
  { term: 'Signature', plain: 'A digital stamp that proves who approved something.', where: 'The payout slips in the cheque trick' },
  { term: 'Test coins (ETH)', plain: 'Practice money of the practice network. Worthless, but behaves like real money.', where: 'Shown to you as rupees' },
];