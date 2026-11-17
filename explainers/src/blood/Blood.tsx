import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Slam} from '../fight/Fight';
import {camAt, Shot} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {FPS, StoryEpisode, at, buildPlan, lineAt} from '../story/timeline';

// BLOOD SPATTER 101. Teach-then-test: five patterns are painted onto a tiled
// wall one per line (shape/angle, mist, spray, cast-off, arterial zigzag), then
// a full "crime wall" comes back and the viewer gets 6 s to pick A/B/C. The
// answer is proved on the wall: strings converge on one impact point, two
// cast-off arcs are counted (+1 for the first, clean hit), and a person-shaped
// void is revealed. Stylised flat stains only — no bodies, no wounds, no gore.
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';

const W = 1080;
const H = 1920;
const PX0 = 50;
const PX1 = 1030;
const PY0 = 640;
const BASE = 1500;
const PY1 = 1660;
const TEST_SECS = 6;
const BLOOD = '#b3101f';
const BLOOD_D = '#7a0913';
const WALL = '#efe8d8';
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const pop = (s: number, t0: number, d = 0.35) => (s < t0 ? 0 : 1 + 0.25 * Math.sin(clamp01((s - t0) / d) * Math.PI) * (1 - clamp01((s - t0) / d)));
const DEG = 180 / Math.PI;

/* ───────────── a stain: base at (x,y), travelling toward `dir` degrees ───────────── */
type St = {x: number; y: number; r: number; dir: number; e: number; t: number; sx?: number; sy?: number; fly?: number; run?: number; id: number};
const Stain: React.FC<{st: St; s: number}> = ({st, s}) => {
  const fly = st.fly ?? 0;
  if (s < st.t - fly) return null;
  if (s < st.t) {
    const u = (s - (st.t - fly)) / fly;
    return <circle cx={lerp(st.sx ?? st.x, st.x, u)} cy={lerp(st.sy ?? st.y, st.y, u)} r={Math.max(1.4, st.r * 0.7)} fill={BLOOD} />;
  }
  const k = 0.55 + 0.45 * clamp01((s - st.t) / 0.1);
  const {r, e} = st;
  const L = r * e;
  const long = e > 1.3;
  const runLen = st.run ? Math.min(st.run, (s - st.t) * 160) : 0;
  return (
    <g transform={`translate(${st.x} ${st.y})`}>
      {runLen > 0 ? (
        <g>
          <rect x={-r * 0.32} y={0} width={r * 0.64} height={runLen} fill={BLOOD} />
          <ellipse cx={0} cy={runLen} rx={r * 0.42} ry={r * 0.5} fill={BLOOD} />
        </g>
      ) : null}
      <g transform={`rotate(${st.dir}) scale(${k})`}>
        <ellipse cx={0} cy={0} rx={L} ry={r} fill={BLOOD} />
        {long ? (
          <>
            <path d={`M ${L * 0.6} ${-r * 0.55} Q ${L + r * 1.4} 0 ${L * 0.6} ${r * 0.55} Z`} fill={BLOOD} />
            <circle cx={L + r * 1.9} cy={0} r={Math.max(0.9, r * 0.32)} fill={BLOOD} />
          </>
        ) : r >= 9 ? (
          Array.from({length: 9}).map((_, j) => {
            const a = (j / 9) * Math.PI * 2 + rnd(st.id + j) * 0.5;
            return <circle key={j} cx={Math.cos(a) * r * 1.02} cy={Math.sin(a) * r * 1.02} r={r * (0.16 + rnd(st.id * 3 + j) * 0.1)} fill={BLOOD} />;
          })
        ) : null}
        {r >= 6 ? <ellipse cx={-L * 0.25} cy={-r * 0.3} rx={L * 0.35} ry={r * 0.22} fill={BLOOD_D} opacity={0.35} /> : null}
      </g>
    </g>
  );
};
const Stains: React.FC<{list: St[]; s: number}> = ({list, s}) => <>{list.map((st) => <Stain key={st.id} st={st} s={s} />)}</>;

/* ───────────── the test wall ───────────── */
const O: [number, number] = [470, 1100];
const VX = 715;
const VHY = 930;
const halfW = (y: number) => {
  if (y < VHY + 40) return 0;
  if (y < VHY + 52) return 24;
  if (y < VHY + 110) return lerp(26, 74, (y - VHY - 52) / 58);
  return 74 - (y - VHY - 110) * 0.025;
};
const inVoid = (x: number, y: number) => Math.hypot(x - VX, y - VHY) < 48 || (y > VHY + 38 && y < BASE && Math.abs(x - VX) < halfW(y) + 4);
const VOID_PATH = (() => {
  const ys: number[] = [];
  for (let y = VHY + 40; y <= BASE; y += 10) ys.push(y);
  const right = ys.map((y) => `${VX + halfW(y)} ${y}`).join(' L ');
  const left = [...ys].reverse().map((y) => `${VX - halfW(y)} ${y}`).join(' L ');
  return `M ${right} L ${left} Z M ${VX - 46} ${VHY} a 46 46 0 1 0 92 0 a 46 46 0 1 0 -92 0 Z`;
})();
const ARC_C: [number, number] = [560, 1290];
const ARCS = [{R: 470, a0: 268, a1: 200}, {R: 545, a0: 266, a1: 207}];
const arcPt = (R: number, deg: number): [number, number] => [ARC_C[0] + R * Math.cos(deg / DEG), ARC_C[1] + R * Math.sin(deg / DEG)];
const castOff = (R: number, a0: number, a1: number, n: number, seed: number, t0: number, dur: number): St[] =>
  Array.from({length: n}).map((_, i) => {
    const u = i / (n - 1);
    const a = lerp(a0, a1, u);
    const jit = (rnd(seed + i * 1.7) - 0.5) * 12;
    const [x, y] = arcPt(R + jit, a);
    return {x, y, r: 6.5 - 3.6 * u + rnd(seed + i) * 1.2, dir: a - 90 + (rnd(seed + i * 2.9) - 0.5) * 8, e: 1.8 + 1.8 * u, t: t0 + u * dur, id: seed * 1000 + i};
  });
