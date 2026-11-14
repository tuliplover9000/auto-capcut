import React from 'react';
import {Face, FaceSvg} from '../fight/art';

// Horde style guide (svg-craft): same family as Fight/Lift — saturated flat,
// two-tone shading, no outlines, faces carry the comedy. Boxes: 400x400 with the
// ground at y=380 (gorilla, man, rabbit, carriage, cage) and 400x700 for the
// chibi human hero (Napoleon), ground y=700. Heroes face RIGHT, the horde faces LEFT.
export const HPAL = {
  fur: '#2c2b31', furDark: '#1d1c21', silver: '#9a9ca6', skin: '#57505c', skinLight: '#6e6672',
  leaf: '#4cb043', leafDark: '#2f8a2c',
  coat: '#24345e', coatDark: '#1a2647', lapel: '#f4f1ea', collar: '#c8323a', gold: '#e2b23a', boot: '#17161b', breeches: '#efe9dc', hat: '#15151a',
  napSkin: '#f1c9a5', napHair: '#3a2a20',
  wood: '#a8743f', woodDark: '#7a4f26', coach: '#2d5b45', coachDark: '#1f4232',
};
export const SHIRTS = ['#ff4f5e', '#3fa7ff', '#ffd23f', '#7be07b', '#b45cff', '#ff8a3a', '#f4f1ea', '#5b8cff', '#ff6fd8'];
export const SKINS = ['#f1c9a5', '#d9a47c', '#a86e45', '#7a4a2a', '#f3d6bd'];
export const HAIRS = ['#2a1d16', '#5a3a24', '#c98f3a', '#1b1b22', '#8a8f9c'];
export const BUNNIES = [['#f4f1ea', '#dcd6cb'], ['#c9b8a0', '#a8967c'], ['#8a8f9c', '#6e7380'], ['#b07a4a', '#8e5d33']];

/* ── GORILLA ── 400x400, faces right. swing 0..1 front-arm swat; beat 0..1 chest-beat
   (fists on the chest, alternating); eat 0..1 leaves to the mouth; pant = tired heave ── */
export const Gorilla: React.FC<{face: Face; t: number; swing?: number; beat?: number; eat?: number; pant?: number}> =
  ({face, t, swing = 0, beat = 0, eat = 0, pant = 0}) => {
  const heave = pant * Math.sin(t * 9) * 6;
  const fistA = Math.sin(t * 26) > 0 ? 1 : 0;
  const armDown = beat < 0.5;
  return (
    <g transform={`translate(0 ${heave})`}>
      {/* back arm (knuckles down) */}
      {armDown ? <g transform={`rotate(${8 - eat * 0} 150 200)`}><rect x={122} y={190} width={58} height={190} rx={28} fill={HPAL.furDark} /></g> : null}
      {/* legs */}
      <rect x={140} y={300} width={56} height={78} rx={22} fill={HPAL.furDark} />
      <rect x={210} y={300} width={56} height={78} rx={22} fill={HPAL.fur} />
      {/* body + silver saddle */}
      <path d="M 92 250 Q 96 150, 200 140 Q 300 140, 312 240 Q 316 320, 200 334 Q 96 326, 92 250 Z" fill={HPAL.fur} />
      <path d="M 96 236 Q 104 170, 170 156 Q 150 210, 156 300 Q 108 292, 96 236 Z" fill={HPAL.silver} />
      <ellipse cx={236} cy={250} rx={58} ry={52} fill={HPAL.skin} opacity={0.6} />
      {/* head: crest dome, face mask */}
      <path d="M 196 150 Q 196 70, 262 62 Q 324 64, 326 136 Q 328 196, 262 206 Q 200 204, 196 150 Z" fill={HPAL.fur} />
      <ellipse cx={272} cy={152} rx={50} ry={46} fill={HPAL.skin} />
      <ellipse cx={272} cy={170} rx={34} ry={24} fill={HPAL.skinLight} />
      <path d="M 222 120 Q 272 100, 322 120" fill="none" stroke={HPAL.furDark} strokeWidth={14} strokeLinecap="round" />
      <FaceSvg cx={272} cy={142} s={0.78} face={face} look={1} blink={Math.floor(t * 10) % 37 === 36} brow={HPAL.furDark} browW={9} />
      <ellipse cx={262} cy={164} rx={5} ry={4} fill="#2a262e" /><ellipse cx={282} cy={164} rx={5} ry={4} fill="#2a262e" />
      {/* front arm: swat / eat / chest beat */}
      {armDown && eat > 0.3 ? (
        <>
          <path d={`M 262 196 L 336 ${262 + Math.sin(t * 6) * 4} L 304 ${176 + Math.sin(t * 6) * 6}`} fill="none" stroke={HPAL.fur} strokeWidth={56} strokeLinecap="round" strokeLinejoin="round" />
          <g transform={`translate(306 ${168 + Math.sin(t * 6) * 6})`}>
            {[-40, -15, 15, 40].map((a, i) => <ellipse key={i} cx={Math.sin((a * Math.PI) / 180) * 34} cy={-30} rx={14} ry={32} fill={i % 2 ? HPAL.leaf : HPAL.leafDark} transform={`rotate(${a} 0 0)`} />)}
            <circle cx={0} cy={0} r={26} fill={HPAL.skin} />
          </g>
        </>
      ) : armDown ? (
        <g transform={`rotate(${-swing * 105} 262 196)`}>
          <rect x={232} y={186} width={62} height={196} rx={30} fill={HPAL.fur} />
          <ellipse cx={263} cy={376} rx={36} ry={22} fill={HPAL.skin} />
        </g>
      ) : (
        <>
          <path d={`M 150 196 L ${190} ${238 - fistA * 22}`} stroke={HPAL.furDark} strokeWidth={54} strokeLinecap="round" />
          <path d={`M 262 196 L ${236} ${238 - (1 - fistA) * 22}`} stroke={HPAL.fur} strokeWidth={56} strokeLinecap="round" />
          <circle cx={190} cy={244 - fistA * 22} r={30} fill={HPAL.skin} />
          <circle cx={236} cy={244 - (1 - fistA) * 22} r={30} fill={HPAL.skinLight} />
        </>
      )}
    </g>
  );
};

