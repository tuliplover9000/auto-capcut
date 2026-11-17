import React from 'react';
import {OPAL, PAINT} from '../observe/art';

// CHAIN REACTION props. Same local convention as the Person rig: base/feet at
// (0,0), facing right; the scene scales each by the perspective factor.

/* a small dog, side view. run = phase (undefined = standing), wag = phase */
export const Dog: React.FC<{run?: number; wag: number; eat?: boolean; fur?: string; dark?: string}> = ({run, wag, eat, fur = '#c98f3a', dark = '#9a6a2a'}) => {
  const sw = run === undefined ? 0 : Math.sin(run);
  const lift = run === undefined ? 0 : Math.abs(Math.cos(run)) * 3;
  return (
    <g transform={`translate(0 ${-lift})`}>
      <ellipse cx={0} cy={lift} rx={22} ry={4} fill="rgba(0,0,0,.18)" />
      {[[-12, 1], [-7, -1], [9, -1], [14, 1]].map(([x, d], k) => (
        <g key={k} transform={`rotate(${d * sw * 32} ${x} -12)`}><rect x={x - 2.5} y={-12} width={5} height={12} rx={2.5} fill={k % 2 ? dark : fur} /></g>
      ))}
      <path d={`M -17 -16 Q -26 ${-26 + Math.sin(wag) * 6} -24 ${-32 + Math.sin(wag) * 4}`} fill="none" stroke={fur} strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={0} cy={-17} rx={19} ry={9} fill={fur} />
      <ellipse cx={-2} cy={-13} rx={12} ry={4} fill="#f0d0a0" />
      <g transform={eat ? 'translate(4 9) rotate(30 16 -24)' : undefined}>
        <circle cx={18} cy={-26} r={8.5} fill={fur} />
        <ellipse cx={26} cy={-23} rx={5.5} ry={4} fill="#f0d0a0" />
        <circle cx={30} cy={-24.5} r={2} fill={OPAL.ink} />
        <circle cx={20} cy={-28} r={1.6} fill={OPAL.ink} />
        <path d="M 12 -33 Q 8 -26 12 -20 Q 16 -26 14 -32 Z" fill={dark} />
      </g>
      <rect x={10} y={-22} width={6} height={3} rx={1.5} fill="#d6293a" transform="rotate(-50 13 -20)" />
    </g>
  );
};

/* pigeon: peck = phase on the ground, fly = wing phase in the air */
export const Pigeon: React.FC<{peck?: number; fly?: number}> = ({peck, fly}) => {
  const dip = peck === undefined ? 0 : Math.max(0, Math.sin(peck)) * 4;
  const flap = fly === undefined ? 0 : Math.sin(fly);
  return (
    <g>
      {fly === undefined ? <ellipse cx={0} cy={0} rx={8} ry={2} fill="rgba(0,0,0,.15)" /> : null}
      {fly === undefined ? <><rect x={-2} y={-4} width={1.6} height={4} fill="#d06a5a" /><rect x={1} y={-4} width={1.6} height={4} fill="#d06a5a" /></> : null}
      <path d="M -12 -9 L -6 -7 L -6 -11 Z" fill="#6a7280" />
      <ellipse cx={-1} cy={-9} rx={8} ry={5.5} fill="#9aa3ae" />
      {fly !== undefined ? <path d={`M -4 -10 L 2 ${-10 - 12 * flap} L 6 -10 Z`} fill="#7a828e" /> : <ellipse cx={-2} cy={-9} rx={5} ry={3} fill="#7a828e" />}
      <g transform={`translate(0 ${dip})`}>
        <circle cx={6} cy={-14} r={3.6} fill="#6a7280" />
        <path d="M 9 -14.5 L 12.5 -13.5 L 9 -12.5 Z" fill="#e0a030" />
        <circle cx={7} cy={-15} r={0.9} fill={OPAL.ink} />
        <ellipse cx={5} cy={-11} rx={2.6} ry={1.6} fill="#5fa38a" />
      </g>
    </g>
  );
};

