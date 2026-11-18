import React from 'react';

// "Buffering" cast. Same bust rig as liar/art (head centre (0,-26), rx 74 /
// ry 84, shoulders to y 170) plus a FOREHEAD SCREEN (everyone in Techtopia
// wears their mood on a display), more expressions and robot/ad eye modes.
export const OL = '#1b1b22';
export type Who = 'DEX' | 'BOLT' | 'NOVA';
export type Mood = 'neutral' | 'happy' | 'nervous' | 'shock' | 'smug' | 'robot' | 'dead' | 'ad' | 'love' | 'hurt';
export type Screen = {text?: string; col?: string; spin?: number; bar?: number; heart?: boolean; flash?: boolean; big?: number};

type Look = {skin: string; hair: string; brow: string; style: 'messy' | 'spiky' | 'bob'; top: string; trim: string};
export const LOOKS: Record<Who, Look> = {
  DEX: {skin: '#eab48b', hair: '#4a2e1c', brow: '#3a2416', style: 'messy', top: '#2fb7a6', trim: '#1f7f74'},
  BOLT: {skin: '#a8714f', hair: '#1c1410', brow: '#1c1410', style: 'spiky', top: '#e8443a', trim: '#f4f1ea'},
  NOVA: {skin: '#f3cfb0', hair: '#7a4fd6', brow: '#4b2d91', style: 'bob', top: '#f4f1ea', trim: '#7a4fd6'},
};
export const COL: Record<string, string> = {DEX: '#3fd6c3', BOLT: '#ff7a3d', NOVA: '#b98cff', SYS: '#6fe3ff'};

const heartPath = (s: number) => `M 0 ${4 * s} C ${-12 * s} ${-4 * s} ${-9 * s} ${-14 * s} 0 ${-8 * s} C ${9 * s} ${-14 * s} ${12 * s} ${-4 * s} 0 ${4 * s} Z`;

const ForeheadScreen: React.FC<{sc: Screen; t: number}> = ({sc, t}) => {
  const col = sc.col ?? '#6fe3ff';
  const on = sc.flash ? Math.sin(t * 18) > -0.3 : true;
  const txt = sc.text ?? '';
  const fs = Math.min(21, 96 / Math.max(1, txt.length * 0.66));
  const hasIcon = sc.spin !== undefined || sc.heart;
  return (
    <g transform={`translate(0 -84) scale(${sc.big ?? 1})`}>
      <rect x={-56} y={-17} width={112} height={34} rx={9} fill="#0b1422" stroke={OL} strokeWidth={4} />
      <rect x={-50} y={-11} width={100} height={22} rx={5} fill={col} opacity={0.12} />
      {on && sc.spin !== undefined ? (
        <g transform={`translate(${txt ? -38 : 0} 0)`}>
          {Array.from({length: 8}).map((_, k) => {
            const a = (k / 8) * Math.PI * 2;
            const head = Math.floor(sc.spin! * 8) % 8;
            const age = (k - head + 8) % 8;
            return <circle key={k} cx={Math.cos(a) * 8} cy={Math.sin(a) * 8} r={2.4} fill={col} opacity={1 - age / 9} />;
          })}
        </g>
      ) : null}
      {on && sc.heart ? <path d={heartPath(1.15)} transform={`translate(${txt ? -38 : 0} 3) scale(${1 + 0.12 * Math.sin(t * 9)})`} fill="#ff5d8f" /> : null}
      {on && txt ? (
        <text x={hasIcon ? 9 : 0} y={fs * 0.36} textAnchor="middle" fontFamily="Montserrat, Arial" fontWeight={900}
          fontSize={hasIcon ? Math.min(fs, 15) : fs} fill={col} letterSpacing={0.5}>{txt}</text>
      ) : null}
      {sc.bar !== undefined ? (
        <g>
          <rect x={-46} y={6} width={92} height={6} rx={3} fill="#24324a" />
          <rect x={-46} y={6} width={92 * sc.bar} height={6} rx={3} fill={col} />
        </g>
      ) : null}
    </g>
  );
};

