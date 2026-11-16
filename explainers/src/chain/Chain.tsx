import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Slam} from '../fight/Fight';
import {camAt, Shot} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {FPS, StoryEpisode, at, buildPlan, lineAt} from '../story/timeline';
import {Bench, HAIRS, Look, PAINT, PANTS, Person, Planter, Pose, SHIRTS, SKINS} from '../observe/art';
import {Bucket, CART_PIVOT, Cart, Dog, HOOK, Ladder, Lamp, Pigeon, POLE, RUNG} from './art';

// CHAIN REACTION. A calm plaza with ~70 well-spaced people. Hook: "in 12 s this
// guy gets covered in paint — find what starts it". The chain plays during the
// search (ice cream -> dog -> pigeons -> umbrella -> ladder -> paint), the splat
// lands before time's up, then the replay traces it BACKWARDS link by link and
// ends on a map of the whole chain. Pure function of the world clock w.
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';

const W = 1080;
const H = 1920;
const FLOOR = 760;
const SEARCH = 12;
const N_EXTRAS = 115;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const pick = <T,>(arr: T[], r: number) => arr[Math.floor(r * arr.length) % arr.length];
const pop = (s: number, t0: number, d = 0.35) => (s < t0 ? 0 : 1 + 0.25 * Math.sin(clamp01((s - t0) / d) * Math.PI) * (1 - clamp01((s - t0) / d)));
const kAt = (y: number) => 1.15 + 0.75 * ((y - FLOOR) / 1100);
const mod = (a: number, n: number) => ((a % n) + n) % n;
const rot = (x: number, y: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
};

/* ───────────── the chain (world-time) ───────────── */
const MAN: [number, number] = [850, 880];
const LAD: [number, number] = [930, 830];
const CART: [number, number] = [700, 990];
const FLOCK: [number, number] = [430, 1210];
const KID: [number, number] = [520, 1120];
const CONE_GROUND: [number, number] = [536, 1130];
const T_DROP = 1.5;
const T_YANK = 2.4;
const T_BURST = 4.0;
const T_TIP = 5.6;
const T_HIT = 6.8;
const T_FALL = 8.8;
const T_SPLAT = 9.5;

const ownerX = (w: number) => 160 + 10 * Math.min(w, T_YANK);
const DOG_KEYS: [number, number, number][] = [[T_YANK, 0, 0], [T_BURST, 430, 1222], [5.0, CONE_GROUND[0] - 22, CONE_GROUND[1] + 6]];
const dogPos = (w: number): [number, number, boolean] => {
  if (w < T_YANK) return [ownerX(w) + 64, 1342, false];
  const k0: [number, number] = [ownerX(T_YANK) + 64, 1342];
  if (w < T_BURST) {
    const u = (w - T_YANK) / (T_BURST - T_YANK);
    return [lerp(k0[0], DOG_KEYS[1][1], u), lerp(k0[1], DOG_KEYS[1][2], u), true];
  }
  if (w < 5.0) {
    const u = (w - T_BURST) / 1.0;
    return [lerp(DOG_KEYS[1][1], DOG_KEYS[2][1], u), lerp(DOG_KEYS[1][2], DOG_KEYS[2][2], u), true];
  }
  return [DOG_KEYS[2][1], DOG_KEYS[2][2], false];
};
const umbrellaTilt = (w: number) => {
  if (w < 5.35) return 0;
  if (w < T_TIP) return 3 * Math.sin((w - 5.35) * 40);
  if (w < T_HIT) return 40 * Math.pow((w - T_TIP) / (T_HIT - T_TIP), 2);
  return 37 + 3 * Math.cos((w - T_HIT) * 14) * Math.exp(-(w - T_HIT) * 4);
};
const ladderRot = (w: number) => (w < T_HIT ? 0 : 8 * Math.sin((w - T_HIT) * 7.5) * clamp01((w - T_HIT) / 0.3) * (w < 9.2 ? 1 : Math.exp(-(w - 9.2) * 3)));
const hookWorld = (w: number): [number, number] => {
  const k = kAt(LAD[1]);
  const [hx, hy] = rot(HOOK[0], HOOK[1], ladderRot(w));
  return [LAD[0] + hx * k, LAD[1] + hy * k];
};
const MAN_HEAD: [number, number] = [MAN[0], MAN[1] - 60 * kAt(MAN[1]) + 4];
const bucketAt = (w: number): {x: number; y: number; r: number; on: 'hook' | 'air' | 'head'} => {
  if (w < T_FALL) return {...{x: 0, y: 0, r: 0}, on: 'hook'};
  const start = hookWorld(T_FALL);
  if (w < T_SPLAT) {
    const u = (w - T_FALL) / (T_SPLAT - T_FALL);
    return {x: lerp(start[0], MAN_HEAD[0], u), y: lerp(start[1], MAN_HEAD[1], u * u), r: 180 * u, on: 'air'};
  }
  return {x: MAN_HEAD[0], y: MAN_HEAD[1], r: 180, on: 'head'};
};
const BIRDS = Array.from({length: 8}).map((_, i) => ({
  x: FLOCK[0] + (rnd(i * 3.1) - 0.5) * 120, y: FLOCK[1] + (rnd(i * 5.7) - 0.5) * 50,
  tx: 780 + (rnd(i * 2.3) - 0.5) * 120, ty: 760 + (rnd(i * 4.9) - 0.5) * 90,
  ex: 400 + rnd(i * 6.1) * 600, ey: 120 + rnd(i * 8.3) * 120, d: i * 0.05, flip: rnd(i * 9.9) < 0.5,
}));
const birdAt = (b: (typeof BIRDS)[number], w: number): {x: number; y: number; fly: boolean; dir: number} => {
  const t0 = T_BURST + b.d;
  if (w < t0) return {x: b.x, y: b.y, fly: false, dir: b.flip ? -1 : 1};
  const t1 = 5.45 + b.d * 0.5;
  if (w < t1) {
    const u = (w - t0) / (t1 - t0);
    return {x: lerp(b.x, b.tx, u), y: lerp(b.y, b.ty, Math.sqrt(u)) - Math.sin(u * Math.PI) * 60, fly: true, dir: 1};
  }
  const u = clamp01((w - t1) / 2.0);
  return {x: lerp(b.tx, b.ex, u), y: lerp(b.ty, b.ey, u), fly: true, dir: b.ex > b.tx ? 1 : -1};
};

