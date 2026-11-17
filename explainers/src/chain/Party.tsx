import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Slam} from '../fight/Fight';
import {camAt, Shot} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {FPS, StoryEpisode, at, buildPlan, lineAt} from '../story/timeline';
import {Bench, Bin, HAIRS, Look, PANTS, Person, Pose, SHIRTS, SKINS} from '../observe/art';
import {Lamp, Pigeon} from './art';
import {BIKE_BB, Bike} from './karma-art';
import {Ball, Goose, KITE_TIE, Kite, PartyHat, PartyTable, SEESAW_HALF, SEESAW_PIVOT_Y, SandBucket, Seesaw, Sprinkler, Tree} from './party-art';

// CHAIN REACTION #3 — HARD MODE. A park birthday. Hook: "in 15 s this cake gets
// smashed — find what starts it". Harder than #13/#15 on purpose:
//  * the start is a tiny sprinkler in the FAR top-left corner, at w = 0.4 s,
//    while eyes are still on the cake arrow in the middle;
//  * chain events make NO sound during the search — only the decoys do
//    (ball-kick thuds, a pigeon flock, a bike bell, a balloon pop);
//  * red herrings: a 2nd sprinkler (opposite corner, switches on first), a 2nd
//    kite, kids kicking another ball, a 2nd jogger, a pigeon take-off;
//  * no screen shake until the splat.
// Chain: sprinkler -> goose -> kid -> ball -> jogger -> seesaw -> bucket ->
// kite guy -> kite -> CAKE. Pure function of the world clock w.
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';

const W = 1080;
const H = 1920;
const FLOOR = 760;
const SEARCH = 15;
const N_EXTRAS = 74;
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

/* ───────────── the chain (world-time) ───────────── */
const SPR: P = [165, 836];
const GOOSE0: P = [242, 850];
const KID: P = [300, 1125];
const JOG_Y = 1400;
const SAW: P = [650, 1405];
const FLY: P = [840, 1060];
const TABLE: P = [560, 1090];
const T_SPR = 0.4;
const T_WAKE = 1.1;
const T_GRUN = 1.6;
const T_GARR = 3.35;
const T_SEE = 3.15;
const T_KICK = 3.5;
const T_BLAND = 4.3;
const T_BSTOP = 4.75;
const T_TRIP = 4.9;
const T_SLAM = 5.3;
const T_LAUNCH = 5.4;
const T_HEAD = 6.6;
const T_LETGO = 7.3;
const T_SPLAT = 12.4;
const KITE_SC = 1.3;

const sprOn = (w: number) => clamp01((w - T_SPR) / 0.5);
const GOOSE_PATH: Array<[number, number, number]> = [[T_GRUN, GOOSE0[0], GOOSE0[1]], [2.5, 262, 965], [T_GARR, 268, 1100], [4.0, 262, 1108], [6.0, 128, 1112]];
const gooseAt = (w: number): {x: number; y: number; mode: 'sleep' | 'honk' | 'run'; dir: number} => {
  if (w < T_WAKE) return {x: GOOSE0[0], y: GOOSE0[1], mode: 'sleep', dir: 1};
  if (w < T_GRUN) return {x: GOOSE0[0], y: GOOSE0[1] - Math.max(0, Math.sin(clamp01((w - T_WAKE) / 0.3) * Math.PI)) * 14, mode: 'honk', dir: 1};
  const [x, y] = path(GOOSE_PATH, w);
  const [x2] = path(GOOSE_PATH, w + 0.05);
  const moving = w < T_GARR || (w > 4.0 && w < 6.0);
  return {x, y, mode: moving ? 'run' : 'honk', dir: x2 >= x - 0.3 ? 1 : -1};
};
const KB = 4.488; // keepy-uppy bounce rate: the ball touches the foot exactly at T_KICK
const ballAt = (w: number): {x: number; y: number; spin: number} => {
  if (w < T_KICK) return {x: KID[0] + 22, y: KID[1] - Math.abs(Math.sin(w * KB)) * 36, spin: w * 3};
  if (w < T_BLAND) {
    const u = (w - T_KICK) / (T_BLAND - T_KICK);
    return {x: lerp(KID[0] + 22, 470, u), y: lerp(KID[1], JOG_Y - 2, u) - Math.sin(u * Math.PI) * 170, spin: 3.5 * 3 + u * 14};
  }
  if (w < T_TRIP) {
    const u = clamp01((w - T_BLAND) / (T_BSTOP - T_BLAND));
    return {x: lerp(470, 505, outQ(u)), y: JOG_Y - 2 - Math.abs(Math.sin(u * Math.PI * 2)) * 8 * (1 - u), spin: 24 + outQ(u) * 4};
  }
  const u = clamp01((w - T_TRIP) / 0.6);
  return {x: lerp(505, 590, outQ(u)), y: JOG_Y + 14 * u, spin: 28 + outQ(u) * 10};
};
const kidAt = (w: number): {x: number; pose: Pose} => {
  if (w < T_SEE) return {x: KID[0], pose: {facing: 'side', reach: Math.max(0, Math.sin(w * KB)) * 0.5}};
  if (w < T_KICK + 0.2) return {x: KID[0], pose: {facing: 'side', reach: 1, mouthO: true, alert: pop(w, T_SEE)}};
  const u = clamp01((w - T_KICK - 0.2) / 2.0);
  return {x: lerp(KID[0], -90, u), pose: {facing: 'side', flip: true, flail: w * 18, mouthO: true}};
};
const jogX = (w: number) => 505 + 300 * (w - T_TRIP);
const joggerAt = (w: number): {x: number; y: number; rot: number; down: boolean} => {
  if (w < T_TRIP) return {x: jogX(w), y: JOG_Y, rot: 0, down: false};
  const u = clamp01((w - T_TRIP) / (T_SLAM - T_TRIP));
  return {x: lerp(505, 528, u), y: JOG_Y - Math.sin(u * Math.PI) * 50, rot: 84 * outQ(u), down: true};
};
const sawTilt = (w: number) => {
  if (w < T_SLAM) return 11;
  const k = clamp01((w - T_SLAM) / 0.1);
  const t = w - T_SLAM - 0.1;
  return lerp(11, -11, k) + (t > 0 ? 2 * Math.sin(t * 26) * Math.exp(-t * 6) : 0);
};
const kSaw = kAt(SAW[1]);
const BUCKET0: P = [SAW[0] + (SEESAW_HALF - 6) * kSaw, SAW[1] - 0.6 * kSaw];
const kFly = kAt(FLY[1]);
const flyerX = (w: number) => (w < T_HEAD ? FLY[0] : FLY[0] + Math.sin((w - T_HEAD) * 5) * 24 * Math.exp(-(w - T_HEAD) * 0.25));
const bucketAt = (w: number): {x: number; y: number; r: number; k: number; onHead: boolean} => {
  if (w < T_LAUNCH) return {x: BUCKET0[0], y: BUCKET0[1], r: 0, k: kSaw, onHead: false};
  const head: P = [flyerX(w), FLY[1] - 66 * kFly];
  if (w < T_HEAD) {
    const u = (w - T_LAUNCH) / (T_HEAD - T_LAUNCH);
    return {x: lerp(BUCKET0[0], head[0], u), y: lerp(BUCKET0[1], head[1], u) - Math.sin(u * Math.PI) * 330, r: 540 * u, k: lerp(kSaw, kFly, u), onHead: false};
  }
  return {x: head[0], y: head[1], r: 180, k: kFly, onHead: true};
};
const HAND: P = [-17.8, -33.8]; // flyer's front hand (person units; flipped to face left)
const kiteAt = (w: number): {x: number; y: number; r: number} => {
  const bx = 690 + 14 * Math.sin(w * 1.3);
  const by = 560 + 10 * Math.sin(w * 1.9);
  const br = 8 * Math.sin(w * 1.1);
  if (w < T_LETGO) return {x: bx, y: by, r: br};
  const KP: Array<[number, number, number]> = [[T_LETGO, 690 + 14 * Math.sin(T_LETGO * 1.3), 560 + 10 * Math.sin(T_LETGO * 1.9)], [8.6, 765, 525], [9.8, 712, 600], [10.9, 625, 700], [11.6, 596, 815], [T_SPLAT, 566, 975]];
  const [x, y] = path(KP, w);
  const dive = clamp01((w - 10.9) / (T_SPLAT - 10.9));
  const loose = (w - T_LETGO);
  return {x, y, r: w >= T_SPLAT ? 168 : 30 * Math.sin(loose * 3.4) * (1 - dive) + 168 * dive * dive};
};

