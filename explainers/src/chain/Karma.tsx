import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Slam} from '../fight/Fight';
import {camAt, Shot} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {FPS, StoryEpisode, at, buildPlan, lineAt} from '../story/timeline';
import {Bench, Bin, HAIRS, Look, PANTS, Person, Planter, Pose, SHIRTS, SKINS} from '../observe/art';
import {Dog, Lamp} from './art';
import {BIKE_BB, Bike, CafeTable, Fountain, FruitStand, Orange, Peel, SleepDog, Skateboard, Tray, WATER} from './karma-art';

// CHAIN REACTION #2 — "karma". A market plaza with a fountain. Hook: "in 15 s
// this guy ends up in the fountain — find what starts it". A 10-link chain runs
// during the search (banana peel -> skater -> skateboard -> fruit stand ->
// oranges -> waiter -> tray -> dog -> bike -> SPLASH); the replay traces it
// backwards and the last link is the twist: the peel was thrown by the SAME guy,
// 12 s before he went in. Pure function of the world clock w.
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';

const W = 1080;
const H = 1920;
const FLOOR = 760;
const SEARCH = 15;
const N_EXTRAS = 110;
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
/* piecewise-linear path through timed keys, eased per segment */
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
/* smooth (Catmull-Rom) path through evenly-timed points */
const spline = (pts: P[], u: number): P => {
  const n = pts.length - 1;
  const f = clamp01(u) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const t = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const cr = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
};

/* ───────────── the chain (world-time) ───────────── */
const MAN: P = [470, 1000];
const BIN: P = [355, 1000];
const FOUNT: P = [540, 975];
const PEEL: P = [340, 1046];
const STAND: P = [830, 1040];
const WAITER_Y = 1352;
const DOGP: P = [540, 1398];
const TRAY_LAND: P = [612, 1392];
const BIKE_Y = 1190;
const T_TOSS = 0.8;
const T_RIM = 1.15;
const T_PEEL = 1.5;
const T_SLIP = 2.9;
const T_STAND = 4.1;
const T_WAITER = 6.4;
const T_TRAY = 7.6;
const T_RUN = 8.4;
const T_SWERVE = 9.9;
const T_BUMP = 12.2;
const T_SPLASH = 12.8; // = T_TOSS + 12 ("karma took twelve seconds")
const kF = kAt(FOUNT[1]);
const IN_WATER: P = [FOUNT[0] - 38 * kF, FOUNT[1] - 30 * kF];

const peelAt = (w: number): {x: number; y: number; r: number; flat: boolean} | null => {
  if (w < T_TOSS) return null;
  const kM = kAt(MAN[1]);
  const hand: P = [MAN[0] - 10 * kM, MAN[1] - 66 * kM];
  const rim: P = [BIN[0] + 6, BIN[1] - 34 * kAt(BIN[1])];
  if (w < T_RIM) {
    const u = (w - T_TOSS) / (T_RIM - T_TOSS);
    return {x: lerp(hand[0], rim[0], u), y: lerp(hand[1], rim[1], u) - Math.sin(u * Math.PI) * 70, r: u * 400, flat: false};
  }
  if (w < T_PEEL) {
    const u = (w - T_RIM) / (T_PEEL - T_RIM);
    return {x: lerp(rim[0], PEEL[0], u), y: lerp(rim[1], PEEL[1], u * u) - Math.sin(u * Math.PI) * 26, r: 400 + u * 300, flat: false};
  }
  if (w < T_SLIP) return {x: PEEL[0], y: PEEL[1], r: 0, flat: true};
  const u = clamp01((w - T_SLIP) / 0.3);
  return {x: PEEL[0] + 26 * outQ(u), y: PEEL[1] + 2, r: 0, flat: true};
};
const skaterX = (w: number) => -80 + (PEEL[0] + 80) * (w / T_SLIP);
const skaterAt = (w: number): {x: number; y: number; rot: number; down: boolean} => {
  if (w < T_SLIP) return {x: skaterX(w), y: PEEL[1], rot: 0, down: false};
  const u = clamp01((w - T_SLIP) / 0.38);
  return {x: lerp(PEEL[0], 262, outQ(u)), y: PEEL[1] + 6 * u - Math.sin(u * Math.PI) * 46, rot: -88 * outQ(u), down: true};
};
const BOARD_HIT = STAND[0] - 112;
const boardAt = (w: number): {x: number; y: number; rot: number} => {
  if (w < T_SLIP) return {x: skaterX(w), y: PEEL[1], rot: 0};
  if (w < T_STAND) {
    const u = (w - T_SLIP) / (T_STAND - T_SLIP);
    return {x: lerp(PEEL[0], BOARD_HIT, u), y: PEEL[1] - Math.max(0, Math.sin(clamp01(u * 4) * Math.PI)) * 12, rot: 0};
  }
  const u = clamp01((w - T_STAND) / 0.35);
  return {x: BOARD_HIT - 34 * outQ(u), y: PEEL[1] + 4 - Math.sin(u * Math.PI) * 30, rot: -180 * outQ(u)};
};
const standTilt = (w: number) => {
  if (w < T_STAND) return 0;
  const k = clamp01((w - T_STAND) / 0.22);
  const t = w - T_STAND - 0.22;
  return -16 * k + (t > 0 ? 2.5 * Math.sin(t * 22) * Math.exp(-t * 5) : 0);
};
/* 9 spilled oranges; #0 is the one the waiter steps on */
const ORANGES = Array.from({length: 9}).map((_, i) => {
  const t0 = T_STAND + 0.06 + i * 0.035;
  const x0 = STAND[0] - 40 + i * 9;
  const g: P = [x0 - 30 - rnd(i * 3.3) * 50, STAND[1] + 22 + rnd(i * 5.1) * 30];
  const e: P = i === 0 ? [790, WAITER_Y] : [690 + rnd(i * 7.7) * 190, 1110 + rnd(i * 9.1) * 200];
  const te = i === 0 ? T_WAITER - 0.1 : t0 + 0.35 + 0.9 + rnd(i * 2.9) * 1.4;
  return {t0, x0, g, e, te};
});
const orangeAt = (o: (typeof ORANGES)[number], w: number): {x: number; y: number; spin: number} | null => {
  if (w < o.t0) return null;
  const y0 = STAND[1] - 100;
  if (w < o.t0 + 0.35) {
    const u = (w - o.t0) / 0.35;
    return {x: lerp(o.x0, o.g[0], u), y: lerp(y0, o.g[1], u * u), spin: u * 4};
  }
  const tg = o.t0 + 0.35;
  const u = clamp01((w - tg) / (o.te - tg));
  const d = outQ(u);
  const x = lerp(o.g[0], o.e[0], d);
  const y = lerp(o.g[1], o.e[1], d) - Math.abs(Math.sin(u * Math.PI * 2)) * 10 * (1 - u);
  return {x, y, spin: d * Math.hypot(o.e[0] - o.g[0], o.e[1] - o.g[1]) / 6};
};
const waiterAt = (w: number): {x: number; rot: number; lift: number; down: boolean} => {
  if (w < T_WAITER) return {x: 790 + 100 * (T_WAITER - w), rot: 0, lift: 0, down: false};
  const u = clamp01((w - T_WAITER) / 0.42);
  return {x: 790 - 16 * outQ(u), rot: 84 * outQ(u), lift: Math.sin(u * Math.PI) * 34, down: true};
};
const trayAt = (w: number): {x: number; y: number; r: number; k: number; landed: boolean} | null => {
  if (w < T_WAITER + 0.05) return null;
  const k6 = kAt(WAITER_Y);
  const from: P = [790 - 19 * k6, WAITER_Y - 37 * k6];
  if (w < T_TRAY) {
    const u = (w - T_WAITER - 0.05) / (T_TRAY - T_WAITER - 0.05);
    return {x: lerp(from[0], TRAY_LAND[0], u), y: lerp(from[1], TRAY_LAND[1], u) - Math.sin(u * Math.PI) * 240, r: -560 * u, k: lerp(k6, kAt(TRAY_LAND[1]), u), landed: false};
  }
  return {x: TRAY_LAND[0], y: TRAY_LAND[1], r: 0, k: kAt(TRAY_LAND[1]), landed: true};
};
const DOG_PATH: Array<[number, number, number]> = [[T_RUN, DOGP[0], DOGP[1]], [T_SWERVE, 520, BIKE_Y + 2], [10.6, 700, 1100], [11.6, 990, 990], [12.4, 1190, 930]];
const dogAt = (w: number): {x: number; y: number; mode: 'sleep' | 'bark' | 'run'; dir: number} => {
  if (w < T_TRAY) return {x: DOGP[0], y: DOGP[1], mode: 'sleep', dir: 1};
  if (w < T_RUN) {
    const u = clamp01((w - T_TRAY) / 0.3);
    return {x: DOGP[0], y: DOGP[1] - Math.sin(u * Math.PI) * 26, mode: 'bark', dir: 1};
  }
  const [x, y] = path(DOG_PATH, w);
  const [x2] = path(DOG_PATH, w + 0.05);
  return {x, y, mode: 'run', dir: x2 >= x - 0.5 ? 1 : -1};
};
const SWERVE: P[] = [[470, BIKE_Y], [432, 1124], [530, 1066], [494, 1014]];
const bikeAt = (w: number): {x: number; y: number; rot: number; crashed: boolean} => {
  if (w < T_SWERVE) return {x: SWERVE[0][0] + 240 * (w - T_SWERVE), y: BIKE_Y, rot: 0, crashed: false};
  if (w < T_BUMP) {
    const u = (w - T_SWERVE) / (T_BUMP - T_SWERVE);
    const [x, y] = spline(SWERVE, u);
    return {x, y, rot: 13 * Math.sin((w - T_SWERVE) * 8.5), crashed: false};
  }
  const u = clamp01((w - T_BUMP) / 0.35);
  return {x: SWERVE[3][0] + 12 * outQ(u), y: SWERVE[3][1] + 6 * u, rot: 80 * outQ(u), crashed: true};
};
const manFall = (w: number): {dx: number; dy: number; rot: number; sy: number} => {
  const u = clamp01((w - T_BUMP) / (T_SPLASH - T_BUMP));
  return {dx: 18 * u, dy: -50 * outQ(u) - Math.sin(u * Math.PI) * 40, rot: -38 * u, sy: 1 - 0.22 * u};
};

