import React from 'react';

// Wind Test style guide (svg-craft): saturated flat illustration, two-tone
// shading (a darker same-hue shape for shadow), NO outlines. Each contender
// lives in a 400x400 box, ground line y = 380, wind blows LEFT -> RIGHT, so
// people/plants lean right and lean INTO it from the left.
export const PAL = {
  stem: '#3f9a3a', stemDark: '#2c7a2a', puff: '#fbfbf2', seed: '#d8d8c8', seedCore: '#a9844a',
  skin: '#f2c3a0', skinShade: '#d9a37f', hair: '#3a2a22', hoodie: '#ff7a2f', hoodieDark: '#d95e1a',
  pants: '#24406b', shoe: '#f4f4f0',
  trunk: '#7a4a2a', trunkDark: '#5c361d', leafA: '#3f9b3a', leafB: '#57b947', leafC: '#2f7d2c',
  car: '#e8392f', carDark: '#b9241c', glass: '#bfe4ff', tyre: '#20222a', hub: '#c9ccd4',
  wall: '#f6ecd8', wallShade: '#e2d2b4', roof: '#2f6fb0', roofDark: '#22548a', door: '#c94b3a', win: '#ffe39a',
};

type Box = {children: React.ReactNode; size: number};
export const ArtBox: React.FC<Box> = ({children, size}) => (
  <svg width={size} height={size} viewBox="0 0 400 400" style={{display: 'block', overflow: 'visible'}}>{children}</svg>
);

