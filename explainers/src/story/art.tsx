import React from 'react';
import {Face, FaceSvg} from '../fight/art';

// Story style guide (svg-craft): same family as Fight/Horde/Lift — saturated
// flat, two-tone shading, no outlines, faces carry the emotion. Characters live
// in a 400x700 box, ground y=700, facing RIGHT (flip for left). Arms are two-
// segment polylines (shoulder -> elbow -> paw) so poses read in silhouette.
export const SPAL = {
  fur: '#b47a43', furDark: '#8d5b2e', muzzle: '#e6c592', ear: '#d99a62', nose: '#2a1d16', pad: '#6b4424',
  khaki: '#8c7f4e', khakiDark: '#6c6139', khakiLight: '#a89a64', beret: '#5b5232', belt: '#4a3f24', boot: '#2a2420',
  red: '#d6293a', white: '#f4f1ea', brass: '#d9a93a', brassDark: '#a87a1e', wood: '#a8743f', woodDark: '#7a4f26',
  blazer: '#2b3550', blazerDark: '#1e263b', grey: '#c9c6c0', glass: '#bfe6d8', milk: '#fbf7ee', beer: '#7a3e12',
};
export const SKINS = ['#f1c9a5', '#e2b48c', '#d9a47c', '#f3d6bd'];
export const HAIRS = ['#2a1d16', '#5a3a24', '#c98f3a', '#1b1b22'];

type P = [number, number];
type Arm = {e: P; p: P};
const lerpP = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const lerpArm = (a: Arm, b: Arm, k: number): Arm => ({e: lerpP(a.e, b.e, k), p: lerpP(a.p, b.p, k)});

export type BearPose = {salute?: number; wave?: number; bottle?: number; carry?: number; hug?: number};

/* ── WOJTEK ── upright chibi Syrian brown bear. Poses blend from idle by weight 0..1 */
export const Bear: React.FC<{face: Face; t: number; pose?: BearPose; cap?: boolean; walk?: number; label?: string; look?: number}> =
  ({face, t, pose = {}, cap = false, walk = 0, label = 'VODKA', look = 1}) => {
  const {salute = 0, wave = 0, bottle = 0, carry = 0, hug = 0} = pose;
  const SF: P = [282, 352];
  const SB: P = [118, 352];
  const breathe = Math.sin(t * 2.2) * 3;
  // front arm
  let F: Arm = {e: [304, 444], p: [300, 522]};
  F = lerpArm(F, {e: [352, 268], p: [282, 150]}, salute);
  F = lerpArm(F, {e: [356, 262], p: [352 + Math.sin(t * 9) * 26, 140]}, wave);
  F = lerpArm(F, {e: [344, 330], p: [306, 238]}, bottle);
  F = lerpArm(F, {e: [348, 238], p: [306, 96]}, carry);
  F = lerpArm(F, {e: [356, 400], p: [400, 380]}, hug);
  let B: Arm = {e: [98, 444], p: [102, 522]};
  B = lerpArm(B, {e: [66, 246], p: [104, 96]}, carry);
  B = lerpArm(B, {e: [60, 380], p: [40, 330]}, hug);
  const leg = Math.sin(walk * Math.PI * 2) * 18;
  const arm = (a: Arm, s: P, col: string, pad: string) => (
    <g>
      <path d={`M ${s[0]} ${s[1]} L ${a.e[0]} ${a.e[1]} L ${a.p[0]} ${a.p[1]}`} fill="none" stroke={col} strokeWidth={62} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={a.p[0]} cy={a.p[1]} r={34} fill={col} />
      <ellipse cx={a.p[0]} cy={a.p[1] + 4} rx={16} ry={12} fill={pad} opacity={0.55} />
    </g>
  );
  return (
    <g transform={`translate(0 ${breathe})`}>
      {/* back arm */}
      {arm(B, SB, SPAL.furDark, SPAL.pad)}
      {/* legs */}
      <g transform={`rotate(${leg} 172 560)`}>
        <rect x={138} y={540} width={70} height={150} rx={32} fill={SPAL.furDark} />
        <ellipse cx={180} cy={688} rx={46} ry={16} fill={SPAL.furDark} />
      </g>
      <g transform={`rotate(${-leg} 232 560)`}>
        <rect x={198} y={540} width={70} height={150} rx={32} fill={SPAL.fur} />
        <ellipse cx={240} cy={688} rx={46} ry={16} fill={SPAL.fur} />
      </g>
      {/* body + belly */}
      <ellipse cx={200} cy={460} rx={140} ry={156} fill={SPAL.fur} />
      <ellipse cx={218} cy={480} rx={84} ry={100} fill={SPAL.muzzle} opacity={0.55} />
      {/* head */}
      <circle cx={122} cy={124} r={40} fill={SPAL.fur} /><circle cx={122} cy={124} r={20} fill={SPAL.ear} />
      <circle cx={290} cy={120} r={40} fill={SPAL.fur} /><circle cx={290} cy={120} r={20} fill={SPAL.ear} />
      <circle cx={206} cy={206} r={110} fill={SPAL.fur} />
      <ellipse cx={226} cy={240} rx={58} ry={42} fill={SPAL.muzzle} />
      <FaceSvg cx={214} cy={200} s={1.05} face={face} look={look} blink={Math.floor(t * 10) % 43 === 42} brow={SPAL.furDark} browW={8} />
      <ellipse cx={226} cy={218} rx={17} ry={11} fill={SPAL.nose} />
      {cap ? (
        <g transform="rotate(-10 206 108)">
          <ellipse cx={206} cy={108} rx={92} ry={30} fill={SPAL.beret} />
          <path d="M 120 112 Q 206 60, 292 104 Q 206 92, 120 112 Z" fill={SPAL.khakiDark} />
          <circle cx={258} cy={96} r={11} fill={SPAL.brass} />
        </g>
      ) : null}
      {/* front arm (over the body) */}
      {arm(F, SF, SPAL.fur, SPAL.pad)}
      {/* the bottle (condensed milk in a vodka bottle / a beer): neck at the muzzle, held in the front paw */}
      {bottle > 0.5 ? (
        <g transform={`translate(${F.p[0]} ${F.p[1]}) rotate(-100)`}>
          <g transform="translate(0 -40)">
            <rect x={-24} y={-10} width={48} height={116} rx={12} fill={label === 'BEER' ? SPAL.beer : SPAL.glass} />
            {label !== 'BEER' ? <rect x={-18} y={26} width={36} height={74} rx={8} fill={SPAL.milk} /> : null}
            <rect x={-12} y={-46} width={24} height={42} rx={6} fill={label === 'BEER' ? SPAL.beer : SPAL.glass} />
            <rect x={-26} y={36} width={52} height={38} fill={label === 'BEER' ? '#f2d16b' : SPAL.white} />
            <text x={0} y={62} textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight={900} fontSize={label === 'BEER' ? 16 : 14} fill={SPAL.red} transform="rotate(90 0 55)">{label}</text>
          </g>
        </g>
      ) : null}
    </g>
  );
};

