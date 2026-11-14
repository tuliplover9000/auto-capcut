import React from 'react';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';

// Odds Ladder art — every piece is an original, generic icon drawn in a
// 400x400 box (no game/brand artwork: the "pirate token" is a generic
// skull-and-crossbones doubloon, the "shiny" is sparkles, not a creature).
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;

export const Box: React.FC<{size: number; children: React.ReactNode}> = ({size, children}) => (
  <svg width={size} height={size} viewBox="0 0 400 400" style={{overflow: 'visible'}}>{children}</svg>
);

const star4 = (cx: number, cy: number, r: number) =>
  `M ${cx} ${cy - r} Q ${cx + r * 0.16} ${cy - r * 0.16}, ${cx + r} ${cy} Q ${cx + r * 0.16} ${cy + r * 0.16}, ${cx} ${cy + r} ` +
  `Q ${cx - r * 0.16} ${cy + r * 0.16}, ${cx - r} ${cy} Q ${cx - r * 0.16} ${cy - r * 0.16}, ${cx} ${cy - r} Z`;

export const Shiny: React.FC<{t: number}> = ({t}) => (
  <g>
    <defs>
      <linearGradient id="shinyG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7ff6ff" /><stop offset="0.5" stopColor="#ff8af0" /><stop offset="1" stopColor="#ffe66b" />
      </linearGradient>
    </defs>
    {[[205, 200, 150, 0], [95, 110, 62, 1.7], [318, 300, 70, 3.1], [312, 92, 40, 4.4], [92, 300, 36, 5.2]].map(([x, y, r, ph], i) => {
      const k = 0.82 + 0.18 * Math.sin(t * 5 + ph);
      return (
        <g key={i} transform={`rotate(${Math.sin(t * 2 + ph) * 8} ${x} ${y})`}>
          <path d={star4(x, y, r * k)} fill="url(#shinyG)" stroke="#ffffff" strokeWidth={i ? 4 : 8} strokeLinejoin="round" />
        </g>
      );
    })}
    <circle cx={182} cy={170} r={14} fill="#ffffff" opacity={0.9} />
  </g>
);

export const Golf: React.FC<{t: number; k: number}> = ({t, k}) => {
  // k: 0 = ball at the front of the green, 1 = in the cup
  const roll = Math.min(1, k);
  const bx = 120 + roll * 128;
  const by = 300 - roll * 22 + (roll >= 1 ? 16 : 0);
  return (
    <g>
      <ellipse cx={200} cy={300} rx={185} ry={70} fill="#2fa84f" />
      <ellipse cx={200} cy={292} rx={165} ry={58} fill="#46c464" />
      <ellipse cx={252} cy={280} rx={30} ry={12} fill="#13301b" />
      <rect x={262} y={60} width={9} height={222} rx={4} fill="#f4f1ea" />
      <path d={`M 271 64 Q ${330 + Math.sin(t * 6) * 8} ${78 + Math.sin(t * 6 + 1) * 6}, 352 92 Q ${320 + Math.sin(t * 6 + 2) * 8} 112, 271 124 Z`}
        fill="#e8392f" />
      {roll < 1 ? <circle cx={bx} cy={by} r={17} fill="#ffffff" stroke="#c9cdd6" strokeWidth={3} /> : null}
      {roll < 1 ? <ellipse cx={bx} cy={by + 16} rx={14} ry={4} fill="#1d5c2c" opacity={0.5} /> : null}
    </g>
  );
};

export const Token: React.FC<{t: number; spin?: number}> = ({t, spin = 1}) => {
  // a doubloon that turns on its vertical axis (never edge-on: it would vanish)
  const sx = 0.55 + 0.45 * Math.abs(Math.cos(t * 2.4 * spin));
  return (
    <g transform={`translate(200 200) scale(${spin ? sx : 1} 1) translate(-200 -200)`}>
      <circle cx={200} cy={200} r={172} fill="#b9770a" />
      <circle cx={200} cy={192} r={170} fill="#f2b81a" />
      <circle cx={200} cy={192} r={140} fill="#ffd34d" stroke="#d8960f" strokeWidth={8} />
      {Array.from({length: 24}).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <circle key={i} cx={200 + Math.cos(a) * 156} cy={192 + Math.sin(a) * 156} r={5} fill="#d8960f" />;
      })}
      {/* crossbones */}
      {[-38, 38].map((r) => (
        <g key={r} transform={`rotate(${r} 200 212)`}>
          <rect x={102} y={200} width={196} height={26} rx={13} fill="#fff8e6" stroke="#3a2a10" strokeWidth={5} />
          <circle cx={104} cy={202} r={14} fill="#fff8e6" stroke="#3a2a10" strokeWidth={5} />
          <circle cx={104} cy={224} r={14} fill="#fff8e6" stroke="#3a2a10" strokeWidth={5} />
          <circle cx={296} cy={202} r={14} fill="#fff8e6" stroke="#3a2a10" strokeWidth={5} />
          <circle cx={296} cy={224} r={14} fill="#fff8e6" stroke="#3a2a10" strokeWidth={5} />
        </g>
      ))}
      {/* skull */}
      <path d="M 200 102 C 140 102, 122 148, 130 186 C 134 206, 150 214, 154 232 L 246 232 C 250 214, 266 206, 270 186 C 278 148, 260 102, 200 102 Z"
        fill="#fff8e6" stroke="#3a2a10" strokeWidth={6} />
      <rect x={160} y={226} width={80} height={40} rx={10} fill="#fff8e6" stroke="#3a2a10" strokeWidth={6} />
      {[180, 200, 220].map((x) => <line key={x} x1={x} y1={238} x2={x} y2={262} stroke="#3a2a10" strokeWidth={5} />)}
      <ellipse cx={172} cy={178} rx={22} ry={25} fill="#3a2a10" />
      <ellipse cx={228} cy={178} rx={22} ry={25} fill="#3a2a10" />
      <path d="M 200 200 L 190 218 L 210 218 Z" fill="#3a2a10" />
      {/* shine streak */}
      <path d={`M ${120 + ((t * 180) % 300)} 60 l 40 0 l -110 280 l -40 0 Z`} fill="#ffffff" opacity={0.22} />
    </g>
  );
};

