import React from 'react';
import {INK_W, RX, RY} from './ridges';
import {printData} from './specs';

export const INK = '#23252f';
export const CREAM = '#f6f1e4';

/** A fingerprint centred at (x,y). `k` 0..1 reveals it (dusting). */
export const Print: React.FC<{id: string; x: number; y: number; s: number; ink?: string; k?: number; uid: string; hl?: number; hlCol?: string; rot?: number}> = ({id, x, y, s, ink = INK, k = 1, uid, hl = 0, hlCol = '#ffd23f', rot = 0}) => {
  const pd = printData(id);
  const clip = `pc-${uid}`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <defs>
        <clipPath id={clip}>
          {k >= 1 ? <ellipse cx={0} cy={0} rx={RX + 6} ry={RY + 6} /> : <circle cx={-RX * 0.6 + RX * 1.2 * k} cy={-RY * 0.3 + RY * 0.6 * k} r={40 + 230 * k} />}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {hl > 0 && pd.hl ? <path d={pd.hl} stroke={hlCol} strokeWidth={INK_W * 3.2} strokeLinecap="round" fill="none" opacity={hl} /> : null}
        <path d={pd.d} stroke={ink} strokeWidth={INK_W} strokeLinecap="round" fill="none" />
        {pd.extra ? <path d={pd.extra} stroke={ink} strokeWidth={INK_W} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
      </g>
    </g>
  );
};

/** Flat cartoon mugshot (identical for both twins). */
export const Mugshot: React.FC<{x: number; y: number; s?: number; tag: string}> = ({x, y, s = 1, tag}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-140} y={-170} width={280} height={340} rx={14} fill="#cfd6df" />
    {[-120, -80, -40, 0, 40, 80, 120].map((yy) => <rect key={yy} x={-140} y={yy} width={280} height={3} fill="#a9b3bf" />)}
    {/* shoulders: orange jumpsuit */}
    <path d="M -120 170 Q -118 92 -40 78 L 40 78 Q 118 92 120 170 Z" fill="#ff8a2a" stroke="#1b1b22" strokeWidth={6} />
    <path d="M -30 80 L 0 116 L 30 80" fill="#f2a477" stroke="#1b1b22" strokeWidth={5} />
    <rect x={-22} y={42} width={44} height={44} fill="#f2a477" stroke="#1b1b22" strokeWidth={5} />
    {/* head */}
    <ellipse cx={0} cy={-26} rx={74} ry={84} fill="#f2a477" stroke="#1b1b22" strokeWidth={6} />
    <ellipse cx={-76} cy={-20} rx={12} ry={20} fill="#f2a477" stroke="#1b1b22" strokeWidth={5} />
    <ellipse cx={76} cy={-20} rx={12} ry={20} fill="#f2a477" stroke="#1b1b22" strokeWidth={5} />
    <path d="M -76 -36 Q -84 -118 0 -116 Q 84 -118 76 -36 Q 62 -84 20 -78 Q -30 -96 -76 -36 Z" fill="#3a2a1e" stroke="#1b1b22" strokeWidth={5} />
    <rect x={-46} y={-40} width={30} height={8} rx={4} fill="#3a2a1e" transform="rotate(8 -31 -36)" />
    <rect x={16} y={-40} width={30} height={8} rx={4} fill="#3a2a1e" transform="rotate(-8 31 -36)" />
    <circle cx={-30} cy={-16} r={8} fill="#1b1b22" />
    <circle cx={30} cy={-16} r={8} fill="#1b1b22" />
    <path d="M -6 0 Q 0 20 10 18" fill="none" stroke="#1b1b22" strokeWidth={4} strokeLinecap="round" />
    <path d="M -24 36 L 24 36" stroke="#1b1b22" strokeWidth={6} strokeLinecap="round" />
    {/* placard */}
    <rect x={-70} y={112} width={140} height={50} rx={6} fill="#1b1b22" />
    <text x={0} y={150} textAnchor="middle" fontFamily='"Courier New", monospace' fontWeight={900} fontSize={36} fill="#fff">{tag}</text>
  </g>
);