/* ── dandelion ── seedsGone 0..1: seeds detach in order and fly right ── */
const SEEDS = 30;
export const Dandelion: React.FC<{sway: number; seedsGone: number; t: number}> = ({sway, seedsGone, t}) => {
  const cx = 200 + sway * 30;
  const cy = 150;
  return (
    <g>
      <path d={`M200 380 Q ${200 + sway * 12} 270, ${cx} ${cy + 8}`} fill="none" stroke={PAL.stem} strokeWidth={9} strokeLinecap="round" />
      <path d="M200 378 L150 350 L176 352 L140 322 L172 330 L160 300 L200 370 Z" fill={PAL.stemDark} />
      <path d="M200 378 L250 352 L224 352 L262 326 L228 332 L244 304 L200 370 Z" fill={PAL.stem} />
      {Array.from({length: SEEDS}).map((_, i) => {
        const a = (i / SEEDS) * Math.PI * 2;
        const gone = Math.max(0, Math.min(1, seedsGone * 1.6 - (i / SEEDS) * 0.6));
        const fx = gone * (380 + (i % 5) * 60);
        const fy = gone * (-160 - (i % 7) * 25) + Math.sin(t * 4 + i) * 10 * gone;
        const r1 = 12;
        const r2 = 64;
        const x1 = cx + Math.cos(a) * r1;
        const y1 = cy + Math.sin(a) * r1;
        const x2 = cx + Math.cos(a) * r2 + fx;
        const y2 = cy + Math.sin(a) * r2 + fy;
        return (
          <g key={i} opacity={1 - gone * 0.25}>
            {gone < 0.05 ? <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={PAL.seed} strokeWidth={2} /> : null}
            <circle cx={x2} cy={y2} r={9} fill={PAL.puff} />
            {[0, 1, 2, 3, 4].map((k) => {
              const b = a + (k - 2) * 0.35;
              return <line key={k} x1={x2} y1={y2} x2={x2 + Math.cos(b) * 14} y2={y2 + Math.sin(b) * 14} stroke={PAL.puff} strokeWidth={2} strokeLinecap="round" />;
            })}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={12} fill={PAL.seedCore} />
    </g>
  );
};

/* ── person ── facing LEFT into the wind; parent rotates for lean/tumble ── */
export const Person: React.FC<{strain: number; t: number}> = ({strain, t}) => {
  const flap = Math.sin(t * 22) * (2 + strain * 8);
  return (
    <g>
      <rect x={176} y={292} width={26} height={84} rx={12} fill={PAL.pants} transform="rotate(8 189 292)" />
      <rect x={206} y={292} width={26} height={84} rx={12} fill={PAL.pants} transform="rotate(-6 219 292)" />
      <ellipse cx={180} cy={378} rx={22} ry={9} fill={PAL.shoe} />
      <ellipse cx={226} cy={378} rx={22} ry={9} fill={PAL.shoe} />
      <path d={`M162 196 Q 200 176, 240 196 L 246 ${300 + flap * 0.3} Q 204 ${312 + flap}, 160 300 Z`} fill={PAL.hoodie} />
      <path d={`M210 190 Q 236 192, 240 196 L 246 ${300 + flap * 0.3} Q 228 306, 214 304 Z`} fill={PAL.hoodieDark} />
      <polyline points="172,212 134,242 140,198" fill="none" stroke={PAL.hoodie} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={140} cy={196} r={13} fill={PAL.skin} />
      <polyline points="232,214 262,250 286,240" fill="none" stroke={PAL.hoodieDark} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={196} cy={146} r={36} fill={PAL.skin} />
      <path d="M214 120 Q 236 140, 230 168 Q 220 150, 206 150 Z" fill={PAL.skinShade} />
      <path d={`M164 140 Q 168 100, 210 106 Q 238 112, ${250 + flap} ${128 - flap * 0.4} Q 228 124, 222 132 Q 196 118, 170 146 Z`} fill={PAL.hair} />
      <circle cx={176} cy={148} r={4} fill={PAL.hair} />
      <path d={`M170 166 Q 178 ${162 + strain * 4}, 186 166`} fill="none" stroke={PAL.hair} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
};

/* ── tree ── snap 0..1 splits it at y=250: the top rotates away ── */
export const Tree: React.FC<{sway: number; snap: number; t: number}> = ({sway, snap, t}) => {
  const bend = sway * 10 + Math.sin(t * 5) * sway * 3;
  const fly = Math.max(0, snap);
  return (
    <g>
      <polygon points="178,380 222,380 214,250 186,250" fill={PAL.trunk} />
      <polygon points="204,380 222,380 214,250 204,250" fill={PAL.trunkDark} />
      {snap > 0 ? <polygon points="186,250 214,250 210,240 200,256 192,238" fill="#c99a63" /> : null}
      <g transform={`translate(${fly * 520} ${-fly * 120}) rotate(${bend + fly * 75} 200 250)`}>
        <polygon points="186,252 214,252 208,170 192,170" fill={PAL.trunk} />
        <circle cx={200} cy={140} r={92} fill={PAL.leafC} />
        <circle cx={150} cy={160} r={64} fill={PAL.leafA} />
        <circle cx={250} cy={156} r={66} fill={PAL.leafA} />
        <circle cx={204} cy={100} r={70} fill={PAL.leafB} />
        <circle cx={176} cy={92} r={30} fill="#7ccf63" opacity={0.7} />
      </g>
    </g>
  );
};

/* ── car ── side view facing right ── */
export const Car: React.FC<{t: number}> = ({t}) => (
  <g>
    <path d="M60 340 Q 58 300, 92 292 L 140 286 Q 168 236, 214 232 L 272 232 Q 300 236, 320 286 L 344 292 Q 356 300, 354 340 Z" fill={PAL.car} />
    <path d="M60 330 L 354 330 L 354 340 L 60 340 Z" fill={PAL.carDark} />
    <path d="M156 286 Q 178 248, 210 246 L 236 246 L 236 286 Z" fill={PAL.glass} />
    <path d="M248 246 L 268 246 Q 288 250, 302 286 L 248 286 Z" fill={PAL.glass} />
    <rect x={240} y={246} width={8} height={40} fill={PAL.carDark} />
    <rect x={334} y={300} width={16} height={12} rx={4} fill="#ffe08a" />
    <rect x={62} y={300} width={12} height={12} rx={3} fill="#ff6b5a" />
    {[120, 290].map((x) => (
      <g key={x} transform={`rotate(${t * 400} ${x} 346)`}>
        <circle cx={x} cy={346} r={34} fill={PAL.tyre} />
        <circle cx={x} cy={346} r={14} fill={PAL.hub} />
        <rect x={x - 3} y={346 - 14} width={6} height={28} fill="#8f939c" />
      </g>
    ))}
  </g>
);

/* ── house ── roofLift / tear 0..1 ── */
export const House: React.FC<{roofLift: number; tear: number}> = ({roofLift, tear}) => {
  const r = Math.min(1, roofLift);
  return (
    <g>
      <g transform={`translate(${tear * 300} ${-tear * 60}) rotate(${tear * 25} 200 380)`} opacity={1 - tear * 0.2}>
        <rect x={110} y={226} width={180} height={154} fill={PAL.wall} />
        <rect x={232} y={226} width={58} height={154} fill={PAL.wallShade} />
        <rect x={180} y={300} width={40} height={80} rx={4} fill={PAL.door} />
        <rect x={130} y={256} width={38} height={34} rx={3} fill={PAL.win} />
        <rect x={238} y={256} width={38} height={34} rx={3} fill={PAL.win} />
        <rect x={147} y={256} width={4} height={34} fill={PAL.wallShade} />
        <rect x={255} y={256} width={4} height={34} fill={PAL.wallShade} />
      </g>
      <g transform={`translate(${r * 360} ${-r * 260}) rotate(${r * 50} 200 186)`}>
        <rect x={246} y={146} width={24} height={50} fill={PAL.door} />
        <polygon points="86,232 200,138 314,232" fill={PAL.roof} />
        <polygon points="200,138 314,232 270,232 200,170" fill={PAL.roofDark} />
      </g>
    </g>
  );
};

/* ── tornado ── grow 0..1, spin in degrees-ish time ── */
export const Tornado: React.FC<{grow: number; t: number}> = ({grow, t}) => (
  <g opacity={Math.min(1, grow * 1.4)}>
    {Array.from({length: 14}).map((_, i) => {
      const k = i / 13;
      const w = (30 + Math.pow(1 - k, 1.6) * 260) * (0.4 + 0.6 * grow);
      const y = 40 + k * 560 * grow;
      const x = 200 + Math.sin(t * 3 + k * 4) * 26 * k + k * 30;
      return (
        <ellipse key={i} cx={x} cy={y} rx={w} ry={w * 0.18} fill={i % 2 ? '#3a3448' : '#4a4358'} opacity={0.92} />
      );
    })}
    {Array.from({length: 10}).map((_, i) => {
      const a = t * 6 + i * 0.63;
      return <rect key={i} x={200 + Math.cos(a) * (60 + i * 9)} y={420 + Math.sin(a) * 30 + i * 12} width={10} height={6}
        fill="#2a2433" transform={`rotate(${a * 57} ${200 + Math.cos(a) * (60 + i * 9)} ${420 + i * 12})`} opacity={grow} />;
    })}
  </g>
);
