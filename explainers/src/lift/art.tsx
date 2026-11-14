import React from 'react';
import {Face, FaceSvg} from '../fight/art';

// Lift style guide (svg-craft): same family as the Fight art — saturated flat,
// two-tone shading, no outlines, faces on everything that's alive. Every object
// lives in a 400x400 box, ground at y=380, and has an ANCHOR (where the balloon
// strings tie on). The liner is generic 1910s (4 buff funnels) with no face.

export const LPAL = {
  cat: '#f29a3a', catDark: '#d27a22', catLight: '#ffd2a0',
  skin: '#f1c9a5', skinDark: '#e3b08a', shirt: '#3fa7ff', shirtDark: '#2a86d8', pants: '#3b3f58', shoe: '#22232e', hair: '#5a3a24',
  car: '#ff4f5e', carDark: '#d6303f', glass: '#bfe9ff', tyre: '#1e1f26', hub: '#c9ccd6',
  whale: '#5c7fa8', whaleDark: '#45668c', whaleBelly: '#c9d8ea',
  hull: '#1d1f26', hullRed: '#b8352c', deck: '#f4f1ea', deckDark: '#d8d3c8', funnel: '#e0a33e', funnelTop: '#16171c',
};
export const BALLOON_COLS = ['#ff4f7b', '#ffd23f', '#3fd0ff', '#7be07b', '#b45cff', '#ff8a3a', '#ff6fd8', '#5b8cff'];

export const ANCHOR: Record<string, [number, number]> = {
  cat: [196, 266], person: [200, 56], car: [196, 196], whale: [222, 232], titanic: [200, 120], kid: [200, 36],
};
export const SIZE: Record<string, number> = {cat: 280, person: 340, car: 480, whale: 720, titanic: 760, helium: 760};

