import React from 'react';
import {Face, FaceSvg, FPAL} from '../fight/art';

// What-If style guide (svg-craft): same family as Story/Fight — saturated flat,
// two-tone shading, no outlines, faces carry the emotion. Boxes, all facing
// RIGHT with the ground at the box bottom:
//   upright (Human, Dinosauroid) 400x700 · Shrew/Chicken 400x400 ·
//   TRex 800x600 · Troodon 600x500 · Mammoth 600x500 · Earth 400x400 (centred)
export const WPAL = {
  rex: '#4f9a4a', rexDark: '#3a7a38', rexBelly: '#c9d98a', rexStripe: '#2f6630',
  troo: '#d08a3a', trooDark: '#a86a26', trooFeather: '#f2c26a', trooStripe: '#7a4a1e',
  shrew: '#9a7a62', shrewDark: '#7a5c46', shrewBelly: '#e0c8ac', pink: '#f2a0a8',
  roid: '#6fbf73', roidDark: '#4f9a56', roidBelly: '#cfe8b0',
  ocean: '#2f8fe0', oceanDark: '#2370c0', land: '#5fbf5a', landDark: '#3f9a40', cloud: '#f4f8ff',
  rock: '#7a6a5e', rockDark: '#564a42', fire: '#ff8a3a', fireHot: '#ffd23f',
  mam: '#7a4a2a', mamDark: '#5a341c', tusk: '#f4ecd8',
  shirt: '#3fa7ff', shirtDark: '#2a84d0', pants: '#2b3550', skin: '#f1c9a5', hair: '#2a1d16', coat: '#f4f6f8', coatDark: '#d4dae2',
  white: '#f4f1ea', ink: '#1b1b22',
};

type P = [number, number];
type Arm = {e: P; p: P};
const lerpP = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const lerpArm = (a: Arm, b: Arm, k: number): Arm => ({e: lerpP(a.e, b.e, k), p: lerpP(a.p, b.p, k)});

/* a single side-view eye (for the dinosaurs, whose heads are in profile) */
const SideEye: React.FC<{x: number; y: number; r: number; face: Face; look?: number}> = ({x, y, r, face, look = 1}) => {
  const lid = face === 'smug' ? 0.55 : face === 'hurt' ? 0.3 : 1;
  const rr = face === 'shock' ? r * 1.25 : r;
  const brow = face === 'angry' ? 18 : face === 'sad' ? -16 : face === 'smug' ? 8 : face === 'shock' ? -10 : 0;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={rr} ry={rr * lid} fill={FPAL.eye} />
      <circle cx={x + look * rr * 0.28} cy={y} r={Math.min(rr * 0.5, rr * lid)} fill={FPAL.pupil} />
      <circle cx={x + look * rr * 0.28 + rr * 0.18} cy={y - rr * 0.2} r={rr * 0.14} fill="#fff" opacity={lid > 0.5 ? 1 : 0} />
      <line x1={x - rr * 1.1} y1={y - rr * 1.2} x2={x + rr * 1.1} y2={y - rr * 1.2} transform={`rotate(${brow} ${x} ${y - rr * 1.2})`}
        stroke={FPAL.pupil} strokeWidth={r * 0.36} strokeLinecap="round" />
    </g>
  );
};

/* ── EARTH ── a planet with a face (box 400x400, centred on 200,200) */
export const Earth: React.FC<{face: Face; t: number}> = ({face, t}) => {
  const spin = (t * 14) % 400;
  return (
    <g>
      <defs><clipPath id="earthClip"><circle cx={200} cy={200} r={190} /></clipPath></defs>
      <circle cx={200} cy={200} r={204} fill="#9fd8ff" opacity={0.25} />
      <circle cx={200} cy={200} r={190} fill={WPAL.ocean} />
      <g clipPath="url(#earthClip)">
        {[-400, 0].map((o) => (
          <g key={o} transform={`translate(${o + spin} 0)`}>
            <path d="M 40 90 Q 90 40 150 70 Q 190 110 150 150 Q 120 200 70 180 Q 20 150 40 90 Z" fill={WPAL.land} />
            <path d="M 230 60 Q 300 40 340 90 Q 360 150 310 160 Q 270 150 250 120 Q 220 90 230 60 Z" fill={WPAL.land} />
            <path d="M 180 230 Q 240 220 260 270 Q 270 330 220 360 Q 190 330 185 290 Q 160 260 180 230 Z" fill={WPAL.landDark} />
            <path d="M 300 250 Q 360 240 390 290 Q 370 330 320 320 Z" fill={WPAL.land} />
          </g>
        ))}
        <path d="M 10 200 A 190 190 0 0 0 390 200 A 190 150 0 0 1 10 200 Z" fill={WPAL.oceanDark} opacity={0.35} />
        {[0, 1, 2].map((k) => (
          <ellipse key={k} cx={((k * 150 + t * 22) % 520) - 60} cy={[64, 340, 372][k]} rx={70} ry={14} fill={WPAL.cloud} opacity={0.75} />
        ))}
      </g>
      <FaceSvg cx={200} cy={206} s={1.6} face={face} look={0} />
    </g>
  );
};

