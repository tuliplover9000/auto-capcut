import React from 'react';

// Parametric suspect bust (same proportions as prints/PrintArt Mugshot):
// head centre (0,-26), rx 74 / ry 84, shoulders down to y 170.
export type Look = {skin: string; hair: string; style: 'curly' | 'slick' | 'short' | 'bob'; shirt: string; collar?: string};
export const LOOKS: Record<string, Look> = {
  A: {skin: '#f2c29a', hair: '#9a4a22', style: 'curly', shirt: '#3fae6a'},
  B: {skin: '#c98d62', hair: '#17141a', style: 'slick', shirt: '#26355e', collar: '#f4f1ea'},
  C: {skin: '#8d5a3b', hair: '#231a14', style: 'short', shirt: '#e0a92a'},
  D: {skin: '#e8b48a', hair: '#e2c06a', style: 'bob', shirt: '#7b8494'},
};
const OL = '#1b1b22';

export const Bust: React.FC<{x: number; y: number; s?: number; who: string; gaze?: number; blink?: number; sweat?: number; mood?: 'calm' | 'nervous' | 'neutral'; talk?: number; rot?: number}> = ({x, y, s = 1, who, gaze = 0, blink = 0, sweat = 0, mood = 'neutral', talk = 0, rot = 0}) => {
  const L = LOOKS[who];
  const eh = 11 * (1 - 0.9 * blink);
  const px = gaze * 7;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {/* shoulders */}
      <path d="M -128 170 Q -124 90 -40 76 L 40 76 Q 124 90 128 170 Z" fill={L.shirt} stroke={OL} strokeWidth={6} />
      {L.collar ? <path d="M -34 78 L 0 128 L 34 78 L 18 76 L 0 104 L -18 76 Z" fill={L.collar} stroke={OL} strokeWidth={4} /> : <path d="M -30 80 Q 0 112 30 80" fill="none" stroke={OL} strokeWidth={5} />}
      <rect x={-22} y={40} width={44} height={44} fill={L.skin} stroke={OL} strokeWidth={5} />
      {/* back hair (bob) */}
      {L.style === 'bob' ? <path d="M -86 -40 Q -96 40 -70 52 L 70 52 Q 96 40 86 -40 Z" fill={L.hair} stroke={OL} strokeWidth={5} /> : null}
      {/* ears + head */}
      <ellipse cx={-76} cy={-20} rx={12} ry={20} fill={L.skin} stroke={OL} strokeWidth={5} />
      <ellipse cx={76} cy={-20} rx={12} ry={20} fill={L.skin} stroke={OL} strokeWidth={5} />
      <ellipse cx={0} cy={-26} rx={74} ry={84} fill={L.skin} stroke={OL} strokeWidth={6} />
      {/* hair */}
      {L.style === 'curly' ? (
        <g fill={L.hair} stroke={OL} strokeWidth={5}>
          {[-62, -38, -12, 14, 40, 62].map((cx, i) => <circle key={i} cx={cx} cy={-92 + Math.abs(cx) * 0.35} r={26} />)}
          <path d="M -74 -50 Q -70 -100 0 -104 Q 70 -100 74 -50 Q 40 -78 0 -74 Q -40 -78 -74 -50 Z" />
        </g>
      ) : L.style === 'slick' ? (
        <path d="M -76 -38 Q -82 -116 4 -114 Q 82 -112 76 -40 Q 70 -72 34 -84 Q -10 -70 -76 -38 Z" fill={L.hair} stroke={OL} strokeWidth={5} />
      ) : L.style === 'short' ? (
        <path d="M -74 -46 Q -76 -112 0 -112 Q 76 -112 74 -46 Q 60 -88 0 -88 Q -60 -88 -74 -46 Z" fill={L.hair} stroke={OL} strokeWidth={5} />
      ) : (
        <path d="M -78 -20 Q -84 -118 0 -116 Q 84 -118 78 -20 Q 70 -70 30 -76 Q 0 -60 -30 -76 Q -70 -70 -78 -20 Z" fill={L.hair} stroke={OL} strokeWidth={5} />
      )}
      {/* brows */}
      {mood === 'nervous' ? (
        <>
          <path d="M -48 -44 L -16 -52" stroke={L.hair === '#e2c06a' ? '#8a6a2a' : L.hair} strokeWidth={8} strokeLinecap="round" />
          <path d="M 16 -52 L 48 -44" stroke={L.hair === '#e2c06a' ? '#8a6a2a' : L.hair} strokeWidth={8} strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M -48 -46 Q -32 -52 -16 -46" fill="none" stroke={L.hair === '#e2c06a' ? '#8a6a2a' : L.hair} strokeWidth={8} strokeLinecap="round" />
          <path d="M 16 -46 Q 32 -52 48 -46" fill="none" stroke={L.hair === '#e2c06a' ? '#8a6a2a' : L.hair} strokeWidth={8} strokeLinecap="round" />
        </>
      )}
      {/* eyes */}
      {[-30, 30].map((ex) => (
        <g key={ex}>
          <ellipse cx={ex} cy={-18} rx={15} ry={eh + 2} fill="#fff" stroke={OL} strokeWidth={4} />
          {blink < 0.8 ? <circle cx={ex + px} cy={-17} r={Math.min(7.5, eh)} fill={OL} /> : null}
        </g>
      ))}
      <path d="M -4 0 Q 2 18 12 16" fill="none" stroke={OL} strokeWidth={4} strokeLinecap="round" />
      {/* mouth */}
      {talk > 0.05 ? (
        <ellipse cx={0} cy={38} rx={16} ry={4 + 10 * talk} fill="#6a2a2a" stroke={OL} strokeWidth={4} />
      ) : mood === 'calm' ? (
        <path d="M -26 32 Q 0 52 26 32" fill="none" stroke={OL} strokeWidth={6} strokeLinecap="round" />
      ) : mood === 'nervous' ? (
        <path d="M -22 40 Q -11 32 0 40 Q 11 48 22 40" fill="none" stroke={OL} strokeWidth={5} strokeLinecap="round" />
      ) : (
        <path d="M -20 38 L 20 38" stroke={OL} strokeWidth={6} strokeLinecap="round" />
      )}
      {mood === 'nervous' ? (
        <>
          <ellipse cx={-48} cy={8} rx={13} ry={7} fill="#ff7a7a" opacity={0.35} />
          <ellipse cx={48} cy={8} rx={13} ry={7} fill="#ff7a7a" opacity={0.35} />
        </>
      ) : null}
      {/* sweat */}
      {sweat > 0 ? (
        <g opacity={sweat}>
          {[[58, -62, 1], [-62, -54, 0.8], [66, -18, 0.7]].map(([dx, dy, k], i) => (
            <path key={i} transform={`translate(${dx} ${dy}) scale(${k})`} d="M 0 -16 Q 11 2 0 10 Q -11 2 0 -16 Z" fill="#8fd3ff" stroke={OL} strokeWidth={3} />
          ))}
        </g>
      ) : null}
    </g>
  );
};

