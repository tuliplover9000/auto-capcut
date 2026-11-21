import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Slam} from '../fight/Fight';
import {camAt, Shot} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {FPS, StoryEpisode, at, buildPlan, lineAt} from '../story/timeline';
import {HAIRS, Look, PANTS, Person, Pose, SHIRTS, SKINS} from '../observe/art';
import {BeachBall, Cooler, Crab, GUARD_FEET, IceCart, Palm, Sandcastle, Seagull, Surfboard, TOWER_PIVOT, Towel, Tower, UMB_C, Umbrella, VolleyNet} from './beach-art';

// CHAIN REACTION #4: the beach. Hook: "in 15 s this sandcastle gets flattened,
// find what starts it". New twist vs #13/#15/#16: the chain starts BEFORE THE
// TIMER. One big wave, in the far top-left corner, rolls a crab out of its hole
// while the narrator is still saying "find what starts it". Viewers who spot
// the crab during the countdown are wrong, and the reveal says so ("Nope").
// Hard-mode rules carry over: chain events are SILENT during the search, only
// decoys make noise; a mirrored decoy wave + crab in the opposite corner; one
// static wide shot; no shake until the crash.
// Chain: wave -> crab -> sunbather -> umbrella -> surfer -> surfboard ->
// beach ball -> lifeguard -> tower -> SANDCASTLE. Pure function of world clock w
// (w = 0 when the countdown starts; negative during the hook).
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';