/* ── ASTEROID ── centred on 0,0, radius ~70; the flame trail points UP-RIGHT (where it came from) */
export const Asteroid: React.FC<{t: number; trail?: number}> = ({t, trail = 1}) => (
  <g>
    {trail > 0 ? (
      <g opacity={trail}>
        <path d="M -40 -50 L 380 -420 L 420 -380 L 50 40 Z" fill={WPAL.fire} opacity={0.55} />
        <path d="M -20 -40 L 300 -330 L 320 -310 L 30 20 Z" fill={WPAL.fireHot} opacity={0.75} />
        <circle cx={0} cy={0} r={96} fill={WPAL.fire} opacity={0.35} />
      </g>
    ) : null}
    <g transform={`rotate(${t * 60})`}>
      <path d="M -66 -10 L -44 -52 L 6 -70 L 52 -44 L 70 4 L 46 54 L -6 70 L -54 46 Z" fill={WPAL.rock} />
      <path d="M -66 -10 L -54 46 L -6 70 L 46 54 L 70 4 Q 20 40 -30 30 Z" fill={WPAL.rockDark} />
      <circle cx={-18} cy={-22} r={14} fill={WPAL.rockDark} /><circle cx={26} cy={10} r={9} fill={WPAL.rockDark} /><circle cx={-6} cy={34} r={7} fill={WPAL.rockDark} />
    </g>
  </g>
);

/* ── SHREW ── a tiny early mammal (box 400x400, ground 400). fur/belly let the
   "real life" scene reuse it as bigger post-extinction mammals */
export const Shrew: React.FC<{face: Face; t: number; run?: number; fur?: string; furDark?: string; belly?: string; snout?: number; look?: number}> =
  ({face, t, run = 0, fur = WPAL.shrew, furDark = WPAL.shrewDark, belly = WPAL.shrewBelly, snout = 1, look = 1}) => {
  const b = Math.sin(run * Math.PI * 2);
  const breathe = Math.sin(t * 6) * 2;
  return (
    <g transform={`translate(0 ${breathe - Math.abs(b) * 10})`}>
      <path d="M 110 330 Q 40 340 12 296" fill="none" stroke={WPAL.pink} strokeWidth={11} strokeLinecap="round" />
      <ellipse cx={150 + b * 14} cy={388} rx={26} ry={12} fill={furDark} />
      <ellipse cx={250 - b * 14} cy={388} rx={26} ry={12} fill={furDark} />
      <ellipse cx={200} cy={318} rx={112} ry={72} fill={fur} />
      <ellipse cx={214} cy={348} rx={80} ry={38} fill={belly} />
      <ellipse cx={180 - b * 14} cy={392} rx={26} ry={12} fill={fur} />
      <ellipse cx={270 + b * 14} cy={392} rx={26} ry={12} fill={fur} />
      <circle cx={256} cy={232} r={32} fill={furDark} /><circle cx={256} cy={232} r={18} fill={WPAL.pink} />
      <ellipse cx={292} cy={290} rx={72} ry={62} fill={fur} />
      <path d={`M 330 262 Q ${330 + 56 * snout} 290 ${334 + 50 * snout} 312 Q 340 330 318 330 Z`} fill={fur} />
      <circle cx={334 + 50 * snout} cy={308} r={11} fill={WPAL.ink} />
      {[-8, 4, 16].map((dy) => <line key={dy} x1={330 + 40 * snout} y1={312} x2={380 + 46 * snout} y2={300 + dy * 1.4} stroke={WPAL.ink} strokeWidth={3} opacity={0.5} />)}
      <FaceSvg cx={300} cy={284} s={0.62} face={face} look={look} />
    </g>
  );
};