const LOOK_KID: Look = {shirt: '#ff6fd8', pants: '#2a3a5a', skin: '#d9a47c', hair: '#2a1d16', hairStyle: 0, hat: 'cap', hatCol: '#3fa7ff'};
const LOOK_JOG: Look = {shirt: '#ff9a1f', pants: '#1b1b22', skin: '#a86e45', hair: '#1b1b22', hairStyle: 2};
const LOOK_FLY: Look = {shirt: '#b45cff', pants: '#5a4a3a', skin: '#f1c9a5', hair: '#a0522d', hairStyle: 1};

type Ent = {x: number; y: number; key: string; el: React.ReactNode; sc?: number};

/* ───────────── decoys (they get the sounds) ───────────── */
const DSPR: P = [915, 848];
const DKA: P = [690, 905];
const DKB: P = [880, 935];
const PASS0 = 0.7;
const PASS = 1.5;
const DFLY: P = [405, 905];
const DJOG_Y = 1255;
const djogX = (w: number) => 1150 - 260 * (w - 5.5);
const PIGEONS: P[] = Array.from({length: 7}).map((_, i) => [330 + rnd(i * 4.1) * 120, 1272 + rnd(i * 2.7) * 46] as P);
const T_PIG = 8.4;
const BIKE_PATH_Y = 962;
const dbikeX = (w: number) => -90 + 230 * (w - 8.6);
const T_BALLOON = 9.6;
const LOOK_DKA: Look = {shirt: '#7be07b', pants: '#2f4a6a', skin: '#f3d6bd', hair: '#c98f3a', hairStyle: 0};
const LOOK_DKB: Look = {shirt: '#ffd23f', pants: '#3a3a44', skin: '#7a4a2a', hair: '#1b1b22', hairStyle: 0, hat: 'cap', hatCol: '#e8505b'};
const LOOK_DFLY: Look = {shirt: '#3fa7ff', pants: '#3a3a44', skin: '#e2b48c', hair: '#5a3a24', hairStyle: 3};
const LOOK_DJOG: Look = {shirt: '#e8505b', pants: '#2a3a5a', skin: '#f1c9a5', hair: '#c98f3a', hairStyle: 1};
const LOOK_DRIDE: Look = {shirt: '#2fb5a4', pants: '#3a3a44', skin: '#d9a47c', hair: '#1b1b22', hairStyle: 0, hat: 'cap', hatCol: '#ffd23f'};
const passBall = (w: number): P => {
  if (w < PASS0) return [DKA[0] + 18, DKA[1]];
  const n = Math.floor((w - PASS0) / PASS);
  const u = clamp01(((w - PASS0) - n * PASS) / 1.0);
  const [a, b] = n % 2 ? [[DKB[0] - 18, DKB[1]], [DKA[0] + 18, DKA[1]]] : [[DKA[0] + 18, DKA[1]], [DKB[0] - 18, DKB[1]]];
  return [lerp(a[0], b[0], outQ(u)), lerp(a[1], b[1], outQ(u)) - Math.sin(u * Math.PI) * 26];
};
const decoyKicks = (until: number) => {
  const out: number[] = [];
  for (let t = PASS0; t < until; t += PASS) out.push(t);
  return out;
};
const decoysAt = (w: number): Ent[] => {
  const n = w < PASS0 ? -1 : Math.floor((w - PASS0) / PASS);
  const kickA = n >= 0 && n % 2 === 0 && w - (PASS0 + n * PASS) < 0.3;
  const kickB = n >= 0 && n % 2 === 1 && w - (PASS0 + n * PASS) < 0.3;
  const [bx, by] = passBall(w);
  const dj = djogX(w);
  const pigUp = w >= T_PIG;
  const ents: Ent[] = [
    {x: DSPR[0], y: DSPR[1], key: 'dspr', el: <g transform="scale(-1 1)"><Sprinkler on={clamp01((w - 0.15) / 0.5)} t={w + 0.7} reach={60} /></g>},
    {x: DKA[0], y: DKA[1], key: 'dka', el: <Person L={LOOK_DKA} p={{facing: 'side', reach: kickA ? 1 : 0.15, bob: Math.sin(w * 2) * 0.4}} />, sc: 0.82},
    {x: DKB[0], y: DKB[1], key: 'dkb', el: <Person L={LOOK_DKB} p={{facing: 'side', flip: true, reach: kickB ? 1 : 0.15, bob: Math.sin(w * 2.2) * 0.4}} />, sc: 0.82},
    {x: bx, y: by, key: 'dball', el: <Ball spin={w * 6} />},
    {x: DFLY[0], y: DFLY[1], key: 'dfly', el: <Person L={LOOK_DFLY} p={{facing: 'side', flip: true, reach: 1, bob: Math.sin(w * 1.5) * 0.4}} />},
    ...PIGEONS.map((p, i): Ent => {
      if (!pigUp) return {x: p[0], y: p[1], key: `pg${i}`, el: <g transform={`scale(${i % 2 ? -1 : 1} 1)`}><Pigeon peck={w * 5 + i} /></g>};
      const u = w - T_PIG - i * 0.04;
      const dx = (i % 2 ? -1 : 1) * (40 + i * 12) * Math.max(0, u);
      return {x: p[0] + dx, y: p[1], key: `pg${i}`, el: <g transform={`translate(0 ${-Math.max(0, u) * (160 + i * 20)}) scale(${dx < 0 ? -1 : 1} 1)`}><Pigeon fly={w * 30 + i} /></g>};
    }),
  ];
  if (w > 5.5 && dj > -100) ents.push({x: dj, y: DJOG_Y, key: 'djog', el: <Person L={LOOK_DJOG} p={{facing: 'side', flip: true, walk: w * 14}} />});
  const bkx = dbikeX(w);
  if (w > 8.6 && bkx < W + 100) ents.push({x: bkx, y: BIKE_PATH_Y, key: 'dbike', el: <Bike crank={w * 9} rider={<g transform={`translate(${BIKE_BB[0] - 2} ${BIKE_BB[1]})`}><Person L={LOOK_DRIDE} p={{facing: 'side', walk: w * 9, reach: 0.75}} /></g>} />});
  return ents;
};

