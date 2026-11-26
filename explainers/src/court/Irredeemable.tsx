import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Slam} from '../fight/Fight';
import {camAt, Shot} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {FPS, StoryEpisode, at, buildPlan, lineAt} from '../story/timeline';

// "GTA 6 IRREDEEMABLE, BUT REAL." Teach-then-test #4, the Dexter move: the
// game is the hook only (its 5-tier Criminal Profile, worst = Irredeemable,
// permanent per player guides). The lesson is real: US Sentencing Guidelines
// criminal history (USSG §4A1.1): 3 pts for a prison sentence over 13 months,
// 2 for 60+ days, 1 for anything else (those capped at 4); 13+ pts =
// Category VI. Test: three rap sheets (A long & scary = 8, B four prison terms
// = 12, C mixed = 13 -> VI). Twist: career offender (§4B1.1) puts A at VI
// automatically. Kicker: real courts forget (§4A1.2(e) 10/15-year windows).
// All art is original; no game assets or logos.
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';
const W = 1080;
const H = 1920;
const TEST_SECS = 10;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const pop = (s: number, t0: number, d = 0.35) => (s < t0 ? 0 : 1 + 0.25 * Math.sin(clamp01((s - t0) / d) * Math.PI) * (1 - clamp01((s - t0) / d)));
const inK = (s: number, t0: number, d = 0.35) => ease(clamp01((s - t0) / d));
const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const GOOD = '#5fd068';
const BAD = '#ff4f5e';
const YEL = '#ffd23f';
const OL = '#1b1b22';
const PAPER = '#f4f1ea';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const RANGES = ['0–1', '2–3', '4–6', '7–9', '10–12', '13+'];
const TIERS: Array<[string, string]> = [['PROFESSIONAL', '#5fd068'], ['HARDENED', '#ffd23f'], ['VIOLENT', '#ff9a1f'], ['PSYCHO', '#ff4f5e'], ['IRREDEEMABLE', '#d0103a']];

type Row = [string, string, number];
const SHEETS: Row[][] = [
  [['SHOPLIFTING', 'PROBATION', 1], ['DRUG FELONY', '90 DAYS JAIL', 2], ['DUI', 'PROBATION', 1], ['VANDALISM', 'PROBATION', 1], ['THEFT', 'PROBATION', 1],
    ['DRUG FELONY', '90 DAYS JAIL', 2], ['DUI', 'PROBATION', 1], ['SHOPLIFTING', 'PROBATION', 1], ['THEFT', 'PROBATION', 1]],
  [['THEFT', '2 YEARS PRISON', 3], ['FRAUD', '3 YEARS PRISON', 3], ['STOLEN CAR', '18 MONTHS PRISON', 3], ['FRAUD', '2 YEARS PRISON', 3]],
  [['FRAUD', '14 MONTHS PRISON', 3], ['THEFT', '2 YEARS PRISON', 3], ['DUI', '90 DAYS JAIL', 2], ['FORGERY', '6 MONTHS JAIL', 2], ['VANDALISM', '60 DAYS JAIL', 2], ['SHOPLIFTING', 'PROBATION', 1]],
];
// A's one-pointers past the first four score nothing (the cap)
const A_ZERO = new Set([6, 7, 8]);
const SHEET_X = [255, 540, 825];
const SHEET_W = 274;
const SHEET_TOP = 668;
const ROW_H = 64;
const HEAD_H = 64;
const C_WORDS = [0.9, 1.8, 2.52, 3.01, 3.42, 4.14]; // "three, three, two, two, two, one" (line 8 word starts)