/* ── a generic little man for the crowd ── 400x400, faces LEFT. run 0..1 cycles the legs */
export const Man: React.FC<{i: number; face: Face; run: number; flip?: boolean}> = ({i, face, run, flip}) => {
  const shirt = SHIRTS[i % SHIRTS.length];
  const skin = SKINS[(i * 7) % SKINS.length];
  const hair = HAIRS[(i * 3) % HAIRS.length];
  const leg = Math.sin(run * Math.PI * 2) * 26;
  const style = i % 4;
  return (
    <g transform={flip ? 'translate(400 0) scale(-1 1)' : undefined}>
      <g transform={`rotate(${leg} 180 290)`}><rect x={160} y={286} width={36} height={92} rx={16} fill="#3b3f58" /></g>
      <g transform={`rotate(${-leg} 220 290)`}><rect x={204} y={286} width={36} height={92} rx={16} fill="#2f3247" /></g>
      <g transform={`rotate(${-leg * 1.4 + 40} 236 196)`}><rect x={222} y={190} width={30} height={100} rx={14} fill={shirt} opacity={0.85} /></g>
      <path d="M 150 196 Q 200 178, 250 196 L 254 296 Q 200 306, 146 296 Z" fill={shirt} />
      <g transform={`rotate(${leg * 1.4 - 40} 164 196)`}><rect x={148} y={190} width={30} height={100} rx={14} fill={shirt} /></g>
      <circle cx={200} cy={128} r={60} fill={skin} />
      {style === 0 ? <path d="M 142 120 Q 146 66, 200 66 Q 254 66, 258 120 Q 236 96, 200 94 Q 164 96, 142 120 Z" fill={hair} /> : null}
      {style === 1 ? <path d="M 140 112 L 260 112 L 252 82 Q 200 56, 148 82 Z M 132 112 L 214 112 L 214 122 L 132 122 Z" fill={SHIRTS[(i + 4) % SHIRTS.length]} /> : null}
      {style === 2 ? <path d="M 144 130 Q 136 64, 200 64 Q 266 64, 256 130 Q 252 96, 200 92 Q 148 96, 144 130 Z" fill={hair} /> : null}
      {style === 3 ? <circle cx={200} cy={74} r={20} fill={hair} /> : null}
      <FaceSvg cx={196} cy={136} s={0.82} face={face} look={-1} />
    </g>
  );
};