/* ── SOLDIER ── 2nd Polish Corps battledress + beret. old = a veteran in a blazer.
   Poses: salute, wave, cheer (both arms up), hold (forearm out, e.g. a paybook) ── */
export const Soldier: React.FC<{i: number; face: Face; t: number; old?: boolean; flip?: boolean; salute?: number; wave?: number; cheer?: number; hold?: number; walk?: number}> =
  ({i, face, t, old = false, flip = false, salute = 0, wave = 0, cheer = 0, hold = 0, walk = 0}) => {
  const skin = SKINS[i % SKINS.length];
  const hair = old ? SPAL.grey : HAIRS[(i * 3) % HAIRS.length];
  const coat = old ? SPAL.blazer : SPAL.khaki;
  const coatD = old ? SPAL.blazerDark : SPAL.khakiDark;
  const leg = Math.sin(walk * Math.PI * 2) * 20;
  const SF: P = [262, 330];
  const SB: P = [138, 330];
  let F: Arm = {e: [272, 420], p: [270, 500]};
  F = lerpArm(F, {e: [330, 250], p: [262, 150]}, salute);
  F = lerpArm(F, {e: [320, 240], p: [330 + Math.sin(t * 9 + i) * 24, 130]}, wave);
  F = lerpArm(F, {e: [300, 230], p: [320, 120 + Math.sin(t * 8 + i) * 10]}, cheer);
  F = lerpArm(F, {e: [282, 420], p: [350, 400]}, hold);
  let B: Arm = {e: [128, 420], p: [130, 500]};
  B = lerpArm(B, {e: [100, 230], p: [80, 120 + Math.cos(t * 8 + i) * 10]}, cheer);
  const arm = (a: Arm, s: P, col: string) => (
    <g>
      <path d={`M ${s[0]} ${s[1]} L ${a.e[0]} ${a.e[1]} L ${a.p[0]} ${a.p[1]}`} fill="none" stroke={col} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={a.p[0]} cy={a.p[1]} r={22} fill={skin} />
    </g>
  );
  return (
    <g transform={flip ? 'translate(400 0) scale(-1 1)' : undefined}>
      {arm(B, SB, coatD)}
      <g transform={`rotate(${leg} 176 520)`}>
        <rect x={152} y={500} width={48} height={150} rx={20} fill={old ? '#3a3f4f' : SPAL.khakiDark} />
        <ellipse cx={184} cy={688} rx={38} ry={14} fill={SPAL.boot} />
        <rect x={150} y={640} width={52} height={48} rx={10} fill={SPAL.boot} />
      </g>
      <g transform={`rotate(${-leg} 224 520)`}>
        <rect x={200} y={500} width={48} height={150} rx={20} fill={old ? '#4a4f60' : SPAL.khaki} />
        <ellipse cx={232} cy={688} rx={38} ry={14} fill={SPAL.boot} />
        <rect x={198} y={640} width={52} height={48} rx={10} fill={SPAL.boot} />
      </g>
      <path d="M 130 318 Q 200 296, 270 318 L 280 520 Q 200 534, 120 520 Z" fill={coat} />
      {old ? (
        <>
          <path d="M 176 312 L 200 380 L 224 312 Z" fill={SPAL.white} />
          {[0, 1, 2].map((k) => <g key={k}><rect x={226 + k * 16} y={360} width={10} height={18} fill={['#d6293a', '#3fa7ff', '#ffd23f'][k]} /><circle cx={231 + k * 16} cy={388} r={7} fill={SPAL.brass} /></g>)}
        </>
      ) : (
        <>
          <rect x={124} y={440} width={152} height={18} fill={SPAL.belt} />
          <rect x={150} y={350} width={36} height={30} rx={4} fill={coatD} />
          <rect x={214} y={350} width={36} height={30} rx={4} fill={coatD} />
        </>
      )}
      <rect x={182} y={270} width={36} height={40} fill={skin} />
      <circle cx={200} cy={200} r={88} fill={skin} />
      {old ? (
        <>
          <path d="M 116 206 Q 112 150, 140 132 Q 130 170, 134 214 Z M 284 206 Q 288 150, 260 132 Q 270 170, 266 214 Z" fill={hair} />
          <path d="M 110 132 Q 200 70, 290 132 Q 200 112, 110 132 Z" fill="#5a5f6e" />
          <path d="M 120 236 Q 200 262, 280 236" fill="none" stroke={hair} strokeWidth={10} strokeLinecap="round" opacity={0.9} />
        </>
      ) : (
        <>
          <path d="M 116 186 Q 116 120, 200 112 Q 284 120, 284 186 Q 262 150, 200 146 Q 138 150, 116 186 Z" fill={hair} />
          <g transform="rotate(-8 200 120)">
            <ellipse cx={204} cy={120} rx={96} ry={32} fill={SPAL.beret} />
            <circle cx={150} cy={118} r={12} fill={SPAL.brass} />
          </g>
        </>
      )}
      <FaceSvg cx={206} cy={210} s={1.15} face={face} look={1} blink={Math.floor(t * 10 + i * 7) % 39 === 38} />
      {arm(F, SF, coat)}
      {hold > 0.5 ? (
        <g transform={`translate(${F.p[0] + 10} ${F.p[1] - 60})`}>
          <rect x={0} y={0} width={86} height={110} rx={6} fill="#7a2a2a" />
          <rect x={8} y={8} width={70} height={94} rx={4} fill="none" stroke={SPAL.brass} strokeWidth={3} />
          <text x={43} y={58} textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight={900} fontSize={13} fill={SPAL.brass}>PAYBOOK</text>
        </g>
      ) : null}
    </g>
  );
};

