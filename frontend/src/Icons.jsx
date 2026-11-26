import React from 'react';

const PATHS = {
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  shield: <path d="M12 3l7 3v5c0 5-3.2 8.2-7 10-3.8-1.8-7-5-7-10V6l7-3z" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  unlock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 017.5-2" /></>,
  bolt: <path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  reset: <><path d="M4 12a8 8 0 108-8" /><path d="M4 4v5h5" /></>,
  play: <path d="M8 5l11 7-11 7V5z" />,
  pause: <><path d="M8 5v14" /><path d="M16 5v14" /></>,
  prev: <><path d="M6 5v14" /><path d="M19 5L9 12l10 7V5z" /></>,
  next: <><path d="M18 5v14" /><path d="M5 5l10 7-10 7V5z" /></>,
  pulse: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  file: <><path d="M6 3h8l4 4v14H6V3z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0" /><path d="M16 5a3.5 3.5 0 010 6M18 14a6.5 6.5 0 013.5 6" /></>,
  mask: <><path d="M4 8c3-2 5-2 8-1 3-1 5-1 8 1 0 6-3 10-8 10S4 14 4 8z" /><path d="M8 11h2M14 11h2" /></>,
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  flask: <><path d="M9 3h6" /><path d="M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" /><path d="M7.5 15h9" /></>,
  book: <><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z" /><path d="M4 19a2 2 0 012-2h13" /></>,
  rewind: <><path d="M3 12a9 9 0 109-9" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></>,
  list: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
  rupee: <path d="M7 5h10M7 9h10M7 5c5 0 7 2 7 4s-2 4-7 4l6 6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  approve: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 012-2h9" /></>,
  repeat: <><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 013-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 01-3 3H3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  alert: <><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v5M12 18h.01" /></>,
  vault: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="12" r="3.5" /><path d="M12 8.5V6M12 18v-2.5M8.5 12H6M18 12h-2.5" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3" /></>,
  chain: <><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></>,
};

export function Icon({ name, size = 18, className = '' }) {
  return (
    <svg
      className={'icon ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] || PATHS.info}
    </svg>
  );
}