export const Toon: React.FC<{x: number; y: number; s?: number; who: Who; mood?: Mood; talk?: number; blink?: number; gaze?: number; screen?: Screen; rot?: number; t?: number; sweat?: number; dim?: number}> = ({x, y, s = 1, who, mood = 'neutral', talk = 0, blink = 0, gaze = 0, screen, rot = 0, t = 0, sweat = 0, dim = 0}) => {
  const L = LOOKS[who];
  const eh = 11 * (1 - 0.9 * blink);
  const px = gaze * 7;
  const robo = mood === 'robot';
  const shock = mood === 'shock';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={1 - dim}>
      {/* shoulders: DEX hoodie, BOLT jacket, NOVA cropped jacket */}
      <path d="M -132 175 Q -128 92 -42 76 L 42 76 Q 128 92 132 175 Z" fill={L.top} stroke={OL} strokeWidth={6} />
      {who === 'DEX' ? (
        <g>
          <path d="M -54 78 Q 0 120 54 78" fill="none" stroke={L.trim} strokeWidth={10} strokeLinecap="round" />
          <path d="M -16 100 L -18 150 M 16 100 L 18 150" stroke="#f4f1ea" strokeWidth={5} strokeLinecap="round" />
        </g>
      ) : who === 'BOLT' ? (
        <g>
          <path d="M -30 78 L 0 175 L 30 78" fill="#1b1b22" stroke={OL} strokeWidth={4} />
          <path d="M -42 76 L -10 150 L -60 112 Z M 42 76 L 10 150 L 60 112 Z" fill="#c22f27" stroke={OL} strokeWidth={4} />
          <path d="M -6 120 L 8 120 L -2 140 L 10 140 L -10 168 L -2 146 L -12 146 Z" fill="#ffd23f" />
        </g>
      ) : (
        <g>
          <path d="M -36 78 L 0 120 L 36 78 L 20 76 L 0 100 L -20 76 Z" fill={L.trim} stroke={OL} strokeWidth={4} />
          <circle cx={-70} cy={130} r={7} fill="#6fe3ff" stroke={OL} strokeWidth={3} />
        </g>
      )}
      <rect x={-22} y={40} width={44} height={44} fill={L.skin} stroke={OL} strokeWidth={5} />
      {L.style === 'bob' ? <path d="M -88 -40 Q -98 44 -72 56 L 72 56 Q 98 44 88 -40 Z" fill={L.hair} stroke={OL} strokeWidth={5} /> : null}
      <ellipse cx={-76} cy={-20} rx={12} ry={20} fill={L.skin} stroke={OL} strokeWidth={5} />
      <ellipse cx={76} cy={-20} rx={12} ry={20} fill={L.skin} stroke={OL} strokeWidth={5} />
      {who === 'NOVA' ? <circle cx={-78} cy={6} r={6} fill="#6fe3ff" stroke={OL} strokeWidth={3} /> : null}
      <ellipse cx={0} cy={-26} rx={74} ry={84} fill={L.skin} stroke={OL} strokeWidth={6} />
      {/* hair */}
      {L.style === 'messy' ? (
        <path d="M -76 -40 Q -84 -118 -10 -116 L -2 -132 L 14 -114 L 30 -128 L 38 -110 Q 84 -104 76 -40 Q 66 -84 34 -88 Q 6 -76 -20 -90 Q -56 -84 -76 -40 Z" fill={L.hair} stroke={OL} strokeWidth={5} strokeLinejoin="round" />
      ) : L.style === 'spiky' ? (
        <g>
          {/* hi-top fade with a bleached tip */}
          <path d="M -76 -40 Q -80 -84 -64 -96 L -66 -168 Q 0 -184 66 -168 L 64 -96 Q 80 -84 76 -40 Q 62 -80 0 -84 Q -62 -80 -76 -40 Z" fill={L.hair} stroke={OL} strokeWidth={5} strokeLinejoin="round" />
          <path d="M -66 -168 Q 0 -184 66 -168 L 65 -146 Q 0 -160 -65 -146 Z" fill="#ffb02e" stroke={OL} strokeWidth={4} />
        </g>
      ) : (
        <path d="M -80 -16 Q -86 -120 0 -118 Q 86 -120 80 -16 Q 72 -66 34 -76 Q 0 -94 -34 -76 Q -72 -66 -80 -16 Z" fill={L.hair} stroke={OL} strokeWidth={5} />
      )}
      {/* brows */}
      {mood === 'nervous' || mood === 'hurt' ? (
        <>
          <path d="M -48 -42 L -16 -52" stroke={L.brow} strokeWidth={8} strokeLinecap="round" />
          <path d="M 16 -52 L 48 -42" stroke={L.brow} strokeWidth={8} strokeLinecap="round" />
        </>
      ) : mood === 'smug' ? (
        <>
          <path d="M -48 -48 L -16 -44" stroke={L.brow} strokeWidth={8} strokeLinecap="round" />
          <path d="M 16 -54 Q 32 -62 48 -52" fill="none" stroke={L.brow} strokeWidth={8} strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d={`M -48 ${shock ? -56 : -46} Q -32 ${shock ? -64 : -52} -16 ${shock ? -56 : -46}`} fill="none" stroke={L.brow} strokeWidth={8} strokeLinecap="round" />
          <path d={`M 16 ${shock ? -56 : -46} Q 32 ${shock ? -64 : -52} 48 ${shock ? -56 : -46}`} fill="none" stroke={L.brow} strokeWidth={8} strokeLinecap="round" />
        </>
      )}
      {/* eyes */}
      {mood === 'dead' ? (
        [-30, 30].map((ex) => <path key={ex} d={`M ${ex - 10} -28 L ${ex + 10} -8 M ${ex + 10} -28 L ${ex - 10} -8`} stroke={OL} strokeWidth={6} strokeLinecap="round" />)
      ) : robo ? (
        [-30, 30].map((ex) => <rect key={ex} x={ex - 15} y={-26} width={30} height={14} rx={3} fill="#6fe3ff" stroke={OL} strokeWidth={4} />)
      ) : mood === 'love' ? (
        [-30, 30].map((ex) => <path key={ex} d={heartPath(1.5)} transform={`translate(${ex} -14) scale(${1 + 0.1 * Math.sin(t * 8)})`} fill="#ff5d8f" stroke={OL} strokeWidth={3} />)
      ) : mood === 'ad' ? (
        [-30, 30].map((ex) => <path key={ex} transform={`translate(${ex} -18) rotate(${t * 120})`} d="M 0 -14 L 4 -4 L 14 0 L 4 4 L 0 14 L -4 4 L -14 0 L -4 -4 Z" fill="#ffd23f" stroke={OL} strokeWidth={3} />)
      ) : mood === 'happy' && talk < 0.05 ? (
        [-30, 30].map((ex) => <path key={ex} d={`M ${ex - 14} -14 Q ${ex} -30 ${ex + 14} -14`} fill="none" stroke={OL} strokeWidth={6} strokeLinecap="round" />)
      ) : who === 'BOLT' && mood !== 'shock' && mood !== 'hurt' ? (
        <g>
          <path d="M -54 -30 L 54 -30 L 50 -10 Q 30 2 10 -10 L 0 -18 L -10 -10 Q -30 2 -50 -10 Z" fill="#14141c" stroke={OL} strokeWidth={4} />
          <path d="M -40 -24 L -26 -24" stroke="#5a6a8a" strokeWidth={4} strokeLinecap="round" />
        </g>
      ) : (
        [-30, 30].map((ex) => (
          <g key={ex}>
            <ellipse cx={ex} cy={-18} rx={shock ? 17 : 15} ry={(shock ? 15 : eh) + 2} fill="#fff" stroke={OL} strokeWidth={4} />
            {blink < 0.8 ? <circle cx={ex + px} cy={-17} r={shock ? 5 : Math.min(7.5, eh)} fill={OL} /> : null}
          </g>
        ))
      )}
      <path d="M -4 0 Q 2 18 12 16" fill="none" stroke={OL} strokeWidth={4} strokeLinecap="round" />
      {/* mouth */}
      {robo && talk > 0.05 ? (
        <g>
          <rect x={-24} y={30} width={48} height={8 + 14 * talk} rx={3} fill="#0b1422" stroke={OL} strokeWidth={4} />
          {[-12, 0, 12].map((dx) => <rect key={dx} x={dx - 3} y={34} width={6} height={2 + 10 * talk} fill="#6fe3ff" />)}
        </g>
      ) : talk > 0.05 ? (
        <ellipse cx={0} cy={38} rx={mood === 'ad' ? 24 : 16} ry={4 + 11 * talk} fill="#6a2a2a" stroke={OL} strokeWidth={4} />
      ) : robo ? (
        <rect x={-24} y={34} width={48} height={8} rx={3} fill="#0b1422" stroke={OL} strokeWidth={4} />
      ) : shock ? (
        <ellipse cx={0} cy={40} rx={12} ry={15} fill="#6a2a2a" stroke={OL} strokeWidth={4} />
      ) : mood === 'happy' || mood === 'love' || mood === 'ad' ? (
        <path d="M -28 30 Q 0 66 28 30 Z" fill="#6a2a2a" stroke={OL} strokeWidth={5} strokeLinejoin="round" />
      ) : mood === 'smug' ? (
        <path d="M -20 40 Q 6 46 26 30" fill="none" stroke={OL} strokeWidth={6} strokeLinecap="round" />
      ) : mood === 'nervous' || mood === 'hurt' ? (
        <path d="M -22 40 Q -11 32 0 40 Q 11 48 22 40" fill="none" stroke={OL} strokeWidth={5} strokeLinecap="round" />
      ) : mood === 'dead' ? (
        <path d="M -16 40 L 16 40" stroke={OL} strokeWidth={6} strokeLinecap="round" />
      ) : (
        <path d="M -18 38 Q 0 44 18 38" fill="none" stroke={OL} strokeWidth={6} strokeLinecap="round" />
      )}
      {mood === 'nervous' || mood === 'love' || mood === 'hurt' ? (
        <>
          <ellipse cx={-50} cy={10} rx={14} ry={7} fill="#ff7a7a" opacity={0.45} />
          <ellipse cx={50} cy={10} rx={14} ry={7} fill="#ff7a7a" opacity={0.45} />
        </>
      ) : null}
      {sweat > 0 ? (
        <g opacity={sweat}>
          {[[60, -60, 1], [-64, -50, 0.8]].map(([dx, dy, k], i) => (
            <path key={i} transform={`translate(${dx} ${dy}) scale(${k})`} d="M 0 -16 Q 11 2 0 10 Q -11 2 0 -16 Z" fill="#8fd3ff" stroke={OL} strokeWidth={3} />
          ))}
        </g>
      ) : null}
      {screen ? <ForeheadScreen sc={screen} t={t} /> : null}
    </g>
  );
};

