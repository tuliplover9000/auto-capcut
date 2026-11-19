import React from 'react';
import {OL} from '../buffer/art';

// "Rizz Meter" props. Everybody in Rizzville has a live RIZZ number floating
// over their head; the cast reuses the Buffering full-body rig (buffer/art).
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const tierCol = (v: number | 'roll') =>
  v === 'roll' ? '#b98cff' : v >= 90 ? '#ffd23f' : v >= 50 ? '#5fd068' : v >= 10 ? '#3fd6c3' : v > 0 ? '#ffb02e' : v === 0 ? '#c9d3df' : '#ff4f5e';

const star = (r: number) => Array.from({length: 10}).map((_, j) => {
  const a = (j / 10) * Math.PI * 2 - Math.PI / 2;
  const rr = j % 2 ? r * 0.45 : r;
  return `${j ? 'L' : 'M'} ${Math.cos(a) * rr} ${Math.sin(a) * rr}`;
}).join(' ') + ' Z';

/* The floating rizz badge: centre (x, y). `shown` is the number on it (or a
   slot-machine roll), `delta` floats a +/- change off its right side. */
export const RizzBadge: React.FC<{x: number; y: number; s?: number; shown: number | 'roll'; t: number; frame: number; delta?: number; deltaK?: number; popK?: number; dim?: number; font: string}> = ({x, y, s = 1, shown, t, frame, delta, deltaK = 0, popK = 0, dim = 0, font}) => {
  const v = shown === 'roll' ? 'roll' : shown;
  const col = tierCol(v);
  const txt = v === 'roll' ? String(Math.floor(hash(Math.floor(frame / 2)) * 100)) : String(v);
  const neg = typeof v === 'number' && v < 0;
  const flashOff = neg && v <= -40 && Math.sin(t * 16) < -0.4;
  const fs = txt.length >= 4 ? 50 : txt.length === 3 ? 58 : 66;
  const sc = s * (1 + 0.28 * popK);
  return (
    <g transform={`translate(${x} ${y}) scale(${sc})`} opacity={1 - dim}>
      {typeof v === 'number' && v >= 90 ? <circle r={120} fill="#ffd23f" opacity={0.18 + 0.08 * Math.sin(t * 5)} /> : null}
      {neg ? <ellipse rx={130} ry={80} fill="#ff4f5e" opacity={0.16 + 0.1 * Math.sin(t * 9)} /> : null}
      {/* smoke at -10 and below, fire at -40 and below */}
      {typeof v === 'number' && v <= -10 ? Array.from({length: 5}).map((_, j) => {
        const k = ((t * 0.7 + j / 5) % 1);
        return <circle key={`sm${j}`} cx={-40 + j * 20 + Math.sin(t * 2 + j) * 14} cy={-60 - k * 170} r={18 + k * 26} fill="#8a8f9c" opacity={0.55 * (1 - k)} />;
      }) : null}
      {typeof v === 'number' && v <= -40 ? [-70, -35, 0, 35, 70].map((dx, j) => {
        const h = 60 + 30 * Math.abs(Math.sin(t * 11 + j * 1.9));
        return (
          <g key={`fi${j}`} transform={`translate(${dx} -40)`}>
            <path d={`M -22 0 Q -26 ${-h * 0.5} 0 ${-h} Q 26 ${-h * 0.5} 22 0 Z`} fill="#ff7a3d" stroke={OL} strokeWidth={3} />
            <path d={`M -11 0 Q -13 ${-h * 0.32} 0 ${-h * 0.6} Q 13 ${-h * 0.32} 11 0 Z`} fill="#ffd23f" />
          </g>
        );
      }) : null}
      <path d="M -14 44 L 14 44 L 0 64 Z" fill="#0e1424" stroke={col} strokeWidth={5} strokeLinejoin="round" />
      <rect x={-104} y={-48} width={208} height={96} rx={24} fill="#0e1424" stroke={col} strokeWidth={7} />
      <rect x={-46} y={-70} width={92} height={30} rx={10} fill={col} stroke={OL} strokeWidth={3} />
      <text y={-47} textAnchor="middle" fontFamily={font} fontWeight={900} fontSize={21} fill={OL} letterSpacing={2}>RIZZ</text>
      {!flashOff ? <text y={fs * 0.36} textAnchor="middle" fontFamily={font} fontWeight={900} fontSize={fs} fill={col}>{txt}</text> : null}
      {typeof v === 'number' && v >= 95 ? [0, 1, 2, 3].map((j) => {
        const a = t * 1.4 + j * (Math.PI / 2);
        const tw = 0.6 + 0.4 * Math.sin(t * 7 + j * 2);
        return <path key={`st${j}`} d={star(14 * tw)} transform={`translate(${Math.cos(a) * 128} ${Math.sin(a) * 62})`} fill="#fff6c2" stroke={OL} strokeWidth={2} />;
      }) : null}
      {delta !== undefined && deltaK > 0 && deltaK < 1 ? (
        <text x={120} y={-30 - deltaK * 70} fontFamily={font} fontWeight={900} fontSize={46} fill={delta > 0 ? '#5fd068' : '#ff4f5e'} stroke={OL} strokeWidth={6} paintOrder="stroke"
          opacity={deltaK < 0.75 ? 1 : (1 - deltaK) / 0.25}>{delta > 0 ? `+${delta}` : String(delta)}</text>
      ) : null}
    </g>
  );
};

