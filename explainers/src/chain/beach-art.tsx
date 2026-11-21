import React from 'react';
import {OPAL} from '../observe/art';

// Props for CHAIN REACTION #4 ("beach"). Same flat style as party-art.tsx:
// origin = ground contact point, +y down, units scale with kAt(y)
// (a Person is ~58 units tall).

const OL = '#1b1b22';

/* beach crab, facing the camera. walk = leg phase, snap 0..1 = claws open,
   up = claws raised, shades = tiny sunglasses (the kicker) */
export const Crab: React.FC<{walk?: number; snap?: number; up?: number; shades?: boolean; angry?: boolean}> = ({walk, snap = 0, up = 0, shades, angry}) => {
  const lg = walk === undefined ? 0 : Math.sin(walk);
  const col = '#ff5a3c';
  const dk = '#b8321e';
  return (
    <g>
      <ellipse cx={0} cy={0} rx={11} ry={2.4} fill="rgba(0,0,0,.18)" />
      {[-1, 1].map((d) => [0, 1, 2].map((j) => (
        <path key={`${d}${j}`} d={`M ${d * 6} -5 L ${d * (11 + j * 1.5)} ${-7 + j * 2 + (j % 2 ? lg : -lg) * 2} L ${d * (13 + j * 1.5)} 0`} fill="none" stroke={dk} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      )))}
      {/* claws */}
      {[-1, 1].map((d) => {
        const lift = -10 - up * 9;
        const op = snap * 0.6;
        return (
          <g key={d}>
            <path d={`M ${d * 7} -7 Q ${d * 13} -9 ${d * 13} ${lift + 3}`} fill="none" stroke={col} strokeWidth={2.6} strokeLinecap="round" />
            <g transform={`translate(${d * 13} ${lift})`}>
              <path d={`M 0 3 Q ${d * 5} ${-1} ${d * 2} ${-6} Z`} fill={col} stroke={dk} strokeWidth={1} transform={`rotate(${d * op * 30} 0 3)`} />
              <path d={`M 0 3 Q ${-d * 4} ${-1} ${-d * 1} ${-6} Z`} fill={col} stroke={dk} strokeWidth={1} transform={`rotate(${-d * op * 30} 0 3)`} />
            </g>
          </g>
        );
      })}
      <ellipse cx={0} cy={-6} rx={9} ry={5.5} fill={col} stroke={dk} strokeWidth={1.2} />
      <ellipse cx={-2} cy={-8} rx={4} ry={1.6} fill="#ff8a6a" />
      {/* eye stalks */}
      {[-3, 3].map((x) => (
        <g key={x}>
          <line x1={x} y1={-10} x2={x * 1.2} y2={-15} stroke={dk} strokeWidth={1.4} />
          <circle cx={x * 1.2} cy={-16} r={2.2} fill="#fff" stroke={OL} strokeWidth={0.6} />
          <circle cx={x * 1.2} cy={-16} r={1} fill={OL} />
        </g>
      ))}
      {angry ? <path d="M -6 -19 L -2 -17.5 M 6 -19 L 2 -17.5" stroke={OL} strokeWidth={1.2} strokeLinecap="round" /> : null}
      {shades ? (
        <g>
          <rect x={-6.4} y={-18} width={5} height={3.4} rx={1.2} fill={OL} />
          <rect x={1.4} y={-18} width={5} height={3.4} rx={1.2} fill={OL} />
          <line x1={-1.4} y1={-17} x2={1.4} y2={-17} stroke={OL} strokeWidth={0.8} />
        </g>
      ) : null}
    </g>
  );
};

/* striped beach umbrella; origin = bottom of the pole. UMB_C is the point it
   tumbles around once the wind has it. */
export const UMB_C: [number, number] = [0, -58];
export const Umbrella: React.FC<{col?: string; col2?: string; flap?: number}> = ({col = '#ff4f5e', col2 = '#f4f1ea', flap = 0}) => {
  const xs = [-46, -23, 0, 23, 46];
  const f = (i: number) => Math.sin(flap + i * 1.7) * 3 * (flap ? 1 : 0);
  return (
    <g>
      <rect x={-1.4} y={-80} width={2.8} height={80} fill="#e2ddd2" stroke="#9aa3ae" strokeWidth={0.6} />
      {xs.slice(0, 4).map((x, i) => (
        <path key={i} d={`M 0 -98 L ${x} ${-70 + f(i)} Q ${(x + xs[i + 1]) / 2} ${-64 + f(i + 1)} ${xs[i + 1]} ${-70 + f(i + 1)} Z`} fill={i % 2 ? col2 : col} stroke="#00000033" strokeWidth={0.8} />
      ))}
      <circle cx={0} cy={-99} r={2.4} fill={col} />
    </g>
  );
};