/* ───────────── the party + extras ───────────── */
const GUESTS: Array<{x: number; y: number; look: Look; hat: string | null; sc: number; facing: 'front' | 'back' | 'side'; flip?: boolean; phone?: boolean}> = [
  {x: 478, y: 1072, look: {shirt: '#3fa7ff', pants: '#2a3a5a', skin: '#f3d6bd', hair: '#c98f3a', hairStyle: 1}, hat: '#ff4f5e', sc: 0.8, facing: 'front'},
  {x: 640, y: 1074, look: {shirt: '#ffd23f', pants: '#5a4a3a', skin: '#a86e45', hair: '#1b1b22', hairStyle: 0}, hat: '#7be07b', sc: 0.8, facing: 'front'},
  {x: 600, y: 1052, look: {shirt: '#ff6fd8', pants: '#3a3a44', skin: '#e2b48c', hair: '#5a3a24', hairStyle: 3}, hat: '#5fa8ff', sc: 0.78, facing: 'front'},
  {x: 420, y: 1092, look: {shirt: '#f4f1ea', pants: '#2f4a6a', skin: '#d9a47c', hair: '#2a1d16', hairStyle: 1, bag: 'tote', bagCol: '#8a5a3a'}, hat: null, sc: 1, facing: 'side', phone: true},
  {x: 705, y: 1096, look: {shirt: '#4a7a5a', pants: '#3a3a44', skin: '#f1c9a5', hair: '#8a8f9c', hairStyle: 2}, hat: null, sc: 1, facing: 'side', flip: true},
];
const PROPS = [
  {x: 60, y: 900, r: 40, el: <Tree s={0.9} />, key: 'tr1'},
  {x: 1010, y: 1180, r: 50, el: <Tree s={1.05} col="#4f9e4c" />, key: 'tr2'},
  {x: 150, y: 1580, r: 60, el: <Tree s={1.2} />, key: 'tr3'},
  {x: 520, y: 840, r: 40, el: <Lamp />, key: 'lamp1'},
  {x: 300, y: 1700, r: 70, el: <Bench />, key: 'b1'},
  {x: 790, y: 1640, r: 70, el: <Bench />, key: 'b2'},
  {x: 1000, y: 880, r: 30, el: <Bin />, key: 'bin'},
];
const KEEP_OUT: [number, number, number][] = (() => {
  const k: [number, number, number][] = [
    [SPR[0], SPR[1], 60], [GOOSE0[0], GOOSE0[1], 45], [KID[0], KID[1], 70], [SAW[0], SAW[1], 140], [FLY[0], FLY[1], 75], [TABLE[0], TABLE[1], 175],
    [DSPR[0], DSPR[1], 55], [DKA[0], DKA[1], 45], [DKB[0], DKB[1], 45], [DFLY[0], DFLY[1], 50], [400, 1295, 90], [470, 1390, 60],
    ...PROPS.map((p) => [p.x, p.y, p.r] as [number, number, number]),
  ];
  for (let w = T_GRUN; w <= 6; w += 0.2) { const [x, y] = path(GOOSE_PATH, w); k.push([x, y, 40]); }
  for (let x = -40; x <= 320; x += 40) k.push([x, KID[1], 44]);
  for (let x = -40; x <= 620; x += 40) k.push([x, JOG_Y, 46]);
  for (let x = DKA[0]; x <= DKB[0]; x += 40) k.push([x, lerp(DKA[1], DKB[1], (x - DKA[0]) / (DKB[0] - DKA[0])), 34]);
  for (let u = 0; u <= 1; u += 0.1) k.push([lerp(BUCKET0[0], FLY[0], u), lerp(BUCKET0[1], FLY[1], u), 40]);
  return k;
})();
type Extra = {look: Look; x: number; y: number; v: number; facing: 'front' | 'back' | 'side'; flip: boolean; phone: boolean; walk: boolean};
const EXTRAS: Extra[] = (() => {
  const out: Extra[] = [];
  for (let c = 0; c < 6000 && out.length < N_EXTRAS; c++) {
    const x = 30 + rnd(c * 7.13 + 1300) * 1020;
    const y = FLOOR + 50 + rnd(c * 3.71 + 1300.5) * 1070;
    const k = kAt(y);
    if (Math.abs(y - BIKE_PATH_Y) < 36 || Math.abs(y - DJOG_Y) < 40) continue;
    if (KEEP_OUT.some(([px, py, r]) => Math.hypot(px - x, (py - y) * 1.3) < r + 8 * k)) continue;
    if (out.some((o) => Math.hypot(o.x - x, (o.y - y) * 1.6) < 60 * k)) continue;
    const i = out.length;
    const r = (j: number) => rnd(i * 19.3 + j * 3.7 + 800);
    const walk = y > 1720 && r(12) < 0.6;
    const look: Look = {
      shirt: pick(SHIRTS, r(1)), pants: pick(PANTS, r(2)), skin: pick(SKINS, r(3)), hair: pick(HAIRS, r(4)),
      hairStyle: (Math.floor(r(5) * 4) % 4) as 0 | 1 | 2 | 3, hat: r(6) < 0.18 ? 'cap' : null, hatCol: pick(['#1b1b22', '#c8504a', '#2f4a6a'], r(7)),
      coat: r(8) < 0.12, shades: r(10) < 0.15,
      bag: r(13) < 0.25 ? 'tote' : r(13) < 0.4 ? 'backpack' : null, bagCol: pick(['#5a3a24', '#3a3a44', '#2f4a6a', '#8a5a3a'], r(11)),
    };
    const fr = r(14);
    out.push({look, x, y, v: (26 + r(15) * 30) * (r(16) < 0.5 ? -1 : 1), facing: fr < 0.55 ? 'front' : fr < 0.8 ? 'back' : 'side', flip: r(17) < 0.5, phone: r(18) < 0.3, walk});
  }
  return out;
})();
const extrasAt = (w: number): Ent[] => EXTRAS.map((e, i) => {
  const shocked = w >= T_SPLAT + 0.15 + (i % 5) * 0.06 && Math.hypot(e.x - TABLE[0], e.y - TABLE[1]) < 520;
  if (e.walk) {
    const x = mod(e.x + e.v * w, W + 200) - 100;
    return {x, y: e.y, key: `e${i}`, el: <Person L={e.look} p={{facing: 'side', flip: e.v < 0, walk: w * (6 + Math.abs(e.v) / 9) + i, mouthO: shocked}} />};
  }
  const p: Pose = shocked
    ? {facing: 'front', mouthO: true, bob: 0}
    : {facing: e.facing, flip: e.flip, phone: e.phone && e.facing !== 'back' ? 1 : 0, bob: Math.sin(w * 1.6 + i) * 0.5};
  return {x: e.x, y: e.y, key: `e${i}`, el: <Person L={e.look} p={p} />};
});