/* Golden retriever, feet on the ground at (x, y), facing right (face -1 flips).
   pose: stand | walk | lie (head on paws) | cover (lying, paw over eyes). */
export const Dog: React.FC<{x: number; y: number; s?: number; face?: 1 | -1; pose?: 'stand' | 'walk' | 'lie' | 'cover'; t: number; shades?: boolean}> = ({x, y, s = 1, face = 1, pose = 'stand', t, shades = false}) => {
  const fur = '#e0a548';
  const dark = '#b97a2e';
  const lying = pose === 'lie' || pose === 'cover';
  const wag = Math.sin(t * (lying ? 5 : 14)) * 22;
  const leg = (lx: number, ph: number) => {
    const w = pose === 'walk' ? Math.sin(t * 12 + ph) * 18 : 0;
    return <path key={lx} d={`M ${lx} -80 L ${lx + w} -4`} stroke={OL} strokeWidth={30} strokeLinecap="round" />;
  };
  const legIn = (lx: number, ph: number) => {
    const w = pose === 'walk' ? Math.sin(t * 12 + ph) * 18 : 0;
    return <path key={`i${lx}`} d={`M ${lx} -80 L ${lx + w} -4`} stroke={fur} strokeWidth={20} strokeLinecap="round" />;
  };
  const by = lying ? -46 : -110;
  const hx = lying ? 118 : 108;
  const hy = lying ? -84 : -176;
  return (
    <g transform={`translate(${x} ${y}) scale(${face * s} ${s})`}>
      <ellipse cx={0} cy={-2} rx={130} ry={14} fill="#000" opacity={0.18} />
      {/* tail */}
      <path d={`M -100 ${by - 10} Q -150 ${by - 40 - wag} -150 ${by - 80 - wag}`} fill="none" stroke={OL} strokeWidth={26} strokeLinecap="round" />
      <path d={`M -100 ${by - 10} Q -150 ${by - 40 - wag} -150 ${by - 80 - wag}`} fill="none" stroke={dark} strokeWidth={16} strokeLinecap="round" />
      {!lying ? [leg(-62, 0), leg(64, Math.PI), legIn(-62, 0), legIn(64, Math.PI)] : null}
      {!lying ? [leg(-40, Math.PI), leg(86, 0), legIn(-40, Math.PI), legIn(86, 0)] : null}
      <ellipse cx={0} cy={by} rx={116} ry={lying ? 40 : 50} fill={fur} stroke={OL} strokeWidth={6} />
      <ellipse cx={60} cy={by + 14} rx={40} ry={lying ? 20 : 26} fill="#f3c77a" />
      {lying ? (
        <g>
          <path d="M 70 -14 L 170 -14" stroke={OL} strokeWidth={28} strokeLinecap="round" />
          <path d="M 70 -14 L 170 -14" stroke={fur} strokeWidth={18} strokeLinecap="round" />
        </g>
      ) : null}
      {/* head */}
      <g transform={`translate(${hx} ${hy}) rotate(${lying ? 0 : Math.sin(t * 3) * 4})`}>
        <circle r={48} fill={fur} stroke={OL} strokeWidth={6} />
        <ellipse cx={44} cy={14} rx={34} ry={22} fill="#f3c77a" stroke={OL} strokeWidth={5} />
        <ellipse cx={74} cy={4} rx={11} ry={9} fill={OL} />
        {pose !== 'cover' ? <path d="M 40 34 Q 50 62 62 36" fill="#ff7a9a" stroke={OL} strokeWidth={4} /> : null}
        {shades ? (
          <path d="M -6 -22 L 62 -22 L 58 -6 Q 46 4 34 -6 L 28 -12 L 22 -6 Q 10 4 0 -6 Z" fill="#14141c" stroke={OL} strokeWidth={4} />
        ) : pose === 'lie' ? (
          <path d="M 12 -14 Q 22 -6 32 -14" fill="none" stroke={OL} strokeWidth={5} strokeLinecap="round" />
        ) : (
          <g><circle cx={22} cy={-12} r={8} fill={OL} /><circle cx={25} cy={-15} r={3} fill="#fff" /></g>
        )}
        <path d="M -30 -34 Q -62 -10 -44 40 Q -24 30 -14 -18 Z" fill={dark} stroke={OL} strokeWidth={5} />
        {pose === 'cover' ? (
          <g>
            <path d="M 70 70 Q 40 20 26 -10" stroke={OL} strokeWidth={30} strokeLinecap="round" fill="none" />
            <path d="M 70 70 Q 40 20 26 -10" stroke={fur} strokeWidth={20} strokeLinecap="round" fill="none" />
            <circle cx={24} cy={-12} r={17} fill="#f3c77a" stroke={OL} strokeWidth={5} />
          </g>
        ) : null}
      </g>
    </g>
  );
};