const LOOK_MAN: Look = {shirt: '#ffd23f', pants: '#2a3a5a', skin: '#e2b48c', hair: '#5a3a24', hairStyle: 0};
const LOOK_SKATER: Look = {shirt: '#e8505b', pants: '#3a3a44', skin: '#a86e45', hair: '#1b1b22', hairStyle: 0, hat: 'beanie', hatCol: '#2fb5a4'};
const LOOK_WAITER: Look = {shirt: '#f4f1ea', pants: '#1b1b22', skin: '#f1c9a5', hair: '#2a1d16', hairStyle: 3};
const LOOK_RIDER: Look = {shirt: '#5b8cff', pants: '#2a3a5a', skin: '#d9a47c', hair: '#a0522d', hairStyle: 1, hat: 'cap', hatCol: '#ffd23f'};
const DOG_FUR = '#f4f1ea';
const DOG_DARK = '#3a3a44';

type Ent = {x: number; y: number; key: string; el: React.ReactNode; sc?: number};

/* ───────────── decoys + extras ───────────── */
const PROPS = [
  {x: 90, y: 900, r: 40, el: <Lamp />, key: 'lamp1'},
  {x: 1000, y: 900, r: 40, el: <Lamp />, key: 'lamp2'},
  {x: 290, y: 1520, r: 70, el: <Bench />, key: 'b1'},
  {x: 700, y: 1660, r: 70, el: <Bench />, key: 'b2'},
  {x: 60, y: 1100, r: 50, el: <Planter />, key: 'pl1'},
  {x: 1010, y: 1500, r: 50, el: <Planter />, key: 'pl2'},
  {x: 955, y: 1192, r: 40, el: <CafeTable />, key: 'ct1'},
  {x: 1040, y: 1270, r: 40, el: <CafeTable />, key: 'ct2'},
  {x: BIN[0], y: BIN[1], r: 30, el: <Bin />, key: 'bin'},
];
const DSKATE_Y = 1618;
const DBIKE_Y = 820;
const D_BANANA: P = [190, 1470];
const D_WAITER: P = [1000, 1205];
const D_DOG: P = [120, 1290];
const LOOK_DBANANA: Look = {shirt: '#7be07b', pants: '#5a4a3a', skin: '#f3d6bd', hair: '#8a8f9c', hairStyle: 2};
const LOOK_DSKATER: Look = {shirt: '#ffd23f', pants: '#2f4a6a', skin: '#e2b48c', hair: '#c98f3a', hairStyle: 1, hat: 'cap', hatCol: '#e8505b'};
const LOOK_DRIDER: Look = {shirt: '#ff8a3a', pants: '#3a3a44', skin: '#7a4a2a', hair: '#1b1b22', hairStyle: 0};
const decoysAt = (w: number): Ent[] => {
  const sx = mod(-60 + 150 * (w + 3), W + 160) - 80;
  const bx = W + 80 - mod(170 * (w + 2), W + 160);
  return [
    {x: D_BANANA[0], y: D_BANANA[1], key: 'dban', el: <Person L={LOOK_DBANANA} p={{facing: 'front', banana: 1, bob: Math.sin(w * 1.7) * 0.6}} />},
    {x: sx, y: DSKATE_Y, key: 'dskate', el: <g><Skateboard /><g transform="translate(0 -7)"><Person L={LOOK_DSKATER} p={{facing: 'side', reach: 0.3, bob: Math.sin(w * 3) * 0.5}} /></g></g>},
    {x: D_WAITER[0], y: D_WAITER[1], key: 'dwait', el: <g><Person L={LOOK_WAITER} p={{facing: 'side', flip: true, reach: 1, bob: Math.sin(w * 1.4) * 0.4}} /><g transform="translate(-19 -37)"><Tray /></g></g>},
    {x: bx, y: DBIKE_Y, key: 'dbike', el: <g transform="scale(-1 1)"><Bike crank={w * 9} rider={<g transform={`translate(${BIKE_BB[0] - 2} ${BIKE_BB[1]})`}><Person L={LOOK_DRIDER} p={{facing: 'side', walk: w * 9, reach: 0.75}} /></g>} /></g>},
    {x: D_DOG[0], y: D_DOG[1], key: 'ddog', el: <SleepDog fur="#c98f3a" dark="#9a6a2a" breath={w * 2.2 + 1} />},
  ];
};
const KEEP_OUT: [number, number, number][] = (() => {
  const k: [number, number, number][] = [
    [MAN[0], MAN[1], 70], [BIN[0], BIN[1], 50], [400, 940, 90], [540, 925, 110], [680, 940, 90], [262, 1052, 80],
    [STAND[0], STAND[1], 115], [DOGP[0], DOGP[1], 70], [TRAY_LAND[0], TRAY_LAND[1], 55], [700, 1300, 60], [650, 1250, 50],
    [D_BANANA[0], D_BANANA[1], 55], [D_WAITER[0], D_WAITER[1], 50], [D_DOG[0], D_DOG[1], 55],
    ...PROPS.map((p) => [p.x, p.y, p.r] as [number, number, number]),
  ];
  for (let x = 0; x <= 760; x += 40) k.push([x, PEEL[1], 42]);
  for (let x = 0; x <= 480; x += 40) k.push([x, BIKE_Y, 42]);
  for (let x = 780; x <= 1100; x += 40) k.push([x, WAITER_Y, 44]);
  for (let x = 700; x <= 900; x += 40) for (let y = 1090; y <= 1340; y += 50) k.push([x, y, 34]);
  for (let u = 0; u <= 1; u += 0.1) { const [x, y] = spline(SWERVE, u); k.push([x, y, 45]); }
  for (let w = T_RUN; w <= 12.4; w += 0.25) { const [x, y] = path(DOG_PATH, w); k.push([x, y, 40]); }
  return k;
})();
type Extra = {look: Look; x: number; y: number; v: number; facing: 'front' | 'back' | 'side'; flip: boolean; phone: boolean; walk: boolean};
const EXTRAS: Extra[] = (() => {
  const out: Extra[] = [];
  for (let c = 0; c < 5000 && out.length < N_EXTRAS; c++) {
    const x = 40 + rnd(c * 7.13 + 900) * 1000;
    const y = FLOOR + 40 + rnd(c * 3.71 + 900.5) * 1080;
    const k = kAt(y);
    if (Math.abs(y - DBIKE_Y) < 34 || Math.abs(y - DSKATE_Y) < 40) continue;
    if (KEEP_OUT.some(([px, py, r]) => Math.hypot(px - x, (py - y) * 1.3) < r + 8 * k)) continue;
    if (out.some((o) => Math.hypot(o.x - x, (o.y - y) * 1.6) < 56 * k)) continue;
    const i = out.length;
    const r = (j: number) => rnd(i * 17.3 + j * 3.7 + 500);
    const walk = y > 1700 && r(12) < 0.6;
    const look: Look = {
      shirt: pick(SHIRTS, r(1)), pants: pick(PANTS, r(2)), skin: pick(SKINS, r(3)), hair: pick(HAIRS, r(4)),
      hairStyle: (Math.floor(r(5) * 4) % 4) as 0 | 1 | 2 | 3, hat: r(6) < 0.15 ? 'cap' : null, hatCol: pick(['#1b1b22', '#c8504a', '#2f4a6a'], r(7)),
      coat: r(8) < 0.25, shades: r(10) < 0.08,
      bag: walk ? (r(13) < 0.4 ? 'case' : null) : r(13) < 0.25 ? 'tote' : r(13) < 0.4 ? 'backpack' : null, bagCol: pick(['#5a3a24', '#3a3a44', '#2f4a6a', '#8a5a3a'], r(11)),
    };
    const fr = r(14);
    out.push({look, x, y, v: (26 + r(15) * 30) * (r(16) < 0.5 ? -1 : 1), facing: fr < 0.55 ? 'front' : fr < 0.8 ? 'back' : 'side', flip: r(17) < 0.5, phone: r(18) < 0.3, walk});
  }
  return out;
})();
const extrasAt = (w: number): Ent[] => EXTRAS.map((e, i) => {
  const shocked = w >= T_SPLASH + 0.15 + (i % 5) * 0.06;
  if (e.walk) {
    const x = mod(e.x + e.v * w, W + 200) - 100;
    return {x, y: e.y, key: `e${i}`, el: <Person L={e.look} p={{facing: 'side', flip: e.v < 0, walk: w * (6 + Math.abs(e.v) / 9) + i, mouthO: shocked}} />};
  }
  const p: Pose = shocked
    ? {facing: 'front', mouthO: true, bob: 0}
    : {facing: e.facing, flip: e.flip, phone: e.phone && e.facing !== 'back' ? 1 : 0, bob: Math.sin(w * 1.6 + i) * 0.5};
  return {x: e.x, y: e.y, key: `e${i}`, el: <Person L={e.look} p={p} />};
});