export const Balloon: React.FC<{x: number; y: number; r: number; color: string; k?: number}> = ({x, y, r, color, k = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <ellipse cx={0} cy={0} rx={r} ry={r * 1.18} fill={color} />
    <ellipse cx={r * 0.18} cy={r * 0.2} rx={r * 0.8} ry={r * 0.95} fill="#000" opacity={0.12} />
    <path d={`M ${-r * 0.16} ${r * 1.16} L ${r * 0.16} ${r * 1.16} L 0 ${r * 1.02} Z`} fill={color} />
    <ellipse cx={-r * 0.36} cy={-r * 0.44} rx={r * 0.2} ry={r * 0.32} fill="#ffffff" opacity={0.55} transform={`rotate(-25 ${-r * 0.36} ${-r * 0.44})`} />
  </g>
);

export const Cat: React.FC<{face: Face; t: number}> = ({face, t}) => {
  const tail = Math.sin(t * 4) * 10;
  return (
    <g>
      <path d={`M 110 340 Q 40 ${330 + tail}, 52 ${250 + tail} Q 60 220, 80 ${236 + tail}`} fill="none" stroke={LPAL.catDark} strokeWidth={26} strokeLinecap="round" />
      <ellipse cx={186} cy={302} rx={100} ry={80} fill={LPAL.cat} />
      <ellipse cx={210} cy={330} rx={60} ry={46} fill={LPAL.catLight} />
      {[150, 180].map((x) => <path key={x} d={`M ${x} 236 Q ${x - 10} 270, ${x + 4} 300`} fill="none" stroke={LPAL.catDark} strokeWidth={10} strokeLinecap="round" />)}
      <ellipse cx={168} cy={372} rx={34} ry={14} fill={LPAL.catDark} />
      <ellipse cx={236} cy={372} rx={34} ry={14} fill={LPAL.cat} />
      <rect x={118} y={262} width={150} height={18} rx={9} fill="#ff4f7b" transform="rotate(-6 193 271)" />
      <circle cx={196} cy={266} r={9} fill="#ffd23f" />
      <path d="M 166 132 L 180 62 L 222 116 Z" fill={LPAL.catDark} />
      <path d="M 262 116 L 300 64 L 312 136 Z" fill={LPAL.cat} />
      <path d="M 186 116 L 188 86 L 210 112 Z" fill="#ff9fb0" />
      <circle cx={240} cy={186} r={80} fill={LPAL.cat} />
      <ellipse cx={246} cy={222} rx={50} ry={34} fill={LPAL.catLight} />
      {[-1, 1].map((sd) => [0, 1].map((j) => (
        <line key={`${sd}${j}`} x1={246 + sd * 30} y1={226 + j * 10} x2={246 + sd * 74} y2={220 + j * 18} stroke="#7a4a1a" strokeWidth={3} strokeLinecap="round" />
      )))}
      <FaceSvg cx={246} cy={190} s={0.95} face={face} look={0} blink={Math.floor(t * 10) % 39 === 38} />
      <path d="M 238 210 L 254 210 L 246 220 Z" fill="#ff7a92" />
    </g>
  );
};

export const Person: React.FC<{face: Face; t: number; arms?: number}> = ({face, t, arms = 1}) => {
  const kick = Math.sin(t * 9) * 12 * arms;
  return (
    <g>
      <g transform={`rotate(${kick} 178 270)`}><rect x={160} y={262} width={36} height={108} rx={16} fill={LPAL.pants} /><ellipse cx={176} cy={372} rx={28} ry={11} fill={LPAL.shoe} /></g>
      <g transform={`rotate(${-kick} 222 270)`}><rect x={204} y={262} width={36} height={108} rx={16} fill={LPAL.pants} /><ellipse cx={226} cy={372} rx={28} ry={11} fill={LPAL.shoe} /></g>
      {/* arms up, gripping the strings */}
      <g transform={`rotate(${(1 - arms) * -160} 150 176)`}><rect x={132} y={66} width={34} height={112} rx={16} fill={LPAL.shirtDark} /><circle cx={149} cy={62} r={19} fill={LPAL.skin} /></g>
      <g transform={`rotate(${(1 - arms) * 160} 250 176)`}><rect x={234} y={66} width={34} height={112} rx={16} fill={LPAL.shirt} /><circle cx={251} cy={62} r={19} fill={LPAL.skin} /></g>
      <path d="M 140 168 Q 200 148, 260 168 L 266 276 Q 200 288, 134 276 Z" fill={LPAL.shirt} />
      <circle cx={200} cy={108} r={62} fill={LPAL.skin} />
      <path d="M 140 100 Q 140 40, 200 40 Q 262 40, 262 100 Q 240 72, 200 70 Q 162 72, 140 100 Z" fill={LPAL.hair} />
      <FaceSvg cx={200} cy={116} s={0.95} face={face} look={0} blink={Math.floor(t * 10) % 41 === 40} />
    </g>
  );
};

export const Car: React.FC<{face: Face; t: number; spin?: number}> = ({face, t, spin = 0}) => (
  <g>
    <path d="M 36 320 L 40 262 Q 46 240, 80 236 L 120 232 L 168 186 Q 182 174, 210 174 L 280 176 Q 304 178, 320 200 L 350 240 Q 372 246, 372 270 L 370 320 Z" fill={LPAL.car} />
    <path d="M 40 300 L 370 300 L 370 322 L 36 322 Z" fill={LPAL.carDark} />
    <path d="M 132 234 L 176 192 Q 184 186, 200 186 L 204 234 Z" fill={LPAL.glass} />
    <path d="M 214 186 L 276 188 Q 296 190, 306 206 L 328 236 L 214 236 Z" fill={LPAL.glass} />
    <rect x={356} y={258} width={16} height={16} rx={4} fill="#fff3a0" />
    {[112, 296].map((x) => (
      <g key={x} transform={`rotate(${spin * 360} ${x} 322)`}>
        <circle cx={x} cy={322} r={44} fill={LPAL.tyre} />
        <circle cx={x} cy={322} r={20} fill={LPAL.hub} />
        <rect x={x - 3} y={300} width={6} height={44} fill="#8a8f9c" />
      </g>
    ))}
    <FaceSvg cx={268} cy={212} s={0.5} face={face} look={1} blink={Math.floor(t * 10) % 45 === 44} />
    <rect x={186} y={168} width={20} height={12} rx={4} fill="#3b3f58" />
  </g>
);

export const Whale: React.FC<{face: Face; t: number}> = ({face, t}) => {
  const fl = Math.sin(t * 3) * 10;
  return (
    <g>
      <path d={`M 70 300 Q 40 ${270 + fl}, 6 ${244 + fl} Q 34 ${290 + fl}, 20 ${330 + fl} Q 50 ${312 + fl}, 82 318 Z`} fill={LPAL.whaleDark} />
      <path d="M 60 300 Q 120 240, 250 236 Q 350 236, 390 290 Q 396 318, 370 334 Q 250 360, 120 336 Q 80 326, 60 300 Z" fill={LPAL.whale} />
      <path d="M 150 336 Q 250 352, 372 332 Q 330 356, 250 360 Q 180 360, 150 336 Z" fill={LPAL.whaleBelly} />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M ${250 + i * 22} 342 Q ${300 + i * 16} ${348 - i}, ${360} 336`} fill="none" stroke={LPAL.whaleDark} strokeWidth={3} opacity={0.6} />)}
      <path d="M 150 252 L 170 226 L 184 248 Z" fill={LPAL.whaleDark} />
      <path d="M 250 330 Q 236 360, 214 372 Q 252 366, 270 334 Z" fill={LPAL.whaleDark} />
      <FaceSvg cx={338} cy={290} s={0.48} face={face} look={1} blink={Math.floor(t * 10) % 49 === 48} />
    </g>
  );
};

/* a generic 1910s liner: black hull, red boot-topping, white decks, four buff funnels */
export const Liner: React.FC<{t: number}> = ({t}) => (
  <g>
    <path d="M 0 262 L 400 262 L 384 360 Q 200 372, 22 360 Z" fill={LPAL.hull} />
    <path d="M 10 336 L 390 336 L 384 360 Q 200 372, 22 360 Z" fill={LPAL.hullRed} />
    <path d="M 0 262 L 400 262 L 398 272 L 2 272 Z" fill={LPAL.deck} />
    {Array.from({length: 22}).map((_, i) => <circle key={i} cx={22 + i * 17} cy={300} r={3.2} fill="#f4e7a8" opacity={0.85} />)}
    <rect x={58} y={226} width={290} height={36} fill={LPAL.deck} />
    <rect x={82} y={198} width={238} height={28} fill={LPAL.deckDark} />
    {Array.from({length: 16}).map((_, i) => <rect key={i} x={66 + i * 17} y={236} width={10} height={14} rx={2} fill="#3b4a5e" opacity={0.75} />)}
    {[112, 172, 232, 292].map((x, i) => (
      <g key={x} transform={`rotate(6 ${x} 198)`}>
        <rect x={x - 17} y={116} width={34} height={84} fill={LPAL.funnel} />
        <rect x={x - 17} y={116} width={34} height={18} fill={LPAL.funnelTop} />
        {i < 3 ? <circle cx={x + 6 + Math.sin(t * 2 + i) * 4} cy={96 - ((t * 20 + i * 9) % 30)} r={14} fill="#c9ccd6" opacity={0.5} /> : null}
      </g>
    ))}
    <line x1={40} y1={262} x2={56} y2={96} stroke="#3a3d4c" strokeWidth={4} />
    <line x1={360} y1={262} x2={346} y2={96} stroke="#3a3d4c" strokeWidth={4} />
    <line x1={56} y1={100} x2={346} y2={100} stroke="#3a3d4c" strokeWidth={2} />
  </g>
);

export const Kid: React.FC<{face: Face; t: number}> = ({face, t}) => (
  <g>
    <rect x={172} y={280} width={24} height={92} rx={10} fill={LPAL.pants} />
    <rect x={204} y={280} width={24} height={92} rx={10} fill={LPAL.pants} />
    <path d="M 160 196 Q 200 182, 240 196 L 244 292 Q 200 300, 156 292 Z" fill="#ffd23f" />
    <g transform={`rotate(${-160 + Math.sin(t * 3) * 6} 236 206)`}><rect x={226} y={200} width={22} height={86} rx={10} fill="#f2b81a" /></g>
    <circle cx={200} cy={140} r={58} fill={LPAL.skin} />
    <path d="M 146 132 Q 150 80, 200 80 Q 250 80, 254 132 Q 232 108, 200 106 Q 168 108, 146 132 Z" fill="#2a1d16" />
    <FaceSvg cx={200} cy={146} s={0.85} face={face} look={1} />
  </g>
);

export const LiftArt: React.FC<{art: string; face: Face; t: number; spin?: number}> = ({art, face, t, spin}) => {
  switch (art) {
    case 'cat': return <Cat face={face} t={t} />;
    case 'person': return <Person face={face} t={t} />;
    case 'car': return <Car face={face} t={t} spin={spin} />;
    case 'whale': return <Whale face={face} t={t} />;
    case 'titanic': return <Liner t={t} />;
    default: return null;
  }
};