const Stamp: React.FC<{x: number; y: number; text: string; col: string; k: number; rot?: number; size?: number}> = ({x, y, text, col, k, rot = -10, size = 46}) => {
  const w = text.length * size * 0.74 + 36;
  return k <= 0 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${k < 1 ? 2.2 - 1.2 * k : k})`} opacity={clamp01(k * 3)}>
      <rect x={-w / 2} y={-size * 0.85} width={w} height={size * 1.5} rx={8} fill="rgba(0,0,0,.25)" stroke={OL} strokeWidth={10} />
      <rect x={-w / 2} y={-size * 0.85} width={w} height={size * 1.5} rx={8} fill={PAPER} stroke={col} strokeWidth={6} />
      <text y={size * 0.32} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={size} fill={col} letterSpacing={3}>{text}</text>
    </g>
  );
};
const Tag: React.FC<{x: number; y: number; text: string; bg?: string; fg?: string; k?: number; size?: number}> = ({x, y, text, bg = OL, fg = YEL, k = 1, size = 34}) => {
  const w = text.length * size * 0.7 + 40;
  return k <= 0 ? null : (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <rect x={-w / 2} y={-size * 1.05} width={w} height={size * 1.7} rx={12} fill={bg} stroke={OL} strokeWidth={5} />
      <text y={size * 0.12} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={size} fill={fg}>{text}</text>
    </g>
  );
};
const Lock: React.FC<{x: number; y: number; k: number; col?: string}> = ({x, y, k, col = '#d0103a'}) => (k <= 0 ? null : (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <path d="M -34 -20 L -34 -52 Q -34 -88 0 -88 Q 34 -88 34 -52 L 34 -20" fill="none" stroke={OL} strokeWidth={22} />
    <path d="M -34 -20 L -34 -52 Q -34 -88 0 -88 Q 34 -88 34 -52 L 34 -20" fill="none" stroke="#c9ced8" strokeWidth={12} />
    <rect x={-56} y={-24} width={112} height={92} rx={14} fill={col} stroke={OL} strokeWidth={7} />
    <circle cx={0} cy={14} r={12} fill={OL} /><rect x={-5} y={14} width={10} height={30} rx={4} fill={OL} />
  </g>
));
const Chip: React.FC<{x: number; y: number; v: number; k: number; zero?: boolean}> = ({x, y, v, k, zero}) => (k <= 0 ? null : (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <circle r={21} fill={zero ? '#d8d2c4' : v === 3 ? BAD : v === 2 ? '#ff9a1f' : YEL} stroke={OL} strokeWidth={4} />
    <text y={8} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={zero ? 20 : 22} fill={zero ? '#8a8172' : OL}>{zero ? '+0' : `+${v}`}</text>
  </g>
));
/* the in-game style rank panel (original design): 5 tiers, a marker that climbs, cracks */
const Profile: React.FC<{lvl: number; crack: number; s: number; y?: number}> = ({lvl, crack, s, y = 700}) => {
  const X0 = 170;
  const PW = 740;
  const RY = (i: number) => y + 130 + i * 92;
  const cx = 540;
  const cy = RY(4);
  return (
    <g>
      <rect x={X0} y={y} width={PW} height={600} rx={26} fill="rgba(14,6,26,.86)" stroke="#ff4fd8" strokeWidth={6} />
      <rect x={X0 + 14} y={y + 14} width={PW - 28} height={600 - 28} rx={18} fill="none" stroke="#3fe0ff" strokeWidth={2} opacity={0.6} />
      <text x={540} y={y + 76} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={44} fill="#fff" letterSpacing={6}>CRIMINAL PROFILE</text>
      {TIERS.map(([name, col], i) => {
        const on = lvl >= i - 0.001;
        const cur = Math.round(lvl) === i || (i === 4 && lvl >= 4);
        return (
          <g key={name} transform={`translate(0 ${RY(i)})`}>
            <rect x={X0 + 40} y={-34} width={PW - 80} height={70} rx={14} fill={cur ? col : 'rgba(255,255,255,.06)'} stroke={on ? col : '#4a3a5a'} strokeWidth={4} opacity={on ? 1 : 0.55} />
            <circle cx={X0 + 86} cy={1} r={18} fill={on ? col : '#2a1f38'} stroke={cur ? OL : col} strokeWidth={4} />
            <text x={X0 + 124} y={14} fontFamily={heavy} fontWeight={900} fontSize={38} fill={cur ? OL : on ? '#fff' : '#7a6a8a'} letterSpacing={2}>{name}</text>
          </g>
        );
      })}
      {/* marker */}
      <g transform={`translate(${X0 + PW - 70} ${lerp(RY(0), RY(4), clamp01(lvl / 4))})`}>
        <path d="M -26 0 L 10 -22 L 10 22 Z" fill="#fff" stroke={OL} strokeWidth={4} />
      </g>
      {crack > 0 ? (
        <g>
          {Array.from({length: 14}).map((_, k) => {
            const a = (k / 14) * Math.PI * 2 + rnd(k) * 0.4;
            const L = (120 + rnd(k + 3) * 300) * clamp01(crack * 1.6 - rnd(k + 7) * 0.5);
            const mx = cx + Math.cos(a + 0.25) * L * 0.5;
            const my = cy + Math.sin(a + 0.25) * L * 0.35;
            const ex = cx + Math.cos(a) * L;
            const ey = cy + Math.sin(a) * L * 0.7;
            return L > 2 ? (
              <g key={k}>
                <path d={`M ${cx} ${cy} L ${mx} ${my} L ${ex} ${ey}`} fill="none" stroke={OL} strokeWidth={7} strokeLinejoin="round" />
                <path d={`M ${cx} ${cy} L ${mx} ${my} L ${ex} ${ey}`} fill="none" stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
              </g>
            ) : null;
          })}
          {Array.from({length: 9}).map((_, k) => {
            const u = clamp01((crack - 0.15) * 1.2);
            const a = rnd(k * 3.3) * Math.PI * 2;
            return <path key={`sh${k}`} d="M 0 -14 L 12 8 L -10 10 Z" fill="#e8f4ff" stroke={OL} strokeWidth={3}
              transform={`translate(${cx + Math.cos(a) * 160 * u} ${cy + Math.sin(a) * 80 * u + u * u * 260}) rotate(${u * 300 * (k % 2 ? 1 : -1)})`} opacity={1 - Math.max(0, u - 0.7) * 3} />;
          })}
          <circle cx={cx} cy={cy} r={22 + 6 * Math.sin(s * 10)} fill="#fff" opacity={0.25} />
        </g>
      ) : null}
    </g>
  );
};
const Synthwave: React.FC<{s: number}> = ({s}) => {
  const HZ = 1300;
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <linearGradient id="sw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a0636" /><stop offset="0.55" stopColor="#7a1f8a" /><stop offset="0.85" stopColor="#ff4f8b" /><stop offset="1" stopColor="#ffb347" />
        </linearGradient>
        <linearGradient id="sw-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe36b" /><stop offset="1" stopColor="#ff4f8b" /></linearGradient>
        <clipPath id="sw-sunclip"><rect x={0} y={0} width={W} height={HZ} /></clipPath>
      </defs>
      <rect width={W} height={HZ} fill="url(#sw-sky)" />
      <g clipPath="url(#sw-sunclip)">
        <circle cx={540} cy={HZ} r={300} fill="url(#sw-sun)" />
        {Array.from({length: 7}).map((_, k) => <rect key={k} x={200} y={HZ - 40 - k * 34} width={680} height={6 + k * 0.6} fill="#7a1f8a" opacity={0.9} />)}
      </g>
      <rect y={HZ} width={W} height={H - HZ} fill="#140428" />
      {Array.from({length: 13}).map((_, k) => {
        const u = ((k + (s * 0.8) % 1) / 13);
        const y = HZ + Math.pow(u, 2) * (H - HZ);
        return <line key={`h${k}`} x1={0} y1={y} x2={W} y2={y} stroke="#ff4fd8" strokeWidth={2 + u * 3} opacity={0.5 + u * 0.4} />;
      })}
      {Array.from({length: 19}).map((_, k) => <line key={`v${k}`} x1={540 + (k - 9) * 40} y1={HZ} x2={540 + (k - 9) * 320} y2={H} stroke="#3fe0ff" strokeWidth={2} opacity={0.55} />)}
      {[[70, 1.1, 1], [1010, 1.25, -1], [190, 0.8, 1], [900, 0.75, -1]].map(([x, sc, d], k) => (
        <g key={k} transform={`translate(${x} ${HZ + 10}) scale(${sc * d} ${sc})`} fill="#14031f">
          <path d="M -8 0 Q -2 -160 30 -330 L 40 -328 Q 12 -160 8 0 Z" />
          {[-150, -115, -65, -25, 20, 200].map((a, j) => {
            const r = ((a + Math.sin(s * 1.2 + j) * 3) * Math.PI) / 180;
            const ex = Math.cos(r) * 120;
            const ey = Math.sin(r) * 60 + 40;
            return <path key={j} d={`M 35 -330 Q ${35 + ex * 0.5} ${-330 + ey * 0.2 - 40} ${35 + ex} ${-330 + ey} Q ${35 + ex * 0.5} ${-330 + ey * 0.4 - 14} 35 -330 Z`} />;
          })}
        </g>
      ))}
    </svg>
  );
};

export const Irredeemable: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const T = (k: string) => at(plan, k);
  const LS = plan.lineStarts;
  const LE = plan.lineEnds;
  const li = lineAt(plan, s);
  const tTest = LE[7] + 0.05;
  const answered = s >= T('answer');
  const gta = li === 0 || li === 14;

  // ── camera
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 960, z: 1, r: 0, ...c});
  shot(0, 0.01, {x: 540, y: 1000, z: 1.1});
  shot(0.05, 2.6, {x: 540, y: 960, z: 1.0});
  shot(LS[1] - 0.05, 0.01, {x: 540, y: 960, z: 1.0});
  shot(LS[8] - 0.05, 0.5, {x: 690, y: 960, z: 1.12});
  shot(LS[9] - 0.05, 0.5, {x: 540, y: 960, z: 1.0});
  shot(LS[11] - 0.05, 0.5, {x: 400, y: 980, z: 1.18});
  shot(LS[13] - 0.05, 0.5, {x: 540, y: 960, z: 1.0});
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const kick = (t0: number, amp: number, decay: number) => (s >= t0 ? amp * Math.exp(-(s - t0) * decay) : 0);
  const shake = kick(T('shatter'), 16, 5) + kick(T('forever'), 8, 7) + kick(T('court'), 8, 8) + kick(T('top'), 7, 8) + kick(T('test'), 10, 7) + kick(T('answer'), 9, 7)
    + kick(T('csum'), 8, 7) + kick(T('career'), 12, 6) + kick(T('auto'), 8, 7) + kick(T('never'), 14, 5);
  const shx = Math.sin(frame * 2.3) * shake;
  const shy = Math.cos(frame * 2.9) * shake;
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + shx}px, ${960 - cam.y + shy}px) scale(${cam.z})`};

  // ── GTA hook / ending
  const lvl = li === 14 ? 4 : s < 0.4 ? 0 : 4 * ease(clamp01((s - 0.4) / (T('shatter') - 0.4)));
  const crack = li === 14 ? 1 : clamp01((s - T('shatter')) / 0.6);
  const gtaScene = gta ? (
    <g>
      <Profile lvl={lvl} crack={crack} s={s} />
      {li === 0 && s >= T('forever') ? <Lock x={540} y={1470} k={pop(s, T('forever'))} /> : null}
      {li === 14 ? <Lock x={540} y={1470} k={1 + 0.06 * Math.sin(s * 6)} /> : null}
    </g>
  ) : null;

  // ── court lessons (li 1..6)
  const lessonOn = li >= 1 && li <= 6;
  const BOX_Y = 668;
  const boxX = (i: number) => 120 + i * 143;
  const scaleRow = (yy: number, hiVI: boolean, kAll: number) => (
    <g opacity={kAll}>
      {ROMAN.map((r, i) => {
        const k = li === 1 ? inK(s, T('court') + 0.15 + i * 0.12, 0.3) : 1;
        const vi = i === 5 && hiVI;
        return (
          <g key={r} transform={`translate(${boxX(i) + 63} ${yy + 70}) scale(${k}) translate(${-(boxX(i) + 63)} ${-(yy + 70)})`}>
            <rect x={boxX(i)} y={yy} width={126} height={140} rx={16} fill={vi ? BAD : '#1e2b48'} stroke={vi ? '#fff' : '#3a4e78'} strokeWidth={vi ? 7 : 4} />
            <text x={boxX(i) + 63} y={yy + 76} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={i >= 3 ? 50 : 56} fill={vi ? OL : '#fff'}>{r}</text>
            {s >= T('scale') ? <text x={boxX(i) + 63} y={yy + 120} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={i === 4 ? 25 : 28}
              fill={vi ? OL : YEL} opacity={inK(s, T('scale') + i * 0.14, 0.25)}>{RANGES[i]}</text> : null}
          </g>
        );
      })}
      {s >= T('scale') ? <text x={540} y={yy + 186} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={26} fill="#8fa0b8" letterSpacing={3} opacity={inK(s, T('scale'), 0.4)}>CRIMINAL HISTORY CATEGORY · POINTS</text> : null}
    </g>
  );
  const RULES: Array<{cue: string; pc: string; v: number; big: string; small: string}> = [
    {cue: 'r3', pc: 'p3', v: 3, big: 'OVER 13 MONTHS', small: 'IN PRISON'},
    {cue: 'r2', pc: 'p2', v: 2, big: '60+ DAYS', small: 'BEHIND BARS'},
    {cue: 'r1', pc: 'p1', v: 1, big: 'ANYTHING LESS', small: 'EVEN PROBATION'},
  ];
  const gavelHit = (t0: number) => (s >= t0 && s < t0 + 0.5 ? Math.sin(clamp01((s - t0) / 0.5) * Math.PI) : 0);
  const gavelA = -38 + 38 * Math.max(gavelHit(T('court') - 0.15), gavelHit(T('thirteen') - 0.15), gavelHit(T('top') - 0.15));
  const lessons = lessonOn ? (
    <g>
      {scaleRow(BOX_Y, s >= T('thirteen'), 1)}
      {s >= T('top') ? <Tag x={boxX(5) + 63} y={BOX_Y - 28} text="THE TOP" bg={BAD} fg={OL} size={28} k={pop(s, T('top'))} /> : null}
      {li >= 2 ? (
        <g>
          <Tag x={540} y={950} text="EVERY PAST SENTENCE = POINTS" size={34} k={pop(s, T('pts'))} />
          {RULES.map((r, i) => {
            const k = inK(s, T(r.cue) - 0.1, 0.3);
            const y = 1040 + i * 150;
            return k > 0 ? (
              <g key={r.cue} opacity={k} transform={`translate(${(1 - k) * -80} 0)`}>
                <rect x={120} y={y} width={840} height={126} rx={18} fill={PAPER} stroke={OL} strokeWidth={5} />
                {/* icon */}
                <g transform={`translate(190 ${y + 63})`}>
                  {i === 0 ? <g>{[-24, -8, 8, 24].map((x) => <rect key={x} x={x - 4} y={-38} width={8} height={76} rx={3} fill="#5a6070" />)}<rect x={-38} y={-42} width={76} height={10} rx={4} fill={OL} /><rect x={-38} y={32} width={76} height={10} rx={4} fill={OL} /></g>
                    : i === 1 ? <g><rect x={-38} y={-34} width={76} height={72} rx={8} fill="#fff" stroke={OL} strokeWidth={5} /><rect x={-38} y={-34} width={76} height={20} rx={6} fill={BAD} stroke={OL} strokeWidth={5} /><text y={26} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={30} fill={OL}>60</text></g>
                      : <g><path d="M -40 -22 L 24 -22 L 42 0 L 24 22 L -40 22 Z" fill={YEL} stroke={OL} strokeWidth={5} /><circle cx={22} cy={0} r={6} fill={OL} /></g>}
                </g>
                <text x={262} y={y + 60} fontFamily={heavy} fontWeight={900} fontSize={44} fill={OL}>{r.big}</text>
                <text x={264} y={y + 100} fontFamily={MONO} fontWeight={900} fontSize={28} fill="#5a6070">{r.small}</text>
                {s >= T(r.pc) ? (
                  <g transform={`translate(880 ${y + 63}) scale(${pop(s, T(r.pc))})`}>
                    <circle r={46} fill={r.v === 3 ? BAD : r.v === 2 ? '#ff9a1f' : YEL} stroke={OL} strokeWidth={6} />
                    <text y={16} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={46} fill={OL}>+{r.v}</text>
                  </g>
                ) : null}
                {i === 2 && s >= T('cap') ? <g transform={`rotate(-8 760 ${y + 20})`}><Tag x={760} y={y + 20} text="MAX 4" bg={BAD} fg={OL} size={30} k={pop(s, T('cap'))} /></g> : null}
              </g>
            ) : null;
          })}
        </g>
      ) : null}
      {/* the judge's bench + gavel */}
      <g>
        <rect x={60} y={1560} width={960} height={400} rx={12} fill="#5a3a24" />
        <rect x={60} y={1560} width={960} height={26} rx={8} fill="#7a5034" />
        {[0, 1, 2, 3].map((k) => <rect key={k} x={110 + k * 230} y={1620} width={170} height={260} rx={10} fill="#4a2e1c" />)}
        <g transform={`translate(820 1548) rotate(${gavelA} 40 0)`}>
          <rect x={-70} y={-8} width={120} height={16} rx={6} fill="#8a5a3a" stroke={OL} strokeWidth={4} />
          <rect x={-110} y={-30} width={46} height={60} rx={8} fill="#6a4026" stroke={OL} strokeWidth={5} />
        </g>
        <ellipse cx={712} cy={1556} rx={44} ry={8} fill="#3a2414" />
      </g>
    </g>
  ) : null;

  // ── rap sheets (test, answer, twist, kicker)
  const sheetsOn = li >= 7 && li <= 13;
  const sheetIn = (i: number) => inK(s, T('test') - 0.1 + i * 0.12, 0.35);
  const twist = li >= 11 && li <= 12;
  const kickerOn = li === 13;
  const yrsK = kickerOn ? clamp01((s - T('forget')) / Math.max(0.5, T('years') + 0.4 - T('forget'))) : 0;
  const cHits = C_WORDS.map((d) => LS[8] + d);
  const chipK = (sheet: number, r: number): number => {
    if (!answered) return 0;
    if (sheet === 2) return s >= cHits[r] ? pop(s, cHits[r], 0.3) : 0;
    if (sheet === 1) return s >= T('b') + r * 0.18 ? pop(s, T('b') + r * 0.18, 0.3) : 0;
    const t0 = T('a') + 0.1 + r * 0.1;
    return s >= t0 ? pop(s, t0, 0.3) : 0;
  };
  const total = (i: number): {t: string; col: string; k: number} | null => {
    if (!answered) return null;
    if (i === 2 && s >= T('csum')) return kickerOn ? {t: `${Math.round(13 * (1 - yrsK))} PTS · ${yrsK >= 1 ? 'I' : 'VI'}`, col: yrsK >= 1 ? GOOD : BAD, k: 1} : {t: '13 PTS · VI', col: BAD, k: pop(s, T('csum'))};
    if (i === 1 && s >= T('bsum')) return {t: '12 PTS · V', col: '#ff9a1f', k: pop(s, T('bsum'))};
    if (i === 0 && s >= T('asum')) {
      if (s >= T('auto')) return {t: 'VI · AUTOMATIC', col: BAD, k: pop(s, T('auto'))};
      return {t: '8 PTS · IV', col: YEL, k: pop(s, T('asum'))};
    }
    return null;
  };
  const sheets = sheetsOn ? (
    <g>
      {SHEETS.map((rows, i) => {
        const x0 = SHEET_X[i] - SHEET_W / 2;
        const h = HEAD_H + rows.length * ROW_H + 16;
        const k = sheetIn(i);
        const dim = (twist && i !== 0) || (kickerOn && i !== 2) ? 0.3 : 1;
        const isC = i === 2;
        const border = answered && isC && li <= 10 ? '#7be07b' : twist && i === 0 && s >= T('career') ? BAD : OL;
        const tt = total(i);
        return (
          <g key={i} opacity={dim * clamp01(k * 2)} transform={`translate(0 ${(1 - k) * 260})`}>
            <rect x={x0} y={SHEET_TOP} width={SHEET_W} height={h} rx={14} fill={PAPER} stroke={border} strokeWidth={border === OL ? 5 : 10} />
            <rect x={x0} y={SHEET_TOP} width={SHEET_W} height={HEAD_H - 6} rx={12} fill="#1e2a44" />
            <circle cx={x0 + 34} cy={SHEET_TOP + 29} r={22} fill={YEL} stroke={OL} strokeWidth={4} />
            <text x={x0 + 34} y={SHEET_TOP + 40} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={30} fill={OL}>{'ABC'[i]}</text>
            <text x={x0 + 68} y={SHEET_TOP + 39} fontFamily={heavy} fontWeight={900} fontSize={24} fill={PAPER} letterSpacing={2}>RAP SHEET</text>
            {rows.map(([off, sent, v], r) => {
              const y = SHEET_TOP + HEAD_H + r * ROW_H;
              const zero = i === 0 && A_ZERO.has(r) && s >= T('acap');
              const drugHi = i === 0 && off === 'DRUG FELONY' && s >= T('drug') && li <= 12;
              const expired = kickerOn && isC && yrsK > (r + 1) / 7;
              return (
                <g key={r} opacity={expired ? 0.35 : 1}>
                  {drugHi ? <rect x={x0 + 6} y={y + 2} width={SHEET_W - 12} height={ROW_H - 6} rx={8} fill="#ffd0d4" stroke={BAD} strokeWidth={4} /> : null}
                  {r > 0 ? <rect x={x0 + 14} y={y} width={SHEET_W - 28} height={2} fill="#d8d0bf" /> : null}
                  <text x={x0 + 16} y={y + 25} fontFamily={heavy} fontWeight={800} fontSize={17} fill="#7a7262" letterSpacing={1}>{off}</text>
                  <text x={x0 + 16} y={y + 52} fontFamily={heavy} fontWeight={900} fontSize={off.length > 0 && sent.length > 15 ? 19 : 21} fill={OL}>{sent}</text>
                  {zero ? <rect x={x0 + 14} y={y + 44} width={SHEET_W - 80} height={4} fill={BAD} /> : null}
                  {expired ? <rect x={x0 + 14} y={y + 33} width={SHEET_W - 28} height={4} fill="#5a6070" /> : null}
                  <Chip x={x0 + SHEET_W - 30} y={y + 32} v={v} k={kickerOn && isC ? (expired ? 0 : 1) : chipK(i, r)} zero={zero} />
                </g>
              );
            })}
            {/* total */}
            <g transform={`translate(${SHEET_X[i]} ${SHEET_TOP + h + 54})`}>
              <rect x={-SHEET_W / 2} y={-34} width={SHEET_W} height={68} rx={14} fill={tt ? tt.col : '#1e2b48'} stroke={OL} strokeWidth={5} />
              <text y={13} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={tt && tt.t.length > 11 ? 28 : 34} fill={tt ? OL : '#8fa0b8'}
                transform={tt ? `scale(${tt.k})` : undefined}>{tt ? tt.t : '? PTS'}</text>
            </g>
            {i === 1 && s >= T('bsum') + 0.5 && li <= 10 ? <Tag x={SHEET_X[1]} y={SHEET_TOP + h + 140} text="1 SHORT" bg={OL} fg={YEL} size={30} k={pop(s, T('bsum') + 0.5)} /> : null}
            {i === 0 && s >= T('acap') && li === 10 ? <g transform={`rotate(-6 ${SHEET_X[0]} ${SHEET_TOP + 560})`}><Tag x={SHEET_X[0]} y={SHEET_TOP + 560} text="CAPPED" bg={BAD} fg={OL} size={30} k={pop(s, T('acap'))} /></g> : null}
          </g>
        );
      })}
      {li === 7 || (li === 8 && !answered) ? null : null}
      {twist && s >= T('again') ? (
        <g transform={`translate(${SHEET_X[0]} ${SHEET_TOP + HEAD_H + 9 * ROW_H + 140})`}>
          <g transform={`scale(${pop(s, T('again'))})`}>
            <rect x={-150} y={-36} width={300} height={72} rx={14} fill={BAD} stroke={OL} strokeWidth={5} />
            <text y={-6} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={22} fill={OL}>NEW CHARGE:</text>
            <text y={24} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={26} fill={PAPER}>DRUG FELONY #3</text>
          </g>
        </g>
      ) : null}
      {twist && s >= T('career') ? <Stamp x={SHEET_X[0] + 120} y={1000} text="CAREER OFFENDER" col={BAD} k={clamp01((s - T('career')) / 0.18)} size={44} rot={-12} /> : null}
      {kickerOn ? (
        <g transform={`translate(840 1500) scale(${pop(s, T('forget'))})`}>
          <rect x={-150} y={-70} width={300} height={140} rx={18} fill={PAPER} stroke={OL} strokeWidth={6} />
          <rect x={-150} y={-70} width={300} height={36} rx={14} fill={BAD} stroke={OL} strokeWidth={6} />
          <text y={50} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={62} fill={OL}>+{Math.round(15 * yrsK)} YRS</text>
        </g>
      ) : null}
    </g>
  ) : null;

  // ── UI card
  const left = Math.max(0, TEST_SECS - Math.max(0, s - tTest));
  const secs = Math.ceil(left - 1e-6);
  const counting = s >= tTest && s < tTest + TEST_SECS;
  const urgent = counting && secs <= 2;
  const ringK = s < tTest ? 1 : left / TEST_SECS;
  const header = gta ? 'GTA 6 · CRIMINAL PROFILE' : li <= 6 ? 'REAL LIFE · U.S. FEDERAL COURT' : li <= 10 ? (answered ? 'THE ANSWER' : 'YOUR TURN') : li <= 12 ? 'THE TWIST' : 'REAL LIFE';
  const bigText = (t: string, col = OL, sz = 52) => <div style={{position: 'absolute', left: 26, top: 60, width: 790, fontFamily: heavy, fontWeight: 900, fontSize: sz, lineHeight: 1.05, color: col, whiteSpace: 'nowrap'}}>{t}</div>;
  const subText = (t: string) => <div style={{position: 'absolute', left: 28, top: 126, width: 790, fontFamily: MONO, fontWeight: 900, fontSize: 27, color: '#5a6070', whiteSpace: 'nowrap'}}>{t}</div>;
  let body: React.ReactNode = null;
  if (li === 0) body = <>{bigText(s >= T('shatter') ? 'IRREDEEMABLE' : 'HOW BAD ARE YOU?', s >= T('shatter') ? '#d0103a' : OL, 58)}{subText(s >= T('forever') ? 'THE WORST RANK. NO WAY BACK.' : 'PROFESSIONAL → IRREDEEMABLE')}</>;
  else if (li === 14) body = <>{bigText('IRREDEEMABLE = FOREVER', '#d0103a', 50)}{subText('GTA NEVER FORGETS')}</>;
  else if (li <= 6) {
    const got = [s >= T('p3'), s >= T('p2'), s >= T('p1')];
    body = (
      <>
        {bigText(li === 1 ? 'CATEGORY I TO VI' : 'THE POINTS', OL, 50)}
        {li === 1 ? subText('THE REAL "CRIMINAL PROFILE"') : ['+3 PRISON 13+ MO', '+2 60+ DAYS', '+1 (MAX 4)'].map((n, k) => (
          <div key={n} style={{position: 'absolute', left: 22 + k * 270, top: 120, width: 256, height: 42, borderRadius: 8, border: '4px solid #1b1b22', boxSizing: 'border-box',
            background: got[k] ? YEL : '#e2ddd2', fontFamily: heavy, fontWeight: 900, fontSize: 21, lineHeight: '34px', textAlign: 'center', color: got[k] ? OL : '#aaa39a',
            transform: `scale(${got[k] ? pop(s, T(['p3', 'p2', 'p1'][k])) : 1})`}}>{got[k] ? n : '?'}</div>
        ))}
      </>
    );
  } else if (li <= 10) {
    body = (
      <>
        {bigText(answered ? 'C IS CATEGORY VI' : 'WHO IS CATEGORY VI?', answered ? '#2a8a5a' : OL, 46)}
        {subText(answered ? '3+3+2+2+2+1 = 13' : '+3 · +2 · +1 (MAX FOUR 1s) · 13 = VI')}
        {!answered ? (
          <svg width={150} height={150} style={{position: 'absolute', left: 676, top: 20}}>
            <circle cx={75} cy={75} r={56} fill={urgent ? '#ffe0e0' : '#fff'} stroke="#d8d2c4" strokeWidth={12} />
            <circle cx={75} cy={75} r={56} fill="none" stroke={urgent ? BAD : '#2a8a5a'} strokeWidth={12} strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 56 * ringK} 999`} transform="rotate(-90 75 75)" />
            <text x={75} y={93} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={54} fill={urgent ? '#d6293a' : OL}>{s < tTest ? TEST_SECS : secs}</text>
          </svg>
        ) : null}
      </>
    );
  } else if (li <= 12) body = <>{bigText(s >= T('career') ? 'CAREER OFFENDER' : 'BUT WAIT...', s >= T('career') ? '#d6293a' : OL)}{subText('2 PRIOR DRUG/VIOLENT FELONIES + 1 NEW')}</>;
  else body = <>{bigText('REAL COURTS FORGET', '#2a8a5a')}{subText('OLD SENTENCES EXPIRE')}</>;
  const card = (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 176, background: PAPER, borderRadius: 14, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 840, height: 46, background: gta ? '#3a0a4a' : '#1e2a44', display: 'flex', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: gta ? '#ff4fd8' : YEL}} />
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: PAPER}}>{header}</span>
      </div>
      {body}
    </div>
  );
  const note = li === 0 ? '* PER PLAYER GUIDES · GTA 6 (2026)' : li >= 1 && li <= 6 ? 'U.S. SENTENCING GUIDELINES §4A1.1 · JUDGES START HERE'
    : li >= 11 && li <= 12 ? 'USSG §4B1.1 · ADULT, NEW DRUG OR VIOLENT FELONY + 2 PRIORS' : li === 13 ? 'USSG §4A1.2(e) · 15 YRS FOR 13+ MONTH TERMS, 10 FOR THE REST' : '';

  // ── captions
  const caps = captions(ep as unknown as FightEpisode, timing, {lineStarts: plan.lineStarts, lineEnds: plan.lineEnds, events: [], hits: [], end: plan.end});
  const capIdx = caps.findIndex((c) => s >= c.start && s < c.end);
  const cap = capIdx >= 0 ? caps[capIdx] : null;
  let capSize = 0;
  let capWrap = false;
  if (cap) {
    const one = 820 / (cap.text.length * 0.78);
    const longest = Math.max(...cap.text.split(' ').map((x) => x.length));
    capWrap = one < 100 && cap.n > 1;
    capSize = Math.min(cap.hot ? 120 : 104, capWrap ? Math.min(78, 820 / (longest * 0.78)) : one);
  }
  const capPop = cap ? 0.55 + 0.45 * spring({frame: frame - Math.round(cap.start * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;

  const slam = s >= T('shatter') && s < T('shatter') + 1.0 && li === 0 ? <Slam k={(s - T('shatter')) / 1.0} text="IRREDEEMABLE" color="#ff3b5c" size={112} top={1330} />
    : s >= T('forever') && li === 0 ? <Slam k={Math.min(0.6, (s - T('forever')) / 1.2)} text="FOREVER" color="#fff" size={120} top={1580} />
      : s >= T('answer') && s < T('answer') + 0.9 ? <Slam k={(s - T('answer')) / 0.9} text="C!" color="#7be07b" size={190} top={1530} />
        : s >= T('auto') && s < T('auto') + 1.2 && li === 12 ? <Slam k={(s - T('auto')) / 1.2} text="NO MATH" color={BAD} size={130} top={1560} />
          : s >= T('never') ? <Slam k={Math.min(0.6, (s - T('never')) / 1.2)} text="NEVER FORGETS" color="#ff3b5c" size={104} top={1580} /> : null;
  const late = s >= tTest + TEST_SECS && s < T('answer');
  const ticks = Array.from({length: TEST_SECS}).map((_, k) => tTest + k);

  return (
    <AbsoluteFill style={{background: '#0d1424', overflow: 'hidden'}}>
      {gta ? <Synthwave s={s} /> : (
        <>
          <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 55%, #24314f 0%, #0d1424 72%)'}} />
          <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, opacity: 0.1}}>
            {Array.from({length: 24}).map((_, k) => <rect key={k} x={0} y={600 + k * 60} width={W} height={3} fill="#9fb0c8" />)}
          </svg>
        </>
      )}
      <div style={camStyle}>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {gtaScene}
          {lessons}
          {sheets}
        </svg>
      </div>
      {late ? <div style={{position: 'absolute', left: 0, top: 1560, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: 110, color: '#fff', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill', transform: `rotate(-3deg) scale(${pop(s, tTest + TEST_SECS)})`}}>TIME!</div> : null}
      {s < T('answer') && li >= 7 ? <div style={{position: 'absolute', left: 120, top: 420, width: 840 * ringK, height: 10, borderRadius: 5, background: urgent ? BAD : YEL}} /> : null}
      {card}
      {note ? <div style={{position: 'absolute', left: 100, top: 432, width: 880, textAlign: 'center', fontFamily: MONO, fontWeight: 900, fontSize: 22, color: gta ? '#ffd0f4' : '#9fb0c8'}}>{note}</div> : null}
      {cap ? (
        <div style={{position: 'absolute', top: 486, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
          fontSize: capSize, lineHeight: 1.0, color: cap.hot ? YEL : '#ffffff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`,
          paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: capWrap ? 'normal' : 'nowrap',
          transform: `scale(${capPop}) rotate(${capIdx % 2 ? 2 : -2}deg)`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}
      {slam}

      {/* audio */}
      <Audio src={staticFile(`music/${ep.id}.wav`)} volume={0.55} />
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}><Audio src={staticFile(ln.file)} /></Sequence>
      ))}
      {ticks.map((t, k) => (
        <Sequence key={`t${k}`} from={Math.round(t * FPS)} durationInFrames={20}><Audio src={staticFile('sfx/tick.wav')} volume={k >= TEST_SECS - 2 ? 0.8 : 0.4} /></Sequence>
      ))}
      {([
        [0.05, 'sfx/whoosh.wav', 0.5], [0.5, 'sfx/powerup.wav', 0.45], [T('shatter'), 'sfx/crack.wav', 0.8], [T('shatter'), 'sfx/slam.wav', 0.8], [T('forever'), 'sfx/powerdown.wav', 0.55], [T('forever') + 0.05, 'sfx/clank.wav', 0.6],
        [LS[1], 'sfx/whoosh.wav', 0.6], [T('court') - 0.05, 'sfx/slam.wav', 0.7], [T('scale'), 'sfx/pop.wav', 0.5],
        [T('pts'), 'sfx/pop.wav', 0.55], [T('r3'), 'sfx/whoosh.wav', 0.4], [T('p3'), 'sfx/coins.wav', 0.5], [T('r2'), 'sfx/whoosh.wav', 0.4], [T('p2'), 'sfx/coins.wav', 0.5],
        [T('r1'), 'sfx/whoosh.wav', 0.4], [T('p1'), 'sfx/coins.wav', 0.5], [T('cap'), 'sfx/clank.wav', 0.55], [T('thirteen') - 0.05, 'sfx/slam.wav', 0.7], [T('top'), 'sfx/ding.wav', 0.5],
        [T('test'), 'sfx/slam.wav', 0.8], [tTest + TEST_SECS, 'sfx/fail.wav', 0.5],
        [T('answer'), 'sfx/ding.wav', 0.8], [T('answer'), 'sfx/shine.wav', 0.6],
        ...cHits.map((t) => [t, 'sfx/coins.wav', 0.45] as [number, string, number]), [T('csum'), 'sfx/slam.wav', 0.8],
        [T('b'), 'sfx/coins.wav', 0.45], [T('bsum'), 'sfx/fail.wav', 0.45], [T('a'), 'sfx/coins.wav', 0.4], [T('acap'), 'sfx/clank.wav', 0.55], [T('asum'), 'sfx/pop.wav', 0.6],
        [T('drug'), 'sfx/zap.wav', 0.5], [T('again'), 'sfx/pop.wav', 0.6], [T('career'), 'sfx/slam.wav', 0.9], [T('career') + 0.05, 'sfx/boom.wav', 0.45], [T('auto'), 'sfx/overload.wav', 0.5],
        [T('forget'), 'sfx/whoosh.wav', 0.5], [T('forget') + 0.2, 'sfx/printer.wav', 0.3], [T('years'), 'sfx/ding.wav', 0.5],
        [LS[14], 'sfx/whoosh.wav', 0.6], [T('never'), 'sfx/crack.wav', 0.8], [T('never'), 'sfx/slam.wav', 0.85],
      ] as Array<[number, string, number]>).map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round(t * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