/* ───────────── the plaza set ───────────── */
const Plaza: React.FC = () => {
  const hLines: number[] = [];
  for (let y = FLOOR + 20, d = 34; y < H; y += d, d *= 1.1) hLines.push(y);
  return (
    <>
      <rect x={0} y={0} width={W} height={FLOOR} fill="#cfe0d8" />
      {/* left: market hall */}
      <rect x={0} y={0} width={360} height={FLOOR} fill="#bcd4c8" />
      {[0, 1, 2].map((k) => <rect key={k} x={30 + k * 110} y={70} width={76} height={120} rx={8} fill="#a8d8ff" stroke="#fff" strokeWidth={6} />)}
      <path d="M 0 470 L 360 470 L 345 530 L 0 530 Z" fill="#e8505b" />
      {Array.from({length: 7}).map((_, k) => <path key={k} d={`M ${k * 52} 530 q 26 24 52 0`} fill={k % 2 ? '#e8505b' : '#f4f1ea'} />)}
      <text x={175} y={510} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={30} fill="#f4f1ea">MARKET</text>
      <rect x={40} y={580} width={130} height={180} rx={6} fill="#6a4a3a" />
      <rect x={200} y={590} width={130} height={110} rx={6} fill="#a8d8ff" />
      {/* centre: town hall with a clock */}
      <rect x={360} y={120} width={360} height={FLOOR - 120} fill="#f0dcc0" />
      <path d="M 340 130 L 540 30 L 740 130 Z" fill="#d9b6a0" />
      <circle cx={540} cy={210} r={58} fill="#f4f1ea" stroke="#5a3a24" strokeWidth={8} />
      <line x1={540} y1={210} x2={540} y2={168} stroke="#1b1b22" strokeWidth={7} strokeLinecap="round" />
      <line x1={540} y1={210} x2={570} y2={226} stroke="#1b1b22" strokeWidth={6} strokeLinecap="round" />
      {[0, 1, 2, 3].map((k) => <rect key={k} x={392 + k * 82} y={320} width={50} height={110} rx={25} fill="#a8d8ff" stroke="#fff" strokeWidth={5} />)}
      {[0, 1, 2, 3, 4].map((k) => <rect key={`c${k}`} x={378 + k * 77} y={470} width={18} height={290} fill="#e6cfae" />)}
      <rect x={490} y={600} width={100} height={160} rx={50} fill="#6a4a3a" />
      {/* right: café */}
      <rect x={720} y={0} width={360} height={FLOOR} fill="#e8c4c4" />
      {[0, 1, 2].map((k) => <rect key={k} x={750 + k * 110} y={70} width={76} height={120} rx={8} fill="#a8d8ff" stroke="#fff" strokeWidth={6} />)}
      <path d="M 720 480 L 1080 480 L 1080 540 L 735 540 Z" fill="#2f4a6a" />
      {Array.from({length: 7}).map((_, k) => <path key={k} d={`M ${728 + k * 52} 540 q 26 24 52 0`} fill={k % 2 ? '#2f4a6a' : '#f4f1ea'} />)}
      <text x={900} y={522} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={34} fill="#f4f1ea">CAFÉ</text>
      <rect x={760} y={590} width={150} height={120} rx={6} fill="#a8d8ff" />
      <rect x={940} y={580} width={100} height={180} rx={6} fill="#4a6a8a" />
      {/* plaza floor */}
      <rect x={0} y={FLOOR} width={W} height={H - FLOOR} fill="#e2ddd2" />
      {hLines.map((y, k) => (k % 2 ? <rect key={k} x={0} y={y} width={W} height={34 * Math.pow(1.1, k)} fill="#d4cec0" opacity={0.6} /> : null))}
      <rect x={0} y={FLOOR} width={W} height={12} fill="#c9c2b2" />
    </>
  );
};