/* towel laid on the sand (origin = centre) */
export const Towel: React.FC<{col?: string; col2?: string; w?: number}> = ({col = '#3fa7ff', col2 = '#f4f1ea', w = 40}) => (
  <g>
    <path d={`M ${-w} -6 L ${w - 4} -6 L ${w} 5 L ${-w + 4} 5 Z`} fill={col} />
    {[-0.5, 0, 0.5].map((u) => <path key={u} d={`M ${u * w * 2 - 4} -6 L ${u * w * 2 + 3} -6 L ${u * w * 2 + 6} 5 L ${u * w * 2 - 1} 5 Z`} fill={col2} opacity={0.85} />)}
  </g>
);

/* surfboard (origin = centre, lying along x) */
export const Surfboard: React.FC<{col?: string}> = ({col = '#ffd23f'}) => (
  <g>
    <path d="M -34 0 Q -30 -6.5 0 -6.5 Q 30 -6.5 37 0 Q 30 6.5 0 6.5 Q -30 6.5 -34 0 Z" fill={col} stroke={OL} strokeWidth={1.2} />
    <path d="M -30 0 L 33 0" stroke="#ff4f5e" strokeWidth={2.2} />
    <path d="M -26 -1 L -32 -9 L -22 -1 Z" fill={OL} />
  </g>
);

/* striped beach ball (origin = centre) */
export const BeachBall: React.FC<{spin?: number; r?: number}> = ({spin = 0, r = 10}) => {
  const cols = ['#ff4f5e', '#f4f1ea', '#3fa7ff', '#f4f1ea', '#ffd23f', '#f4f1ea'];
  return (
    <g transform={`rotate(${spin * 57.3})`}>
      {cols.map((c, k) => {
        const a0 = (k / 6) * Math.PI * 2;
        const a1 = ((k + 1) / 6) * Math.PI * 2;
        return <path key={k} d={`M 0 0 L ${Math.cos(a0) * r} ${Math.sin(a0) * r} A ${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r} Z`} fill={c} />;
      })}
      <circle r={r} fill="none" stroke={OL} strokeWidth={1} />
      <circle r={r * 0.22} fill="#f4f1ea" stroke={OL} strokeWidth={0.6} />
      <ellipse cx={-r * 0.4} cy={-r * 0.45} rx={r * 0.22} ry={r * 0.13} fill="#fff" opacity={0.7} transform={`rotate(${-spin * 57.3} ${-r * 0.4} ${-r * 0.45})`} />
    </g>
  );
};

/* lifeguard tower; origin = base centre. It tips around its RIGHT leg base
   (TOWER_PIVOT). The lifeguard is drawn by the scene between `back` and the
   front panel via the `guard` slot (tower coords; feet at GUARD_FEET). */
export const TOWER_PIVOT: [number, number] = [22, 0];
export const GUARD_FEET: [number, number] = [2, -92];
export const Tower: React.FC<{guard?: React.ReactNode; flag?: number}> = ({guard, flag = 0}) => (
  <g>
    {/* legs + braces */}
    {[-22, 22].map((x) => <rect key={x} x={x - 2.5} y={-100} width={5} height={100} fill="#e8e2d4" stroke="#9a8f7a" strokeWidth={0.8} />)}
    <path d="M -20 -10 L 20 -50 M 20 -10 L -20 -50 M -20 -55 L 20 -95 M 20 -55 L -20 -95" stroke="#c8bfa8" strokeWidth={2.4} />
    {/* ladder on the left */}
    <path d="M -26 0 L -34 -100 M -18 0 L -26 -100" stroke="#c8bfa8" strokeWidth={1.8} />
    {Array.from({length: 7}).map((_, k) => <line key={k} x1={-27 + k * -1.1} y1={-10 - k * 14} x2={-19 - k * 1.1} y2={-10 - k * 14} stroke="#c8bfa8" strokeWidth={1.8} />)}
    {/* flag pole */}
    <rect x={24} y={-160} width={2} height={60} fill="#9aa3ae" />
    <path d={`M 26 -160 Q ${38 + Math.sin(flag * 6) * 2} ${-156 + Math.sin(flag * 5) * 2} ${48} ${-154 + Math.sin(flag * 7) * 2} L 26 -146 Z`} fill="#ff4f5e" />
    {/* seat platform */}
    <rect x={-30} y={-104} width={60} height={6} rx={1.5} fill="#c8bfa8" />
    {guard}
    {/* front panel hides the lifeguard's legs: he reads as sitting */}
    <rect x={-28} y={-124} width={56} height={22} rx={2} fill="#f4f1ea" stroke="#9a8f7a" strokeWidth={0.8} />
    <rect x={-28} y={-124} width={56} height={5} fill="#ff4f5e" />
    <rect x={-5} y={-117} width={10} height={12} fill="#ff4f5e" />
    <rect x={-10} y={-112} width={20} height={3} fill="#ff4f5e" />
    <rect x={-1.5} y={-117} width={3} height={12} fill="#f4f1ea" opacity={0} />
  </g>
);