export const Flush: React.FC<{t: number; fan: number}> = ({t, fan}) => {
  const ranks = ['10', 'J', 'Q', 'K', 'A'];
  return (
    <g>
      {ranks.map((r, i) => {
        const a = (i - 2) * 15 * fan;
        return (
          <g key={r} transform={`rotate(${a} 200 380) translate(0 ${Math.sin(t * 3 + i) * 3})`}>
            <rect x={128} y={110} width={144} height={204} rx={16} fill="#ffffff" stroke="#1b1f2e" strokeWidth={6} />
            <text x={146} y={156} fontFamily={heavy} fontWeight={900} fontSize={40} fill="#1b1f2e">{r}</text>
            <text x={200} y={258} textAnchor="middle" fontFamily="Arial" fontSize={96} fill="#1b1f2e">{'♠'}</text>
          </g>
        );
      })}
    </g>
  );
};

export const Bolt: React.FC<{t: number}> = ({t}) => {
  const flick = 0.75 + 0.25 * Math.abs(Math.sin(t * 23));
  return (
    <g>
      <circle cx={200} cy={170} r={60} fill="#5a6378" /><circle cx={140} cy={188} r={46} fill="#5a6378" />
      <circle cx={262} cy={190} r={50} fill="#5a6378" /><rect x={110} y={180} width={190} height={56} rx={28} fill="#5a6378" />
      <circle cx={186} cy={150} r={40} fill="#737d93" />
      <polygon points="214,204 150,300 196,300 166,392 262,268 214,268 248,204" fill="#ffe14d" stroke="#ffffff" strokeWidth={8}
        strokeLinejoin="round" opacity={flick} style={{filter: 'drop-shadow(0 0 22px #fff3a0)'}} />
    </g>
  );
};

export const Chest: React.FC<{t: number; open: number}> = ({t, open}) => (
  <g>
    {open > 0.05 ? <ellipse cx={200} cy={200} rx={120 * open} ry={90 * open} fill="#fff1a6" opacity={0.75} style={{filter: 'blur(14px)'}} /> : null}
    <rect x={70} y={210} width={260} height={150} rx={14} fill="#8a4f22" stroke="#3b200b" strokeWidth={8} />
    {[120, 280].map((x) => <rect key={x} x={x - 13} y={210} width={26} height={150} fill="#f2b81a" stroke="#3b200b" strokeWidth={5} />)}
    <g transform={`rotate(${-open * 38} 78 214)`}>
      <path d="M 70 214 L 70 168 C 70 120, 330 120, 330 168 L 330 214 Z" fill="#a0602c" stroke="#3b200b" strokeWidth={8} strokeLinejoin="round" />
      {[120, 280].map((x) => <rect key={x} x={x - 13} y={130} width={26} height={84} fill="#f2b81a" stroke="#3b200b" strokeWidth={5} />)}
    </g>
    <rect x={180} y={222} width={40} height={46} rx={8} fill="#ffd34d" stroke="#3b200b" strokeWidth={5} />
    <circle cx={200} cy={240} r={6} fill="#3b200b" />
    {open > 0.3 ? [0, 1, 2].map((i) => (
      <circle key={i} cx={150 + i * 50} cy={190 - ((t * 140 + i * 40) % 90)} r={10} fill="#ffd34d" opacity={1 - ((t * 140 + i * 40) % 90) / 90} />
    )) : null}
  </g>
);

export const Powerball: React.FC<{t: number}> = ({t}) => (
  <g transform={`rotate(${Math.sin(t * 2) * 6} 200 200)`}>
    <defs>
      <radialGradient id="pbG" cx="0.36" cy="0.32" r="0.75">
        <stop offset="0" stopColor="#ff7a7a" /><stop offset="0.55" stopColor="#e3192b" /><stop offset="1" stopColor="#8c0b17" />
      </radialGradient>
    </defs>
    <circle cx={200} cy={200} r={175} fill="url(#pbG)" />
    <circle cx={200} cy={200} r={86} fill="#ffffff" />
    <text x={200} y={234} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={96} fill="#1b1f2e">26</text>
    <ellipse cx={136} cy={104} rx={46} ry={26} fill="#ffffff" opacity={0.35} transform="rotate(-30 136 104)" />
  </g>
);

export const ArtFor: React.FC<{art: string; t: number; k: number}> = ({art, t, k}) =>
  art === 'shiny' ? <Shiny t={t} />
    : art === 'golf' ? <Golf t={t} k={k} />
    : art === 'token' ? <Token t={t} />
    : art === 'flush' ? <Flush t={t} fan={k} />
    : art === 'bolt' ? <Bolt t={t} />
    : art === 'chest' ? <Chest t={t} open={k} />
    : art === 'powerball' ? <Powerball t={t} />
    : <Token t={t} />;