/* ── props (400x400 boxes unless noted) ── */
export const Crate: React.FC<{label?: string}> = ({label = '25-PDR'}) => (
  <g>
    <rect x={0} y={0} width={240} height={150} rx={8} fill={SPAL.wood} />
    <rect x={0} y={0} width={240} height={22} fill={SPAL.woodDark} />
    <rect x={0} y={128} width={240} height={22} fill={SPAL.woodDark} />
    <path d="M 10 22 L 230 128" stroke={SPAL.woodDark} strokeWidth={14} />
    <rect x={56} y={56} width={128} height={40} rx={4} fill="#e8d6a8" />
    <text x={120} y={86} textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight={900} fontSize={26} fill="#3a2a1a">{label}</text>
  </g>
);

export const Shell: React.FC = () => (
  <g>
    <rect x={0} y={20} width={150} height={44} rx={6} fill={SPAL.brass} />
    <rect x={0} y={20} width={150} height={12} rx={6} fill="#f0c95a" />
    <path d="M 150 20 Q 214 26, 226 42 Q 214 58, 150 64 Z" fill="#6f7a5a" />
    <rect x={132} y={18} width={14} height={48} fill={SPAL.brassDark} />
  </g>
);

export const Sign: React.FC<{lines: string[]; color?: string; ink?: string; w?: number}> = ({lines, color = SPAL.white, ink = SPAL.red, w = 300}) => (
  <g>
    <rect x={w / 2 - 10} y={60 + lines.length * 56} width={20} height={200} fill={SPAL.woodDark} />
    <rect x={0} y={0} width={w} height={60 + lines.length * 56} rx={12} fill={color} />
    <rect x={8} y={8} width={w - 16} height={44 + lines.length * 56} rx={8} fill="none" stroke={ink} strokeWidth={6} />
    {lines.map((l, k) => <text key={k} x={w / 2} y={74 + k * 56} textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight={900} fontSize={46} fill={ink}>{l}</text>)}
  </g>
);