/* sandcastle (origin = bottom centre); crush 0..1 flattens it */
export const Sandcastle: React.FC<{crush?: number; t: number}> = ({crush = 0, t}) => {
  const S = '#ecc988';
  const D = '#d4ad68';
  const ST = '#a8854a';
  if (crush > 0) {
    const c = Math.min(1, crush * 3);
    return (
      <g>
        <ellipse cx={0} cy={-3} rx={36 + 12 * c} ry={6 + 2 * (1 - c)} fill={S} stroke={ST} strokeWidth={1} />
        {Array.from({length: 9}).map((_, k) => (
          <ellipse key={k} cx={-34 + k * 8.5} cy={-5 - (k % 3) * 2.5} rx={4 + (k % 2) * 2} ry={2.6} fill={k % 2 ? D : S} />
        ))}
      </g>
    );
  }
  const tower = (x: number, h: number, w: number) => (
    <g key={x}>
      <rect x={x - w / 2} y={-h} width={w} height={h} fill={S} stroke={ST} strokeWidth={1} />
      {[-1, 0, 1].map((j) => <rect key={j} x={x + j * (w / 3) - w / 8} y={-h - 4} width={w / 4} height={4} fill={S} stroke={ST} strokeWidth={0.8} />)}
      <rect x={x - 2} y={-h + 6} width={4} height={5} rx={2} fill={D} />
    </g>
  );
  return (
    <g>
      <ellipse cx={0} cy={0} rx={44} ry={6} fill="rgba(0,0,0,.14)" />
      <path d="M -40 0 L -36 -14 L 36 -14 L 40 0 Z" fill={D} stroke={ST} strokeWidth={1} />
      {tower(-26, 30, 13)}
      {tower(26, 30, 13)}
      <rect x={-20} y={-24} width={40} height={10} fill={S} stroke={ST} strokeWidth={1} />
      {tower(0, 44, 16)}
      <rect x={-4} y={-22} width={8} height={8} rx={4} fill={D} />
      <rect x={-0.6} y={-62} width={1.2} height={18} fill="#6a4a3a" />
      <path d={`M 0.6 -62 L ${11 + Math.sin(t * 6) * 1.5} ${-59 + Math.sin(t * 5) * 1} L 0.6 -55 Z`} fill="#ff4f5e" />
      {/* shells */}
      <circle cx={-12} cy={-8} r={1.6} fill="#ff9fc8" /><circle cx={12} cy={-7} r={1.6} fill="#f4f1ea" />
    </g>
  );
};

/* seagull: stand (peck phase) or fly (wing phase) */
export const Seagull: React.FC<{peck?: number; fly?: number}> = ({peck, fly}) => {
  const dip = peck === undefined ? 0 : Math.max(0, Math.sin(peck)) * 3;
  const flap = fly === undefined ? 0 : Math.sin(fly);
  return (
    <g>
      {fly === undefined ? <ellipse cx={0} cy={0} rx={9} ry={2} fill="rgba(0,0,0,.15)" /> : null}
      {fly === undefined ? <><rect x={-2} y={-5} width={1.4} height={5} fill="#f08a24" /><rect x={1.2} y={-5} width={1.4} height={5} fill="#f08a24" /></> : null}
      <path d="M -14 -10 L -7 -8 L -7 -12 Z" fill="#3a3a44" />
      <ellipse cx={-1} cy={-10} rx={9} ry={5.2} fill="#f8f8f4" stroke="#c8c8bc" strokeWidth={0.6} />
      {fly !== undefined
        ? <path d={`M -6 -11 Q -1 ${-13 - 16 * flap} 6 ${-12 - 18 * flap} Q 3 -11 4 -10 Z`} fill="#9aa3ae" stroke="#5a6070" strokeWidth={0.5} />
        : <path d="M -9 -11 Q -2 -14 6 -11 Q -2 -8 -9 -9 Z" fill="#9aa3ae" />}
      <g transform={`translate(0 ${dip})`}>
        <circle cx={7} cy={-14.5} r={3.8} fill="#f8f8f4" />
        <path d="M 10 -15 L 15 -14 L 10 -13 Z" fill="#ffc21f" />
        <circle cx={14} cy={-13.9} r={0.6} fill="#ff4f5e" />
        <circle cx={8} cy={-15.6} r={0.9} fill={OPAL.ink} />
      </g>
    </g>
  );
};