const TEST_SPRAY: St[] = (() => {
  const out: St[] = [];
  for (let i = 0; i < 3000 && out.length < 340; i++) {
    const a = rnd(i * 2.13 + 7) * Math.PI * 2;
    const dmax = 290 + 230 * Math.max(0, Math.cos(a));
    const d = 26 + Math.pow(rnd(i * 3.31 + 1), 1.0) * dmax;
    const x = O[0] + Math.cos(a) * d;
    const y = O[1] + Math.sin(a) * d * 0.95;
    if (y > BASE - 8 || inVoid(x, y)) continue;
    out.push({x, y, r: 2.6 + rnd(i * 5.1) * 5.2 * (1 - d / 700), dir: a * DEG, e: 1 + d / 230, t: 0, id: 5000 + i});
  }
  return out;
})();
const TEST_ARCS = ARCS.map((A, j) => castOff(A.R, A.a0, A.a1, 26, 70 + j * 9, 0, 0));
// the strings: well-spread spray stains, joined back to the impact point
const STRINGS = (() => {
  const picks: St[] = [];
  const cand = TEST_SPRAY.filter((st) => Math.hypot(st.x - O[0], st.y - O[1]) > 150 && st.r > 3.4);
  for (let b = 0; b < 14; b++) {
    const lo = -Math.PI + (b / 14) * Math.PI * 2;
    const hi = lo + (Math.PI * 2) / 14;
    const inBin = cand.filter((st) => {
      const a = Math.atan2(st.y - O[1], st.x - O[0]);
      return a >= lo && a < hi;
    });
    if (inBin.length) picks.push(inBin.reduce((m, c) => (Math.hypot(c.x - O[0], c.y - O[1]) > Math.hypot(m.x - O[0], m.y - O[1]) ? c : m)));
  }
  return picks;
})();

/* ───────────── the lessons ───────────── */
const M_SRC: [number, number] = [180, 1040];
const mistAt = (t0: number): St[] => Array.from({length: 430}).map((_, i) => {
  const g = (rnd(i * 1.3) + rnd(i * 2.7) + rnd(i * 4.1)) / 3 - 0.5;
  const a = g * 1.3;
  const d = 40 + Math.pow(rnd(i * 6.7 + 2), 0.85) * 700;
  return {x: M_SRC[0] + Math.cos(a) * d, y: M_SRC[1] + Math.sin(a) * d, r: 1.2 + rnd(i * 8.9) * 2.0, dir: a * DEG, e: 1 + d / 700, t: t0 + d / 2600, id: 10000 + i};
});
const S_SRC: [number, number] = [540, 1060];
const sprayAt = (t0: number): St[] => Array.from({length: 120}).map((_, i) => {
  const a = rnd(i * 2.9 + 3) * Math.PI * 2;
  const d = 30 + Math.pow(rnd(i * 4.3 + 9), 1.2) * 330;
  const x = S_SRC[0] + Math.cos(a) * d;
  const y = S_SRC[1] + Math.sin(a) * d * 0.95;
  return {x, y, r: 3.6 + rnd(i * 7.7) * 5, dir: a * DEG, e: 1 + d / 220, t: t0 + d / 1500, sx: S_SRC[0], sy: S_SRC[1], fly: d / 1500, id: 20000 + i};
}).filter((st) => st.y < BASE - 8);
const C_PIV: [number, number] = [540, 1330];
const C_R = 540;
const ZIG_X0 = 110;
const ZIG_WAVE = 172;
const zigAt = (beats: number[]): St[] => beats.flatMap((tb, i) => Array.from({length: 15}).map((_, j) => {
  const u = j / 14;
  const A = 240 - i * 28;
  const x = ZIG_X0 + (i + u) * ZIG_WAVE;
  const y = 1160 - A * Math.sin(Math.PI * u) + (rnd(i * 31 + j) - 0.5) * 10;
  const r = 6 + 9 * Math.sin(Math.PI * u) + rnd(i * 13 + j) * 2;
  return {x, y, r, dir: (rnd(i * 7 + j) - 0.5) * 30, e: 1.15, t: tb + u * 0.42, run: r > 12.5 ? 60 + rnd(i * 17 + j) * 110 : 0, id: 30000 + i * 100 + j};
}));

