import React from 'react';
import {OPAL} from '../observe/art';

// CHAIN REACTION #2 (karma) props. Same convention as the Person rig: base at
// (0,0), facing right; the scene scales each by the perspective factor.

const STONE = '#d9cfbd';
const STONE_D = '#c4b79e';
const STONE_L = '#ece4d4';
export const WATER = '#6cc4ee';

/* the plaza fountain. `inside` is drawn in the basin, between the water and the front wall. */
export const FOUNT_R = 130;
export const FOUNT_RY = 34;
export const FOUNT_TOP = -54; // centre of the rim ellipse
export const Fountain: React.FC<{t: number; inside?: React.ReactNode; rip?: number}> = ({t, inside, rip = 0}) => {
  const R = FOUNT_R;
  const r = FOUNT_RY;
  const c = FOUNT_TOP;
  const jet = (d: string, k: number) => (
    <path d={d} fill="none" stroke="#d8f2ff" strokeWidth={4} strokeLinecap="round" strokeDasharray="10 7" strokeDashoffset={-t * 60 - k * 5} opacity={0.95} />
  );
  return (
    <g>
      <ellipse cx={0} cy={0} rx={R + 12} ry={12} fill="rgba(0,0,0,.16)" />
      <ellipse cx={0} cy={c} rx={R} ry={r} fill={STONE_L} />
      <ellipse cx={0} cy={c} rx={R - 13} ry={r - 8} fill={WATER} />
      {[0, 1, 2].map((k) => {
        const u = (t * 0.6 + k / 3) % 1;
        return <ellipse key={k} cx={0} cy={c - 4} rx={30 + u * 70} ry={6 + u * 15} fill="none" stroke="#bfe8ff" strokeWidth={2} opacity={0.7 * (1 - u)} />;
      })}
      {rip > 0 ? [0, 1].map((k) => {
        const u = Math.min(1, rip * 0.8 + k * 0.25);
        return <ellipse key={`r${k}`} cx={-38} cy={c + 22} rx={14 + u * 60} ry={4 + u * 13} fill="none" stroke="#fff" strokeWidth={3} opacity={0.8 * (1 - u)} />;
      }) : null}
      {/* centre column, bowl and top */}
      <rect x={-9} y={-150} width={18} height={98} fill={STONE_D} />
      <path d="M -46 -150 Q -30 -128 0 -126 Q 30 -128 46 -150 Z" fill={STONE_D} />
      <ellipse cx={0} cy={-150} rx={46} ry={10} fill={STONE_L} />
      <ellipse cx={0} cy={-150} rx={38} ry={6} fill={WATER} />
      <rect x={-5} y={-200} width={10} height={50} fill={STONE_D} />
      <ellipse cx={0} cy={-200} rx={16} ry={4} fill={STONE_L} />
      <circle cx={0} cy={-207} r={5} fill={STONE_D} />
      {jet('M 0 -210 Q -22 -236 -36 -152', 0)}
      {jet('M 0 -210 Q 22 -236 36 -152', 1)}
      {jet('M -44 -148 Q -64 -132 -70 -66', 2)}
      {jet('M 44 -148 Q 64 -132 70 -66', 3)}
      {inside}
      {/* front wall + lip */}
      <path d={`M ${-R} ${c} A ${R} ${r} 0 0 0 ${R} ${c} L ${R} ${c + 20} A ${R} ${r} 0 0 1 ${-R} ${c + 20} Z`} fill={STONE_D} />
      <path d={`M ${-R} ${c} A ${R} ${r} 0 0 0 ${R} ${c}`} fill="none" stroke={STONE} strokeWidth={8} />
    </g>
  );
};

/* banana peel lying flat on the ground (or flying: same shape, rotated by the scene) */
export const Peel: React.FC<{flat?: boolean}> = ({flat = true}) => (
  <g transform={flat ? 'scale(1 0.55)' : undefined}>
    {flat ? <ellipse cx={0} cy={2} rx={14} ry={4} fill="rgba(0,0,0,.18)" /> : null}
    {[-150, -30, 90].map((a) => (
      <ellipse key={a} cx={Math.cos((a * Math.PI) / 180) * 7} cy={Math.sin((a * Math.PI) / 180) * 7 - 4} rx={8} ry={3.6}
        transform={`rotate(${a} ${Math.cos((a * Math.PI) / 180) * 7} ${Math.sin((a * Math.PI) / 180) * 7 - 4})`} fill="#ffd84a" stroke="#b8902a" strokeWidth={1} />
    ))}
    <circle cx={0} cy={-4} r={3.2} fill="#f2c432" stroke="#b8902a" strokeWidth={0.8} />
    <rect x={-1.2} y={-9} width={2.4} height={4} rx={1} fill="#6a4a1a" />
  </g>
);