/* volleyball net (origin = centre between the poles) */
export const VolleyNet: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={50} ry={5} fill="rgba(0,0,0,.12)" />
    {[-46, 46].map((x) => <rect key={x} x={x - 1.6} y={-52} width={3.2} height={52} fill="#5a6070" />)}
    <rect x={-46} y={-52} width={92} height={16} fill="rgba(255,255,255,.18)" stroke="#f4f1ea" strokeWidth={1.4} />
    {Array.from({length: 11}).map((_, k) => <line key={k} x1={-46 + k * 9.2} y1={-52} x2={-46 + k * 9.2} y2={-36} stroke="#f4f1ea" strokeWidth={0.6} opacity={0.8} />)}
    {[0, 1].map((k) => <line key={`h${k}`} x1={-46} y1={-47 + k * 5.5} x2={46} y2={-47 + k * 5.5} stroke="#f4f1ea" strokeWidth={0.6} opacity={0.8} />)}
  </g>
);

/* ice-cream cart pushed along the bottom of the beach */
export const IceCart: React.FC<{t: number}> = ({t}) => (
  <g>
    <ellipse cx={0} cy={0} rx={34} ry={5} fill="rgba(0,0,0,.15)" />
    <circle cx={-18} cy={-6} r={6} fill={OL} /><circle cx={18} cy={-6} r={6} fill={OL} />
    <rect x={-30} y={-38} width={60} height={30} rx={4} fill="#8fd6ff" stroke="#2a7ab0" strokeWidth={1} />
    <text x={0} y={-19} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={9} fill="#d6293a">ICE CREAM</text>
    <rect x={-1.2} y={-90} width={2.4} height={52} fill="#9aa3ae" />
    <path d="M -38 -78 Q 0 -104 38 -78 Z" fill="#ff9fc8" />
    {[-24, 0, 24].map((x) => <path key={x} d={`M ${x - 7} -80 Q ${x} -92 ${x + 7} -80 Z`} fill="#f4f1ea" opacity={0.8} />)}
    <circle cx={30} cy={-44 + Math.sin(t * 12) * 0.6} r={2.4} fill="#ffd23f" stroke={OL} strokeWidth={0.6} />
  </g>
);

/* cooler box */
export const Cooler: React.FC<{col?: string}> = ({col = '#3fa7ff'}) => (
  <g>
    <ellipse cx={0} cy={0} rx={14} ry={3} fill="rgba(0,0,0,.15)" />
    <rect x={-12} y={-16} width={24} height={16} rx={2} fill={col} />
    <rect x={-13} y={-19} width={26} height={5} rx={2} fill="#f4f1ea" />
    <rect x={-5} y={-22} width={10} height={3} rx={1.5} fill="#5a6070" />
  </g>
);

/* palm tree for the backdrop */
export const Palm: React.FC<{s?: number; lean?: number; t?: number}> = ({s = 1, lean = 1, t = 0}) => (
  <g transform={`scale(${s * lean} ${s})`}>
    <ellipse cx={0} cy={0} rx={22} ry={5} fill="rgba(0,0,0,.14)" />
    <path d="M -5 0 Q -2 -70 18 -150 L 26 -148 Q 8 -70 5 0 Z" fill="#a8724a" />
    {Array.from({length: 7}).map((_, k) => <path key={k} d={`M ${-4 + k * 2.6} ${-k * 21} l 9 -2`} stroke="#8a5a3a" strokeWidth={1.4} />)}
    <g transform="translate(22 -150)">
      {[-150, -110, -60, -20, 20, 200].map((a, k) => {
        const r = (a + Math.sin(t * 1.4 + k) * 4) * Math.PI / 180;
        const ex = Math.cos(r) * 62;
        const ey = Math.sin(r) * 30 + 26;
        return <path key={k} d={`M 0 0 Q ${ex * 0.5} ${ey * 0.2 - 22} ${ex} ${ey} Q ${ex * 0.5} ${ey * 0.4 - 8} 0 0 Z`} fill={k % 2 ? '#3f9a4a' : '#4fae5a'} />;
      })}
      <circle cx={-3} cy={6} r={5} fill="#6a4a2a" /><circle cx={5} cy={7} r={5} fill="#5a3a24" />
    </g>
  </g>
);