/* ── MAMMOTH ── (box 600x500, ground 500) */
export const Mammoth: React.FC<{face: Face; t: number; walk?: number}> = ({face, t, walk = 0}) => {
  const l = Math.sin(walk * Math.PI * 2) * 10;
  const sway = Math.sin(t * 2) * 6;
  return (
    <g>
      {[[150, l], [370, -l]].map(([x, r], i) => <rect key={i} x={x} y={330} width={70} height={168} rx={26} fill={WPAL.mamDark} transform={`rotate(${r} ${x + 35} 330)`} />)}
      <ellipse cx={270} cy={270} rx={210} ry={150} fill={WPAL.mam} />
      <ellipse cx={240} cy={160} rx={130} ry={70} fill={WPAL.mam} />
      {[0, 1, 2, 3, 4, 5].map((k) => <path key={k} d={`M ${110 + k * 50} 380 l 14 46 l 14 -46`} fill={WPAL.mamDark} />)}
      {[[200, -l], [420, l]].map(([x, r], i) => <rect key={i} x={x} y={340} width={74} height={160} rx={28} fill={WPAL.mam} transform={`rotate(${r} ${x + 37} 340)`} />)}
      <circle cx={470} cy={210} r={100} fill={WPAL.mam} />
      <path d={`M 520 260 Q 570 330 ${556 + sway} 440 Q ${548 + sway} 480 ${520 + sway} 470`} fill="none" stroke={WPAL.mam} strokeWidth={44} strokeLinecap="round" />
      <path d="M 500 290 Q 600 330 590 230" fill="none" stroke={WPAL.tusk} strokeWidth={20} strokeLinecap="round" />
      <ellipse cx={400} cy={200} rx={44} ry={70} fill={WPAL.mamDark} />
      <FaceSvg cx={486} cy={196} s={0.8} face={face} look={1} />
    </g>
  );
};

/* ── T. REX ── (box 800x600, ground 600). stomp lifts+drops the near leg, jaw opens the mouth */
export const TRex: React.FC<{face: Face; t: number; stomp?: number; jaw?: number; walk?: number; look?: number}> =
  ({face, t, stomp = 0, jaw = 0, walk = 0, look = 1}) => {
  const breathe = Math.sin(t * 2.4) * 4;
  const l = Math.sin(walk * Math.PI * 2) * 14;
  const tail = Math.sin(t * 1.8) * 6;
  const leg = (x: number, col: string, rot: number, lift: number) => (
    <g transform={`translate(0 ${-lift}) rotate(${rot} ${x} 400)`}>
      <ellipse cx={x} cy={430} rx={78} ry={100} fill={col} />
      <path d={`M ${x - 30} 470 L ${x + 6} 584 L ${x + 44} 584 L ${x + 34} 470 Z`} fill={col} />
      <ellipse cx={x + 40} cy={588} rx={66} ry={16} fill={col} />
      {[0, 1, 2].map((k) => <path key={k} d={`M ${x + 70 + k * 12} 580 l 22 6 l -22 6 Z`} fill={WPAL.white} />)}
    </g>
  );
  return (
    <g transform={`translate(0 ${breathe})`}>
      <path d={`M 300 270 Q 160 ${250 + tail} 0 ${236 + tail * 3} Q 150 ${300 + tail} 300 410 Z`} fill={WPAL.rexDark} />
      {leg(330, WPAL.rexDark, -l, 0)}
      <ellipse cx={400} cy={330} rx={196} ry={136} fill={WPAL.rex} />
      <ellipse cx={440} cy={392} rx={136} ry={70} fill={WPAL.rexBelly} />
      {[0, 1, 2, 3].map((k) => <path key={k} d={`M ${300 + k * 70} 206 q 20 40 0 80`} fill="none" stroke={WPAL.rexStripe} strokeWidth={16} strokeLinecap="round" opacity={0.6} />)}
      {/* neck + head */}
      <path d="M 500 230 Q 540 180 560 140 L 620 260 Q 560 300 520 320 Z" fill={WPAL.rex} />
      <path d={`M 560 232 L 576 ${276 + jaw * 60} L 740 ${262 + jaw * 74} L 754 238 Z`} fill="#7a1e2a" />
      <g transform={`rotate(${jaw * 24} 560 236)`}>
        <path d="M 556 230 L 752 232 Q 770 262 736 274 L 590 284 Q 560 272 556 230 Z" fill={WPAL.rexDark} />
        {[0, 1, 2, 3, 4].map((k) => <path key={k} d={`M ${600 + k * 30} 232 l 10 -14 l 10 14 Z`} fill={WPAL.white} />)}
      </g>
      <path d="M 520 170 Q 530 96 640 92 L 742 112 Q 790 136 776 204 L 762 236 L 548 240 Q 512 214 520 170 Z" fill={WPAL.rex} />
      {[0, 1, 2, 3, 4].map((k) => <path key={k} d={`M ${604 + k * 30} 236 l 10 16 l 10 -16 Z`} fill={WPAL.white} />)}
      <circle cx={752} cy={150} r={7} fill={WPAL.ink} />
      <SideEye x={652} y={150} r={22} face={face} look={look} />
      {/* the famous tiny arm */}
      <path d="M 560 340 L 610 372 L 640 352" fill="none" stroke={WPAL.rexDark} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 638 344 l 14 -6 M 640 356 l 16 2" stroke={WPAL.white} strokeWidth={6} strokeLinecap="round" />
      {leg(450, WPAL.rex, l - stomp * 22, stomp * 90)}
    </g>
  );
};