/* ───────────── the park set ───────────── */
const Park: React.FC = () => {
  const bands: number[] = [];
  for (let y = FLOOR + 16, d = 30; y < H; y += d, d *= 1.1) bands.push(y);
  return (
    <>
      <defs>
        <linearGradient id="party-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cc8ff" />
          <stop offset="1" stopColor="#d4efff" />
        </linearGradient>
      </defs>
      <rect x={-400} y={0} width={W + 800} height={FLOOR} fill="url(#party-sky)" />
      {/* clouds */}
      {[[150, 470, 1], [820, 450, 1.2], [520, 690, 0.8]].map(([x, y, s], k) => (
        <g key={k} transform={`translate(${x} ${y}) scale(${s})`} opacity={0.9}>
          <ellipse cx={0} cy={0} rx={60} ry={20} fill="#fff" /><ellipse cx={-26} cy={-12} rx={30} ry={18} fill="#fff" /><ellipse cx={22} cy={-14} rx={34} ry={22} fill="#fff" />
        </g>
      ))}
      {/* far skyline */}
      {[[-400, 610, 260], [-140, 560, 120], [-20, 640, 130], [110, 590, 110], [220, 660, 150], [370, 620, 120], [490, 650, 140], [630, 600, 120], [750, 640, 130], [880, 580, 120], [1000, 630, 140], [1140, 600, 340]].map(([x, y, w], k) => (
        <g key={k}>
          <rect x={x} y={y} width={w} height={FLOOR - y} fill={k % 2 ? '#a9c6d8' : '#b9d3e2'} />
          {Array.from({length: Math.floor((FLOOR - y - 20) / 34)}).map((_, r) => (
            <rect key={r} x={x + 14} y={y + 16 + r * 34} width={w - 28} height={10} fill="#d6e8f2" opacity={0.7} />
          ))}
        </g>
      ))}
      {/* tree line */}
      {Array.from({length: 16}).map((_, k) => (
        <g key={k}>
          <circle cx={-300 + k * 110} cy={FLOOR - 30 - (k % 3) * 10} r={56 + (k % 2) * 14} fill={k % 2 ? '#4f9e4c' : '#5fae5a'} />
        </g>
      ))}
      {/* lawn */}
      <rect x={-400} y={FLOOR} width={W + 800} height={H - FLOOR} fill="#9fd17a" />
      {bands.map((y, k) => (k % 2 ? <rect key={k} x={-400} y={y} width={W + 800} height={30 * Math.pow(1.1, k)} fill="#8fc46c" opacity={0.55} /> : null))}
      <rect x={-400} y={FLOOR} width={W + 800} height={10} fill="#7ab35a" />
      {/* the bike path */}
      <rect x={-400} y={BIKE_PATH_Y - 26} width={W + 800} height={40} fill="#e9dcc0" />
      <rect x={-400} y={BIKE_PATH_Y - 8} width={W + 800} height={3} fill="#fff" opacity={0.6} />
      {/* playground sand under the seesaw */}
      <ellipse cx={SAW[0]} cy={SAW[1] + 4} rx={200} ry={44} fill="#ecd59a" />
      {/* flower beds */}
      {[[60, 1350], [990, 1420], [930, 1010]].map(([x, y], k) => (
        <g key={k}>
          <ellipse cx={x} cy={y} rx={46} ry={12} fill="#6a9a4a" />
          {Array.from({length: 8}).map((_, j) => <circle key={j} cx={x - 36 + j * 10} cy={y - 4 - (j % 2) * 4} r={4} fill={['#ff4f5e', '#ffd23f', '#ff9fc8', '#f4f1ea'][j % 4]} />)}
        </g>
      ))}
    </>
  );
};