const LOOK_MAN: Look = {shirt: '#f4f1ea', pants: '#2a3a5a', skin: '#e2b48c', hair: '#5a3a24', hairStyle: 0};
const LOOK_KID: Look = {shirt: '#ff8a3a', pants: '#2f4a6a', skin: '#f1c9a5', hair: '#c98f3a', hairStyle: 3};
const LOOK_OWNER: Look = {shirt: '#9a5ad0', pants: '#3a3a44', skin: '#a86e45', hair: '#1b1b22', hairStyle: 1, coat: true};
const LOOK_PAINTER: Look = {shirt: '#e8e2d4', pants: '#e8e2d4', skin: '#d9a47c', hair: '#2a1d16', hairStyle: 0, hat: 'cap', hatCol: PAINT};

type Ent = {x: number; y: number; key: string; el: React.ReactNode; sc?: number};

/* ───────────── extras: well spaced, nobody near the chain ───────────── */
const PROPS = [
  {x: 110, y: 920, r: 40, el: <Lamp />, key: 'lamp1'},
  {x: 1040, y: 1580, r: 40, el: <Lamp />, key: 'lamp2'},
  {x: 290, y: 1590, r: 70, el: <Bench />, key: 'b1'},
  {x: 790, y: 1650, r: 70, el: <Bench />, key: 'b2'},
  {x: 70, y: 1180, r: 50, el: <Planter />, key: 'pl1'},
  {x: 990, y: 1470, r: 50, el: <Planter />, key: 'pl2'},
];
/* decoys (red herrings): another kid with an ice cream, another dog on a leash, another flock */
const DKID: [number, number] = [230, 985];
const DFLOCK: [number, number] = [880, 1370];
const dOwnerX = (w: number) => 520 + 11 * w;
const DECOY_BIRDS = Array.from({length: 6}).map((_, i) => ({x: DFLOCK[0] + (rnd(i * 4.4 + 50) - 0.5) * 110, y: DFLOCK[1] + (rnd(i * 6.6 + 50) - 0.5) * 44, flip: rnd(i * 2.2 + 50) < 0.5}));
const LOOK_DKID: Look = {shirt: '#3fa7ff', pants: '#5a4a3a', skin: '#a86e45', hair: '#1b1b22', hairStyle: 0, hat: 'cap', hatCol: '#e8505b'};
const LOOK_DOWNER: Look = {shirt: '#2fb5a4', pants: '#2a3a5a', skin: '#f3d6bd', hair: '#c98f3a', hairStyle: 3};
const decoysAt = (w: number): Ent[] => {
  const ox = dOwnerX(w);
  const k = kAt(1530);
  return [
    {x: DKID[0], y: DKID[1], key: 'dkid', sc: 0.74, el: <Person L={LOOK_DKID} p={{facing: 'front', cone: true, bob: Math.sin(w * 2.4) * 0.8}} />},
    {x: ox, y: 1530, key: 'downer', el: <Person L={LOOK_DOWNER} p={{facing: 'side', walk: w * 6, reach: 0.35}} />},
    {x: ox + 64, y: 1540, key: 'ddog', el: (
      <g>
        <path d={`M ${10 - 64 / k} ${-24 - 10 / k} Q ${(10 - 64 / k + 11) / 2} ${-4} 11 -20`} fill="none" stroke="#2a8a5a" strokeWidth={2.2} />
        <g transform="scale(0.9)"><Dog run={w * 6} wag={w * 12} /></g>
      </g>
    )},
    ...DECOY_BIRDS.map((b, i) => ({x: b.x, y: b.y, key: `dbird${i}`, el: <g transform={`scale(${b.flip ? -1 : 1} 1)`}><Pigeon peck={w * 5 + i * 1.7} /></g>})),
  ];
};
const KEEP_OUT: [number, number, number][] = [
  [MAN[0], MAN[1], 70], [LAD[0], LAD[1], 60], [CART[0], CART[1], 115], [FLOCK[0], FLOCK[1], 80], [KID[0], KID[1], 60],
  [ownerX(0), 1330, 70], [300, 1300, 50], [370, 1260, 50], [480, 1180, 50], [620, 870, 60], [780, 800, 60],
  [DKID[0], DKID[1], 55], [DFLOCK[0], DFLOCK[1], 75], [480, 1535, 70], [580, 1535, 70], [680, 1535, 70], [760, 1535, 70],
  ...PROPS.map((p) => [p.x, p.y, p.r] as [number, number, number]),
];
type Extra = {look: Look; x: number; y: number; v: number; facing: 'front' | 'back' | 'side'; flip: boolean; phone: boolean; walk: boolean};
const EXTRAS: Extra[] = (() => {
  const out: Extra[] = [];
  for (let c = 0; c < 4000 && out.length < N_EXTRAS; c++) {
    const x = 40 + rnd(c * 7.13) * 1000;
    const y = FLOOR + 40 + rnd(c * 3.71 + 0.5) * 1000;
    const k = kAt(y);
    if (KEEP_OUT.some(([px, py, r]) => Math.hypot(px - x, (py - y) * 1.3) < r + 8 * k)) continue;
    if (out.some((o) => Math.hypot(o.x - x, (o.y - y) * 1.6) < 58 * k)) continue;
    const i = out.length;
    const r = (j: number) => rnd(i * 17.3 + j * 3.7);
    const walk = (y > 1600 || (y > 1010 && y < 1065)) && r(12) < 0.55;
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
  const shocked = w >= T_SPLAT + 0.15 + (i % 5) * 0.06;
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
const Plaza: React.FC<{w: number}> = ({w}) => {
  const painted = w >= T_SPLAT ? 3 : 3;
  const hLines: number[] = [];
  for (let y = FLOOR + 20, d = 34; y < H; y += d, d *= 1.1) hLines.push(y);
  return (
    <>
      {/* buildings */}
      <rect x={0} y={0} width={W} height={FLOOR} fill="#e9d6b4" />
      <rect x={0} y={0} width={520} height={FLOOR} fill="#d9b6a0" />
      {[0, 1, 2, 3].map((k) => <rect key={k} x={40 + k * 120} y={60} width={80} height={130} rx={8} fill="#a8d8ff" stroke="#fff" strokeWidth={6} />)}
      {[0, 1, 2, 3].map((k) => <rect key={`r${k}`} x={570 + k * 125} y={60} width={85} height={130} rx={8} fill="#a8d8ff" stroke="#fff" strokeWidth={6} />)}
      {/* bakery (left) */}
      <rect x={30} y={500} width={460} height={260} fill="#c89878" />
      <path d="M 20 470 L 500 470 L 480 530 L 40 530 Z" fill="#2fb5a4" />
      {Array.from({length: 8}).map((_, k) => <path key={k} d={`M ${40 + k * 55} 530 q 27 26 55 0`} fill={k % 2 ? '#2fb5a4' : '#f4f1ea'} />)}
      <rect x={70} y={580} width={170} height={140} rx={6} fill="#a8d8ff" />
      <rect x={300} y={570} width={110} height={190} rx={6} fill="#6a4a3a" />
      <text x={260} y={505} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={30} fill="#f4f1ea">BAKERY</text>
      {/* café (right): the painter is painting its sign in blue */}
      <rect x={560} y={560} width={500} height={200} fill="#f4f1ea" />
      <rect x={600} y={600} width={160} height={140} rx={6} fill="#a8d8ff" />
      <rect x={790} y={590} width={90} height={170} rx={6} fill="#4a6a8a" />
      <text x={880} y={530} fontFamily="Arial Black, Arial" fontWeight={900} fontSize={72} fill={PAINT}>CAF</text>
      <text x={1028} y={530} fontFamily="Arial Black, Arial" fontWeight={900} fontSize={72} fill="none" stroke={PAINT} strokeWidth={2} strokeDasharray="6 6">É</text>
      {painted ? null : null}
      {/* plaza floor */}
      <rect x={0} y={FLOOR} width={W} height={H - FLOOR} fill="#e4dccb" />
      {hLines.map((y, k) => (k % 2 ? <rect key={k} x={0} y={y} width={W} height={34 * Math.pow(1.1, k)} fill="#d8cfbb" opacity={0.6} /> : null))}
      <rect x={0} y={FLOOR} width={W} height={12} fill="#c9bea6" />
    </>
  );
};

/* ───────────── composition ───────────── */
export const Chain: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
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
  const w3 = (t: number) => Math.min(9.4, 6.8 + (t - T('l5')) * 0.8);
  const wAt = (t: number): number => {
    if (t < tRw) return Math.min(SEARCH, t - tGo);
    if (t < LS[3]) return lerp(SEARCH, w3(LS[3]), ease(clamp01((t - tRw) / (LS[3] - tRw))));
    if (li === 3) return w3(t);
    if (li === 4) return 5.75 + (t - T('l3')) * 0.8;
    if (li === 5) return 4.0 + (t - T('scared')) * 0.8;
    if (li === 6) return 2.7 + (t - T('chasing')) * 0.9;
    if (li === 7) return Math.min(2.05, T_DROP + (t - T('drop')) * 0.8);
    if (li === 8) return 0.3;
    return 11.0 + (t - LS[9]) * 0.4;
  };
  const w = wAt(s);
  const searching = s >= tGo && s < tGo + SEARCH;
  const frozen = (s >= tGo + SEARCH && s < tRw) || (li === 7 && s > T('drop') + 0.7) || li === 8;
  const rewinding = s >= tRw && s < LS[3];

  // ── director
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 960, z: 1, r: 0, ...c});
  shot(0, 0.01, {x: 560, y: 980, z: 1.06});
  shot(T('arrow') - 0.1, 0.5, {x: 640, y: 930, z: 1.12});
  shot(tGo - 0.3, 0.6, {x: 540, y: 960, z: 1.0});
  shot(tGo + T_SPLAT - 0.05, 0.12, {x: 820, y: 800, z: 1.5});
  shot(tLate, 0.5, {x: 540, y: 960, z: 1.0});
  shot(LS[3], 0.6, {x: 860, y: 760, z: 1.85});
  shot(LS[4] - 0.1, 0.6, {x: 640, y: 790, z: 1.45});
  shot(LS[5] - 0.1, 0.6, {x: 420, y: 1210, z: 2.1});
  shot(LS[6] - 0.1, 0.6, {x: 380, y: 1230, z: 1.75});
  shot(LS[7] - 0.1, 0.6, {x: 525, y: 1080, z: 3.0});
  shot(LS[8] - 0.1, 0.8, {x: 560, y: 980, z: 1.08});
  shot(LS[9] - 0.05, 0.4, {x: 850, y: 830, z: 3.3});
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const kick = (t0: number, amp: number, decay: number) => (s >= t0 ? amp * Math.exp(-(s - t0) * decay) : 0);
  const shake = kick(tGo + T_SPLAT, 16, 6) + kick(tGo + T_HIT, 6, 8) + kick(T('six'), 6, 8) + kick(T('blue'), 6, 8);
  const shx = Math.sin(frame * 2.3) * shake;
  const shy = Math.cos(frame * 2.9) * shake;
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + shx}px, ${960 - cam.y + shy}px) scale(${cam.z})`};
  const toScreen = (x: number, y: number): [number, number] => [540 + (x - cam.x) * cam.z + shx, 960 + (y - cam.y) * cam.z + shy];

  // ── the chain actors
  const dropK = clamp01((w - T_DROP) / 0.35);
  const kid: Ent = {x: KID[0], y: KID[1], key: 'kid', sc: 0.74, el: <Person L={LOOK_KID} p={w < T_DROP ? {facing: 'front', cone: true, bob: Math.sin(w * 2) * 0.5} : {facing: 'front', mouthO: w < 4, alert: w > T_DROP + 0.2 && w < 3 ? pop(w, T_DROP + 0.2) : 0}} />};
  const yanked = w >= T_YANK;
  const owner: Ent = {x: ownerX(w), y: 1330, key: 'owner', el: <Person L={LOOK_OWNER} p={yanked ? {facing: 'side', reach: 1, mouthO: true, alert: w < T_YANK + 1.5 ? pop(w, T_YANK) : 0} : {facing: 'side', walk: w * 6, reach: 0.35}} />};
  const [dx, dy, running] = dogPos(w);
  const dog: Ent = {x: dx, y: dy, key: 'dog', el: <Dog run={running || w < T_YANK ? w * (running ? 16 : 6) : undefined} wag={w * 14} eat={w >= 5.0} />};
  const man: Ent = {x: MAN[0], y: MAN[1], key: 'man', el: <Person L={LOOK_MAN} p={w < T_SPLAT ? {facing: 'front', phone: 1, bob: Math.sin(w * 1.3) * 0.4} : {facing: 'front', paint: clamp01((w - T_SPLAT) / 0.25), mouthO: true}} />};
  const lr = ladderRot(w);
  const kL = kAt(LAD[1]);
  const ladder: Ent = {x: LAD[0], y: LAD[1], key: 'ladder', el: (
    <g transform={`rotate(${lr})`}>
      <Ladder />
      <g transform={`translate(0 ${-RUNG})`}>
        <Person L={LOOK_PAINTER} p={w >= T_HIT && w < 11 ? {facing: 'back', flail: w * 16, alert: w >= T_FALL ? pop(w, T_FALL) : 0} : {facing: 'back', ear: 1}} />
      </g>
      {w < T_FALL ? <g transform={`translate(${HOOK[0]} ${HOOK[1]})`}><Bucket /></g> : null}
    </g>
  )};
  const cart: Ent = {x: CART[0], y: CART[1], key: 'cart', el: <Cart tilt={umbrellaTilt(w)} />};
  const coneEnt: Ent | null = w >= T_DROP ? {x: lerp(KID[0] + 10, CONE_GROUND[0], dropK), y: CONE_GROUND[1] - 0.01, key: 'cone', el: (
    <g transform={`translate(0 ${-(1 - dropK) * 30})`}>
      {dropK >= 1 && w < 5.2 ? <ellipse cx={0} cy={0} rx={9} ry={3.5} fill="#ff8fc0" /> : null}
      {w < 5.2 ? <g transform={`rotate(${dropK * 110})`}><path d="M -3.4 -1 L 3.4 -1 L 0 9 Z" fill="#e0a860" /><circle cx={0} cy={-4} r={4.4} fill="#ff8fc0" /></g> : null}
    </g>
  )} : null;
  const groundBirds: Ent[] = BIRDS.map((b, i) => ({b, i, p: birdAt(b, w)})).filter((x) => !x.p.fly)
    .map(({b, i, p}) => ({x: p.x, y: p.y, key: `bird${i}`, el: <g transform={`scale(${b.flip ? -1 : 1} 1)`}><Pigeon peck={w * 6 + i} /></g>}));

  const hw = 540 / cam.z + 120;
  const hh = 960 / cam.z + 160;
  const ents: Ent[] = [...extrasAt(w), ...decoysAt(w), kid, owner, dog, man, ladder, cart, ...(coneEnt ? [coneEnt] : []), ...groundBirds,
    ...PROPS.map((p) => ({x: p.x, y: p.y, key: p.key, el: p.el}))]
    .filter((e) => Math.abs(e.x - cam.x) < hw && e.y > cam.y - hh && e.y - 400 < cam.y + hh)
    .sort((a, b) => a.y - b.y);

  const b = bucketAt(w);
  const kB = kAt(MAN[1]);
  const [ohx, ohy] = [ownerX(w) + 10 * kAt(1330), 1330 - 24 * kAt(1330)];

  // ── labelled boxes (world rect -> screen)
  const box = (x0: number, y0: number, x1: number, y1: number, label: string, col: string, t0: number, t1 = Infinity, key = label) => {
    if (s < t0 || s >= t1) return null;
    const [sx0, sy0] = toScreen(x0, y0);
    const [sx1, sy1] = toScreen(x1, y1);
    const fs = Math.max(26, Math.min(42, 15 * cam.z));
    return (
      <div key={key} style={{position: 'absolute', left: sx0, top: sy0, width: sx1 - sx0, height: sy1 - sy0, border: `${Math.max(5, cam.z * 2.4)}px solid ${col}`,
        borderRadius: 10, transform: `scale(${pop(s, t0, 0.3)})`, boxShadow: '0 0 0 3px rgba(0,0,0,.35)'}}>
        <div style={{position: 'absolute', left: '50%', bottom: '100%', transform: 'translate(-50%, -6px)', background: col, color: '#111', fontFamily: heavy, fontWeight: 900,
          fontSize: fs, padding: '2px 12px', borderRadius: 6, whiteSpace: 'nowrap'}}>{label}</div>
      </div>
    );
  };
  const personBox = (x: number, y: number, sc = 1): [number, number, number, number] => {
    const k = kAt(y) * sc;
    return [x - 20 * k, y - 70 * k, x + 20 * k, y + 6 * k];
  };
  const birdsNow = BIRDS.map((bd) => birdAt(bd, w));
  const flockBox: [number, number, number, number] = [Math.min(...birdsNow.map((p) => p.x)) - 20, Math.min(...birdsNow.map((p) => p.y)) - 34, Math.max(...birdsNow.map((p) => p.x)) + 20, Math.max(...birdsNow.map((p) => p.y)) + 8];
  const umbTop = (() => {
    const kc = kAt(CART[1]);
    const [ux, uy] = rot(0, -POLE, umbrellaTilt(w));
    return [CART[0] + (CART_PIVOT[0] + ux) * kc, CART[1] + (CART_PIVOT[1] + uy) * kc] as [number, number];
  })();
  const kc = kAt(CART[1]);
  const boxes = [
    box(...personBox(MAN[0], MAN[1]), '6 · PAINT', '#5fa8ff', T('l6'), LS[4], 'b6'),
    box(LAD[0] - 40 * kL, LAD[1] - 260 * kL, LAD[0] + 40 * kL, LAD[1] + 6, '5 · LADDER', '#ffd23f', T('l5'), LS[4], 'b5'),
    box(umbTop[0] - 110 * kc, umbTop[1] - 50 * kc, umbTop[0] + 110 * kc, umbTop[1] + 50 * kc, '4 · UMBRELLA', '#ff8a3a', T('l4'), LS[5], 'b4'),
    box(...flockBox, '3 · PIGEONS', '#7be07b', T('l3'), LS[5], 'b3'),
    box(dx - 30 * kAt(dy), dy - 44 * kAt(dy), dx + 40 * kAt(dy), dy + 6, '2 · DOG', '#b45cff', T('l2'), LS[6], 'b2'),
    box(CONE_GROUND[0] - 24, CONE_GROUND[1] - 26, CONE_GROUND[0] + 24, CONE_GROUND[1] + 8, '1 · ICE CREAM', '#ff6fd8', T('l1'), LS[7], 'b1'),
    box(...personBox(KID[0], KID[1], 0.74), 'IT STARTED HERE', '#ff4f5e', T('kid'), LS[8], 'bk'),
  ];

  // ── the chain map (L8): numbered stops joined by a growing dashed line
  const STOPS: Array<[number, number, string]> = [
    [KID[0] + 8, KID[1] - 40, '#ff6fd8'], [ownerX(0.3) + 64, 1320, '#b45cff'], [FLOCK[0], FLOCK[1] - 14, '#7be07b'],
    [CART[0], CART[1] - 230 * kc, '#ff8a3a'], [LAD[0], LAD[1] - 180 * kL, '#ffd23f'], [MAN[0], MAN[1] - 90, '#5fa8ff'],
  ];
  const mapK = li >= 8 && li < 9 ? clamp01((s - T('map')) / 1.4) : 0;
  const chainMap = mapK > 0 ? (() => {
    const pts = STOPS.map(([x, y]) => toScreen(x, y));
    const segs = pts.slice(1).map((p, i) => [pts[i], p] as const);
    const lens = segs.map(([a, c]) => Math.hypot(c[0] - a[0], c[1] - a[1]));
    const total = lens.reduce((a, c) => a + c, 0);
    let left = total * mapK;
    return (
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        {segs.map(([a, c], i) => {
          const f = clamp01(left / lens[i]);
          left -= lens[i];
          return f > 0 ? <line key={i} x1={a[0]} y1={a[1]} x2={lerp(a[0], c[0], f)} y2={lerp(a[1], c[1], f)} stroke="#fff" strokeWidth={10} strokeDasharray="22 14" strokeLinecap="round" /> : null;
        })}
        {pts.map(([x, y], i) => {
          const shown = mapK * 5 >= i - 0.01;
          return shown ? (
            <g key={i} transform={`translate(${x} ${y}) scale(${pop(s, T('map') + (i / 5) * 1.4, 0.3)})`}>
              <circle r={34} fill={STOPS[i][2]} stroke="#111" strokeWidth={6} />
              <text y={14} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={40} fill="#111">{i + 1}</text>
            </g>
          ) : null;
        })}
      </svg>
    );
  })() : null;

  // ── UI: the card (timer during the search; the 6-link chain fills in during the trace)
  const left = Math.max(0, SEARCH - Math.max(0, s - tGo));
  const secs = Math.ceil(left - 1e-6);
  const urgent = searching && secs <= 3;
  const ringK = searching ? left / SEARCH : s < tGo ? 1 : 0;
  const LINKS: Array<[string, string, string]> = [['ICE CREAM', 'l1', '#ff6fd8'], ['DOG', 'l2', '#b45cff'], ['PIGEONS', 'l3', '#7be07b'], ['UMBRELLA', 'l4', '#ff8a3a'], ['LADDER', 'l5', '#ffd23f'], ['PAINT', 'l6', '#5fa8ff']];
  const before = s < tGo + SEARCH;
  const header = before ? 'CHAIN REACTION' : rewinding ? '◀◀ REWINDING' : 'TRACING IT BACK';
  const card = (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 176, background: '#f4f1ea', borderRadius: 14, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 840, height: 46, background: '#1e2a44', display: 'flex', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: '#ffd23f'}} />
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: '#f4f1ea'}}>{header}</span>
      </div>
      {li < 3 ? (
        <>
          <div style={{position: 'absolute', left: 26, top: 62, width: 640, fontFamily: heavy, fontWeight: 900, fontSize: 50, lineHeight: 1.05, color: before ? '#1b1b22' : '#d6293a'}}>
            {before ? 'WHAT STARTS IT?' : li === 1 ? 'TOO LATE!' : 'TOO LATE!'}
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
        LINKS.map(([name, kind, col], i) => {
          const on = s >= T(kind);
          return (
            <div key={name} style={{position: 'absolute', left: 22 + i * 136, top: 58, width: 120, textAlign: 'center'}}>
              <div style={{margin: '0 auto', width: 62, height: 62, borderRadius: 31, background: on ? col : '#e2ddd2', border: '5px solid #1b1b22', boxSizing: 'border-box',
                fontFamily: heavy, fontWeight: 900, fontSize: 34, lineHeight: '52px', color: on ? '#111' : '#aaa39a', transform: `scale(${on ? pop(s, T(kind)) : 1})`}}>{i + 1}</div>
              <div style={{marginTop: 8, fontFamily: MONO, fontWeight: 900, fontSize: 20, color: on ? '#1b1b22' : '#b8b2a6'}}>{on ? name : '???'}</div>
              {i < 5 ? <div style={{position: 'absolute', left: 96, top: 26, width: 64, height: 6, background: s >= T(LINKS[i + 1][1]) && on ? '#1b1b22' : '#d8d2c4'}} /> : null}
            </div>
          );
        })
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

  // hook arrow on the guy (and a small marker through the search)
  const [mx, my] = toScreen(MAN[0], MAN[1] - 80 * kAt(MAN[1]));
  const arrowK = s >= T('arrow') - 0.15 && s < tGo + SEARCH ? 1 : 0;
  const bigArrow = s < tGo + 0.4;
  const arrow = arrowK ? (
    <div style={{position: 'absolute', left: mx - 60, top: my - (bigArrow ? 170 : 90) + Math.sin(s * 7) * 10, width: 120, textAlign: 'center', transform: `scale(${pop(s, T('arrow') - 0.15)})`}}>
      {bigArrow ? <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 38, color: '#fff', WebkitTextStroke: '7px #111', paintOrder: 'stroke fill', whiteSpace: 'nowrap', marginLeft: -40, width: 200}}>THIS GUY</div> : null}
      <svg width={120} height={bigArrow ? 90 : 56} viewBox="0 0 120 90"><path d="M 35 0 L 85 0 L 85 40 L 110 40 L 60 88 L 10 40 L 35 40 Z" fill="#ff4f5e" stroke="#111" strokeWidth={7} /></svg>
    </div>
  ) : null;

  const splatT = tGo + T_SPLAT;
  const slam = s >= splatT && s < splatT + 0.9 ? <Slam k={(s - splatT) / 0.9} text="SPLAT!" color="#5fa8ff" size={170} top={1180} />
    : s >= T('six') && s < T('six') + 1.1 ? <Slam k={(s - T('six')) / 1.1} text="6 DISASTERS" color="#ffd23f" size={120} top={1400} /> : null;
  const ticks = Array.from({length: SEARCH}).map((_, k) => tGo + k);

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, filter: frozen || rewinding ? 'saturate(0.45) brightness(0.95)' : undefined}}>
        <div style={camStyle}>
          <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <Plaza w={w} />
            {/* blue puddle around the guy */}
            {w >= T_SPLAT ? <ellipse cx={MAN[0]} cy={MAN[1] + 2} rx={40 * clamp01((w - T_SPLAT) / 0.4)} ry={11 * clamp01((w - T_SPLAT) / 0.4)} fill={PAINT} opacity={0.85} /> : null}
            {ents.map((e) => <g key={e.key} transform={`translate(${e.x} ${e.y}) scale(${kAt(e.y) * (e.sc ?? 1)})`}>{e.el}</g>)}
            {/* the leash */}
            {!yanked ? <path d={`M ${ohx} ${ohy} Q ${(ohx + dx) / 2} ${Math.max(ohy, dy - 20) + 18} ${dx + 12 * kAt(dy)} ${dy - 22 * kAt(dy)}`} fill="none" stroke="#d6293a" strokeWidth={3} />
              : <path d={`M ${dx + 12 * kAt(dy)} ${dy - 22 * kAt(dy)} Q ${dx - 20} ${dy + 2} ${dx - 50} ${dy + 4}`} fill="none" stroke="#d6293a" strokeWidth={3} />}
            {/* falling / landed bucket */}
            {b.on !== 'hook' ? <g transform={`translate(${b.x} ${b.y}) scale(${kB}) rotate(${b.r})`}><Bucket full={b.on === 'air' && b.r < 90} /></g> : null}
            {b.on === 'air' && b.r > 60 ? <path d={`M ${b.x - 8} ${b.y + 10} Q ${b.x} ${b.y + 40} ${b.x + 8} ${b.y + 10}`} fill={PAINT} /> : null}
            {/* splash */}
            {w >= T_SPLAT && w < T_SPLAT + 0.6 ? Array.from({length: 10}).map((_, k) => {
              const d = (w - T_SPLAT) / 0.6;
              const a = -Math.PI * (k / 9);
              return <circle key={k} cx={MAN_HEAD[0] + Math.cos(a) * d * 70} cy={MAN_HEAD[1] + Math.sin(a) * d * 50 + d * d * 60} r={7 * (1 - d * 0.6)} fill={PAINT} />;
            }) : null}
            {/* pigeons in the air */}
            {BIRDS.map((bd, i) => {
              const p = birdAt(bd, w);
              if (!p.fly) return null;
              return <g key={i} transform={`translate(${p.x} ${p.y}) scale(${kAt(FLOCK[1]) * p.dir} ${kAt(FLOCK[1])})`}><Pigeon fly={w * 30 + i} /></g>;
            })}
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
        [tGo + T_DROP + 0.3, 'sfx/pop.wav', 0.5], [tGo + T_YANK, 'sfx/whoosh.wav', 0.5], [tGo + T_BURST, 'sfx/seeds.wav', 0.6], [tGo + T_BURST, 'sfx/whoosh.wav', 0.5],
        [tGo + T_HIT, 'sfx/clank.wav', 0.8], [tGo + T_FALL, 'sfx/whoosh.wav', 0.7], [splatT, 'sfx/slam.wav', 0.9], [splatT, 'sfx/pop.wav', 0.9],
        [tLate, 'sfx/fail.wav', 0.6], [tRw, 'sfx/scratch.wav', 0.6], [tRw + 0.1, 'sfx/whoosh.wav', 0.6],
        [T('l6'), 'sfx/ding.wav', 0.5], [T('l5'), 'sfx/clank.wav', 0.6], [T('l4'), 'sfx/ding.wav', 0.5], [T('l3'), 'sfx/ding.wav', 0.5],
        [T('l2'), 'sfx/ding.wav', 0.5], [T('l1'), 'sfx/ding.wav', 0.55], [T('kid'), 'sfx/shine.wav', 0.6], [T('map'), 'sfx/whoosh.wav', 0.5],
        [T('six'), 'sfx/slam.wav', 0.8], [T('blue'), 'sfx/bell.wav', 0.6],
      ] as Array<[number, string, number]>).map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round(t * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