/* ── TROODON ── slender, feathered, big-eyed (box 600x500, ground 500) */
export const Troodon: React.FC<{face: Face; t: number; walk?: number; look?: number}> = ({face, t, walk = 0, look = 1}) => {
  const l = Math.sin(walk * Math.PI * 2) * 16;
  const bob = Math.sin(t * 3) * 4;
  const leg = (x: number, col: string, r: number) => (
    <g transform={`rotate(${r} ${x} 300)`}>
      <ellipse cx={x} cy={320} rx={40} ry={56} fill={col} />
      <path d={`M ${x - 10} 350 L ${x + 30} 430 L ${x} 494 L ${x + 16} 494 L ${x + 48} 430 L ${x + 18} 350 Z`} fill={col} />
      <ellipse cx={x + 22} cy={494} rx={40} ry={9} fill={col} />
    </g>
  );
  return (
    <g transform={`translate(0 ${bob})`}>
      <path d="M 220 250 Q 110 230 20 200 Q 100 270 220 300 Z" fill={WPAL.trooDark} />
      {[0, 1, 2].map((k) => <path key={k} d={`M ${30 + k * 26} ${200 + k * 8} q -26 -20 -30 6 q 16 12 30 -6`} fill={WPAL.trooFeather} />)}
      {leg(240, WPAL.trooDark, -l)}
      <ellipse cx={270} cy={270} rx={110} ry={74} fill={WPAL.troo} />
      <ellipse cx={290} cy={300} rx={76} ry={36} fill={WPAL.trooFeather} />
      {[0, 1, 2].map((k) => <path key={k} d={`M ${220 + k * 40} 206 q 12 26 0 52`} fill="none" stroke={WPAL.trooStripe} strokeWidth={10} strokeLinecap="round" opacity={0.6} />)}
      <path d="M 340 240 Q 380 170 400 120 L 440 140 Q 410 220 370 280 Z" fill={WPAL.troo} />
      <path d="M 380 120 Q 390 66 450 64 Q 520 66 556 104 Q 560 124 530 130 L 400 150 Q 376 144 380 120 Z" fill={WPAL.troo} />
      <path d="M 410 140 L 530 130 Q 520 146 420 156 Z" fill={WPAL.trooDark} />
      <SideEye x={452} y={98} r={22} face={face} look={look} />
      {/* feathered arm */}
      <path d="M 340 270 L 380 310 L 420 296" fill="none" stroke={WPAL.trooDark} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 340 266 Q 370 330 404 318 Q 372 300 352 262 Z" fill={WPAL.trooFeather} />
      {leg(300, WPAL.troo, l)}
    </g>
  );
};

/* ── upright people (box 400x700, ground 700). Human + Dinosauroid share the rig:
   phone = hold a phone up to read · wave · sit = seated (hips at y 520) */