/* tiny icons for "checkable" chips, drawn in a 40x40 box centred at 0,0 */
export const Icon: React.FC<{k: 'name' | 'receipt' | 'camera' | 'rewind'; col?: string}> = ({k, col = OL}) => {
  if (k === 'receipt') return (
    <g>
      <path d="M -12 -17 L 12 -17 L 12 15 L 8 11 L 4 15 L 0 11 L -4 15 L -8 11 L -12 15 Z" fill="#fff" stroke={col} strokeWidth={3} strokeLinejoin="round" />
      <path d="M -7 -9 L 7 -9 M -7 -2 L 7 -2 M -7 5 L 3 5" stroke={col} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
  if (k === 'camera') return (
    <g>
      <rect x={-16} y={-10} width={24} height={18} rx={3} fill="#fff" stroke={col} strokeWidth={3} />
      <path d="M 8 -4 L 17 -9 L 17 7 L 8 2 Z" fill={col} />
      <circle cx={-4} cy={-1} r={4} fill={col} />
      <path d="M -10 8 L -14 17" stroke={col} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
  if (k === 'rewind') return (
    <g fill={col}>
      <path d="M 2 -12 L -12 0 L 2 12 Z" />
      <path d="M 16 -12 L 2 0 L 16 12 Z" />
    </g>
  );
  return (
    <g>
      <rect x={-16} y={-12} width={32} height={24} rx={4} fill="#fff" stroke={col} strokeWidth={3} />
      <circle cx={-7} cy={-2} r={4} fill={col} />
      <path d="M -12 8 Q -7 2 -2 8" fill={col} />
      <path d="M 2 -4 L 11 -4 M 2 2 L 9 2" stroke={col} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
};