/* the troopship, 900 wide, waterline y=0 */
export const Ship: React.FC<{t: number}> = ({t}) => (
  <g>
    <path d="M 0 -170 L 900 -170 L 840 0 L 60 0 Z" fill="#6d7686" />
    <path d="M 0 -170 L 900 -170 L 892 -140 L 8 -140 Z" fill="#535b69" />
    <rect x={180} y={-300} width={480} height={130} rx={10} fill="#e8e4da" />
    {Array.from({length: 9}).map((_, k) => <circle key={k} cx={220 + k * 50} cy={-236} r={13} fill="#3a4250" />)}
    <rect x={430} y={-430} width={90} height={130} fill="#c8323a" />
    <rect x={430} y={-430} width={90} height={26} fill="#1b1b22" />
    {[0, 1, 2].map((k) => <circle key={k} cx={476 + Math.sin(t + k) * 14 + k * 26} cy={-470 - k * 50 - (t * 30) % 40} r={30 + k * 10} fill="#d8dbe2" opacity={0.7 - k * 0.15} />)}
    {Array.from({length: 12}).map((_, k) => <circle key={k} cx={60 + k * 70} cy={-100} r={11} fill="#3a4250" />)}
  </g>
);

/* the 22nd Company emblem: a bear carrying an artillery shell, in a roundel. 400x400 */
export const Emblem: React.FC<{t: number}> = ({t}) => (
  <g>
    <circle cx={200} cy={200} r={190} fill={SPAL.white} />
    <circle cx={200} cy={200} r={174} fill="#c8323a" />
    <circle cx={200} cy={200} r={150} fill={SPAL.white} />
    <svg x={70} y={46} width={260} height={300} viewBox="0 0 400 700" style={{overflow: 'visible'}}>
      <g style={{filter: 'brightness(0.25) sepia(1) saturate(3) hue-rotate(-20deg)'}}>
        <Bear face="happy" t={t} pose={{carry: 1}} />
      </g>
      <g transform="translate(78 30) scale(1.08)"><Shell /></g>
    </svg>
  </g>
);

export const Penguin: React.FC<{t: number; beret?: boolean}> = ({t, beret = true}) => (
  <g transform={`rotate(${Math.sin(t * 3) * 3} 200 380)`}>
    <ellipse cx={200} cy={270} rx={90} ry={120} fill="#1b1b22" />
    <ellipse cx={214} cy={290} rx={60} ry={92} fill={SPAL.white} />
    <circle cx={200} cy={150} r={66} fill="#1b1b22" />
    <ellipse cx={220} cy={156} rx={30} ry={34} fill={SPAL.white} />
    <circle cx={226} cy={150} r={9} fill="#1b1b22" />
    <path d="M 256 160 L 300 172 L 256 182 Z" fill="#f2a31a" />
    <path d="M 120 250 Q 96 310, 122 340" fill="none" stroke="#1b1b22" strokeWidth={26} strokeLinecap="round" />
    <ellipse cx={170} cy={386} rx={30} ry={10} fill="#f2a31a" /><ellipse cx={236} cy={386} rx={30} ry={10} fill="#f2a31a" />
    {beret ? <g transform="rotate(-12 200 92)"><ellipse cx={200} cy={92} rx={62} ry={20} fill="#2b3550" /><circle cx={232} cy={86} r={8} fill={SPAL.brass} /></g> : null}
  </g>
);