/* ───────────── composition ───────────── */
export const Party: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
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
  const W3 = 11.9;
  const AFTER = 14.5;
  const wAt = (t: number): number => {
    if (t < tRw) return Math.min(SEARCH, t - tGo);
    if (t < LS[3]) return lerp(SEARCH, W3, ease(clamp01((t - tRw) / (LS[3] - tRw))));
    if (li === 3) return Math.min(13.4, W3 + (t - LS[3]) * 0.7);
    if (li === 4) return 6.2 + (t - LS[4]) * 0.75;
    if (li === 5) return 4.75 + (t - LS[5]) * 0.7;
    if (li === 6) return 3.2 + (t - LS[6]) * 0.75;
    if (li === 7) return 0.25 + (t - LS[7]) * 1.1;
    if (li === 8) return 0.62;
    if (li === 9) return AFTER;
    return AFTER + (t - LS[10]) * 0.5;
  };
  const w = wAt(s);
  const searching = s >= tGo && s < tGo + SEARCH;
  const frozen = (s >= tGo + SEARCH && s < tRw) || li === 8 || li === 9;
  const rewinding = s >= tRw && s < LS[3];

  // ── director (the search is ONE static wide shot — no zooms that point at the chain)
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 960, z: 1, r: 0, ...c});
  shot(0, 0.01, {x: 550, y: 1010, z: 1.12});
  shot(T('arrow') - 0.1, 0.5, {x: 556, y: 1000, z: 1.18});
  shot(tGo - 0.3, 0.6, {x: 540, y: 960, z: 1.0});
  shot(tGo + T_SPLAT - 0.05, 0.12, {x: 560, y: 1010, z: 1.5});
  shot(tLate, 0.5, {x: 540, y: 960, z: 1.0});
  const foc = (t: number, blend: number, x: number, y: number, z: number) => shot(t, blend, {x, y: y - 120 / z, z});
  foc(LS[3], 0.6, 585, 930, 1.6);
  foc(LS[4] - 0.1, 0.6, 800, 1190, 1.4);
  foc(LS[5] - 0.1, 0.6, 600, 1370, 1.8);
  foc(LS[6] - 0.1, 0.6, 400, 1250, 1.5);
  foc(LS[7] - 0.1, 0.6, 250, 960, 2.0);
  foc(LS[8] - 0.1, 0.5, 190, 838, 3.0);
  foc(LS[9] - 0.1, 0.8, 540, 1120, 1.1);
  foc(LS[10] - 0.05, 0.45, 560, 1030, 2.5);
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const kick = (t0: number, amp: number, decay: number) => (s >= t0 ? amp * Math.exp(-(s - t0) * decay) : 0);
  const shake = kick(tGo + T_SPLAT, 16, 6) + kick(T('first'), 6, 7) + kick(T('ten'), 6, 8) + kick(T('bday'), 6, 8);
  const shx = Math.sin(frame * 2.3) * shake;
  const shy = Math.cos(frame * 2.9) * shake;
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + shx}px, ${960 - cam.y + shy}px) scale(${cam.z})`};
  const toScreen = (x: number, y: number): P => [540 + (x - cam.x) * cam.z + shx, 960 + (y - cam.y) * cam.z + shy];

  // ── the chain actors
  const sprinkler: Ent = {x: SPR[0], y: SPR[1], key: 'spr', el: <Sprinkler on={sprOn(w)} t={w} />};
  const gs = gooseAt(w);
  const goose: Ent = {x: gs.x, y: gs.y, key: 'goose', el: (
    <g transform={`scale(${gs.dir} 1)`}>
      <Goose mode={gs.mode} t={w} wet={w > 0.85 && w < 4} />
      {gs.mode === 'honk' && w < 4.6 ? <text x={14} y={-60} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={16} fill="#d6293a" stroke="#fff" strokeWidth={3} paintOrder="stroke" transform={`scale(${gs.dir} 1)`}>!</text> : null}
    </g>
  )};
  const kd = kidAt(w);
  const kid: Ent = {x: kd.x, y: KID[1], key: 'kid', el: <Person L={LOOK_KID} p={kd.pose} />, sc: 0.82};
  const bl = ballAt(w);
  const ball: Ent = {x: bl.x, y: bl.y, key: 'ball', el: <Ball spin={bl.spin} />};
  const jg = joggerAt(w);
  const jogger: Ent = {x: jg.x, y: jg.y, key: 'jog', el: (
    <g transform={`rotate(${jg.rot})`}>
      <Person L={LOOK_JOG} p={!jg.down ? {facing: 'side', walk: w * 14} : w < T_SLAM + 0.9 ? {facing: 'side', flail: w * 18, mouthO: true} : {facing: 'side', mouthO: true}} />
    </g>
  )};
  const saw: Ent = {x: SAW[0], y: SAW[1], key: 'saw', el: <Seesaw tilt={sawTilt(w)} />};
  const bk = bucketAt(w);
  const bucketGround: Ent | null = w < T_LAUNCH ? {x: bk.x, y: bk.y, key: 'bucket', el: <g transform={`rotate(${sawTilt(w) * 0.9})`}><SandBucket /></g>} : null;
  const fx = flyerX(w);
  const blinded = w >= T_HEAD;
  const flyer: Ent = {x: fx, y: FLY[1], key: 'flyer', el: (
    <g>
      <Person L={LOOK_FLY} p={!blinded ? {facing: 'side', flip: true, reach: 1, bob: Math.sin(w * 1.5) * 0.4} : {facing: 'side', flip: true, flail: w * 16, mouthO: true}} />
      {blinded ? <g transform="translate(0 -66) rotate(180)"><SandBucket full={false} /></g> : null}
    </g>
  )};
  const table: Ent = {x: TABLE[0], y: TABLE[1], key: 'table', el: <PartyTable t={w} splat={w >= T_SPLAT ? clamp01((w - T_SPLAT) / 0.3) + 0.001 : 0} popped={w >= T_BALLOON} />};
  const guests: Ent[] = GUESTS.map((g, i) => {
    const shocked = w >= T_SPLAT + 0.1 + i * 0.05;
    const p: Pose = shocked ? {facing: g.facing === 'back' ? 'front' : g.facing, flip: g.flip, mouthO: true, flail: i % 2 ? w * 15 + i : undefined}
      : {facing: g.facing, flip: g.flip, phone: g.phone ? 1 : 0, bob: Math.sin(w * 2 + i) * 0.5};
    return {x: g.x, y: g.y, key: `g${i}`, sc: g.sc, el: <g><Person L={g.look} p={p} />{g.hat ? <PartyHat col={g.hat} /> : null}</g>};
  });

  const hw = 540 / cam.z + 160;
  const hh = 960 / cam.z + 160;
  const ents: Ent[] = [...extrasAt(w), ...decoysAt(w), sprinkler, goose, kid, ball, jogger, saw, ...(bucketGround ? [bucketGround] : []), flyer, table, ...guests,
    ...PROPS.map((p) => ({x: p.x, y: p.y, key: p.key, el: p.el}))]
    .filter((e) => Math.abs(e.x - cam.x) < hw && e.y > cam.y - hh && e.y - 400 < cam.y + hh)
    .sort((a, b) => a.y - b.y);

  // kites (in the air, drawn over the lawn) + strings
  const kt = kiteAt(w);
  const kiteEl = (x: number, y: number, r: number, k: number, col?: string, col2?: string) => (
    <g transform={`translate(${x} ${y}) scale(${k}) rotate(${r})`}><Kite t={w} col={col} col2={col2} /></g>
  );
  const tieOf = (x: number, y: number, r: number, k: number): P => {
    const a = (r * Math.PI) / 180;
    return [x + (KITE_TIE[0] * Math.cos(a) - KITE_TIE[1] * Math.sin(a)) * k, y + (KITE_TIE[0] * Math.sin(a) + KITE_TIE[1] * Math.cos(a)) * k];
  };
  const tie = tieOf(kt.x, kt.y, kt.r, KITE_SC);
  const hand: P = [fx + HAND[0] * kFly, FLY[1] + HAND[1] * kFly];
  const looseEnd: P = (() => {
    if (w < T_LETGO) return hand;
    const u = clamp01((w - T_LETGO) / 1.2);
    return [lerp(hand[0], tie[0] + 40 * Math.sin(w * 2), u), lerp(hand[1], tie[1] + 230, u)];
  })();
  const mainString = w < T_SPLAT
    ? <path d={`M ${tie[0]} ${tie[1]} Q ${(tie[0] + looseEnd[0]) / 2 + (w < T_LETGO ? 30 : 50 * Math.sin(w * 3))} ${(tie[1] + looseEnd[1]) / 2 + (w < T_LETGO ? 40 : 10)} ${looseEnd[0]} ${looseEnd[1]}`}
        fill="none" stroke="#f4f1ea" strokeWidth={1.6} opacity={0.95} />
    : null;
  const dk = {x: 300 + 12 * Math.sin(w * 1.1 + 2), y: 505 + 9 * Math.sin(w * 1.7 + 1), r: 7 * Math.sin(w * 0.9 + 1)};
  const dtie = tieOf(dk.x, dk.y, dk.r, 1.15);
  const dhand: P = [DFLY[0] + HAND[0] * kAt(DFLY[1]), DFLY[1] + HAND[1] * kAt(DFLY[1])];
  const dString = <path d={`M ${dtie[0]} ${dtie[1]} Q ${(dtie[0] + dhand[0]) / 2 + 26} ${(dtie[1] + dhand[1]) / 2 + 36} ${dhand[0]} ${dhand[1]}`} fill="none" stroke="#f4f1ea" strokeWidth={1.6} opacity={0.95} />;

  // flying bucket (world overlay)
  const flyBucket = !bk.onHead && w >= T_LAUNCH ? <g transform={`translate(${bk.x} ${bk.y}) scale(${bk.k}) rotate(${bk.r} 0 -9)`}><SandBucket /></g> : null;
  const sand = w >= T_LAUNCH && w < T_LAUNCH + 1.1 ? Array.from({length: 8}).map((_, k) => {
    const u = (w - T_LAUNCH) / 1.1;
    return <circle key={k} cx={lerp(BUCKET0[0], FLY[0], u * 0.6) + (k - 4) * 6 * u} cy={BUCKET0[1] - 30 - Math.sin(u * Math.PI) * 220 * (0.5 + k / 16) + u * u * 260} r={2.6} fill="#e6c88a" opacity={1 - u} />;
  }) : null;

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
    ['SPRINKLER', 'l1', '#8fd6ff'], ['GOOSE', 'l2', '#f4f1ea'], ['KID', 'l3', '#ff6fd8'], ['BALL', 'l4', '#ffd84a'], ['JOGGER', 'l5', '#ff9a1f'],
    ['SEESAW', 'l6', '#2fd5a4'], ['BUCKET', 'l7', '#ff4f5e'], ['KITE GUY', 'l8', '#b45cff'], ['KITE', 'l9', '#7be07b'], ['CAKE', 'l10', '#ff9fc8'],
  ];
  const ends: Record<string, number> = {l10: LS[4], l9: LS[4], l8: LS[5], l7: LS[5], l6: LS[6], l5: LS[6], l4: LS[7], l3: LS[7], l2: LS[8], l1: LS[8]};
  const kG = kk(gs.y);
  const kJ = kk(jg.y);
  const kTb = kk(TABLE[1]);
  const kS = kk(SPR[1]);
  const kKid = kk(KID[1]) * 0.82;
  const rects: Record<string, [number, number, number, number]> = {
    l10: [TABLE[0] - 30 * kTb, TABLE[1] - 90 * kTb, TABLE[0] + 30 * kTb, TABLE[1] - 30 * kTb],
    l9: [kt.x - 34 * KITE_SC, kt.y - 40 * KITE_SC, kt.x + 34 * KITE_SC, kt.y + 40 * KITE_SC],
    l8: [fx - 24 * kFly, FLY[1] - 86 * kFly, fx + 24 * kFly, FLY[1] + 8],
    l7: bk.onHead ? [bk.x - 16 * kFly, bk.y - 12 * kFly, bk.x + 16 * kFly, bk.y + 22 * kFly] : [bk.x - 18 * bk.k, bk.y - 34 * bk.k, bk.x + 18 * bk.k, bk.y + 8],
    l6: [SAW[0] - (SEESAW_HALF + 6) * kSaw, SAW[1] + (SEESAW_PIVOT_Y - 26) * kSaw, SAW[0] + (SEESAW_HALF + 6) * kSaw, SAW[1] + 8],
    l5: jg.down ? [jg.x - 10 * kJ, jg.y - 34 * kJ, jg.x + 72 * kJ, jg.y + 10] : [jg.x - 22 * kJ, jg.y - 72 * kJ, jg.x + 22 * kJ, jg.y + 8],
    l4: [bl.x - 14 * kk(bl.y), bl.y - 22 * kk(bl.y), bl.x + 14 * kk(bl.y), bl.y + 6],
    l3: [kd.x - 22 * kKid, KID[1] - 74 * kKid, kd.x + 22 * kKid, KID[1] + 8],
    l2: [gs.x - 30 * kG, gs.y - 56 * kG, gs.x + 34 * kG, gs.y + 8],
    l1: [SPR[0] - 16 * kS, SPR[1] - 30 * kS, SPR[0] + 16 * kS, SPR[1] + 8],
  };
  const boxes = [
    ...LINKS.map(([name, kind, col], i) => box(rects[kind], `${i + 1} · ${name}`, col, T(kind), ends[kind], kind)),
    box([SPR[0] - 22 * kS, SPR[1] - 40 * kS, SPR[0] + 22 * kS, SPR[1] + 10], 'IT STARTED HERE', '#8fd6ff', T('here'), LS[9], 'here'),
  ];

  // ── the chain map (L9): 10 numbered stops corner -> cake, then the start pulses
  const STOPS: P[] = [[SPR[0], SPR[1] - 18], [262, 965], [300, 1065], [470, 1330], [545, 1395], [650, 1355], [790, 1185], [FLY[0], 985], [610, 870], [TABLE[0], 1000]];
  const MAPD = 1.5;
  const mapK = li === 9 ? clamp01((s - T('map')) / MAPD) : 0;
  const ringK = li === 9 ? clamp01((s - T('map') - MAPD - 0.05) / 0.4) : 0;
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
  const header = before ? 'CHAIN REACTION · HARD MODE' : rewinding ? '◀◀ REWINDING' : li < 3 ? 'TIME’S UP' : li >= 3 && li <= 7 ? `TRACING IT BACK · ${found}/10` : li === 8 ? 'IT STARTED HERE' : 'THE WHOLE CHAIN';
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
          <div style={{position: 'absolute', left: 28, top: 126, fontFamily: MONO, fontWeight: 900, fontSize: 28, color: '#5a6070'}}>{before ? 'DON’T TRUST YOUR EARS' : 'LET’S RUN IT BACKWARDS'}</div>
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
            {li === 8 && s >= T('here') ? <span style={{color: '#2a7ab0'}}>1 · SPRINKLER · 0.4 SEC</span> : li >= 9 ? <span>SPRINKLER → CAKE</span> : latest ? `${latest.i + 1} · ${latest.n}` : '???'}
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

  // hook arrow on the cake — gone the moment the search starts
  const [ax, ay] = toScreen(TABLE[0], TABLE[1] - 100 * kTb);
  const arrow = s >= T('arrow') - 0.15 && s < tGo + 0.25 ? (
    <div style={{position: 'absolute', left: ax - 60, top: ay - 170 + Math.sin(s * 7) * 10, width: 120, textAlign: 'center', transform: `scale(${pop(s, T('arrow') - 0.15)})`}}>
      <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 38, color: '#fff', WebkitTextStroke: '7px #111', paintOrder: 'stroke fill', whiteSpace: 'nowrap', marginLeft: -40, width: 200}}>THIS CAKE</div>
      <svg width={120} height={90} viewBox="0 0 120 90"><path d="M 35 0 L 85 0 L 85 40 L 110 40 L 60 88 L 10 40 L 35 40 Z" fill="#ff4f5e" stroke="#111" strokeWidth={7} /></svg>
    </div>
  ) : null;

  const splatT = tGo + T_SPLAT;
  const slam = s >= splatT && s < splatT + 0.9 ? <Slam k={(s - splatT) / 0.9} text="SPLAT!" color="#ff9fc8" size={170} top={1180} />
    : s >= T('first') && s < T('first') + 1.2 ? <Slam k={(s - T('first')) / 1.2} text="0.4 SEC" color="#8fd6ff" size={150} top={1330} />
      : s >= T('ten') && s < T('ten') + 1.1 ? <Slam k={(s - T('ten')) / 1.1} text="10 LINKS" color="#ffd23f" size={130} top={1400} />
        : s >= T('bday') - 0.05 ? <Slam k={Math.min(0.85, (s - T('bday') + 0.05) / 1.4)} text="HAPPY BIRTHDAY" color="#ff9fc8" size={92} top={1340} /> : null;
  const ticks = Array.from({length: SEARCH}).map((_, k) => tGo + k);

  // splat droplets + balloon pop puff (world)
  const splatD = w >= T_SPLAT && w < T_SPLAT + 0.9 ? (w - T_SPLAT) / 0.9 : -1;
  const cakeTop: P = [TABLE[0], TABLE[1] - 56 * kTb];
  const balPop = w >= T_BALLOON && w < T_BALLOON + 0.35 ? (w - T_BALLOON) / 0.35 : -1;
  const zz = gs.mode === 'sleep' ? [0, 1, 2].map((k) => {
    const u = mod(w * 0.6 + k / 3, 1);
    const kz = kAt(GOOSE0[1]);
    return <text key={k} x={GOOSE0[0] + (14 + u * 14) * kz} y={GOOSE0[1] - (24 + u * 26) * kz} fontFamily="Arial Black, Arial" fontWeight={900} fontSize={(8 + u * 5) * kz} fill="#5a6a8a" opacity={1 - u}>z</text>;
  }) : null;

  // decoy SFX only during the search (chain events are silent)
  const searchSfx: Array<[number, string, number]> = [
    ...decoyKicks(SEARCH).map((t) => [tGo + t, 'sfx/punch.wav', 0.28] as [number, string, number]),
    [tGo + T_PIG, 'sfx/whoosh.wav', 0.5], [tGo + T_PIG + 0.1, 'sfx/shutter.wav', 0.3],
    [tGo + T_BALLOON, 'sfx/pop.wav', 0.6],
    [tGo + 9.6, 'sfx/bell.wav', 0.42], [tGo + 10.8, 'sfx/bell.wav', 0.36],
  ];

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, filter: li === 9 ? 'saturate(0.35) brightness(0.62)' : frozen || rewinding ? 'saturate(0.45) brightness(0.95)' : undefined}}>
        <div style={camStyle}>
          <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <Park />
            {kiteEl(dk.x, dk.y, dk.r, 1.15, '#3fa7ff', '#f4f1ea')}
            {dString}
            {ents.map((e) => <g key={e.key} transform={`translate(${e.x} ${e.y}) scale(${kAt(e.y) * (e.sc ?? 1)})`}>{e.el}</g>)}
            {zz}
            {sand}
            {flyBucket}
            {mainString}
            {kiteEl(kt.x, kt.y, kt.r, KITE_SC)}
            {balPop >= 0 ? <circle cx={TABLE[0] + 52 * kTb} cy={TABLE[1] - 108 * kTb} r={6 + balPop * 26} fill="none" stroke="#b45cff" strokeWidth={5 * (1 - balPop)} /> : null}
            {splatD >= 0 ? Array.from({length: 18}).map((_, k) => {
              const a = -Math.PI * (0.05 + 0.9 * (k / 17));
              const v = 0.7 + rnd(k * 3.3) * 0.6;
              return <ellipse key={k} cx={cakeTop[0] + Math.cos(a) * splatD * 150 * v} cy={cakeTop[1] + Math.sin(a) * splatD * 140 * v + splatD * splatD * 180}
                rx={8 * (1 - splatD * 0.5)} ry={7 * (1 - splatD * 0.5)} fill={k % 3 ? '#ff9fc8' : '#fff'} stroke="#e070a0" strokeWidth={1} />;
            }) : null}
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
      <Sequence from={Math.round(Math.max(0, tGo - 0.3) * FPS)} durationInFrames={Math.round((SEARCH + 0.6) * FPS)}>
        <Audio src={staticFile('sfx/ambience.wav')} volume={0.5} />
      </Sequence>
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}><Audio src={staticFile(ln.file)} /></Sequence>
      ))}
      {ticks.map((t, k) => (
        <Sequence key={`t${k}`} from={Math.round(t * FPS)} durationInFrames={20}><Audio src={staticFile('sfx/tick.wav')} volume={k >= SEARCH - 3 ? 0.8 : 0.35} /></Sequence>
      ))}
      {([
        ...searchSfx,
        [splatT, 'sfx/slam.wav', 0.9], [splatT, 'sfx/seeds.wav', 0.8], [splatT + 0.05, 'sfx/boom.wav', 0.45],
        [tLate, 'sfx/fail.wav', 0.6], [tRw, 'sfx/scratch.wav', 0.6], [tRw + 0.1, 'sfx/whoosh.wav', 0.6],
        ...LINKS.map(([, k], i) => [T(k), 'sfx/ding.wav', 0.42 + i * 0.015] as [number, string, number]),
        [T('here'), 'sfx/whoosh.wav', 0.5], [T('first'), 'sfx/slam.wav', 0.85], [T('map'), 'sfx/whoosh.wav', 0.5],
        [T('ten'), 'sfx/slam.wav', 0.8], [T('bday'), 'sfx/shine.wav', 0.6], [T('bday') + 0.3, 'sfx/bell.wav', 0.55],
      ] as Array<[number, string, number]>).map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round(t * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