type Rig = {phone?: number; wave?: number; sit?: number; walk?: number};
const rigArms = (t: number, {phone = 0, wave = 0}: Rig) => {
  let F: Arm = {e: [290, 430], p: [296, 520]};
  F = lerpArm(F, {e: [300, 450], p: [282, 362]}, phone);
  F = lerpArm(F, {e: [304, 250], p: [318 + Math.sin(t * 9) * 26, 150]}, wave);
  let B: Arm = {e: [112, 430], p: [104, 520]};
  B = lerpArm(B, {e: [176, 460], p: [246, 400]}, phone);
  return {F, B};
};
const rigLegs = (walk: number, sit: number, col: string, dark: string, foot: string) => {
  const sw = Math.sin(walk * Math.PI * 2) * 40;
  const leg = (hx: number, col2: string, d: number) => {
    const knee: P = lerpP([hx + d * 0.4, 610], [hx + 130, 534], sit);
    const ft: P = lerpP([hx + d, 690], [hx + 136, 690], sit);
    return (
      <g>
        <path d={`M ${hx} 520 L ${knee[0]} ${knee[1]} L ${ft[0]} ${ft[1]}`} fill="none" stroke={col2} strokeWidth={56} strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx={ft[0] + 14} cy={ft[1] + 2} rx={40} ry={14} fill={foot} />
      </g>
    );
  };
  return {back: leg(170, dark, -sw), front: leg(232, col, sw)};
};
const limb = (a: Arm, s: P, col: string, hand: React.ReactNode) => (
  <g>
    <path d={`M ${s[0]} ${s[1]} L ${a.e[0]} ${a.e[1]} L ${a.p[0]} ${a.p[1]}`} fill="none" stroke={col} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" />
    {hand}
  </g>
);
export const Phone: React.FC<{x: number; y: number; glow?: number}> = ({x, y, glow = 1}) => (
  <g transform={`translate(${x} ${y}) rotate(-12)`}>
    <rect x={-26} y={-46} width={52} height={92} rx={10} fill={WPAL.ink} />
    <rect x={-20} y={-38} width={40} height={76} rx={5} fill="#7fd0ff" opacity={0.6 + 0.4 * glow} />
  </g>
);

export const Human: React.FC<{face: Face; t: number; rig?: Rig; coat?: boolean; glasses?: boolean; shirt?: string; look?: number}> =
  ({face, t, rig = {}, coat = false, glasses = false, shirt = WPAL.shirt, look = 1}) => {
  const {F, B} = rigArms(t, rig);
  const L = rigLegs(rig.walk ?? 0, rig.sit ?? 0, WPAL.pants, '#1e263b', WPAL.ink);
  const top = coat ? WPAL.coat : shirt;
  const topDark = coat ? WPAL.coatDark : WPAL.shirtDark;
  const hand = (a: Arm) => <circle cx={a.p[0]} cy={a.p[1]} r={24} fill={WPAL.skin} />;
  const breathe = Math.sin(t * 2.2) * 3;
  return (
    <g transform={`translate(0 ${breathe})`}>
      {limb(B, [148, 330], topDark, hand(B))}
      {L.back}
      {L.front}
      <path d={`M 130 312 Q 200 290 270 312 L 268 ${coat ? 600 : 540} Q 200 ${coat ? 612 : 552} 132 ${coat ? 600 : 540} Z`} fill={top} />
      {coat ? <path d="M 200 320 L 200 600" stroke={WPAL.coatDark} strokeWidth={6} /> : null}
      <circle cx={200} cy={206} r={92} fill={WPAL.skin} />
      <path d="M 110 196 Q 108 110 200 108 Q 294 110 290 196 Q 262 150 200 148 Q 140 150 110 196 Z" fill={coat ? '#9aa0aa' : WPAL.hair} />
      <FaceSvg cx={208} cy={214} s={1.25} face={face} look={look} />
      {glasses ? (
        <g fill="none" stroke={WPAL.ink} strokeWidth={6}>
          <circle cx={170} cy={204} r={30} /><circle cx={246} cy={204} r={30} /><line x1={200} y1={204} x2={216} y2={204} />
        </g>
      ) : null}
      {limb(F, [254, 330], top, hand(F))}
      {(rig.phone ?? 0) > 0.5 ? <Phone x={F.p[0] + 4} y={F.p[1] - 40} /> : null}
    </g>
  );
};

/* ── THE DINOSAUROID ── Russell & Séguin's 1982 thought experiment, drawn in our
   style: big domed head, huge eyes, no nose, three-fingered hands, no tail */