/* hot-dog cart; the umbrella hinges at the cart top and tilts by `tilt` degrees (+ = right) */
export const CART_PIVOT: [number, number] = [0, -64];
export const POLE = 160;
export const Cart: React.FC<{tilt: number}> = ({tilt}) => (
  <g>
    <ellipse cx={0} cy={0} rx={70} ry={10} fill="rgba(0,0,0,.18)" />
    <rect x={-62} y={-64} width={124} height={50} rx={6} fill="#e8505b" />
    <rect x={-62} y={-64} width={124} height={10} rx={4} fill="#f4f1ea" />
    <rect x={-48} y={-46} width={96} height={22} rx={4} fill="#ffd23f" />
    <text x={0} y={-29} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={15} fill="#8a2a1a">HOT DOGS</text>
    <circle cx={-40} cy={-10} r={10} fill={OPAL.ink} /><circle cx={-40} cy={-10} r={4} fill={OPAL.steel} />
    <circle cx={40} cy={-10} r={10} fill={OPAL.ink} /><circle cx={40} cy={-10} r={4} fill={OPAL.steel} />
    <g transform={`rotate(${tilt} ${CART_PIVOT[0]} ${CART_PIVOT[1]})`}>
      <rect x={-2.5} y={CART_PIVOT[1] - POLE} width={5} height={POLE} fill="#d8d2c4" />
      <path d={`M -100 ${CART_PIVOT[1] - POLE + 34} Q 0 ${CART_PIVOT[1] - POLE - 30} 100 ${CART_PIVOT[1] - POLE + 34} Z`} fill="#ff4f5e" />
      {[-60, -20, 20, 60].map((x) => <path key={x} d={`M ${x - 13} ${CART_PIVOT[1] - POLE + 30} Q ${x} ${CART_PIVOT[1] - POLE - 8} ${x + 13} ${CART_PIVOT[1] - POLE + 30} Z`} fill="#f4f1ea" opacity={0.9} />)}
      <circle cx={0} cy={CART_PIVOT[1] - POLE - 2} r={5} fill="#d8d2c4" />
    </g>
  </g>
);

/* the painter's ladder leaning on the café wall; the painter stands on a rung */
export const LADDER_H = 250;
export const RUNG = 150; // the painter's feet, units above the base
export const HOOK: [number, number] = [22, -228]; // where the bucket hangs (ladder coords)
export const Ladder: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={30} ry={6} fill="rgba(0,0,0,.15)" />
    <rect x={-22} y={-LADDER_H} width={6} height={LADDER_H} rx={3} fill="#c9a060" />
    <rect x={16} y={-LADDER_H} width={6} height={LADDER_H} rx={3} fill="#c9a060" />
    {Array.from({length: 8}).map((_, k) => <rect key={k} x={-18} y={-20 - k * 30} width={36} height={5} rx={2} fill="#b08a4a" />)}
  </g>
);
export const Bucket: React.FC<{full?: boolean}> = ({full = true}) => (
  <g>
    <path d="M -10 -22 Q 0 -34 10 -22" fill="none" stroke={OPAL.steel} strokeWidth={1.8} />
    <path d="M -10 -22 L 10 -22 L 8 0 L -8 0 Z" fill="#dfe6ee" stroke="#9aa3ae" strokeWidth={1} />
    <rect x={-9} y={-16} width={18} height={6} fill={PAINT} />
    {full ? <ellipse cx={0} cy={-22} rx={10} ry={2.6} fill={PAINT} /> : null}
  </g>
);
export const Lamp: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={16} ry={4} fill="rgba(0,0,0,.15)" />
    <rect x={-4} y={-230} width={8} height={230} fill="#3a4a5a" />
    <rect x={-12} y={-12} width={24} height={12} rx={3} fill="#2a3a4a" />
    <path d="M -18 -230 L 18 -230 L 12 -256 L -12 -256 Z" fill="#2a3a4a" />
    <rect x={-10} y={-246} width={20} height={14} fill="#ffe7a0" />
  </g>
);