const W = 1080;
const H = 1920;
const FLOOR = 760;
const SHORE = 892;
const SEARCH = 15;
const N_EXTRAS = 58;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const outQ = (x: number) => 1 - (1 - x) * (1 - x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const pick = <T,>(arr: T[], r: number) => arr[Math.floor(r * arr.length) % arr.length];
const pop = (s: number, t0: number, d = 0.35) => (s < t0 ? 0 : 1 + 0.25 * Math.sin(clamp01((s - t0) / d) * Math.PI) * (1 - clamp01((s - t0) / d)));
const kAt = (y: number) => 1.15 + 0.75 * ((y - FLOOR) / 1100);
const mod = (a: number, n: number) => ((a % n) + n) % n;
type P = [number, number];
const path = (keys: Array<[number, number, number]>, w: number, e: (x: number) => number = (x) => x): P => {
  if (w <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) {
    if (w < keys[i][0]) {
      const u = e((w - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
      return [lerp(keys[i - 1][1], keys[i][1], u), lerp(keys[i - 1][2], keys[i][2], u)];
    }
  }
  const l = keys[keys.length - 1];
  return [l[1], l[2]];
};
const rot = (p: P, deg: number, c: P): P => {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};

/* ───────────── the chain (world-time) ───────────── */
const HOLE: P = [120, 912];
const SUN: P = [196, 950];
const UMB: P = [300, 938];
const SURF_Y = 1012;
const KIDB: P = [830, 1330];
const TOWER: P = [320, 1292];
const CASTLE: P = [525, 1294];
const BUILDER: P = [632, 1302];
const T_WAVE = -1.0;
const T_PINCH = 0.4;
const T_KICK = 1.0;
const T_TUMBLE = 1.35;
const T_SWEEP = 5.0;
const T_DROP = 5.08;
const T_SMACK = 6.0;
const T_BONK = 8.8;
const T_ROCK = 9.2;
const T_TIP = 10.6;
const T_CRASH = 12.1;
const T_CHILL = 15.5;

// the waves: ambient lapping + the real big wave (left) + a decoy big wave (right) that comes first
const bump = (w: number, peak: number) => (w < peak - 0.6 ? 0 : w < peak ? ease((w - peak + 0.6) / 0.6) : w < peak + 0.8 ? 1 - ease((w - peak) / 0.8) : 0);
const T_DWAVE = -2.3;
const shoreY = (x: number, w: number) =>
  SHORE + 4 * Math.sin(x * 0.021 + w * 1.3) + 5 * Math.max(0, Math.sin(w * 0.8 + x * 0.004)) +
  34 * bump(w, T_WAVE) * Math.exp(-(((x - 130) / 110) ** 2)) + 30 * bump(w, T_DWAVE) * Math.exp(-(((x - 960) / 110) ** 2));

const crabAt = (w: number): {x: number; y: number; r: number; hide: boolean; walk?: number; snap: number; up: number; shades: boolean} => {
  const base = {r: 0, hide: false, snap: 0, up: 0, shades: false};
  if (w >= T_CHILL) return {...base, x: 224, y: 953, up: 0.6 + 0.4 * Math.sin(w * 3), shades: true};
  if (w < T_WAVE) return {...base, x: HOLE[0], y: HOLE[1], hide: true};
  if (w < -0.7) {
    const u = (w - T_WAVE) / 0.3;
    return {...base, x: lerp(HOLE[0], 140, u), y: lerp(HOLE[1], 930, u) - Math.sin(u * Math.PI) * 16, r: 360 * u, up: 0.5};
  }
  if (w < 0.3) {
    const u = (w + 0.7) / 1.0;
    return {...base, x: lerp(140, 186, u), y: lerp(930, 951, u), walk: w * 34};
  }
  if (w < 1.4) return {...base, x: 186, y: 951, snap: w < 0.6 ? Math.abs(Math.sin((w - 0.3) * 30)) : 0, up: w < 0.6 ? 0.4 : 1};
  if (w < 3.6) {
    const u = (w - 1.4) / 2.2;
    return {...base, x: lerp(186, HOLE[0], u), y: lerp(951, HOLE[1] + 2, u), walk: w * 30};
  }
  return {...base, x: HOLE[0], y: HOLE[1], hide: true};
};
const sunAt = (w: number): {x: number; y: number; r: number; pose: Pose} => {
  if (w < T_PINCH) return {x: SUN[0], y: SUN[1], r: 90, pose: {facing: 'front'}};
  if (w < 0.7) {
    const u = (w - T_PINCH) / 0.3;
    return {x: SUN[0] + 22 * u, y: SUN[1] - Math.sin(u * Math.PI) * 34, r: 90 * (1 - outQ(u)), pose: {facing: 'side', flail: w * 20, mouthO: true}};
  }
  if (w < T_KICK) {
    const u = (w - 0.7) / (T_KICK - 0.7);
    return {x: lerp(218, 272, u), y: SUN[1] - Math.abs(Math.sin(u * Math.PI * 2)) * 14, r: 0, pose: {facing: 'side', flail: w * 20, mouthO: true, reach: u > 0.7 ? 1 : 0}};
  }
  if (w < 2.6) {
    const u = (w - T_KICK) / 1.6;
    return {x: lerp(272, 236, u), y: SUN[1] - Math.abs(Math.sin(u * Math.PI * 5)) * 12, r: 0, pose: {facing: 'side', flail: w * 18, mouthO: true}};
  }
  return {x: 236, y: SUN[1], r: 0, pose: {facing: 'front', mouthO: true, bob: Math.sin(w * 3) * 0.6}};
};
const UMB_PATH: Array<[number, number, number]> = [[T_TUMBLE, 369, 913], [2.1, 470, 930], [2.7, 505, 937], [3.4, 610, 955], [4.25, 725, 975], [T_SWEEP, 828, 990], [5.5, 858, 1000], [6.2, 872, 1004]];
const umbAt = (w: number): {x: number; y: number; r: number; planted: boolean} => {
  if (w < T_KICK) return {x: UMB[0], y: UMB[1], r: Math.sin(w * 2) * 1.2, planted: true};
  if (w < T_TUMBLE) return {x: UMB[0], y: UMB[1] - 8 * clamp01((w - T_KICK) / 0.35), r: 70 * outQ((w - T_KICK) / 0.35), planted: true};
  const [x, y] = path(UMB_PATH, w);
  const r = 70 + (x - 369) * 1.3;
  return {x, y: y - Math.abs(Math.sin((r * Math.PI) / 180)) * 12 * (w < T_SWEEP ? 1 : 0), r, planted: false};
};
const surfX = (w: number) => 846 + 40 * (T_SWEEP - w);
const surferAt = (w: number): {x: number; y: number; rot: number; down: boolean} => {
  if (w < T_SWEEP) return {x: surfX(w), y: SURF_Y, rot: 0, down: false};
  const u = clamp01((w - T_SWEEP) / 0.4);
  return {x: lerp(846, 826, u), y: SURF_Y - Math.sin(u * Math.PI) * 30, rot: -84 * outQ(u), down: true};
};
const kSurf = kAt(SURF_Y);
const BOARD0: P = [846, SURF_Y - 30 * kSurf];
const kKidB = kAt(KIDB[1]) * 0.82;
const KB = 3.4;
const ballHeld = (w: number): P => [KIDB[0] - 14 * kKidB, KIDB[1] - (40 + Math.abs(Math.sin(w * KB)) * 34) * kKidB];
const BALL_LAUNCH = ballHeld(T_SMACK);
const boardAt = (w: number): {x: number; y: number; r: number; held: boolean} => {
  if (w < T_DROP) return {x: 0, y: 0, r: 0, held: true};
  if (w < T_SMACK) {
    const u = (w - T_DROP) / (T_SMACK - T_DROP);
    return {x: lerp(BOARD0[0], BALL_LAUNCH[0] + 20, u), y: lerp(BOARD0[1], BALL_LAUNCH[1] + 10, u) - Math.sin(u * Math.PI) * 120, r: -630 * u, held: false};
  }
  const u = clamp01((w - T_SMACK) / 0.55);
  return {x: lerp(BALL_LAUNCH[0] + 20, 868, outQ(u)), y: lerp(BALL_LAUNCH[1] + 10, KIDB[1] + 26, u) - Math.sin(u * Math.PI) * 30, r: lerp(-630, -720, outQ(u)), held: false};
};
const kTow = kAt(TOWER[1]);
const PIV: P = [TOWER[0] + TOWER_PIVOT[0] * kTow, TOWER[1]];
const towerTilt = (w: number) => {
  if (w < T_ROCK) return 0;
  if (w < T_TIP) return Math.sin((w - T_ROCK) * 9) * 7 * clamp01((w - T_ROCK) / 1.2) + 2 * clamp01((w - T_ROCK) / 1.4);
  const r0 = Math.sin((T_TIP - T_ROCK) * 9) * 7 + 2;
  if (w < T_CRASH) return lerp(r0, 90, Math.pow((w - T_TIP) / (T_CRASH - T_TIP), 2.2));
  const t = w - T_CRASH;
  return 90 - 5 * Math.sin(t * 14) * Math.exp(-t * 7);
};
const twr = (local: P, w: number): P => rot([TOWER[0] + local[0] * kTow, TOWER[1] + local[1] * kTow], towerTilt(w), PIV);
const HEAD_LOCAL: P = [GUARD_FEET[0], GUARD_FEET[1] - 50];
const ballAt = (w: number): {x: number; y: number; spin: number} => {
  if (w < T_SMACK) {
    const [x, y] = ballHeld(w);
    return {x, y, spin: w * 2};
  }
  const head = twr(HEAD_LOCAL, T_BONK);
  if (w < T_BONK) {
    const u = (w - T_SMACK) / (T_BONK - T_SMACK);
    return {x: lerp(BALL_LAUNCH[0], head[0], u), y: lerp(BALL_LAUNCH[1], head[1] - 12, u) - Math.sin(u * Math.PI) * 300, spin: T_SMACK * 2 - u * 9};
  }
  if (w < 9.6) {
    const u = (w - T_BONK) / 0.8;
    return {x: lerp(head[0], 182, u), y: lerp(head[1] - 12, 1290, u) - Math.sin(u * Math.PI) * 70, spin: -9 - u * 6};
  }
  const u = clamp01((w - 9.6) / 1.2);
  return {x: lerp(182, 128, outQ(u)), y: 1290 - Math.abs(Math.sin(u * Math.PI * 2)) * 18 * (1 - u), spin: -15 - outQ(u) * 6};
};

const LOOK_SUN: Look = {shirt: '#e2b48c', pants: '#ff9a1f', skin: '#e2b48c', hair: '#2a1d16', hairStyle: 0};
const LOOK_SURF: Look = {shirt: '#1b1b22', pants: '#1b1b22', skin: '#f1c9a5', hair: '#c98f3a', hairStyle: 1};
const LOOK_GUARD: Look = {shirt: '#e8312e', pants: '#e8312e', skin: '#a86e45', hair: '#1b1b22', hairStyle: 0, hat: 'cap', hatCol: '#f4f1ea', shades: true};
const LOOK_KIDB: Look = {shirt: '#7be07b', pants: '#3fa7ff', skin: '#d9a47c', hair: '#5a3a24', hairStyle: 0};
const LOOK_BUILD: Look = {shirt: '#ff6fd8', pants: '#2a3a5a', skin: '#f3d6bd', hair: '#c98f3a', hairStyle: 3, hat: 'cap', hatCol: '#ffd23f'};

type Ent = {x: number; y: number; key: string; el: React.ReactNode; sc?: number};

/* ───────────── decoys (they get the sounds) ───────────── */
const DHOLE: P = [968, 910];
const dcrabAt = (w: number): {x: number; y: number; hide: boolean; walk?: number; snap: number} => {
  if (w < -2.2 || w > 2.0) return {x: DHOLE[0], y: DHOLE[1], hide: true, snap: 0};
  const u = (w + 2.2) / 4.2;
  return {x: DHOLE[0] - 70 * Math.sin(u * Math.PI * 2), y: DHOLE[1] + 44 * Math.sin(u * Math.PI), hide: false, walk: w * 30, snap: Math.max(0, Math.sin(w * 6))};
};
const DVA: P = [150, 1640];
const DVB: P = [410, 1668];
const NET: P = [280, 1655];
const PASS0 = 0.5;
const PASS = 1.3;
const passBall = (w: number): P => {
  if (w < PASS0) return [DVA[0] + 10, DVA[1] - 70];
  const n = Math.floor((w - PASS0) / PASS);
  const u = clamp01(((w - PASS0) - n * PASS) / PASS);
  const [a, b] = n % 2 ? [DVB, DVA] : [DVA, DVB];
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - 70 - Math.sin(u * Math.PI) * 120];
};
const decoyHits = (until: number) => {
  const out: number[] = [];
  for (let t = PASS0; t < until; t += PASS) out.push(t);
  return out;
};
const GULLS: P[] = Array.from({length: 7}).map((_, i) => [600 + rnd(i * 4.1 + 9) * 170, 1515 + rnd(i * 2.7 + 9) * 55] as P);
const T_GULL = 7.4;
const DUMB: P = [965, 1452];
const T_GUST = 7.2;
const CART_Y = 1812;
const cartX = (w: number) => -90 + 112 * (w - 8.2);
const LOOK_DVA: Look = {shirt: '#ffd23f', pants: '#2f4a6a', skin: '#f3d6bd', hair: '#c98f3a', hairStyle: 1};
const LOOK_DVB: Look = {shirt: '#a86e45', pants: '#e8505b', skin: '#a86e45', hair: '#1b1b22', hairStyle: 0};
const LOOK_VEND: Look = {shirt: '#f4f1ea', pants: '#2a3a5a', skin: '#d9a47c', hair: '#1b1b22', hairStyle: 0, hat: 'cap', hatCol: '#ff4f5e'};
const LOOK_SEA: Look = {shirt: '#2f4a6a', pants: '#2f4a6a', skin: '#e2b48c', hair: '#5a3a24', hairStyle: 0};
const decoysAt = (w: number): Ent[] => {
  const n = w < PASS0 ? -1 : Math.floor((w - PASS0) / PASS);
  const hitA = n >= 0 && n % 2 === 0 && w - (PASS0 + n * PASS) < 0.3;
  const hitB = n >= 0 && n % 2 === 1 && w - (PASS0 + n * PASS) < 0.3;
  const dc = dcrabAt(w);
  const gullUp = w >= T_GULL;
  const gust = clamp01((w - T_GUST) / 0.3) * (1 - clamp01((w - T_GUST - 1.2) / 0.4));
  const ents: Ent[] = [
    {x: dc.x, y: dc.y, key: 'dcrab', el: dc.hide ? <CrabEyes /> : <Crab walk={dc.walk} snap={dc.snap} up={0.6} />},
    {x: DVA[0], y: DVA[1], key: 'dva', el: <Person L={LOOK_DVA} p={{facing: 'side', ear: hitA ? 1 : 0.2, bob: Math.sin(w * 2) * 0.4}} />},
    {x: DVB[0], y: DVB[1], key: 'dvb', el: <Person L={LOOK_DVB} p={{facing: 'side', flip: true, ear: hitB ? 1 : 0.2, bob: Math.sin(w * 2.2) * 0.4}} />},
    {x: NET[0], y: NET[1], key: 'net', el: <VolleyNet />},
    {x: DUMB[0], y: DUMB[1], key: 'dumb', el: <g transform={`rotate(${gust * 9 * Math.sin(w * 13)})`}><Umbrella col="#ff4f5e" flap={gust > 0 ? w * 20 : 0} /></g>},
    ...GULLS.map((p, i): Ent => {
      if (!gullUp) return {x: p[0], y: p[1], key: `gl${i}`, el: <g transform={`scale(${i % 2 ? -1 : 1} 1)`}><Seagull peck={w * 4 + i} /></g>};
      const u = Math.max(0, w - T_GULL - i * 0.05);
      const dx = (i % 2 ? -1 : 1) * (60 + i * 14) * u;
      return {x: p[0] + dx, y: p[1], key: `gl${i}`, el: <g transform={`translate(0 ${-u * (190 + i * 24)}) scale(${dx < 0 ? -1 : 1} 1)`}><Seagull fly={w * 26 + i} /></g>};
    }),
  ];
  const cx = cartX(w);
  if (w > 8.2 && cx < W + 120) {
    ents.push({x: cx, y: CART_Y, key: 'cart', el: <IceCart t={w} />});
    ents.push({x: cx - 52, y: CART_Y + 2, key: 'vend', el: <Person L={LOOK_VEND} p={{facing: 'side', walk: w * 8, reach: 0.8}} />});
  }
  return ents;
};
const CrabEyes: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={7} ry={2.6} fill="#5a4426" />
    {[-3, 3].map((x) => <circle key={x} cx={x} cy={-3} r={1.8} fill="#fff" stroke="#1b1b22" strokeWidth={0.5} />)}
  </g>
);

/* ───────────── beachgoers + props ───────────── */
const PROPS = [
  {x: 40, y: 1010, r: 40, el: <Palm s={1.0} />, key: 'palm1'},
  {x: 1046, y: 1240, r: 40, el: <Palm s={1.1} lean={-1} />, key: 'palm2'},
  {x: 1020, y: 1870, r: 50, el: <Palm s={1.25} lean={-1} />, key: 'palm3'},
  {x: 398, y: 1498, r: 30, el: <Cooler />, key: 'cool1'},
  {x: 716, y: 1706, r: 30, el: <Cooler col="#ff4f5e" />, key: 'cool2'},
  {x: 236, y: 954, r: 0, el: <Towel col="#ff4f5e" />, key: 'stowel'},
];
const KEEP_OUT: [number, number, number][] = (() => {
  const k: [number, number, number][] = [
    [HOLE[0], HOLE[1], 50], [SUN[0] + 40, SUN[1], 80], [UMB[0], UMB[1], 60], [KIDB[0], KIDB[1], 70], [TOWER[0], TOWER[1], 90], [CASTLE[0], CASTLE[1], 70],
    [BUILDER[0], BUILDER[1], 45], [DHOLE[0], DHOLE[1] + 20, 80], [DVA[0], DVA[1], 50], [DVB[0], DVB[1], 50], [NET[0], NET[1], 70], [DUMB[0], DUMB[1], 70],
    [680, 1540, 110], [182, 1290, 50], [128, 1295, 40],
    ...PROPS.map((p) => [p.x, p.y, p.r] as [number, number, number]),
  ];
  for (let u = 0; u <= 1; u += 0.2) k.push([lerp(HOLE[0], 190, u), lerp(HOLE[1], 955, u), 62]);
  for (let x = 300; x <= 1120; x += 40) k.push([x, lerp(935, 1012, clamp01((x - 300) / 560)), 46]);
  for (let u = 0; u <= 1; u += 0.1) k.push([lerp(846, 840, u), lerp(1010, 1330, u), 44]);
  for (let x = TOWER[0]; x <= 600; x += 40) k.push([x, TOWER[1], 50]);
  return k;
})();
type Extra = {look: Look; x: number; y: number; v: number; facing: 'front' | 'back' | 'side'; flip: boolean; phone: boolean; walk: boolean; lie: 0 | 1 | -1; towel: string; umb: string | null};
const EXTRAS: Extra[] = (() => {
  const out: Extra[] = [];
  for (let c = 0; c < 6000 && out.length < N_EXTRAS; c++) {
    const x = 30 + rnd(c * 7.13 + 2300) * 1020;
    const y = SHORE + 70 + rnd(c * 3.71 + 2300.5) * 950;
    const k = kAt(y);
    if (Math.abs(y - CART_Y) < 40) continue;
    const i = out.length;
    const r = (j: number) => rnd(i * 19.3 + j * 3.7 + 1800);
    const lie = r(20) < 0.38 ? (r(21) < 0.5 ? 1 : -1) : 0;
    const rad = lie ? 64 : 0;
    if (KEEP_OUT.some(([px, py, rr]) => Math.hypot(px - x - (lie ? lie * 30 * k : 0), (py - y) * 1.3) < rr + (8 + rad * 0.4) * k)) continue;
    if (out.some((o) => Math.hypot(o.x + (o.lie ? o.lie * 30 * kAt(o.y) : 0) - x - (lie ? lie * 30 * k : 0), (o.y - y) * 1.6) < (o.lie || lie ? 92 : 60) * k)) continue;
    const walk = !lie && y > 1700 && r(12) < 0.6;
    const shirtless = r(9) < 0.42;
    const skin = pick(SKINS, r(3));
    const look: Look = {
      shirt: shirtless ? skin : pick(SHIRTS, r(1)), pants: shirtless ? pick(['#ff4f5e', '#3fa7ff', '#ffd23f', '#2fb5a4', '#b45cff', '#1b1b22'], r(2)) : pick(PANTS, r(2)), skin, hair: pick(HAIRS, r(4)),
      hairStyle: (Math.floor(r(5) * 4) % 4) as 0 | 1 | 2 | 3, hat: r(6) < 0.2 ? 'cap' : null, hatCol: pick(['#f4f1ea', '#ff4f5e', '#2f4a6a', '#ffd23f'], r(7)),
      shades: r(10) < 0.35, bag: !shirtless && r(13) < 0.15 ? 'tote' : null, bagCol: pick(['#5a3a24', '#2f4a6a', '#8a5a3a'], r(11)),
    };
    const fr = r(14);
    out.push({look, x, y, v: (24 + r(15) * 30) * (r(16) < 0.5 ? -1 : 1), facing: fr < 0.55 ? 'front' : fr < 0.8 ? 'back' : 'side', flip: r(17) < 0.5, phone: r(18) < 0.25, walk, lie: lie as 0 | 1 | -1,
      towel: pick(['#3fa7ff', '#ffd23f', '#7be07b', '#b45cff', '#ff9fc8', '#2fb5a4', '#ff4f5e'], r(22)),
      umb: lie && r(23) < 0.55 ? pick(['#ff4f5e', '#3fa7ff', '#ffd23f', '#2fb5a4', '#ff4f5e'], r(24)) : null});
  }
  return out;
})();
const extrasAt = (w: number): Ent[] => EXTRAS.flatMap((e, i): Ent[] => {
  const shocked = w >= T_CRASH + 0.15 + (i % 5) * 0.06 && Math.hypot(e.x - CASTLE[0], e.y - CASTLE[1]) < 520;
  if (e.walk) {
    const x = mod(e.x + e.v * w, W + 200) - 100;
    return [{x, y: e.y, key: `e${i}`, el: <Person L={e.look} p={{facing: 'side', flip: e.v < 0, walk: w * (6 + Math.abs(e.v) / 9) + i, mouthO: shocked}} />}];
  }
  if (e.lie) {
    const k = kAt(e.y);
    const out: Ent[] = [{x: e.x, y: e.y, key: `e${i}`, el: (
      <g>
        <g transform={`translate(${e.lie * 28} 2)`}><Towel col={e.towel} w={38} /></g>
        <g transform={`rotate(${e.lie * 90})`}><Person L={e.look} p={{facing: 'front', mouthO: shocked}} /></g>
      </g>
    )}];
    if (e.umb) out.push({x: e.x + e.lie * 58 * k, y: e.y - 6, key: `u${i}`, el: <Umbrella col={e.umb} />});
    return out;
  }
  const p: Pose = shocked
    ? {facing: 'front', mouthO: true, bob: 0}
    : {facing: e.facing, flip: e.flip, phone: e.phone && e.facing !== 'back' ? 1 : 0, bob: Math.sin(w * 1.6 + i) * 0.5};
  return [{x: e.x, y: e.y, key: `e${i}`, el: <Person L={e.look} p={p} />}];
});

/* ───────────── the beach set ───────────── */
const Beach: React.FC<{w: number}> = ({w}) => {
  const xs: number[] = [];
  for (let x = -420; x <= W + 420; x += 16) xs.push(x);
  const edge = xs.map((x) => `${x},${shoreY(x, w)}`).join(' L ');
  const seaX = -100 + 52 * (w + 5);
  return (
    <>
      <defs>
        <linearGradient id="beach-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6ec6ff" />
          <stop offset="1" stopColor="#d4f0ff" />
        </linearGradient>
        <linearGradient id="beach-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f7fc8" />
          <stop offset="1" stopColor="#4fc0e4" />
        </linearGradient>
      </defs>
      <rect x={-420} y={0} width={W + 840} height={FLOOR} fill="url(#beach-sky)" />
      <circle cx={170} cy={668} r={70} fill="#fff6c2" opacity={0.5} />
      <circle cx={170} cy={668} r={44} fill="#ffe680" />
      {[[820, 520, 1.1], [520, 650, 0.8], [990, 690, 0.7]].map(([x, y, s], k) => (
        <g key={k} transform={`translate(${x + Math.sin(w * 0.05 + k) * 6} ${y}) scale(${s})`} opacity={0.92}>
          <ellipse cx={0} cy={0} rx={60} ry={20} fill="#fff" /><ellipse cx={-26} cy={-12} rx={30} ry={18} fill="#fff" /><ellipse cx={22} cy={-14} rx={34} ry={22} fill="#fff" />
        </g>
      ))}
      {/* sailboat on the horizon */}
      <g transform={`translate(${700 + w * 3} ${FLOOR + 6})`}>
        <path d="M -16 0 L 16 0 L 11 6 L -11 6 Z" fill="#f4f1ea" />
        <path d="M 0 -2 L 0 -30 L 13 -4 Z" fill="#f4f1ea" /><path d="M -2 -2 L -2 -24 L -12 -4 Z" fill="#ff9fc8" />
      </g>
      {/* the sea, its edge is the live shoreline */}
      <path d={`M -420 ${FLOOR} L ${W + 420} ${FLOOR} L ${xs.slice().reverse().map((x) => `${x},${shoreY(x, w)}`).join(' L ')} Z`} fill="url(#beach-sea)" />
      {Array.from({length: 10}).map((_, k) => {
        const y = FLOOR + 14 + k * 12;
        const off = mod(w * (20 + k * 4) + k * 97, 220);
        return Array.from({length: 7}).map((__, j) => (
          <rect key={`${k}-${j}`} x={-200 + j * 220 + off} y={y} width={44 + (k % 3) * 14} height={2.4} rx={1.2} fill="#ffffff" opacity={0.22 + (k / 10) * 0.2} />
        ));
      })}
      {/* a surfer out on the water (silent decoy) */}
      <g transform={`translate(${seaX} ${842 + Math.sin(w * 2) * 3}) scale(${kAt(842) * 0.8})`}>
        <Surfboard col="#2fb5a4" />
        <g transform="translate(0 -4)"><Person L={LOOK_SEA} p={{facing: 'side', reach: 0.6, bob: Math.sin(w * 3)}} /></g>
      </g>
      {/* sand + wet band + foam */}
      <path d={`M -420 ${shoreY(-420, w)} L ${edge} L ${W + 420} ${H} L -420 ${H} Z`} fill="#f2dba4" />
      <path d={`M ${edge} L ${W + 420} ${shoreY(W + 420, w) + 22} L ${xs.slice().reverse().map((x) => `${x},${shoreY(x, w) + 22}`).join(' L ')} Z`} fill="#dcc185" opacity={0.75} />
      <path d={`M ${edge}`} fill="none" stroke="#ffffff" strokeWidth={6} strokeLinejoin="round" opacity={0.95} />
      <path d={`M ${xs.map((x) => `${x},${shoreY(x, w) - 9 + 2 * Math.sin(x * 0.05 + w * 3)}`).join(' L ')}`} fill="none" stroke="#e8f8ff" strokeWidth={3} opacity={0.6} />
      {/* sand texture */}
      {Array.from({length: 70}).map((_, k) => (
        <ellipse key={k} cx={rnd(k * 5.1) * W} cy={SHORE + 40 + rnd(k * 2.3 + 1) * (H - SHORE - 40)} rx={3 + rnd(k) * 5} ry={1.2} fill="#d8bd82" opacity={0.6} />
      ))}
      {/* crab holes */}
      {[HOLE, DHOLE].map(([x, y], k) => <ellipse key={k} cx={x} cy={y + 1} rx={9} ry={3.2} fill="#7a6036" />)}
    </>
  );
};

/* ───────────── composition ───────────── */
export const ChainBeach: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const T = (k: string) => at(plan, k);
  const LS = plan.lineStarts;
  const li = lineAt(plan, s);

  // ── s -> world clock
  const tGo = plan.lineEnds[0] + 0.05;
  const tLate = T('late');
  const tRw = T('rewind');
  const AFTER = 15.6;
  const W3 = 12.15 - (T('l10') - LS[3]) * 0.7;
  const w8 = (t: number) => T_WAVE + (t - T('l1')) * 0.6;
  const W7END = T_PINCH + (LS[8] - 0.05 - T('l2')) * 0.55;
  const wAt = (t: number): number => {
    if (t < tRw) return Math.min(SEARCH, t - tGo);
    if (t < LS[3]) return lerp(SEARCH, W3, ease(clamp01((t - tRw) / (LS[3] - tRw))));
    if (li === 3) return Math.min(13.4, 12.15 + (t - T('l10')) * 0.7);
    if (li === 4) return 7.6 + (t - LS[4]) * 0.75;
    if (li === 5) return 4.8 + (t - LS[5]) * 0.9;
    if (li === 6) return 0.7 + (t - LS[6]) * 1.2;
    if (li === 7) return Math.max(-0.55, T_PINCH + (t - T('l2')) * 0.55);
    if (li === 8) return t < LS[8] + 0.5 ? lerp(W7END, w8(LS[8] + 0.5), ease((t - LS[8]) / 0.5)) : w8(t);
    if (li === 9) return T_WAVE;
    if (li === 10) return AFTER;
    return AFTER + (t - LS[11]) * 0.5;
  };
  const w = wAt(s);
  const searching = s >= tGo && s < tGo + SEARCH;
  const frozen = (s >= tGo + SEARCH && s < tRw) || li === 9 || li === 10;
  const rewinding = (s >= tRw && s < LS[3]) || (li === 8 && s < LS[8] + 0.5);

  // ── director (the search is ONE static wide shot)
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 960, z: 1, r: 0, ...c});
  shot(0, 0.01, {x: 540, y: 1010, z: 1.06});
  shot(tGo - 0.3, 0.6, {x: 540, y: 960, z: 1.0});
  shot(tGo + T_CRASH - 0.05, 0.12, {x: 470, y: 1230, z: 1.45});
  shot(tLate, 0.5, {x: 540, y: 960, z: 1.0});
  const foc = (t: number, blend: number, x: number, y: number, z: number) => shot(t, blend, {x, y: y - 120 / z, z});
  foc(LS[3], 0.6, 440, 1200, 1.7);
  foc(LS[4] - 0.1, 0.6, 430, 1140, 1.5);
  foc(LS[5] - 0.1, 0.6, 790, 1150, 1.6);
  foc(LS[6] - 0.1, 0.6, 540, 960, 1.35);
  foc(LS[7] - 0.1, 0.6, 195, 935, 2.4);
  foc(LS[8] - 0.1, 0.5, 160, 915, 2.9);
  foc(LS[9] - 0.1, 0.5, 145, 905, 3.2);
  foc(LS[10] - 0.1, 0.8, 520, 1110, 1.05);
  foc(LS[11] - 0.05, 0.45, 215, 940, 3.3);
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const kick = (t0: number, amp: number, decay: number) => (s >= t0 ? amp * Math.exp(-(s - t0) * decay) : 0);
  const shake = kick(tGo + T_CRASH, 16, 6) + kick(T('first'), 6, 7) + kick(T('ten'), 6, 8) + kick(T('nope'), 5, 9);
  const shx = Math.sin(frame * 2.3) * shake;
  const shy = Math.cos(frame * 2.9) * shake;
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + shx}px, ${960 - cam.y + shy}px) scale(${cam.z})`};
  const toScreen = (x: number, y: number): P => [540 + (x - cam.x) * cam.z + shx, 960 + (y - cam.y) * cam.z + shy];

  // ── the chain actors
  const cb = crabAt(w);
  const crab: Ent = {x: cb.x, y: cb.y, key: 'crab', el: cb.hide ? <CrabEyes /> : (
    <g transform={`rotate(${cb.r} 0 -6)`}><Crab walk={cb.walk} snap={cb.snap} up={cb.up} shades={cb.shades} angry={!cb.shades && w > T_WAVE && w < 1.4} /></g>
  )};
  const sb = sunAt(w);
  const sunbather: Ent = {x: sb.x, y: sb.y, key: 'sun', el: <g transform={`rotate(${sb.r})`}><Person L={LOOK_SUN} p={sb.pose} /></g>};
  const um = umbAt(w);
  const kU = kAt(um.y);
  const umbEnt: Ent | null = um.planted ? {x: um.x, y: um.y, key: 'umb', el: <g transform={`rotate(${um.r})`}><Umbrella col="#ff4f5e" /></g>} : null;
  const sf = surferAt(w);
  const bd = boardAt(w);
  const surfer: Ent = {x: sf.x, y: sf.y, key: 'surf', el: (
    <g transform={`rotate(${sf.rot})`}>
      <Person L={LOOK_SURF} p={!sf.down ? {facing: 'side', flip: true, walk: w * 9, bob: 0} : w < T_SWEEP + 0.9 ? {facing: 'side', flip: true, flail: w * 18, mouthO: true} : {facing: 'side', flip: true, mouthO: true}} />
      {bd.held ? <g transform="translate(0 -30)"><Surfboard /></g> : null}
    </g>
  )};
  const bl = ballAt(w);
  const kidB: Ent = {x: KIDB[0], y: KIDB[1], key: 'kidb', sc: 0.82, el: (
    <Person L={LOOK_KIDB} p={w < T_SMACK ? {facing: 'side', flip: true, reach: 0.5 + 0.5 * Math.abs(Math.sin(w * KB))} : {facing: 'side', flip: true, mouthO: true, flail: w < T_SMACK + 1.2 ? w * 16 : undefined, alert: pop(w, T_SMACK)}} />
  )};
  const tilt = towerTilt(w);
  const guardPose: Pose = w < T_BONK ? {facing: 'front', bob: Math.sin(w * 1.2) * 0.8} : {facing: 'front', flail: w * 17, mouthO: true, alert: w < T_CRASH ? pop(w, T_BONK) : 0};
  const guardUp = w < T_BONK ? 0 : -12 * clamp01((w - T_BONK) / 0.3);
  const tower: Ent = {x: TOWER[0], y: TOWER[1], key: 'tower', el: (
    <g transform={`rotate(${tilt} ${TOWER_PIVOT[0]} 0)`}>
      <Tower flag={w} guard={<g transform={`translate(${GUARD_FEET[0]} ${GUARD_FEET[1] + guardUp})`}><Person L={LOOK_GUARD} p={guardPose} /></g>} />
    </g>
  )};
  const castle: Ent = {x: CASTLE[0], y: CASTLE[1], key: 'castle', el: <Sandcastle t={w} crush={w >= T_CRASH ? clamp01((w - T_CRASH) / 0.3) + 0.001 : 0} />};
  const builder: Ent = {x: BUILDER[0], y: BUILDER[1], key: 'build', sc: 0.75, el: (
    <Person L={LOOK_BUILD} p={w < T_CRASH + 0.1 ? {facing: 'side', flip: true, reach: 0.5 + 0.3 * Math.sin(w * 4)} : {facing: 'front', mouthO: true, flail: w * 15}} />
  )};

  const hw = 540 / cam.z + 160;
  const hh = 960 / cam.z + 160;
  const ents: Ent[] = [...extrasAt(w), ...decoysAt(w), crab, sunbather, ...(umbEnt ? [umbEnt] : []), surfer, kidB, tower, castle, builder,
    ...PROPS.map((p) => ({x: p.x, y: p.y, key: p.key, el: p.el}))]
    .filter((e) => Math.abs(e.x - cam.x) < hw && e.y > cam.y - hh && e.y - 400 < cam.y + hh)
    .sort((a, b) => a.y - b.y);
  // the towel must sit under the sunbather
  const towelFirst = ents.sort((a, b) => (a.key === 'stowel' ? -1 : b.key === 'stowel' ? 1 : 0) || a.y - b.y);

  // flying things (world overlay, drawn over everyone)
  const umbFly = !um.planted ? <g transform={`translate(${um.x} ${um.y}) scale(${kU}) rotate(${um.r}) translate(${-UMB_C[0]} ${-UMB_C[1]})`}><Umbrella col="#ff4f5e" /></g> : null;
  const boardFly = !bd.held ? <g transform={`translate(${bd.x} ${bd.y}) scale(${kAt(bd.y)}) rotate(${bd.r})`}><Surfboard /></g> : null;
  const ballEl = <g transform={`translate(${bl.x} ${bl.y}) scale(${kAt(Math.max(bl.y, 1000))})`}><BeachBall spin={bl.spin} r={12} /></g>;
  const crashD = w >= T_CRASH && w < T_CRASH + 1.0 ? (w - T_CRASH) / 1.0 : -1;
  const kC = kAt(CASTLE[1]);

  // ── labelled boxes (world rect -> screen)
  const box = (r: [number, number, number, number], label: string, col: string, t0: number, t1: number, key: string, x?: boolean) => {
    if (s < t0 || s >= t1) return null;
    const [sx0, sy0] = toScreen(r[0], r[1]);
    const [sx1, sy1] = toScreen(r[2], r[3]);
    const fs = Math.max(26, Math.min(42, 15 * cam.z));
    return (
      <div key={key} style={{position: 'absolute', left: sx0, top: sy0, width: sx1 - sx0, height: sy1 - sy0, border: `${Math.max(5, cam.z * 2.4)}px solid ${col}`,
        borderRadius: 10, transform: `scale(${pop(s, t0, 0.3)})`, boxShadow: '0 0 0 3px rgba(0,0,0,.35)'}}>
        <div style={{position: 'absolute', left: '50%', bottom: '100%', transform: 'translate(-50%, -6px)', background: col, color: '#111', fontFamily: heavy, fontWeight: 900,
          fontSize: fs, padding: '2px 12px', borderRadius: 6, whiteSpace: 'nowrap', textDecoration: x ? 'line-through' : undefined}}>{label}</div>
        {x ? <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <path d="M 8 8 L 92 92 M 92 8 L 8 92" stroke="#ff2a3a" strokeWidth={14} strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{strokeWidth: 14}} />
        </svg> : null}
      </div>
    );
  };
  const LINKS: Array<[string, string, string]> = [
    ['WAVE', 'l1', '#8fd6ff'], ['CRAB', 'l2', '#ff7a5a'], ['SUNBATHER', 'l3', '#ff9a1f'], ['UMBRELLA', 'l4', '#ff4f5e'], ['SURFER', 'l5', '#f4f1ea'],
    ['SURFBOARD', 'l6', '#ffd23f'], ['BEACH BALL', 'l7', '#3fa7ff'], ['LIFEGUARD', 'l8', '#ff6f6f'], ['TOWER', 'l9', '#2fd5a4'], ['SANDCASTLE', 'l10', '#ecc988'],
  ];
  const tNope = T('nope');
  const ends: Record<string, number> = {l10: LS[4], l9: LS[4], l8: LS[5], l7: LS[5], l6: LS[6], l5: LS[6], l4: LS[7], l3: LS[7], l2: tNope, l1: LS[9]};
  const rotBox = (pts: P[]): [number, number, number, number] => {
    const q = pts.map((p) => twr(p, w));
    return [Math.min(...q.map((p) => p[0])), Math.min(...q.map((p) => p[1])), Math.max(...q.map((p) => p[0])), Math.max(...q.map((p) => p[1]))];
  };
  const kSf = kAt(sf.y);
  const kSb = kAt(sb.y);
  const kCb = kAt(cb.y);
  const kBall = kAt(Math.max(bl.y, 1000));
  const kBd = kAt(bd.y);
  const boardC: P = bd.held ? [sf.x, sf.y - 30 * kSf] : [bd.x, bd.y];
  const rects: Record<string, [number, number, number, number]> = {
    l10: [CASTLE[0] - 46 * kC, CASTLE[1] - 66 * kC, CASTLE[0] + 46 * kC, CASTLE[1] + 8],
    l9: rotBox([[-32, 4], [32, 4], [-32, -128], [32, -128]]),
    l8: rotBox([[-14, -158 + guardUp], [16, -158 + guardUp], [-14, -104], [16, -104]]),
    l7: [bl.x - 15 * kBall, bl.y - 15 * kBall, bl.x + 15 * kBall, bl.y + 15 * kBall],
    l6: [boardC[0] - 40 * kBd, boardC[1] - 40 * kBd, boardC[0] + 40 * kBd, boardC[1] + 40 * kBd],
    l5: sf.down ? [sf.x - 74 * kSf, sf.y - 34 * kSf, sf.x + 12 * kSf, sf.y + 10] : [sf.x - 24 * kSf, sf.y - 72 * kSf, sf.x + 24 * kSf, sf.y + 8],
    l4: um.planted ? [um.x - 50 * kU, um.y - 104 * kU, um.x + 50 * kU, um.y + 8] : [um.x - 54 * kU, um.y - 54 * kU, um.x + 54 * kU, um.y + 54 * kU],
    l3: sb.r > 45 ? [sb.x - 8 * kSb, sb.y - 26 * kSb, sb.x + 64 * kSb, sb.y + 10] : [sb.x - 22 * kSb, sb.y - 72 * kSb, sb.x + 22 * kSb, sb.y + 8],
    l2: [cb.x - 17 * kCb, cb.y - 26 * kCb, cb.x + 17 * kCb, cb.y + 6],
    l1: [HOLE[0] - 70, HOLE[1] - 40, HOLE[0] + 60, HOLE[1] + 26],
  };
  const boxes = [
    ...LINKS.map(([name, kind, col], i) => box(rects[kind], `${i + 1} · ${name}`, col, T(kind), ends[kind], kind)),
    box(rects.l2, '2 · CRAB', '#ff7a5a', tNope, tNope + 0.9, 'nopex', true),
    box([HOLE[0] - 62, HOLE[1] - 36, HOLE[0] + 54, HOLE[1] + 22], 'IT STARTED HERE', '#8fd6ff', T('here'), LS[10], 'here'),
  ];

  // ── the chain map: 10 numbered stops corner -> sandcastle, then the start pulses
  const STOPS: P[] = [[95, 880], [172, 978], [258, 905], [520, 945], [852, 985], [846, 1150], [828, 1290], [323, 1060], [392, 1210], [CASTLE[0], 1262]];
  const MAPD = 1.5;
  const mapK = li === 10 ? clamp01((s - T('map')) / MAPD) : 0;
  const ringK = li === 10 ? clamp01((s - T('map') - MAPD - 0.05) / 0.4) : 0;
  const chainMap = mapK > 0 ? (() => {
    const pts = STOPS.map(([x, y]) => toScreen(x, y));
    const segs = pts.slice(1).map((p, i) => [pts[i], p] as const);
    const lens = segs.map(([a, c]) => Math.hypot(c[0] - a[0], c[1] - a[1]));
    const total = lens.reduce((a, c) => a + c, 0);
    let left = total * mapK;
    const a1 = pts[0];
    return (
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        {segs.map(([a, c], i) => {
          const f = clamp01(left / lens[i]);
          left -= lens[i];
          return f > 0 ? <line key={i} x1={a[0]} y1={a[1]} x2={lerp(a[0], c[0], f)} y2={lerp(a[1], c[1], f)} stroke="#fff" strokeWidth={9} strokeDasharray="20 13" strokeLinecap="round" /> : null;
        })}
        {ringK > 0 ? <circle cx={a1[0]} cy={a1[1]} r={30 + 26 * ringK + 6 * Math.sin(s * 9)} fill="none" stroke="#ff4f5e" strokeWidth={8} opacity={0.9} /> : null}
        {pts.map(([x, y], i) => {
          const shown = mapK * 9 >= i - 0.01;
          return shown ? (
            <g key={i} transform={`translate(${x} ${y}) scale(${pop(s, T('map') + (i / 9) * MAPD, 0.3)})`}>
              <circle r={30} fill={LINKS[i][2]} stroke="#111" strokeWidth={6} />
              <text y={12} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={i === 9 ? 30 : 36} fill="#111">{i + 1}</text>
            </g>
          ) : null;
        })}
      </svg>
    );
  })() : null;

  // ── UI card
  const left = Math.max(0, SEARCH - Math.max(0, s - tGo));
  const secs = Math.ceil(left - 1e-6);
  const urgent = searching && secs <= 3;
  const timerK = searching ? left / SEARCH : s < tGo ? 1 : 0;
  const before = s < tGo + SEARCH;
  const found = LINKS.filter(([, k]) => s >= T(k)).length;
  const latest = LINKS.map(([n, k, c], i) => ({n, k, c, i, t: T(k)})).filter((x) => s >= x.t).sort((a, b) => b.t - a.t)[0];
  const header = before ? 'CHAIN REACTION · HARD MODE' : rewinding && li < 3 ? '◀◀ REWINDING' : li < 3 ? 'TIME’S UP' : li >= 3 && li <= 7 ? `TRACING IT BACK · ${found}/10` : li === 8 ? (s < LS[8] + 0.5 ? '◀◀ FURTHER BACK' : 'THE TWIST') : li === 9 ? 'IT STARTED HERE' : 'THE WHOLE CHAIN';
  const bottom = li === 8
    ? (s >= T('l1') ? <span style={{color: '#2a7ab0'}}>1 · WAVE</span> : s >= tNope ? <span style={{color: '#d6293a'}}>NOT THE CRAB</span> : <span>2 · CRAB?</span>)
    : li === 9 ? <span style={{color: '#2a7ab0'}}>1 · WAVE · BEFORE THE TIMER</span>
      : li >= 10 ? <span>WAVE → SANDCASTLE</span> : latest ? `${latest.i + 1} · ${latest.n}` : '???';
  const card = (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 176, background: '#f4f1ea', borderRadius: 14, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 840, height: 46, background: before ? '#5a1e2a' : '#1e2a44', display: 'flex', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: before ? '#ff4f5e' : '#ffd23f'}} />
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: '#f4f1ea'}}>{header}</span>
      </div>
      {li < 3 ? (
        <>
          <div style={{position: 'absolute', left: 26, top: 62, width: 640, fontFamily: heavy, fontWeight: 900, fontSize: 50, lineHeight: 1.05, color: before ? '#1b1b22' : '#d6293a'}}>
            {before ? 'WHAT STARTS IT?' : 'TOO LATE!'}
          </div>
          <div style={{position: 'absolute', left: 28, top: 126, fontFamily: MONO, fontWeight: 900, fontSize: 28, color: '#5a6070'}}>{before ? 'DON’T BLINK' : 'LET’S RUN IT BACKWARDS'}</div>
          <svg width={150} height={150} style={{position: 'absolute', left: 676, top: 36}}>
            <circle cx={75} cy={75} r={56} fill={urgent ? '#ffe0e0' : '#fff'} stroke="#d8d2c4" strokeWidth={12} />
            <circle cx={75} cy={75} r={56} fill="none" stroke={urgent ? '#ff4f5e' : '#2a8a5a'} strokeWidth={12} strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 56 * timerK} 999`} transform="rotate(-90 75 75)" />
            <text x={75} y={93} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={before ? 54 : 34} fill={urgent ? '#d6293a' : '#1b1b22'}>{before ? secs : '0'}</text>
          </svg>
        </>
      ) : (
        <>
          {LINKS.map(([, kind, col], i) => {
            const on = s >= T(kind) && !(kind === 'l2' && false);
            const nextOn = i < 9 && s >= T(LINKS[i + 1][1]);
            return (
              <div key={kind} style={{position: 'absolute', left: 16 + i * 82, top: 58, width: 66, height: 56}}>
                {i < 9 ? <div style={{position: 'absolute', left: 48, top: 23, width: 52, height: 6, background: on && nextOn ? '#1b1b22' : '#d8d2c4'}} /> : null}
                <div style={{position: 'absolute', left: 6, top: 0, width: 54, height: 54, borderRadius: 27, background: on ? col : '#e2ddd2', border: '5px solid #1b1b22', boxSizing: 'border-box',
                  fontFamily: heavy, fontWeight: 900, fontSize: i === 9 ? 24 : 28, lineHeight: '44px', textAlign: 'center', color: on ? '#111' : '#aaa39a',
                  transform: `scale(${on ? pop(s, T(kind)) : 1})`}}>{i + 1}</div>
              </div>
            );
          })}
          <div style={{position: 'absolute', left: 0, top: 122, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: 38, color: '#1b1b22',
            transform: latest ? `scale(${pop(s, li === 8 && s >= tNope && s < T('l1') ? tNope : latest.t, 0.3)})` : undefined}}>
            {bottom}
          </div>
        </>
      )}
    </div>
  );

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
    capSize = Math.min(cap.hot ? 130 : 112, capWrap ? Math.min(100, 820 / (longest * 0.78)) : one);
  }
  const capPop = cap ? 0.55 + 0.45 * spring({frame: frame - Math.round(cap.start * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;

  // hook arrow on the sandcastle, gone the moment the search starts
  const [ax, ay] = toScreen(CASTLE[0], CASTLE[1] - 70 * kC);
  const arrow = s >= T('arrow') - 0.15 && s < tGo + 0.25 ? (
    <div style={{position: 'absolute', left: ax - 60, top: ay - 170 + Math.sin(s * 7) * 10, width: 120, textAlign: 'center', transform: `scale(${pop(s, T('arrow') - 0.15)})`}}>
      <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 38, color: '#fff', WebkitTextStroke: '7px #111', paintOrder: 'stroke fill', whiteSpace: 'nowrap', marginLeft: -140, width: 400}}>THIS SANDCASTLE</div>
      <svg width={120} height={90} viewBox="0 0 120 90"><path d="M 35 0 L 85 0 L 85 40 L 110 40 L 60 88 L 10 40 L 35 40 Z" fill="#ff4f5e" stroke="#111" strokeWidth={7} /></svg>
    </div>
  ) : null;

  const crashT = tGo + T_CRASH;
  const slam = s >= crashT && s < crashT + 0.9 ? <Slam k={(s - crashT) / 0.9} text="FLATTENED!" color="#ecc988" size={150} top={1400} />
    : s >= tNope && s < tNope + 0.8 ? <Slam k={(s - tNope) / 0.8} text="NOPE" color="#ff4f5e" size={160} top={1360} />
      : s >= T('first') && s < T('first') + 1.3 ? <Slam k={(s - T('first')) / 1.3} text="BEFORE THE TIMER" color="#8fd6ff" size={104} top={1360} />
        : s >= T('ten') && s < T('ten') + 1.1 ? <Slam k={(s - T('ten')) / 1.1} text="10 LINKS" color="#ffd23f" size={130} top={1400} />
          : s >= T('fine') - 0.05 ? <Slam k={Math.min(0.85, (s - T('fine') + 0.05) / 1.4)} text="THE CRAB IS FINE" color="#ff7a5a" size={92} top={1360} /> : null;
  const ticks = Array.from({length: SEARCH}).map((_, k) => tGo + k);
  const zz = w < T_BONK ? [0, 1, 2].map((k) => {
    const u = mod(w * 0.6 + k / 3, 1);
    const [hx, hy] = twr([HEAD_LOCAL[0] + 10 + u * 12, HEAD_LOCAL[1] - 8 - u * 22], w);
    return <text key={k} x={hx} y={hy} fontFamily="Arial Black, Arial" fontWeight={900} fontSize={(9 + u * 6) * kTow} fill="#5a6a8a" opacity={1 - u}>z</text>;
  }) : null;

  // decoy SFX only during the search (chain events are silent)
  const searchSfx: Array<[number, string, number]> = [
    ...decoyHits(SEARCH).map((t) => [tGo + t, 'sfx/punch.wav', 0.3] as [number, string, number]),
    [tGo + T_GUST, 'sfx/wind.wav', 0.5],
    [tGo + T_GULL, 'sfx/whoosh.wav', 0.5], [tGo + T_GULL + 0.1, 'sfx/shutter.wav', 0.3],
    [tGo + 9.6, 'sfx/bell.wav', 0.42], [tGo + 10.8, 'sfx/bell.wav', 0.36],
  ];

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, filter: li === 10 ? 'saturate(0.35) brightness(0.62)' : frozen || rewinding ? 'saturate(0.45) brightness(0.95)' : undefined}}>
        <div style={camStyle}>
          <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <Beach w={w} />
            {towelFirst.map((e) => <g key={e.key} transform={`translate(${e.x} ${e.y}) scale(${kAt(e.y) * (e.sc ?? 1)})`}>{e.el}</g>)}
            {zz}
            {umbFly}
            {boardFly}
            {ballEl}
            {crashD >= 0 ? Array.from({length: 20}).map((_, k) => {
              const a = -Math.PI * (0.05 + 0.9 * (k / 19));
              const v = 0.7 + rnd(k * 3.3) * 0.6;
              return <ellipse key={k} cx={CASTLE[0] + Math.cos(a) * crashD * 170 * v} cy={CASTLE[1] - 20 + Math.sin(a) * crashD * 150 * v + crashD * crashD * 190}
                rx={7 * (1 - crashD * 0.5)} ry={6 * (1 - crashD * 0.5)} fill={k % 3 ? '#ecc988' : '#d4ad68'} />;
            }) : null}
            {crashD >= 0 ? <ellipse cx={CASTLE[0]} cy={CASTLE[1] - 10} rx={60 + 160 * crashD} ry={20 + 40 * crashD} fill="#f2dba4" opacity={0.7 * (1 - crashD)} /> : null}
          </svg>
        </div>
      </div>
      {rewinding ? (
        <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 3px, transparent 3px 7px)'}}>
          <div style={{position: 'absolute', left: 0, top: mod(s * 2600, H), width: W, height: 70, background: 'rgba(255,255,255,.18)', filter: 'blur(4px)'}} />
          <div style={{position: 'absolute', left: 0, top: 1300, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: 120, color: '#fff', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill'}}>◀◀</div>
        </AbsoluteFill>
      ) : null}
      {arrow}
      {boxes}
      {chainMap}
      {s < tGo + SEARCH ? <div style={{position: 'absolute', left: 120, top: 420, width: 840 * timerK, height: 10, borderRadius: 5, background: urgent ? '#ff4f5e' : '#ffd23f'}} /> : null}
      {card}
      {cap ? (
        <div style={{position: 'absolute', top: 500, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
          fontSize: capSize, lineHeight: 1.0, color: cap.hot ? '#ffd23f' : '#ffffff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`,
          paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: capWrap ? 'normal' : 'nowrap',
          transform: `scale(${capPop}) rotate(${capIdx % 2 ? 2 : -2}deg)`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}
      {slam}

      {/* audio */}
      <Audio src={staticFile(`music/${ep.id}.wav`)} volume={0.55} />
      <Sequence from={0} durationInFrames={Math.round((tGo + SEARCH + 0.4) * FPS)}>
        <Audio src={staticFile('sfx/surf.wav')} volume={0.55} />
      </Sequence>
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}><Audio src={staticFile(ln.file)} /></Sequence>
      ))}
      {ticks.map((t, k) => (
        <Sequence key={`t${k}`} from={Math.round(t * FPS)} durationInFrames={20}><Audio src={staticFile('sfx/tick.wav')} volume={k >= SEARCH - 3 ? 0.8 : 0.35} /></Sequence>
      ))}
      {([
        ...searchSfx,
        [crashT, 'sfx/slam.wav', 0.9], [crashT, 'sfx/seeds.wav', 0.8], [crashT + 0.05, 'sfx/boom.wav', 0.5], [crashT - 0.5, 'sfx/crack.wav', 0.45],
        [tLate, 'sfx/fail.wav', 0.6], [tRw, 'sfx/scratch.wav', 0.6], [tRw + 0.1, 'sfx/whoosh.wav', 0.6],
        ...LINKS.map(([, k], i) => [T(k), 'sfx/ding.wav', 0.42 + i * 0.015] as [number, string, number]),
        [LS[8], 'sfx/scratch.wav', 0.5], [tNope, 'sfx/fail.wav', 0.55],
        [T('here'), 'sfx/whoosh.wav', 0.5], [T('first'), 'sfx/slam.wav', 0.85], [T('map'), 'sfx/whoosh.wav', 0.5],
        [T('ten'), 'sfx/slam.wav', 0.8], [T('fine'), 'sfx/shine.wav', 0.6], [T('fine') + 0.3, 'sfx/bell.wav', 0.55],
      ] as Array<[number, string, number]>).map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round(t * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