export const Dinosauroid: React.FC<{face: Face; t: number; rig?: Rig; look?: number; statue?: boolean}> = ({face, t, rig = {}, look = 1, statue = false}) => {
  const {F, B} = rigArms(t, rig);
  const skin = statue ? '#b9c4b0' : WPAL.roid;
  const dark = statue ? '#98a390' : WPAL.roidDark;
  const belly = statue ? '#d4dccb' : WPAL.roidBelly;
  const L = rigLegs(rig.walk ?? 0, rig.sit ?? 0, skin, dark, dark);
  const hand = (a: Arm, col: string) => (
    <g>{[-14, 0, 14].map((d) => <circle key={d} cx={a.p[0] + d * 0.6} cy={a.p[1] + 14 + Math.abs(d) * -0.4} r={11} fill={col} />)}<circle cx={a.p[0]} cy={a.p[1]} r={20} fill={col} /></g>
  );
  const breathe = statue ? 0 : Math.sin(t * 2.2) * 3;
  return (
    <g transform={`translate(0 ${breathe})`}>
      {limb(B, [150, 340], dark, hand(B, dark))}
      {L.back}
      {L.front}
      <path d="M 134 318 Q 200 300 266 318 L 260 540 Q 200 556 140 540 Z" fill={skin} />
      <path d="M 166 360 Q 200 350 234 360 L 230 520 Q 200 530 170 520 Z" fill={belly} />
      <rect x={170} y={270} width={60} height={70} fill={skin} />
      <ellipse cx={206} cy={196} rx={118} ry={124} fill={skin} />
      <path d="M 120 150 Q 200 60 300 150" fill="none" stroke={dark} strokeWidth={10} opacity={0.4} strokeLinecap="round" />
      {[0, 1, 2].map((k) => <circle key={k} cx={150 + k * 34} cy={120 - k * 8} r={7} fill={dark} opacity={0.45} />)}
      {/* huge eyes (golden irises, slit pupils) */}
      {[166, 252].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={196} rx={36} ry={face === 'smug' ? 22 : 40} fill={statue ? '#e6ebe0' : '#ffd23f'} />
          {!statue ? <ellipse cx={x + look * 6} cy={196} rx={9} ry={face === 'smug' ? 18 : 30} fill={WPAL.ink} /> : null}
          {!statue ? <circle cx={x + look * 6 + 10} cy={182} r={6} fill="#fff" /> : null}
          <line x1={x - 34} y1={face === 'angry' ? 146 : 144} x2={x + 34} y2={face === 'smug' ? 158 : 146} stroke={dark} strokeWidth={10} strokeLinecap="round"
            transform={face === 'sad' ? `rotate(${x < 200 ? -14 : 14} ${x} 146)` : undefined} />
        </g>
      ))}
      <circle cx={196} cy={252} r={4} fill={dark} /><circle cx={222} cy={252} r={4} fill={dark} />
      {face === 'happy' || face === 'smug'
        ? <path d="M 172 278 Q 210 302 248 274" fill="none" stroke={dark} strokeWidth={8} strokeLinecap="round" />
        : face === 'shock' ? <ellipse cx={210} cy={286} rx={14} ry={18} fill={FPAL.mouth} />
          : <line x1={180} y1={284} x2={240} y2={284} stroke={dark} strokeWidth={8} strokeLinecap="round" />}
      {limb(F, [252, 340], skin, hand(F, skin))}
      {(rig.phone ?? 0) > 0.5 ? <Phone x={F.p[0] + 4} y={F.p[1] - 44} /> : null}
    </g>
  );
};

/* ── CHICKEN ── the hidden gag: birds ARE dinosaurs (box 400x400, ground 400) */
export const Chicken: React.FC<{t: number}> = ({t}) => {
  const peck = Math.max(0, Math.sin(t * 3)) ** 8;
  return (
    <g>
      <line x1={180} y1={330} x2={176} y2={396} stroke="#f0a020" strokeWidth={10} /><line x1={220} y1={330} x2={224} y2={396} stroke="#f0a020" strokeWidth={10} />
      <path d="M 90 250 Q 70 170 120 190 Q 110 230 150 240 Z" fill="#e8e2d6" />
      <ellipse cx={200} cy={270} rx={110} ry={80} fill={WPAL.white} />
      <g transform={`rotate(${peck * 40} 270 250)`}>
        <circle cx={290} cy={180} r={50} fill={WPAL.white} />
        <path d="M 270 134 q 10 -30 22 -4 q 12 -28 22 4 Z" fill="#e0303a" />
        <path d="M 334 176 l 34 10 l -34 12 Z" fill="#f0a020" />
        <path d="M 324 202 q 10 26 -6 30 q -12 -12 6 -30 Z" fill="#e0303a" />
        <circle cx={306} cy={170} r={8} fill={WPAL.ink} />
      </g>
    </g>
  );
};
