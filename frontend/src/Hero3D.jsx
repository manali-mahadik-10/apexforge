import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';

const ORBIT = [
  { icon: 'vault', label: 'VAULT' },
  { icon: 'mask', label: 'THIEF' },
  { icon: 'shield', label: 'SHIELD' },
  { icon: 'chain', label: 'BLOCKCHAIN' },
  { icon: 'lock', label: 'STRONG LOCKS' },
  { icon: 'pulse', label: 'LIVE FEED' },
];

// The 3D logo with gold icons going around it.
export function HeroOrbit() {
  const stage = useRef(null);

  useEffect(() => {
    const el = stage.current;
    if (!el) return undefined;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const leave = () => { tx = 0; ty = 0; };
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty('--rx', (-cy * 14).toFixed(2) + 'deg');
      el.style.setProperty('--ry', (cx * 18).toFixed(2) + 'deg');
      raf = requestAnimationFrame(loop);
    };
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mousemove', move);
      el.removeEventListener('mouseleave', leave);
    };
  }, []);

  return (
    <div className="orbit" ref={stage}>
      <div className="orbit-tilt">
        <div className="orbit-glow" />
        <div className="orbit-ring orbit-ring-1" />
        <div className="orbit-ring orbit-ring-2" />
        <div className="orbit-spin">
          {ORBIT.map((o, i) => (
            <div className="orbit-slot" key={o.label} style={{ '--a': (i * 360) / ORBIT.length + 'deg' }}>
              <div className="orbit-item">
                <span className="orbit-ic"><Icon name={o.icon} size={26} /></span>
                <span className="orbit-lb">{o.label}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="orbit-logo">
          <img src="/logo.png" alt="ApexForge logo" draggable="false" />
        </div>
      </div>
    </div>
  );
}

// A card that tilts toward your mouse.
export function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = 'perspective(900px) rotateX(' + ((0.5 - y) * 10).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 12).toFixed(2) + 'deg) translateY(-4px)';
    el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <div ref={ref} className={'card tilt ' + className} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

// A number that counts up when it changes.
export function CountUp({ value, suffix = '' }) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const a = from.current;
    const step = (t) => {
      const k = Math.min(1, (t - start) / 800);
      setN(Math.round(a + (value - a) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}{suffix}</>;
}