/* ───────────── props ───────────── */
const Wall: React.FC = () => {
  const tiles: React.ReactNode[] = [];
  for (let y = PY0; y < BASE; y += 82) tiles.push(<rect key={`h${y}`} x={PX0} y={y} width={PX1 - PX0} height={3} fill="#d9d0bc" />);
  for (let x = PX0 + 82; x < PX1; x += 82) tiles.push(<rect key={`v${x}`} x={x} y={PY0} width={3} height={BASE - PY0} fill="#d9d0bc" />);
  return (
    <>
      <rect x={PX0 - 14} y={PY0 - 14} width={PX1 - PX0 + 28} height={PY1 - PY0 + 28} rx={18} fill="#0b0c11" />
      <rect x={PX0} y={PY0} width={PX1 - PX0} height={BASE - PY0} fill={WALL} />
      {tiles}
      <rect x={PX0} y={BASE} width={PX1 - PX0} height={34} fill="#cfc4ad" />
      <rect x={PX0} y={BASE + 34} width={PX1 - PX0} height={PY1 - BASE - 34} fill="#8a8172" />
      {Array.from({length: 7}).map((_, k) => <rect key={k} x={PX0 + k * 150} y={BASE + 34} width={4} height={PY1 - BASE - 34} fill="#7a7264" />)}
    </>
  );
};
/* forensic L-scale in the corner */
const Scale: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={0} y={-26} width={230} height={26} fill="#fff" stroke="#1b1b22" strokeWidth={2} />
    <rect x={0} y={-230} width={26} height={230} fill="#fff" stroke="#1b1b22" strokeWidth={2} />
    {Array.from({length: 23}).map((_, k) => <rect key={k} x={k * 10} y={-26} width={2} height={k % 5 ? 8 : 14} fill="#1b1b22" />)}
    {Array.from({length: 23}).map((_, k) => <rect key={`v${k}`} x={0} y={-k * 10 - 2} width={k % 5 ? 8 : 14} height={2} fill="#1b1b22" />)}
    <rect x={150} y={-22} width={70} height={18} fill="#ffd23f" />
    <text x={185} y={-8} textAnchor="middle" fontFamily={MONO} fontWeight={900} fontSize={14} fill="#1b1b22">CM</text>
  </g>
);
const Bat: React.FC = () => (
  <g>
    <path d={`M 0 -8 L 300 -12 Q 520 -28 ${C_R + 10} -26 Q ${C_R + 26} 0 ${C_R + 10} 26 Q 520 28 300 12 L 0 8 Z`} fill="#8a5a2a" stroke="#4a2a12" strokeWidth={4} />
    <rect x={-6} y={-13} width={14} height={26} rx={6} fill="#4a2a12" />
    <rect x={30} y={-9} width={120} height={18} fill="#2a2a32" opacity={0.85} />
  </g>
);
const Heart: React.FC<{k: number}> = ({k}) => (
  <g transform={`scale(${1 + 0.28 * k})`}>
    <path d="M 0 22 C -40 -6 -30 -38 0 -22 C 30 -38 40 -6 0 22 Z" fill="#ff4f5e" stroke="#1b1b22" strokeWidth={5} />
  </g>
);
const Burst: React.FC<{k: number; col: string; r: number}> = ({k, col, r}) => {
  if (k <= 0 || k >= 1) return null;
  const pts = Array.from({length: 20}).map((_, j) => {
    const a = (j / 20) * Math.PI * 2;
    const rr = (j % 2 ? 0.45 : 1) * r * (0.6 + 0.4 * k);
    return `${Math.cos(a) * rr},${Math.sin(a) * rr}`;
  }).join(' ');
  return <polygon points={pts} fill={col} stroke="#1b1b22" strokeWidth={5} opacity={1 - k * k} />;
};

/* a magnifier: re-draws `children` scaled about (cx,cy) inside a circle */
const Lens: React.FC<{id: string; cx: number; cy: number; r: number; z: number; k: number; label: string; children: React.ReactNode}> = ({id, cx, cy, r, z, k, label, children}) => {
  if (k <= 0) return null;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`}>
      <defs><clipPath id={id}><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
      <line x1={cx + r * 0.7} y1={cy + r * 0.7} x2={cx + r * 1.25} y2={cy + r * 1.25} stroke="#1b1b22" strokeWidth={30} strokeLinecap="round" />
      <g clipPath={`url(#${id})`}>
        <circle cx={cx} cy={cy} r={r} fill={WALL} />
        <g transform={`translate(${cx} ${cy}) scale(${z}) translate(${-cx} ${-cy})`}>{children}</g>
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1b1b22" strokeWidth={14} />
      <circle cx={cx} cy={cy} r={r - 9} fill="none" stroke="#fff" strokeWidth={3} opacity={0.6} />
      <g transform={`translate(${cx} ${cy + r + 48})`}>
        <rect x={-110} y={-34} width={220} height={52} rx={10} fill="#1b1b22" />
        <text x={0} y={4} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={34} fill="#ffd23f">{label}</text>
      </g>
    </g>
  );
};