/* ── NAPOLEON ── chibi 400x700, ground y=700, faces right. crop 0..1 swings the riding crop;
   hand-in-waistcoat when idle; walk 0..1 legs ── */
export const Napoleon: React.FC<{face: Face; t: number; crop?: number; walk?: number}> = ({face, t, crop = 0, walk = 0}) => {
  const leg = Math.sin(walk * Math.PI * 2) * 22;
  return (
    <g>
      <g transform={`rotate(${leg} 176 520)`}>
        <rect x={152} y={500} width={48} height={110} rx={20} fill={HPAL.breeches} />
        <rect x={148} y={590} width={56} height={104} rx={14} fill={HPAL.boot} />
        <ellipse cx={186} cy={692} rx={40} ry={13} fill={HPAL.boot} />
      </g>
      <g transform={`rotate(${-leg} 224 520)`}>
        <rect x={200} y={500} width={48} height={110} rx={20} fill={HPAL.breeches} />
        <rect x={196} y={590} width={56} height={104} rx={14} fill={HPAL.boot} />
        <ellipse cx={234} cy={692} rx={40} ry={13} fill={HPAL.boot} />
      </g>
      {/* back arm + riding crop */}
      <g transform={`rotate(${-crop * 120 + Math.sin(t * 30) * crop * 20} 130 330)`}>
        <rect x={106} y={320} width={48} height={160} rx={22} fill={HPAL.coatDark} />
        <circle cx={130} cy={486} r={22} fill="#f4f1ea" />
        <line x1={130} y1={486} x2={150 + crop * 40} y2={640} stroke="#3a2a20" strokeWidth={7} strokeLinecap="round" />
      </g>
      {/* coat with tails, white waistcoat, red collar, gold epaulettes */}
      <path d="M 116 320 Q 200 292, 284 320 L 300 560 L 250 560 L 236 470 L 164 470 L 150 560 L 100 560 Z" fill={HPAL.coat} />
      <path d="M 170 316 L 230 316 L 236 480 L 164 480 Z" fill={HPAL.lapel} />
      <path d="M 156 314 L 200 330 L 244 314 L 238 336 L 200 350 L 162 336 Z" fill={HPAL.collar} />
      <rect x={104} y={316} width={52} height={20} rx={8} fill={HPAL.gold} />
      <rect x={244} y={316} width={52} height={20} rx={8} fill={HPAL.gold} />
      {[380, 410, 440].map((y) => <circle key={y} cx={200} cy={y} r={5} fill={HPAL.gold} />)}
      {/* front arm: hand tucked in the waistcoat (the pose) */}
      {crop > 0.5 ? (
        <g transform="rotate(-30 270 330)"><rect x={246} y={320} width={48} height={150} rx={22} fill={HPAL.coat} /></g>
      ) : (
        <path d="M 270 330 Q 290 400, 214 404" fill="none" stroke={HPAL.coat} strokeWidth={46} strokeLinecap="round" />
      )}
      <rect x={180} y={262} width={40} height={40} fill="#e3b08a" />
      <circle cx={200} cy={200} r={92} fill={HPAL.napSkin} />
      <path d="M 112 200 Q 110 150, 140 128 L 200 120 L 196 150 L 176 138 L 172 168 L 150 150 Q 132 170, 124 210 Z" fill={HPAL.napHair} />
      <FaceSvg cx={204} cy={214} s={1.4} face={face} look={1} blink={Math.floor(t * 10) % 41 === 40} />
      {/* the bicorne, worn sideways, with a tricolour cockade */}
      <path d="M 60 150 Q 200 30, 340 150 Q 300 128, 200 126 Q 100 128, 60 150 Z" fill={HPAL.hat} />
      <path d="M 70 150 Q 200 116, 330 150 L 330 160 Q 200 130, 70 160 Z" fill={HPAL.gold} />
      <circle cx={262} cy={110} r={18} fill="#2457c9" /><circle cx={262} cy={110} r={12} fill="#ffffff" /><circle cx={262} cy={110} r={6} fill="#d0282e" />
    </g>
  );
};