export const Skateboard: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={22} ry={3} fill="rgba(0,0,0,.18)" />
    <path d="M -24 -9 Q -22 -6 -18 -6 L 18 -6 Q 22 -6 24 -9 L 24 -6 Q 22 -3 18 -3 L -18 -3 Q -22 -3 -24 -6 Z" fill="#1b1b22" />
    <rect x={-20} y={-7} width={40} height={4} rx={2} fill="#e8505b" />
    <circle cx={-13} cy={-1.8} r={2.6} fill="#f4f1ea" stroke={OPAL.ink} strokeWidth={0.8} />
    <circle cx={13} cy={-1.8} r={2.6} fill="#f4f1ea" stroke={OPAL.ink} strokeWidth={0.8} />
  </g>
);

export const ORANGE = '#ff9a1f';
export const Orange: React.FC<{spin?: number}> = ({spin = 0}) => (
  <g>
    <ellipse cx={0} cy={0.5} rx={5} ry={1.6} fill="rgba(0,0,0,.18)" />
    <circle cx={0} cy={-5} r={5.2} fill={ORANGE} stroke="#c86a10" strokeWidth={0.8} />
    <circle cx={Math.cos(spin) * 2.6} cy={-5 + Math.sin(spin) * 2.6} r={1.3} fill="#ffd08a" />
  </g>
);

/* fruit stand: crate table + striped awning. tilt (deg, <0 = left side collapses) about the right leg top. */
export const FruitStand: React.FC<{tilt: number; full: boolean}> = ({tilt, full}) => {
  const pile: [number, number][] = [];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6 - row * 2; i++) pile.push([-52 + row * 14 + i * 14 + (row ? 7 : 0) + 14 * (row === 2 ? 0 : 0), -76 - row * 10]);
  const legK = Math.min(1, -tilt / 16);
  return (
    <g>
      <ellipse cx={0} cy={0} rx={80} ry={9} fill="rgba(0,0,0,.16)" />
      {/* left leg gets kicked out */}
      <g transform={`rotate(${legK * 55} -62 -2)`}><rect x={-65} y={-54} width={6} height={54} rx={2} fill="#7a5a3a" /></g>
      <rect x={58} y={-54} width={6} height={54} rx={2} fill="#7a5a3a" />
      <g transform={`rotate(${tilt} 61 -54)`}>
        <rect x={-70} y={-68} width={140} height={20} rx={3} fill="#a8743a" />
        {[-46, -16, 16, 46].map((x) => <rect key={x} x={x - 1} y={-68} width={2} height={20} fill="#8a5a2a" />)}
        <rect x={-34} y={-63} width={68} height={12} rx={3} fill="#f4f1ea" />
        <text x={0} y={-53.5} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={10} fill="#c86a10">ORANGES</text>
        {full ? pile.map(([x, y], k) => <circle key={k} cx={x + 10} cy={y + 2} r={6.5} fill={ORANGE} stroke="#c86a10" strokeWidth={0.8} />) : null}
        <rect x={-68} y={-150} width={4} height={84} fill="#6a4a2a" />
        <rect x={64} y={-150} width={4} height={84} fill="#6a4a2a" />
        <rect x={-80} y={-156} width={160} height={20} fill="#2fb5a4" />
        {Array.from({length: 8}).map((_, k) => <rect key={k} x={-80 + k * 20} y={-156} width={10} height={20} fill="#f4f1ea" />)}
        {Array.from({length: 8}).map((_, k) => <path key={`s${k}`} d={`M ${-80 + k * 20} -136 q 10 10 20 0`} fill={k % 2 ? '#2fb5a4' : '#f4f1ea'} />)}
      </g>
    </g>
  );
};

/* a serving tray with two drinks (glasses = false once they've flown off) */
export const Tray: React.FC<{glasses?: boolean}> = ({glasses = true}) => (
  <g>
    {glasses ? (
      <>
        <rect x={-8} y={-12} width={5.5} height={11} rx={1} fill="rgba(220,240,255,.85)" stroke="#9ab" strokeWidth={0.6} />
        <rect x={-7.4} y={-8} width={4.3} height={6.6} fill="#ffb03a" />
        <rect x={2} y={-13} width={5.5} height={12} rx={1} fill="rgba(220,240,255,.85)" stroke="#9ab" strokeWidth={0.6} />
        <rect x={2.6} y={-8.5} width={4.3} height={7} fill="#e8505b" />
      </>
    ) : null}
    <ellipse cx={0} cy={0} rx={14} ry={3.4} fill="#c9ced6" stroke="#8a919c" strokeWidth={1} />
  </g>
);