/* ───────────── composition ───────────── */
export const Karma: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
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
  const W3 = 12.3;
  const l7cut = T('l7') - 0.6;
  const AFTER = 14.5;
  const wAt = (t: number): number => {
    if (t < tRw) return Math.min(SEARCH, t - tGo);
    if (t < LS[3]) return lerp(SEARCH, W3, ease(clamp01((t - tRw) / (LS[3] - tRw))));
    if (li === 3) return Math.min(13.9, W3 + (t - LS[3]) * 0.85);
    if (li === 4) return t < l7cut ? T_SWERVE + (t - T('l8')) * 0.8 : 7.0 + (t - l7cut) * 0.95;
    if (li === 5) return 5.7 + (t - LS[5]) * 0.75;
    if (li === 6) return 3.8 + (t - LS[6]) * 0.8;
    if (li === 7) return 2.5 + (t - LS[7]) * 0.7;
    if (li === 8) return Math.min(1.75, 0.2 + (t - LS[8]) * 1.3);
    if (li === 9) return AFTER;
    return AFTER + (t - LS[10]) * 0.5;
  };
  const w = wAt(s);
  const searching = s >= tGo && s < tGo + SEARCH;
  const frozen = (s >= tGo + SEARCH && s < tRw) || (li === 8 && s > T('same') + 0.5) || li === 9;
  const rewinding = s >= tRw && s < LS[3];

  // ── director
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 960, z: 1, r: 0, ...c});
  shot(0, 0.01, {x: 500, y: 980, z: 1.1});
  shot(T('arrow') - 0.1, 0.5, {x: 520, y: 960, z: 1.16});
  shot(tGo - 0.3, 0.6, {x: 540, y: 960, z: 1.0});
  shot(tGo + T_SPLASH - 0.05, 0.12, {x: 520, y: 980, z: 1.45});
  shot(tLate, 0.5, {x: 540, y: 960, z: 1.0});
  // trace shots: put the action centre at screen y ~1080 (below the card + captions)
  const foc = (t: number, blend: number, x: number, y: number, z: number) => shot(t, blend, {x, y: y - 120 / z, z});
  foc(LS[3], 0.6, 500, 965, 1.9);
  foc(LS[4] - 0.1, 0.6, 500, 1150, 1.55);
  foc(l7cut, 0.3, 640, 1350, 1.7);
  foc(LS[5] - 0.1, 0.6, 780, 1300, 1.85);
  foc(LS[6] - 0.1, 0.6, 780, 1010, 1.65);
  foc(LS[7] - 0.1, 0.6, 310, 1035, 2.0);
  foc(LS[8] - 0.1, 0.6, 420, 985, 2.1);
  foc(T('same') - 0.05, 0.35, 470, 950, 3.0);
  foc(LS[9] - 0.1, 0.8, 580, 1135, 1.15);
  foc(LS[10] - 0.05, 0.45, 500, 900, 2.7);
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const kick = (t0: number, amp: number, decay: number) => (s >= t0 ? amp * Math.exp(-(s - t0) * decay) : 0);
  const shake = kick(tGo + T_SPLASH, 16, 6) + kick(tGo + T_STAND, 5, 8) + kick(tGo + T_TRAY, 5, 8) + kick(T('same'), 7, 7) + kick(T('ten'), 6, 8) + kick(T('karma'), 6, 8);
  const shx = Math.sin(frame * 2.3) * shake;
  const shy = Math.cos(frame * 2.9) * shake;
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + shx}px, ${960 - cam.y + shy}px) scale(${cam.z})`};
  const toScreen = (x: number, y: number): P => [540 + (x - cam.x) * cam.z + shx, 960 + (y - cam.y) * cam.z + shy];

  // ── the chain actors
  const kM = kAt(MAN[1]);
  const inWater = w >= T_SPLASH;
  let manPose: Pose;
  if (w < 0.3) manPose = {facing: 'front', banana: 1, bob: Math.sin(w * 2) * 0.5};
  else if (w < 0.95) manPose = {facing: 'side', flip: true, banana: 1 + clamp01((w - 0.3) / 0.5)};
  else if (w < 11.5) manPose = {facing: 'front', phone: 1, bob: Math.sin(w * 1.3) * 0.4};
  else if (w < T_BUMP) manPose = {facing: 'front', mouthO: true, alert: pop(w, 11.5)};
  else manPose = {facing: 'front', mouthO: true, flail: w * 18};
  const mf = manFall(w);
  const man: Ent | null = inWater ? null : {x: MAN[0] + mf.dx, y: w >= T_BUMP ? MAN[1] + 0.5 : MAN[1], key: 'man',
    el: <g transform={`translate(0 ${mf.dy / kM}) rotate(${mf.rot}) scale(1 ${mf.sy})`}><Person L={LOOK_MAN} p={manPose} /></g>};
  const wetK = clamp01((w - T_SPLASH) / 0.5);
  const waterMan = inWater ? (
    <g transform={`translate(-38 ${-30 + (1 - wetK) * 30})`}>
      <clipPath id="karma-water"><rect x={-60} y={-140} width={120} height={116} /></clipPath>
      <g clipPath="url(#karma-water)">
        <Person L={{...LOOK_MAN, hair: '#3a2a1a'}} p={w < T_SPLASH + 1.1 ? {facing: 'front', mouthO: true, flail: w * 20} : {facing: 'front', mouthO: true, bob: Math.sin(w * 3) * 0.6}} />
        {[-8, -2, 5, 9].map((x, k) => <ellipse key={x} cx={x} cy={-44 + mod(w * 30 + k * 7, 22)} rx={1.4} ry={2.4} fill={WATER} stroke="#fff" strokeWidth={0.5} />)}
      </g>
      <ellipse cx={0} cy={-24} rx={16} ry={4} fill="none" stroke="#fff" strokeWidth={2} opacity={0.85} />
    </g>
  ) : null;
  const fountain: Ent = {x: FOUNT[0], y: FOUNT[1], key: 'fount', el: <Fountain t={w} inside={waterMan} rip={inWater ? clamp01((w - T_SPLASH) / 1.2) : 0} />};

  const sk = skaterAt(w);
  const skater: Ent = {x: sk.x, y: sk.y, key: 'skater', el: (
    <g transform={`rotate(${sk.rot})`}>
      {!sk.down ? <Skateboard /> : null}
      <g transform={sk.down ? undefined : 'translate(0 -7)'}>
        <Person L={LOOK_SKATER} p={!sk.down ? {facing: 'side', reach: 0.3, bob: Math.sin(w * 3) * 0.5} : w < T_SLIP + 0.9 ? {facing: 'side', flail: w * 18, mouthO: true} : {facing: 'side', mouthO: true}} />
      </g>
    </g>
  )};
  const bd = boardAt(w);
  const board: Ent | null = sk.down ? {x: bd.x, y: bd.y, key: 'board', el: <g transform={`rotate(${bd.rot} 0 -5)`}><Skateboard /></g>} : null;
  const pl = peelAt(w);
  const peelGround: Ent | null = pl && pl.flat ? {x: pl.x, y: pl.y, key: 'peel', el: <Peel />} : null;
  const stand: Ent = {x: STAND[0], y: STAND[1], key: 'stand', el: <FruitStand tilt={standTilt(w)} full={w < T_STAND + 0.06} />};
  const oranges: Ent[] = ORANGES.map((o, i) => ({o, i, p: orangeAt(o, w)})).filter((x) => x.p)
    .map(({i, p}) => ({x: p!.x, y: p!.y, key: `or${i}`, el: <Orange spin={p!.spin} />}));
  const wt = waiterAt(w);
  const waiter: Ent = {x: wt.x, y: WAITER_Y, key: 'waiter', el: (
    <g transform={`translate(0 ${-wt.lift}) rotate(${wt.rot})`}>
      <Person L={LOOK_WAITER} p={!wt.down ? {facing: 'side', flip: true, walk: w * 7, reach: 1} : {facing: 'side', flip: true, flail: w * 16, mouthO: true, alert: w > T_WAITER + 0.5 && w < 9 ? pop(w, T_WAITER + 0.5) : 0}} />
      {!wt.down ? <g transform="translate(-19 -37)"><Tray /></g> : null}
    </g>
  )};
  const tr = trayAt(w);
  const trayGround: Ent | null = tr && tr.landed ? {x: tr.x, y: tr.y, key: 'tray', el: (
    <g>
      <ellipse cx={-14} cy={2} rx={16} ry={4} fill="#ffb03a" opacity={0.8} />
      <ellipse cx={12} cy={3} rx={12} ry={3} fill="#e8505b" opacity={0.7} />
      <g transform="scale(1 0.7)"><Tray glasses={false} /></g>
      {[-20, -10, 6, 16, 24].map((x, k) => <path key={x} d={`M ${x} ${-1 - (k % 2) * 2} l 3 -4 l 2 4 z`} fill="rgba(220,240,255,.9)" stroke="#9ab" strokeWidth={0.5} />)}
    </g>
  )} : null;
  const dg = dogAt(w);
  const dog: Ent = {x: dg.x, y: dg.y, key: 'dog', el: dg.mode === 'sleep' ? <SleepDog fur={DOG_FUR} dark={DOG_DARK} breath={w * 2.4} />
    : (
      <g transform={`scale(${dg.dir} 1)`}>
        <Dog fur={DOG_FUR} dark={DOG_DARK} run={dg.mode === 'run' ? w * 18 : undefined} wag={w * 16} />
        {dg.mode === 'bark' ? <text x={16} y={-44} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={18 * pop(w, T_TRAY)} fill="#d6293a" stroke="#fff" strokeWidth={3} paintOrder="stroke">!</text> : null}
      </g>
    )};
  const bk = bikeAt(w);
  const swerving = w >= T_SWERVE && w < T_BUMP;
  const rider = (
    <g transform={`translate(${BIKE_BB[0] - 2} ${BIKE_BB[1]})`}>
      <Person L={LOOK_RIDER} p={bk.crashed ? {facing: 'side', mouthO: true, flail: w * 14} : {facing: 'side', walk: w * 10, reach: 0.75, mouthO: swerving, alert: swerving ? pop(w, T_SWERVE) : 0}} />
    </g>
  );
  const bike: Ent = {x: bk.x, y: bk.y, key: 'bike', el: <g transform={`rotate(${bk.rot})`}><Bike crank={bk.crashed ? 0 : w * 10} rider={rider} /></g>};

  const hw = 540 / cam.z + 140;
  const hh = 960 / cam.z + 160;
  const ents: Ent[] = [...extrasAt(w), ...decoysAt(w), fountain, ...(man ? [man] : []), skater, ...(board ? [board] : []), ...(peelGround ? [peelGround] : []),
    stand, ...oranges, waiter, ...(trayGround ? [trayGround] : []), dog, bike, ...PROPS.map((p) => ({x: p.x, y: p.y, key: p.key, el: p.el}))]
    .filter((e) => Math.abs(e.x - cam.x) < hw && e.y > cam.y - hh && e.y - 400 < cam.y + hh)
    .sort((a, b) => a.y - b.y);

  // ── labelled boxes (world rect -> screen)
  const box = (r: [number, number, number, number], label: string, col: string, t0: number, t1: number, key: string) => {
    if (s < t0 || s >= t1) return null;
    const [sx0, sy0] = toScreen(r[0], r[1]);
    const [sx1, sy1] = toScreen(r[2], r[3]);
    const fs = Math.max(26, Math.min(42, 15 * cam.z));
    return (
      <div key={key} style={{position: 'absolute', left: sx0, top: sy0, width: sx1 - sx0, height: sy1 - sy0, border: `${Math.max(5, cam.z * 2.4)}px solid ${col}`,
        borderRadius: 10, transform: `scale(${pop(s, t0, 0.3)})`, boxShadow: '0 0 0 3px rgba(0,0,0,.35)'}}>
        <div style={{position: 'absolute', left: '50%', bottom: '100%', transform: 'translate(-50%, -6px)', background: col, color: '#111', fontFamily: heavy, fontWeight: 900,
          fontSize: fs, padding: '2px 12px', borderRadius: 6, whiteSpace: 'nowrap'}}>{label}</div>
      </div>
    );
  };
  const kk = (y: number) => kAt(y);
  const LINKS: Array<[string, string, string]> = [
    ['BANANA PEEL', 'l1', '#ffd84a'], ['SKATER', 'l2', '#ff6fd8'], ['SKATEBOARD', 'l3', '#ff4f5e'], ['FRUIT STAND', 'l4', '#2fd5a4'], ['ORANGES', 'l5', '#ff9a1f'],
    ['WAITER', 'l6', '#f4f1ea'], ['TRAY', 'l7', '#8fd0ff'], ['DOG', 'l8', '#b45cff'], ['BIKE', 'l9', '#7be07b'], ['SPLASH', 'l10', '#5fa8ff'],
  ];
  const ends: Record<string, number> = {l10: LS[4], l9: LS[4], l8: LS[5], l7: LS[5], l6: LS[6], l5: LS[6], l4: LS[7], l3: LS[7], l2: LS[8], l1: LS[8]};
  const o0 = orangeAt(ORANGES[0], w);
  const rects: Record<string, [number, number, number, number]> = {
    l10: [IN_WATER[0] - 34, IN_WATER[1] - 82, IN_WATER[0] + 34, IN_WATER[1] + 4],
    l9: bk.crashed ? [bk.x - 30 * kk(bk.y), bk.y - 64 * kk(bk.y), bk.x + 58 * kk(bk.y), bk.y + 8] : [bk.x - 36 * kk(bk.y), bk.y - 82 * kk(bk.y), bk.x + 36 * kk(bk.y), bk.y + 6],
    l8: [dg.x - 34 * kk(dg.y), dg.y - 44 * kk(dg.y), dg.x + 40 * kk(dg.y), dg.y + 8],
    l7: tr ? [tr.x - 22 * tr.k, tr.y - 22 * tr.k, tr.x + 22 * tr.k, tr.y + 8] : [0, 0, 0, 0],
    l6: wt.down ? [wt.x - 12 * kk(WAITER_Y), WAITER_Y - 34 * kk(WAITER_Y), wt.x + 70 * kk(WAITER_Y), WAITER_Y + 8] : [wt.x - 22 * kk(WAITER_Y), WAITER_Y - 72 * kk(WAITER_Y), wt.x + 22 * kk(WAITER_Y), WAITER_Y + 8],
    l5: o0 ? [o0.x - 14, o0.y - 22, o0.x + 14, o0.y + 6] : [0, 0, 0, 0],
    l4: [STAND[0] - 112 * kk(STAND[1]), STAND[1] - 166 * kk(STAND[1]), STAND[0] + 90 * kk(STAND[1]), STAND[1] + 8],
    l3: [bd.x - 30 * kk(bd.y), bd.y - 26 * kk(bd.y), bd.x + 30 * kk(bd.y), bd.y + 8],
    l2: sk.down ? [sk.x - 72 * kk(sk.y), sk.y - 34 * kk(sk.y), sk.x + 12 * kk(sk.y), sk.y + 10] : [sk.x - 24 * kk(sk.y), sk.y - 76 * kk(sk.y), sk.x + 24 * kk(sk.y), sk.y + 8],
    l1: pl ? [pl.x - 18 * kk(pl.y), pl.y - 16 * kk(pl.y), pl.x + 18 * kk(pl.y), pl.y + 8] : [0, 0, 0, 0],
  };
  const boxes = [
    ...LINKS.map(([name, kind, col], i) => box(rects[kind], `${i + 1} · ${name}`, col, T(kind), ends[kind], kind)),
    box([MAN[0] - 22 * kM, MAN[1] - 76 * kM, MAN[0] + 22 * kM, MAN[1] + 8], 'THE SAME GUY', '#ff4f5e', T('same'), LS[9], 'same'),
  ];

  // ── the chain map (L9): 10 numbered stops on the aftermath, then the loop closes back on him
  const STOPS: P[] = [[PEEL[0] + 26, PEEL[1] - 20], [230, 1000], [600, 1010], [STAND[0], STAND[1] - 120], [760, 1215],
    [855, 1290], [660, 1345], [520, 1290], [430, 1140], [IN_WATER[0], IN_WATER[1] - 50]];
  const MAPD = 1.5;
  const mapK = li === 9 ? clamp01((s - T('map')) / MAPD) : 0;
  const loopK = li === 9 ? clamp01((s - T('map') - MAPD - 0.05) / 0.55) : 0;
  const chainMap = mapK > 0 ? (() => {
    const pts = STOPS.map(([x, y]) => toScreen(x, y));
    const segs = pts.slice(1).map((p, i) => [pts[i], p] as const);
    const lens = segs.map(([a, c]) => Math.hypot(c[0] - a[0], c[1] - a[1]));
    const total = lens.reduce((a, c) => a + c, 0);
    let left = total * mapK;
    const a10 = pts[9];
    const a1 = pts[0];
    return (
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        {segs.map(([a, c], i) => {
          const f = clamp01(left / lens[i]);
          left -= lens[i];
          return f > 0 ? <line key={i} x1={a[0]} y1={a[1]} x2={lerp(a[0], c[0], f)} y2={lerp(a[1], c[1], f)} stroke="#fff" strokeWidth={9} strokeDasharray="20 13" strokeLinecap="round" /> : null;
        })}
        {loopK > 0 ? <line x1={a10[0]} y1={a10[1]} x2={lerp(a10[0], a1[0], loopK)} y2={lerp(a10[1], a1[1], loopK)} stroke="#ff4f5e" strokeWidth={12} strokeDasharray="20 13" strokeLinecap="round" /> : null}
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

  // ── UI: the card (timer during the search; the 10-link chain fills in backwards during the trace)
  const left = Math.max(0, SEARCH - Math.max(0, s - tGo));
  const secs = Math.ceil(left - 1e-6);
  const urgent = searching && secs <= 3;
  const ringK = searching ? left / SEARCH : s < tGo ? 1 : 0;
  const before = s < tGo + SEARCH;
  const found = LINKS.filter(([, k]) => s >= T(k)).length;
  const latest = LINKS.map(([n, k, c], i) => ({n, k, c, i, t: T(k)})).filter((x) => s >= x.t).sort((a, b) => b.t - a.t)[0];
  const header = before ? 'CHAIN REACTION' : rewinding ? '◀◀ REWINDING' : li < 3 ? 'TIME’S UP' : li >= 3 && li <= 7 ? `TRACING IT BACK · ${found}/10` : li === 8 ? 'IT STARTED HERE' : 'THE WHOLE CHAIN';
  const card = (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 176, background: '#f4f1ea', borderRadius: 14, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 840, height: 46, background: '#1e2a44', display: 'flex', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: '#ffd23f'}} />
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: '#f4f1ea'}}>{header}</span>
      </div>
      {li < 3 ? (
        <>
          <div style={{position: 'absolute', left: 26, top: 62, width: 640, fontFamily: heavy, fontWeight: 900, fontSize: 50, lineHeight: 1.05, color: before ? '#1b1b22' : '#d6293a'}}>
            {before ? 'WHAT STARTS IT?' : 'TOO LATE!'}
          </div>
          <div style={{position: 'absolute', left: 28, top: 126, fontFamily: MONO, fontWeight: 900, fontSize: 28, color: '#5a6070'}}>{before ? 'WATCH THE WHOLE PLAZA' : 'LET’S RUN IT BACKWARDS'}</div>
          <svg width={150} height={150} style={{position: 'absolute', left: 676, top: 36}}>
            <circle cx={75} cy={75} r={56} fill={urgent ? '#ffe0e0' : '#fff'} stroke="#d8d2c4" strokeWidth={12} />
            <circle cx={75} cy={75} r={56} fill="none" stroke={urgent ? '#ff4f5e' : '#2a8a5a'} strokeWidth={12} strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 56 * ringK} 999`} transform="rotate(-90 75 75)" />
            <text x={75} y={93} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={before ? 54 : 34} fill={urgent ? '#d6293a' : '#1b1b22'}>{before ? secs : '0'}</text>
          </svg>
        </>
      ) : (
        <>
          {LINKS.map(([, kind, col], i) => {
            const on = s >= T(kind);
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
            transform: latest ? `scale(${pop(s, latest.t, 0.3)})` : undefined}}>
            {li === 8 && s >= T('same') ? <span style={{color: '#d6293a'}}>0 · THE SAME GUY</span> : li >= 9 ? <span>1 PEEL → 10 DISASTERS</span> : latest ? `${latest.i + 1} · ${latest.n}` : '???'}
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
    capSize = Math.min(cap.hot ? 130 : 112, capWrap ? 820 / (longest * 0.78) : one);
  }
  const capPop = cap ? 0.55 + 0.45 * spring({frame: frame - Math.round(cap.start * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;

  // hook arrow on the guy — gone the moment the search starts (so eyes leave him)
  const [mx, my] = toScreen(MAN[0], MAN[1] - 80 * kM);
  const arrow = s >= T('arrow') - 0.15 && s < tGo + 0.25 ? (
    <div style={{position: 'absolute', left: mx - 60, top: my - 170 + Math.sin(s * 7) * 10, width: 120, textAlign: 'center', transform: `scale(${pop(s, T('arrow') - 0.15)})`}}>
      <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 38, color: '#fff', WebkitTextStroke: '7px #111', paintOrder: 'stroke fill', whiteSpace: 'nowrap', marginLeft: -40, width: 200}}>THIS GUY</div>
      <svg width={120} height={90} viewBox="0 0 120 90"><path d="M 35 0 L 85 0 L 85 40 L 110 40 L 60 88 L 10 40 L 35 40 Z" fill="#ff4f5e" stroke="#111" strokeWidth={7} /></svg>
    </div>
  ) : null;

  const splatT = tGo + T_SPLASH;
  const slam = s >= splatT && s < splatT + 0.9 ? <Slam k={(s - splatT) / 0.9} text="SPLASH!" color="#5fa8ff" size={170} top={1180} />
    : s >= T('same') && s < T('same') + 1.1 ? <Slam k={(s - T('same')) / 1.1} text="HIM?!" color="#ff4f5e" size={160} top={1330} />
      : s >= T('ten') && s < T('ten') + 1.1 ? <Slam k={(s - T('ten')) / 1.1} text="10 DISASTERS" color="#ffd23f" size={112} top={1400} />
        : s >= T('karma') && s < T('karma') + 1.3 ? <Slam k={(s - T('karma')) / 1.3} text="KARMA" color="#ffd23f" size={170} top={1330} />
          : s >= T('secs') - 0.1 ? <Slam k={Math.min(0.85, (s - T('secs') + 0.1) / 1.4)} text="12.0 SEC" color="#7be07b" size={130} top={1350} /> : null;
  const ticks = Array.from({length: SEARCH}).map((_, k) => tGo + k);

  // splash droplets (world)
  const splashD = w >= T_SPLASH && w < T_SPLASH + 0.9 ? (w - T_SPLASH) / 0.9 : -1;
  // flying peel / tray (world overlays)
  const flyPeel = pl && !pl.flat ? <g transform={`translate(${pl.x} ${pl.y}) scale(${kAt(MAN[1])}) rotate(${pl.r})`}><Peel flat={false} /></g> : null;
  const flyTray = tr && !tr.landed ? <g transform={`translate(${tr.x} ${tr.y}) scale(${tr.k}) rotate(${tr.r})`}><Tray /></g> : null;
  const zz = dg.mode === 'sleep' ? [0, 1, 2].map((k) => {
    const u = mod(w * 0.6 + k / 3, 1);
    const kd = kAt(DOGP[1]);
    return <text key={k} x={DOGP[0] + (24 + u * 18) * kd} y={DOGP[1] - (22 + u * 34) * kd} fontFamily="Arial Black, Arial" fontWeight={900} fontSize={(9 + u * 6) * kd} fill="#5a6a8a" opacity={1 - u}>z</text>;
  }) : null;

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, filter: li === 9 ? 'saturate(0.35) brightness(0.62)' : frozen || rewinding ? 'saturate(0.45) brightness(0.95)' : undefined}}>
        <div style={camStyle}>
          <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <Plaza />
            {ents.map((e) => <g key={e.key} transform={`translate(${e.x} ${e.y}) scale(${kAt(e.y) * (e.sc ?? 1)})`}>{e.el}</g>)}
            {zz}
            {flyPeel}
            {flyTray}
            {splashD >= 0 ? Array.from({length: 16}).map((_, k) => {
              const a = -Math.PI * (0.08 + 0.84 * (k / 15));
              const v = 0.7 + rnd(k * 3.3) * 0.6;
              return <ellipse key={k} cx={IN_WATER[0] + Math.cos(a) * splashD * 120 * v} cy={IN_WATER[1] - 40 + Math.sin(a) * splashD * 150 * v + splashD * splashD * 170}
                rx={8 * (1 - splashD * 0.5)} ry={11 * (1 - splashD * 0.5)} fill={k % 3 ? WATER : '#e8f7ff'} stroke="#fff" strokeWidth={1.5} />;
            }) : null}
            {splashD >= 0 && splashD < 0.6 ? <ellipse cx={IN_WATER[0]} cy={IN_WATER[1] - 20} rx={40 + splashD * 90} ry={14 + splashD * 30} fill="none" stroke="#e8f7ff" strokeWidth={10 * (1 - splashD)} /> : null}
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
      {s < tGo + SEARCH ? <div style={{position: 'absolute', left: 120, top: 420, width: 840 * ringK, height: 10, borderRadius: 5, background: urgent ? '#ff4f5e' : '#ffd23f'}} /> : null}
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
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}><Audio src={staticFile(ln.file)} /></Sequence>
      ))}
      {ticks.map((t, k) => (
        <Sequence key={`t${k}`} from={Math.round(t * FPS)} durationInFrames={20}><Audio src={staticFile('sfx/tick.wav')} volume={k >= SEARCH - 3 ? 0.8 : 0.35} /></Sequence>
      ))}
      {([
        [tGo + T_TOSS - 0.1, 'sfx/whoosh.wav', 0.35], [tGo + T_RIM, 'sfx/pop.wav', 0.5], [tGo + T_SLIP, 'sfx/whoosh.wav', 0.55], [tGo + T_SLIP + 0.38, 'sfx/punch.wav', 0.6],
        [tGo + T_STAND, 'sfx/crack.wav', 0.7], [tGo + T_STAND + 0.4, 'sfx/pop.wav', 0.45], [tGo + T_STAND + 0.7, 'sfx/pop.wav', 0.4],
        [tGo + T_WAITER, 'sfx/whoosh.wav', 0.6], [tGo + T_TRAY, 'sfx/clank.wav', 0.85], [tGo + T_TRAY + 0.05, 'sfx/shine.wav', 0.5],
        [tGo + T_SWERVE, 'sfx/bell.wav', 0.55], [tGo + T_SWERVE + 1.1, 'sfx/bell.wav', 0.45], [tGo + T_BUMP, 'sfx/punch.wav', 0.8],
        [splatT, 'sfx/slam.wav', 0.9], [splatT, 'sfx/seeds.wav', 0.8], [splatT + 0.05, 'sfx/boom.wav', 0.45],
        [tLate, 'sfx/fail.wav', 0.6], [tRw, 'sfx/scratch.wav', 0.6], [tRw + 0.1, 'sfx/whoosh.wav', 0.6],
        ...LINKS.map(([, k], i) => [T(k), 'sfx/ding.wav', 0.42 + i * 0.015] as [number, string, number]),
        [T('throw'), 'sfx/whoosh.wav', 0.45], [T('same'), 'sfx/slam.wav', 0.85], [T('map'), 'sfx/whoosh.wav', 0.5],
        [T('ten'), 'sfx/slam.wav', 0.8], [T('karma'), 'sfx/shine.wav', 0.6], [T('secs'), 'sfx/bell.wav', 0.6],
      ] as Array<[number, string, number]>).map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round(t * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