/* ── RABBIT ── 400x400, faces LEFT. hop 0..1 = one hop arc (squash at the ends) */
export const Rabbit: React.FC<{i: number; hop: number; face?: Face}> = ({i, hop, face = 'happy'}) => {
  const [c, d] = BUNNIES[i % BUNNIES.length];
  const up = Math.sin(hop * Math.PI) * 60;
  const sq = 1 - Math.abs(Math.cos(hop * Math.PI)) * 0.12;
  return (
    <g transform={`translate(0 ${-up}) translate(200 380) scale(${2 - sq}, ${sq}) translate(-200 -380)`}>
      <ellipse cx={226} cy={300} rx={104} ry={78} fill={c} />
      <circle cx={322} cy={286} r={28} fill="#ffffff" />
      <ellipse cx={260} cy={366} rx={44} ry={16} fill={d} />
      <ellipse cx={170} cy={370} rx={30} ry={12} fill={d} />
      <ellipse cx={136} cy={214} rx={62} ry={56} fill={c} />
      <ellipse cx={130} cy={110} rx={20} ry={66} fill={c} transform="rotate(-14 130 160)" />
      <ellipse cx={130} cy={112} rx={9} ry={48} fill="#ffb3c1" transform="rotate(-14 130 160)" />
      <ellipse cx={170} cy={116} rx={20} ry={64} fill={d} transform="rotate(12 170 166)" />
      <FaceSvg cx={126} cy={214} s={0.6} face={face} look={-1} />
      <ellipse cx={92} cy={226} rx={9} ry={7} fill="#ff8fa8" />
    </g>
  );
};

/* ── CARRIAGE ── 400x400, faces right; shake 0..1 rattles it (full of rabbits) */
export const Carriage: React.FC<{t: number; shake?: number; bunnies?: number}> = ({t, shake = 0, bunnies = 0}) => {
  const jig = Math.sin(t * 40) * 6 * shake;
  return (
    <g>
      <g transform={`translate(${jig} ${-Math.abs(jig)})`}>
        <path d="M 40 160 Q 40 110, 90 104 L 310 104 Q 360 110, 360 160 L 350 300 L 50 300 Z" fill={HPAL.coach} />
        <path d="M 50 280 L 350 280 L 350 300 L 50 300 Z" fill={HPAL.coachDark} />
        <rect x={80} y={130} width={100} height={90} rx={12} fill="#bfe0ff" />
        <rect x={220} y={130} width={100} height={90} rx={12} fill="#bfe0ff" />
        {bunnies > 0 ? [0, 1, 2, 3].slice(0, Math.ceil(bunnies * 4)).map((k) => (
          <svg key={k} x={84 + (k % 2) * 140} y={128 + Math.abs(Math.sin(t * 8 + k)) * -10} width={92} height={92} viewBox="0 0 400 400"><Rabbit i={k} hop={0} face="happy" /></svg>
        )) : null}
        <path d="M 40 104 L 360 104" stroke={HPAL.gold} strokeWidth={10} />
        <path d="M 196 112 L 204 112 L 204 296 L 196 296 Z" fill={HPAL.gold} />
      </g>
      {[100, 300].map((x) => (
        <g key={x}>
          <circle cx={x} cy={318} r={62} fill="none" stroke={HPAL.woodDark} strokeWidth={14} />
          {[0, 1, 2, 3].map((k) => <line key={k} x1={x} y1={318} x2={x + Math.cos(k * 0.785 + t) * 58} y2={318 + Math.sin(k * 0.785 + t) * 58} stroke={HPAL.wood} strokeWidth={7} />)}
          <circle cx={x} cy={318} r={12} fill={HPAL.gold} />
        </g>
      ))}
    </g>
  );
};

/* ── CAGE ── 400x400 wooden hutch; open 0..1 swings the door down */
export const Cage: React.FC<{open: number}> = ({open}) => (
  <g>
    <rect x={40} y={170} width={320} height={210} rx={10} fill={HPAL.woodDark} />
    <rect x={56} y={186} width={288} height={178} fill="#3a2a1a" />
    <g transform={`translate(56 0) scale(${1 - open * 0.85} 1) translate(-56 0)`}>
      <rect x={56} y={186} width={288} height={178} fill="none" stroke={HPAL.wood} strokeWidth={10} />
      {[0, 1, 2, 3, 4, 5].map((k) => <rect key={k} x={84 + k * 46} y={186} width={10} height={178} fill={HPAL.wood} />)}
    </g>
    <rect x={30} y={150} width={340} height={28} rx={8} fill={HPAL.wood} />
  </g>
);