/* A park pigeon, feet at (x, y). fly 0..1 = flapping away up and right. */
export const Pigeon: React.FC<{x: number; y: number; s?: number; t: number; k?: number; fly?: number}> = ({x, y, s = 1, t, k = 0, fly = 0}) => {
  const peck = fly > 0 ? 0 : Math.max(0, Math.sin(t * 3 + k * 2.1)) * 10;
  const flap = Math.sin(t * 40 + k) * 30;
  return (
    <g transform={`translate(${x + fly * (500 + k * 120)} ${y - fly * (900 + k * 140)}) scale(${s})`} opacity={1 - Math.max(0, fly - 0.75) * 4}>
      {fly === 0 ? <path d="M -6 0 L -6 -14 M 6 0 L 6 -14" stroke="#ff7a3d" strokeWidth={4} /> : null}
      <ellipse cx={0} cy={-30} rx={30} ry={20} fill="#8a93a8" stroke={OL} strokeWidth={4} />
      <path d={fly > 0 ? `M -6 -36 L -40 ${-60 - flap} L 10 -40 Z` : 'M -24 -34 Q 0 -44 14 -28 Q 0 -20 -24 -26 Z'} fill="#6c7488" stroke={OL} strokeWidth={3} />
      <path d="M -28 -30 L -46 -40 L -44 -24 Z" fill="#6c7488" stroke={OL} strokeWidth={3} />
      <g transform={`translate(${26} ${-46 + peck})`}>
        <circle r={13} fill="#7a84a0" stroke={OL} strokeWidth={4} />
        <path d="M 10 0 L 22 4 L 10 7 Z" fill="#ffb02e" stroke={OL} strokeWidth={2} />
        <circle cx={4} cy={-3} r={3} fill={OL} />
      </g>
      <path d="M 8 -40 Q 18 -34 22 -44" stroke="#5fd068" strokeWidth={4} fill="none" opacity={0.8} />
    </g>
  );
};

export const Spark: React.FC<{x: number; y: number; r: number; col?: string; op?: number}> = ({x, y, r, col = '#ffd23f', op = 1}) => (
  <path d={star(r)} transform={`translate(${x} ${y})`} fill={col} stroke={OL} strokeWidth={3} opacity={op} />
);