/* The house AI: a floating holographic orb with a waveform mouth. */
export const Orb: React.FC<{x: number; y: number; s?: number; talk?: number; t: number; k?: number}> = ({x, y, s = 1, talk = 0, t, k = 1}) => (
  <g transform={`translate(${x} ${y + Math.sin(t * 2.2) * 8}) scale(${s * k})`} opacity={k}>
    <circle r={78} fill="#6fe3ff" opacity={0.12 + 0.1 * talk} />
    <circle r={56} fill="#0f2a40" stroke="#6fe3ff" strokeWidth={6} />
    <circle r={56} fill="none" stroke="#6fe3ff" strokeWidth={2} opacity={0.5} strokeDasharray="6 10" transform={`rotate(${t * 40})`} />
    <ellipse cx={-18} cy={-12} rx={8} ry={talk > 0.05 ? 10 : 12} fill="#6fe3ff" />
    <ellipse cx={18} cy={-12} rx={8} ry={talk > 0.05 ? 10 : 12} fill="#6fe3ff" />
    {[-24, -12, 0, 12, 24].map((dx, i) => {
      const h = 4 + talk * 22 * Math.abs(Math.sin(t * 17 + i * 1.7));
      return <rect key={dx} x={dx - 3.5} y={20 - h / 2} width={7} height={h} rx={3.5} fill="#6fe3ff" />;
    })}
  </g>
);