/* a dog asleep: curled, head on its paws */
export const SleepDog: React.FC<{fur: string; dark: string; breath: number}> = ({fur, dark, breath}) => (
  <g>
    <ellipse cx={2} cy={0} rx={24} ry={4} fill="rgba(0,0,0,.16)" />
    <path d="M -18 -6 Q -30 -4 -24 2" fill="none" stroke={fur} strokeWidth={4} strokeLinecap="round" />
    <ellipse cx={0} cy={-8} rx={20} ry={8 + Math.sin(breath) * 0.8} fill={fur} />
    <ellipse cx={-6} cy={-11} rx={6} ry={3.5} fill={dark} />
    <rect x={10} y={-4} width={14} height={4} rx={2} fill={fur} />
    <circle cx={20} cy={-9} r={7.5} fill={fur} />
    <ellipse cx={27} cy={-6} rx={4.5} ry={3.2} fill="#f0d0a0" />
    <circle cx={30.5} cy={-7} r={1.6} fill={OPAL.ink} />
    <path d="M 18 -11 q 2.5 1.5 5 0" fill="none" stroke={OPAL.ink} strokeWidth={1.2} strokeLinecap="round" />
    <path d="M 14 -15 Q 10 -8 14 -3 Q 18 -9 16 -14 Z" fill={dark} />
  </g>
);

/* bicycle with an optional rider slot; feet of the rider at the bottom bracket (-4,-11) */
export const BIKE_BB: [number, number] = [-4, -11];
export const Bike: React.FC<{crank: number; rider?: React.ReactNode}> = ({crank, rider}) => {
  const fr = '#2fb5a4';
  const wheel = (x: number) => (
    <g>
      <circle cx={x} cy={-11} r={11} fill="none" stroke={OPAL.ink} strokeWidth={3} />
      {[0, 1, 2].map((k) => <line key={k} x1={x + Math.cos(crank + (k * Math.PI) / 3) * 10} y1={-11 + Math.sin(crank + (k * Math.PI) / 3) * 10}
        x2={x - Math.cos(crank + (k * Math.PI) / 3) * 10} y2={-11 - Math.sin(crank + (k * Math.PI) / 3) * 10} stroke={OPAL.steel} strokeWidth={0.8} />)}
      <circle cx={x} cy={-11} r={1.8} fill={OPAL.steel} />
    </g>
  );
  return (
    <g>
      <ellipse cx={0} cy={0} rx={34} ry={4} fill="rgba(0,0,0,.16)" />
      {wheel(-22)}
      {wheel(22)}
      <path d="M -22 -11 L -4 -11 L -10 -30 Z M -10 -30 L 14 -31 L -4 -11 M 14 -31 L 22 -11" fill="none" stroke={fr} strokeWidth={3.2} strokeLinejoin="round" />
      <path d="M 14 -31 L 12 -37 L 19 -38" fill="none" stroke={OPAL.ink} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={-16} y={-33} width={11} height={3.4} rx={1.7} fill={OPAL.ink} />
      {rider}
      <line x1={-4 + Math.cos(crank) * 6} y1={-11 + Math.sin(crank) * 6} x2={-4 - Math.cos(crank) * 6} y2={-11 - Math.sin(crank) * 6} stroke={OPAL.ink} strokeWidth={2.4} strokeLinecap="round" />
    </g>
  );
};

export const CafeTable: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={16} ry={4} fill="rgba(0,0,0,.15)" />
    <rect x={-1.5} y={-24} width={3} height={24} fill="#3a3a44" />
    <ellipse cx={0} cy={-1} rx={8} ry={2} fill="#3a3a44" />
    <ellipse cx={0} cy={-25} rx={18} ry={5} fill="#f4f1ea" stroke="#c9c2b4" strokeWidth={1} />
    <rect x={-4} y={-34} width={5} height={9} rx={1} fill="#c8504a" />
    <rect x={-22} y={-30} width={3} height={30} fill="#5a4a3a" />
    <rect x={19} y={-30} width={3} height={30} fill="#5a4a3a" />
    <rect x={-24} y={-16} width={8} height={3} fill="#5a4a3a" />
    <rect x={16} y={-16} width={8} height={3} fill="#5a4a3a" />
  </g>
);