/* ───────────── composition ───────────── */
export const Blood: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const T = (k: string) => at(plan, k);
  const LS = plan.lineStarts;
  const LE = plan.lineEnds;
  const li = lineAt(plan, s);
  const tTest = LE[6] + 0.05;
  const tWipe = T('wipe');

  // ── director
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 960, z: 1, r: 0, ...c});
  shot(0, 0.01, {x: 560, y: 1080, z: 1.08});
  shot(0.05, 3.6, {x: 540, y: 1070, z: 1.0});
  shot(LS[1], 0.4, {x: 540, y: 1060, z: 1.0});
  shot(T('strings') - 0.2, 0.7, {x: O[0] + 30, y: O[1] - 40, z: 1.18});
  shot(LS[8], 0.6, {x: 520, y: 1010, z: 1.06});
  shot(T('gap') - 0.1, 0.5, {x: VX - 40, y: 1080, z: 1.3});
  shot(LS[10], 0.7, {x: 540, y: 1060, z: 1.0});
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const kick = (t0: number, amp: number, decay: number) => (s >= t0 ? amp * Math.exp(-(s - t0) * decay) : 0);
  const shake = kick(T('test'), 10, 7) + kick(T('answer'), 8, 7) + kick(T('three'), 8, 7) + kick(T('nine'), 10, 6) + kick(T('blow'), 6, 8) + kick(T('mist'), 5, 8);
  const shx = Math.sin(frame * 2.3) * shake;
  const shy = Math.cos(frame * 2.9) * shake;
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + shx}px, ${960 - cam.y + shy}px) scale(${cam.z})`};

  // ── which stains are on the wall
  const lessonFade = (i: number) => (li === i ? 1 : li === i + 1 ? 1 - clamp01((s - LS[i + 1]) / 0.25) : 0);
  const testOn = s < tWipe + 0.6 || s >= T('test');
  const testStamp = (st: St) => (s < T('test') ? -1 : T('test') + rnd(st.id * 0.37) * 0.35);
  const wipeX = s < tWipe ? -1 : lerp(PX0 - 60, PX1 + 60, ease(clamp01((s - tWipe) / 0.55)));
  const mist = mistAt(T('mist'));
  const spray = sprayAt(T('spray'));
  const cast = castOff(C_R, 330, 212, 36, 40, LS[4] + 0.25, 0.7);
  const beats = Array.from({length: 5}).map((_, i) => LS[5] + 0.2 + i * 0.62);
  const zig = zigAt(beats);
  const batK = clamp01((s - (LS[4] + 0.2)) / 0.8);
  const batOn = s >= LS[4] && s < T('swing') + 0.9;
  const batAng = lerp(332, 208, ease(batK));
  const heartK = beats.reduce((m, tb) => Math.max(m, s >= tb && s < tb + 0.35 ? 1 - (s - tb) / 0.35 : 0), 0);

  // shape lesson (side view + what you see)
  const roundU = clamp01((s - T('round')) / 0.38);
  const longU = clamp01((s - T('long')) / 0.38);
  const shapeLesson = lessonFade(1) > 0 ? (
    <g opacity={lessonFade(1)}>
      <rect x={100} y={700} width={880} height={640} rx={22} fill="#fff" stroke="#1b1b22" strokeWidth={6} />
      <text x={130} y={752} fontFamily={MONO} fontWeight={900} fontSize={28} fill="#7a7264">SIDE VIEW</text>
      <rect x={130} y={960} width={820} height={14} fill="#8a8172" />
      <text x={130} y={1040} fontFamily={MONO} fontWeight={900} fontSize={28} fill="#7a7264">THE STAIN IT LEAVES</text>
      {/* drop 1: straight down */}
      {s >= T('round') ? <line x1={330} y1={760} x2={330} y2={958} stroke="#9aa3ae" strokeWidth={4} strokeDasharray="10 10" /> : null}
      {s >= T('round') && roundU < 1 ? <path transform={`translate(330 ${lerp(770, 950, roundU)})`} d="M 0 -26 Q 15 -2 0 10 Q -15 -2 0 -26 Z" fill={BLOOD} /> : null}
      {roundU >= 1 ? (
        <g>
          <ellipse cx={330} cy={958} rx={30} ry={6} fill={BLOOD} />
          <Stain st={{x: 330, y: 1180, r: 50, dir: 0, e: 1, t: T('round') + 0.38, id: 1}} s={s} />
          <text x={330} y={1300} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={54} fill="#1b1b22" transform={`translate(330 1280) scale(${pop(s, T('round') + 0.4)}) translate(-330 -1280)`}>90°</text>
        </g>
      ) : null}
      {/* drop 2: at a low angle */}
      {s >= T('long') ? <line x1={480} y1={770} x2={720} y2={958} stroke="#9aa3ae" strokeWidth={4} strokeDasharray="10 10" /> : null}
      {s >= T('long') && longU < 1 ? <path transform={`translate(${lerp(490, 712, longU)} ${lerp(778, 952, longU)}) rotate(-52)`} d="M 0 -26 Q 15 -2 0 10 Q -15 -2 0 -26 Z" fill={BLOOD} /> : null}
      {longU >= 1 ? (
        <g>
          <ellipse cx={740} cy={958} rx={56} ry={6} fill={BLOOD} />
          <path d="M 790 958 A 70 70 0 0 0 776 916" fill="none" stroke="#1b1b22" strokeWidth={4} />
          <Stain st={{x: 700, y: 1180, r: 38, dir: 0, e: 2.2, t: T('long') + 0.38, id: 2}} s={s} />
          <text x={700} y={1300} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={54} fill="#1b1b22" transform={`translate(700 1280) scale(${pop(s, T('long') + 0.4)}) translate(-700 -1280)`}>27°</text>
        </g>
      ) : null}
      {s >= T('tail') ? (
        <g transform={`translate(700 1100) scale(${pop(s, T('tail'))}) translate(-700 -1100)`}>
          <path d="M 600 1100 L 860 1100 L 860 1082 L 900 1110 L 860 1138 L 860 1120 L 600 1120 Z" fill="#ffd23f" stroke="#1b1b22" strokeWidth={5} />
          <text x={740} y={1080} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={30} fill="#1b1b22">FLYING THIS WAY</text>
        </g>
      ) : null}
    </g>
  ) : null;

  // the lens is reused by the mist lesson
  const lensK = li === 2 ? clamp01((s - (T('mist') + 0.75)) / 0.25) * lessonFade(2) : 0;
  const LENS: [number, number] = [640, 1010];

  // ── test overlays
  const strK = (i: number) => clamp01((s - (T('strings') + i * 0.08)) / 0.7);
  const showStrings = s >= T('strings') && li <= 8;
  const strings = showStrings ? (
    <g>
      {STRINGS.map((st, i) => {
        const k = ease(strK(i));
        if (k <= 0) return null;
        const ex = lerp(st.x, O[0], k);
        const ey = lerp(st.y, O[1], k);
        return (
          <g key={i}>
            <line x1={st.x} y1={st.y} x2={ex} y2={ey} stroke="#1b1b22" strokeWidth={8} strokeLinecap="round" />
            <line x1={st.x} y1={st.y} x2={ex} y2={ey} stroke="#ff2e47" strokeWidth={4} strokeLinecap="round" />
            <circle cx={st.x} cy={st.y} r={7} fill="#fff" stroke="#1b1b22" strokeWidth={3} />
          </g>
        );
      })}
      {s >= T('origin') ? (
        <g transform={`translate(${O[0]} ${O[1]}) scale(${pop(s, T('origin'))})`}>
          <circle r={34 + 6 * Math.sin(s * 8)} fill="none" stroke="#ffd23f" strokeWidth={8} />
          <circle r={10} fill="#ffd23f" stroke="#1b1b22" strokeWidth={4} />
        </g>
      ) : null}
    </g>
  ) : null;
  const arcOverlay = (j: number, kind: string) => {
    if (s < T(kind) || li !== 8) return null;
    const A = ARCS[j];
    const k = clamp01((s - T(kind)) / 0.5);
    const a1 = lerp(A.a0, A.a1, k);
    const [x0, y0] = arcPt(A.R, A.a0);
    const [x1, y1] = arcPt(A.R, a1);
    const [lx, ly] = arcPt(A.R + 52, lerp(A.a0, A.a1, 0.45));
    return (
      <g key={kind}>
        <path d={`M ${x0} ${y0} A ${A.R} ${A.R} 0 0 0 ${x1} ${y1}`} fill="none" stroke="#ffd23f" strokeWidth={9} strokeDasharray="20 14" strokeLinecap="round" opacity={0.95} />
        <g transform={`translate(${lx} ${ly}) scale(${pop(s, T(kind))})`}>
          <circle r={30} fill="#ffd23f" stroke="#1b1b22" strokeWidth={6} />
          <text y={13} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={36} fill="#1b1b22">{j + 1}</text>
        </g>
      </g>
    );
  };
  const gapK = s >= T('gap') && li >= 9 ? clamp01((s - T('gap')) / 0.4) : 0;
  const ghostK = s >= T('stood') && li >= 9 ? clamp01((s - T('stood')) / 0.5) : 0;

  // ── UI: the card
  const answered = s >= T('answer');
  const left = Math.max(0, TEST_SECS - Math.max(0, s - tTest));
  const secs = Math.ceil(left - 1e-6);
  const counting = s >= tTest && s < tTest + TEST_SECS;
  const urgent = counting && secs <= 2;
  const ringK = s < tTest ? 1 : left / TEST_SECS;
  const LESSONS: Array<[string, string, string]> = [
    ['SHAPE', 'ROUND = STRAIGHT DOWN', 'LONG = ANGLED · TAIL = DIRECTION'],
    ['MIST', 'UNDER 1 mm', 'UNDER 1 mm → GUNSHOT'],
    ['SPRAY', '1–4 mm, ONE SPOT', '1–4 mm, ONE SPOT → BLOW'],
    ['CAST-OFF', 'CURVED LINE', 'CURVED LINE → SWINGING WEAPON'],
    ['ZIGZAG', 'WAVES', '1 WAVE = 1 HEARTBEAT → ARTERY'],
  ];
  const LESSON_CUE = ['tail', 'gun', 'blow', 'swing', 'beat'];
  const OPTS: Array<[string, string]> = [['A', 'GUNSHOT'], ['B', 'HEAVY BLOW'], ['C', 'CUT ARTERY']];
  const header = li === 0 ? 'BLOOD SPATTER 101' : li <= 5 ? `THE CODE · ${li}/5` : li <= 7 ? (answered ? 'THE ANSWER' : 'YOUR TURN') : li === 8 ? 'HOW MANY HITS?' : li === 9 ? 'THE GAP' : 'TV VS REAL';
  const hits: Array<[string, string]> = [['ARC 1', 'arc1'], ['ARC 2', 'arc2'], ['1ST HIT', 'first'], ['= 3+', 'three']];
  const bigText = (t: string, col = '#1b1b22', sz = 52) => <div style={{position: 'absolute', left: 26, top: 60, width: 790, fontFamily: heavy, fontWeight: 900, fontSize: sz, lineHeight: 1.05, color: col, whiteSpace: 'nowrap'}}>{t}</div>;
  const subText = (t: string) => <div style={{position: 'absolute', left: 28, top: 126, width: 790, fontFamily: MONO, fontWeight: 900, fontSize: 27, color: '#5a6070', whiteSpace: 'nowrap'}}>{t}</div>;
  let body: React.ReactNode = null;
  if (li === 0) body = <>{bigText('HOW DID THEY DIE?', '#b3101f', 58)}{subText('LEARN THE CODE, THEN YOU TRY')}</>;
  else if (li <= 5) {
    const [name, a, b] = LESSONS[li - 1];
    const done = s >= T(LESSON_CUE[li - 1]);
    body = (
      <>
        {bigText(name)}
        {subText(done ? b : a)}
        {Array.from({length: 5}).map((_, k) => (
          <div key={k} style={{position: 'absolute', left: 560 + k * 54, top: 70, width: 40, height: 40, borderRadius: 20, border: '5px solid #1b1b22', boxSizing: 'border-box',
            background: k < li ? '#b3101f' : '#e2ddd2', transform: `scale(${k === li - 1 ? pop(s, LS[li]) : 1})`}} />
        ))}
      </>
    );
  } else if (li <= 7) {
    body = (
      <>
        {OPTS.map(([L, txt], k) => {
          const right = k === 1;
          const col = answered ? (right ? '#7be07b' : '#e2ddd2') : '#fff';
          return (
            <div key={L} style={{position: 'absolute', left: 20 + k * 214, top: 62, width: 200, height: 98, borderRadius: 12, background: col, border: '5px solid #1b1b22', boxSizing: 'border-box',
              transform: `scale(${answered && right ? pop(s, T('answer')) : s >= T('ask') ? pop(s, T('ask') + k * 0.08) : 0.0001})`, opacity: answered && !right ? 0.5 : 1}}>
              <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 40, textAlign: 'center', lineHeight: '46px', color: '#1b1b22'}}>{answered && right ? '✓ ' : ''}{L}</div>
              <div style={{fontFamily: MONO, fontWeight: 900, fontSize: 22, textAlign: 'center', color: '#1b1b22', textDecoration: answered && !right ? 'line-through' : 'none'}}>{txt}</div>
            </div>
          );
        })}
        <svg width={150} height={150} style={{position: 'absolute', left: 676, top: 36}}>
          <circle cx={75} cy={75} r={56} fill={urgent ? '#ffe0e0' : '#fff'} stroke="#d8d2c4" strokeWidth={12} />
          <circle cx={75} cy={75} r={56} fill="none" stroke={urgent ? '#ff4f5e' : '#2a8a5a'} strokeWidth={12} strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 56 * ringK} 999`} transform="rotate(-90 75 75)" />
          <text x={75} y={93} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={54} fill={urgent ? '#d6293a' : '#1b1b22'}>{answered ? '✓' : s < tTest ? TEST_SECS : secs}</text>
        </svg>
      </>
    );
  } else if (li === 8) {
    body = hits.map(([txt, kind], k) => {
      const on = s >= T(kind);
      return (
        <div key={txt} style={{position: 'absolute', left: 20 + k * 204, top: 66, width: 186, height: 86, borderRadius: 12, border: '5px solid #1b1b22', boxSizing: 'border-box',
          background: on ? (k === 3 ? '#ff4f5e' : '#ffd23f') : '#e2ddd2', fontFamily: heavy, fontWeight: 900, fontSize: 36, lineHeight: '76px', textAlign: 'center',
          color: on ? '#1b1b22' : '#aaa39a', transform: `scale(${on ? pop(s, T(kind)) : 1})`}}>{on ? txt : '?'}</div>
      );
    });
  } else if (li === 9) body = <>{bigText('SOMEONE STOOD HERE')}{subText('THEY BLOCKED THE SPRAY')}</>;
  else body = <>{bigText(s >= T('nine') ? 'WRONG ~1 IN 9' : 'TV: NEVER WRONG', s >= T('nine') ? '#b3101f' : '#1b1b22')}{subText(s >= T('study') ? '75 ANALYSTS · HICKLIN ET AL. 2021' : 'REAL LIFE?')}</>;
  const card = (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 176, background: '#f4f1ea', borderRadius: 14, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 840, height: 46, background: '#2a0d12', display: 'flex', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: '#ff4f5e'}} />
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: '#f4f1ea'}}>{header}</span>
      </div>
      {body}
    </div>
  );
  const note = li === 2 || li === 3 ? '* RULES OF THUMB, NOT LAWS' : li === 10 && s >= T('study') ? 'FORENSIC SCIENCE INTERNATIONAL, 2021' : '';

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
    capSize = Math.min(cap.hot ? 120 : 104, capWrap ? 820 / (longest * 0.78) : one);
  }
  const capPop = cap ? 0.55 + 0.45 * spring({frame: frame - Math.round(cap.start * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;

  const slam = s >= T('answer') && s < T('answer') + 0.9 ? <Slam k={(s - T('answer')) / 0.9} text="B!" color="#7be07b" size={190} top={1330} />
    : s >= T('three') && s < T('three') + 1.1 ? <Slam k={(s - T('three')) / 1.1} text="3+ HITS" color="#ffd23f" size={140} top={1360} />
    : s >= T('nine') ? <Slam k={Math.min(0.5, (s - T('nine')) / 1.2)} text="1 IN 9" color="#ff4f5e" size={170} top={1330} /> : null;
  const late = s >= tTest + TEST_SECS && s < T('answer');
  const ticks = Array.from({length: TEST_SECS}).map((_, k) => tTest + k);
  const finalDim = s >= T('tv') ? clamp01((s - T('tv')) / 0.6) : 0;

  return (
    <AbsoluteFill style={{background: '#101219', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 58%, #2a1418 0%, #101219 70%)'}} />
      <div style={{position: 'absolute', inset: 0, filter: finalDim ? `saturate(${1 - 0.5 * finalDim})` : undefined}}>
        <div style={camStyle}>
          <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0, overflow: "visible"}}>
            <Wall />
            <Scale x={PX0 + 30} y={BASE - 20} />
            {/* the test wall (hook + test) */}
            {testOn ? (
              <g>
                <defs><clipPath id="wipeclip"><rect x={wipeX} y={0} width={W * 2} height={H} /></clipPath></defs>
                <g clipPath={wipeX > -1 && s < T('test') ? 'url(#wipeclip)' : undefined}>
                  {TEST_SPRAY.map((st) => <Stain key={st.id} st={{...st, t: testStamp(st)}} s={s} />)}
                  {TEST_ARCS.flat().map((st) => <Stain key={st.id} st={{...st, t: testStamp(st)}} s={s} />)}
                </g>
                {wipeX > -1 && s < tWipe + 0.6 ? <rect x={wipeX - 16} y={PY0 - 10} width={32} height={BASE - PY0 + 20} rx={10} fill="#ffd23f" stroke="#1b1b22" strokeWidth={5} /> : null}
              </g>
            ) : null}
            {/* hook: fresh drops land in the first half-second */}
            {s < 1.2 ? <Stains list={[0, 1, 2, 3, 4].map((j) => ({x: O[0] - 120 + j * 70, y: O[1] - 260 + rnd(j) * 60, r: 7 + rnd(j * 3) * 3, dir: -60 + j * 30, e: 1.6, t: 0.2 + j * 0.07, sx: O[0], sy: O[1], fly: 0.15, id: 90 + j}))} s={s} /> : null}
            {/* lessons */}
            {shapeLesson}
            {lessonFade(2) > 0 ? (
              <g opacity={lessonFade(2)}>
                <Stains list={mist} s={s} />
                <g transform={`translate(${M_SRC[0]} ${M_SRC[1]})`}><Burst k={clamp01((s - T('mist')) / 0.4)} col="#fff4c8" r={70} /></g>
                {s >= T('gun') ? (
                  <g transform={`translate(${M_SRC[0]} ${M_SRC[1] - 110}) scale(${pop(s, T('gun'))})`}>
                    <rect x={-90} y={-36} width={180} height={60} rx={12} fill="#1b1b22" />
                    <text y={8} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={36} fill="#ffd23f">GUNSHOT</text>
                  </g>
                ) : null}
              </g>
            ) : null}
            {lessonFade(3) > 0 ? (
              <g opacity={lessonFade(3)}>
                <Stains list={spray} s={s} />
                <g transform={`translate(${S_SRC[0]} ${S_SRC[1]})`}><Burst k={clamp01((s - T('spray')) / 0.35)} col="#ffd23f" r={60} /></g>
                {s >= T('blow') ? (
                  <g transform={`translate(${S_SRC[0]} ${S_SRC[1] + 380}) scale(${pop(s, T('blow'))})`}>
                    <rect x={-130} y={-36} width={260} height={60} rx={12} fill="#1b1b22" />
                    <text y={8} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={36} fill="#ffd23f">HEAVY BLOW</text>
                  </g>
                ) : null}
              </g>
            ) : null}
            {lessonFade(4) > 0 ? (
              <g opacity={lessonFade(4)}>
                <Stains list={cast} s={s} />
                {s >= T('swing') ? (
                  <g opacity={clamp01((s - T('swing')) / 0.3)}>
                    <path d={`M ${C_PIV[0] + (C_R + 70) * Math.cos(325 / DEG)} ${C_PIV[1] + (C_R + 70) * Math.sin(325 / DEG)} A ${C_R + 70} ${C_R + 70} 0 0 0 ${C_PIV[0] + (C_R + 70) * Math.cos(222 / DEG)} ${C_PIV[1] + (C_R + 70) * Math.sin(222 / DEG)}`}
                      fill="none" stroke="#1b1b22" strokeWidth={10} strokeDasharray="22 14" />
                    <g transform={`translate(${C_PIV[0] + (C_R + 70) * Math.cos(222 / DEG)} ${C_PIV[1] + (C_R + 70) * Math.sin(222 / DEG)}) rotate(${222 - 90})`}>
                      <path d="M -26 -6 L 0 30 L 26 -6 Z" fill="#1b1b22" />
                    </g>
                  </g>
                ) : null}
                {batOn ? (
                  <g opacity={s > T('swing') + 0.4 ? 1 - clamp01((s - T('swing') - 0.4) / 0.5) : 1}>
                    {batK > 0 && batK < 1 ? (
                      <path d={`M ${C_PIV[0]} ${C_PIV[1]} L ${C_PIV[0] + (C_R + 20) * Math.cos(lerp(batAng + 22, batAng, 0) / DEG)} ${C_PIV[1] + (C_R + 20) * Math.sin((batAng + 22) / DEG)} A ${C_R + 20} ${C_R + 20} 0 0 0 ${C_PIV[0] + (C_R + 20) * Math.cos(batAng / DEG)} ${C_PIV[1] + (C_R + 20) * Math.sin(batAng / DEG)} Z`}
                        fill="#8a5a2a" opacity={0.25} />
                    ) : null}
                    <g transform={`translate(${C_PIV[0]} ${C_PIV[1]}) rotate(${batAng})`}><Bat /></g>
                  </g>
                ) : null}
              </g>
            ) : null}
            {lessonFade(5) > 0 ? (
              <g opacity={lessonFade(5)}>
                <Stains list={zig} s={s} />
                <g transform="translate(900 760)"><Heart k={heartK} /></g>
                {s >= T('beat') ? (
                  <g transform={`translate(540 1420) scale(${pop(s, T('beat'))})`}>
                    <rect x={-150} y={-36} width={300} height={60} rx={12} fill="#1b1b22" />
                    <text y={8} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={34} fill="#ffd23f">1 WAVE = 1 BEAT</text>
                  </g>
                ) : null}
              </g>
            ) : null}
            {/* the answer, proved on the wall */}
            {strings}
            {arcOverlay(0, 'arc1')}
            {arcOverlay(1, 'arc2')}
            {s >= T('first') && li === 8 ? (
              <g transform={`translate(${O[0]} ${O[1] + 120}) scale(${pop(s, T('first'))})`}>
                <rect x={-150} y={-38} width={300} height={64} rx={12} fill="#ff4f5e" stroke="#1b1b22" strokeWidth={5} />
                <text y={8} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={34} fill="#1b1b22">+1 FIRST HIT</text>
              </g>
            ) : null}
            {gapK > 0 ? (
              <g>
                <path d={VOID_PATH} fill="#1b1b22" fillRule="nonzero" opacity={0.42 * ghostK} />
                <path d={VOID_PATH} fill="#ffd23f" opacity={(0.12 + 0.08 * Math.sin(s * 7)) * gapK} />
                <path d={VOID_PATH} fill="none" stroke="#ffd23f" strokeWidth={7} strokeDasharray="18 12" opacity={gapK} />
                {ghostK > 0 ? (
                  <g transform={`translate(${VX + 170} ${VHY + 10}) scale(${pop(s, T("stood"))})`}>
                    <rect x={-80} y={-34} width={160} height={58} rx={12} fill="#ffd23f" stroke="#1b1b22" strokeWidth={5} />
                    <text y={8} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={36} fill="#1b1b22">HERE</text>
                  </g>
                ) : null}
              </g>
            ) : null}
            {/* the mist lens */}
            <Lens id="mistlens" cx={LENS[0]} cy={LENS[1]} r={150} z={4} k={lensK} label="< 1 mm">
              <Stains list={mist} s={s} />
            </Lens>
          </svg>
        </div>
      </div>
      {late ? <div style={{position: 'absolute', left: 0, top: 1330, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: 110, color: '#fff', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill', transform: `rotate(-3deg) scale(${pop(s, tTest + TEST_SECS)})`}}>TIME!</div> : null}
      {s < T('answer') && li >= 6 ? <div style={{position: 'absolute', left: 120, top: 420, width: 840 * ringK, height: 10, borderRadius: 5, background: urgent ? '#ff4f5e' : '#ffd23f'}} /> : null}
      {card}
      {note ? <div style={{position: 'absolute', left: 120, top: 432, width: 840, textAlign: 'center', fontFamily: MONO, fontWeight: 900, fontSize: 24, color: '#d8d2c4'}}>{note}</div> : null}
      {cap ? (
        <div style={{position: 'absolute', top: 486, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
          fontSize: capSize, lineHeight: 1.0, color: cap.hot ? '#ff4f5e' : '#ffffff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`,
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
      {beats.map((t, k) => (
        <Sequence key={`b${k}`} from={Math.round(t * FPS)} durationInFrames={30}><Audio src={staticFile('sfx/punch.wav')} volume={0.35} /></Sequence>
      ))}
      {([
        [0.2, 'sfx/pop.wav', 0.6], [tWipe, 'sfx/whoosh.wav', 0.6], [T('round') + 0.38, 'sfx/pop.wav', 0.7], [T('long') + 0.38, 'sfx/pop.wav', 0.7], [T('tail'), 'sfx/ding.wav', 0.45],
        [T('mist'), 'sfx/crack.wav', 0.55], [T('mist') + 0.75, 'sfx/shine.wav', 0.4], [T('gun'), 'sfx/ding.wav', 0.5],
        [T('spray'), 'sfx/punch.wav', 0.75], [T('blow'), 'sfx/ding.wav', 0.5], [LS[4] + 0.2, 'sfx/whoosh.wav', 0.8], [T('swing'), 'sfx/ding.wav', 0.45],
        [T('test'), 'sfx/slam.wav', 0.8], [tTest + TEST_SECS, 'sfx/fail.wav', 0.5], [T('answer'), 'sfx/ding.wav', 0.8], [T('answer'), 'sfx/shine.wav', 0.6],
        [T('strings'), 'sfx/whoosh.wav', 0.5], [T('origin'), 'sfx/pop.wav', 0.7], [T('arc1'), 'sfx/ding.wav', 0.5], [T('arc2'), 'sfx/ding.wav', 0.55],
        [T('first'), 'sfx/pop.wav', 0.6], [T('three'), 'sfx/slam.wav', 0.8], [T('gap'), 'sfx/shine.wav', 0.6], [T('stood'), 'sfx/boom.wav', 0.5],
        [T('study'), 'sfx/printer.wav', 0.35], [T('nine'), 'sfx/slam.wav', 0.85], [T('nine') + 0.1, 'sfx/fail.wav', 0.45],
      ] as Array<[number, string, number]>).map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round(t * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