/* A talking chrome toaster (it knows where you are). */
export const Toaster: React.FC<{x: number; y: number; s?: number; talk?: number; t: number}> = ({x, y, s = 1, talk = 0, t}) => (
  <g transform={`translate(${x} ${y + (talk > 0.05 ? -Math.abs(Math.sin(t * 14)) * 6 : 0)}) scale(${s})`}>
    <rect x={-46} y={-38} width={30} height={10} rx={4} fill="#3a3f4a" stroke={OL} strokeWidth={4} transform="translate(-6 0)" />
    <rect x={-80} y={-70} width={160} height={110} rx={30} fill="#c9d3df" stroke={OL} strokeWidth={6} />
    <rect x={-60} y={-78} width={50} height={14} rx={6} fill="#3a3f4a" stroke={OL} strokeWidth={4} />
    <rect x={10} y={-78} width={50} height={14} rx={6} fill="#3a3f4a" stroke={OL} strokeWidth={4} />
    <path d="M -62 -50 Q -40 -60 -20 -52" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.7} fill="none" />
    <circle cx={-24} cy={-18} r={9} fill={OL} />
    <circle cx={24} cy={-18} r={9} fill={OL} />
    <circle cx={-21} cy={-21} r={3} fill="#fff" />
    <circle cx={27} cy={-21} r={3} fill="#fff" />
    {talk > 0.05 ? <ellipse cx={0} cy={12} rx={14} ry={4 + 9 * talk} fill="#6a2a2a" stroke={OL} strokeWidth={4} /> : <path d="M -14 10 Q 0 18 14 10" fill="none" stroke={OL} strokeWidth={5} strokeLinecap="round" />}
    <rect x={84} y={-30} width={10} height={36} rx={4} fill="#3a3f4a" stroke={OL} strokeWidth={3} />
    <rect x={-70} y={36} width={24} height={10} rx={3} fill="#3a3f4a" />
    <rect x={46} y={36} width={24} height={10} rx={3} fill="#3a3f4a" />
  </g>
);

export const Heart: React.FC<{x: number; y: number; s?: number; col?: string; op?: number}> = ({x, y, s = 1, col = '#ff5d8f', op = 1}) => (
  <path d={heartPath(3)} transform={`translate(${x} ${y}) scale(${s})`} fill={col} stroke={OL} strokeWidth={3} opacity={op} />
);
