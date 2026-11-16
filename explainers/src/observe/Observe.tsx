import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Slam} from '../fight/Fight';
import {camAt, Shot} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {FPS, StoryEpisode, at, buildPlan, lineAt} from '../story/timeline';
import {Bench, Bin, HAIRS, Kiosk, Look, OPAL, PANTS, Person, Pillar, Planter, Pose, SHIRTS, SKINS} from './art';

// OBSERVATION TEST. A 600-person train-station crowd with a pickpocket team
// hidden in it. Hook -> 15 s search (timer) -> STOP -> REWIND -> narrated replay
// that zooms in on each step (distractor, dipper, receiver) -> leaves the 4th
// member (the lookout) unrevealed for the comments.
// Everything is a pure function of the WORLD clock w (seconds of station time),
// so rewinding / replaying / freezing is just remapping s -> w.
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';

const W = 1080;
const H = 1920;
const FLOOR = 640;
const SEARCH = 15;
const N_PEOPLE = 600;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const pick = <T,>(arr: T[], r: number) => arr[Math.floor(r * arr.length) % arr.length];
const pop = (s: number, t0: number, d = 0.35) => (s < t0 ? 0 : 1 + 0.25 * Math.sin(clamp01((s - t0) / d) * Math.PI) * (1 - clamp01((s - t0) / d)));
/** perspective: people further back are smaller */
const kAt = (y: number) => 0.72 + 0.45 * ((y - FLOOR) / 1080);
/** ramp 0->1 over [a, a+d] and back 1->0 over [b, b+d] */
const hold = (w: number, a: number, b: number, d = 0.2) => clamp01((w - a) / d) * (1 - clamp01((w - b) / d));
/** piecewise-linear path through keyframes [w, x, y] */
const path = (w: number, keys: [number, number, number][]): [number, number, number] => {
  if (w <= keys[0][0]) return [keys[0][1], keys[0][2], 0];
  for (let i = 1; i < keys.length; i++) {
    const [w1, x1, y1] = keys[i];
    const [w0, x0, y0] = keys[i - 1];
    if (w < w1) {
      const k = (w - w0) / (w1 - w0);
      const moving = Math.hypot(x1 - x0, y1 - y0) > 1;
      return [lerp(x0, x1, k), lerp(y0, y1, k), moving ? Math.sign(x1 - x0 || 1) : 0];
    }
  }
  const l = keys[keys.length - 1];
  return [l[1], l[2], 0];
};

/* ───────────── the pickpocket team (world-time keyframes) ───────────── */
const V_POS: [number, number] = [560, 1050];
const D_KEYS: [number, number, number][] = [[1.0, 210, 905], [4.05, 524, 1046], [9.4, 524, 1046], [15.5, -80, 990]];
const P_KEYS: [number, number, number][] = [[5.0, 650, 1085], [5.8, 590, 1058], [7.4, 590, 1058], [9.8, 772, 1240], [10.4, 772, 1240], [16, 1010, 1300]];
const R_KEYS: [number, number, number][] = [[8.2, 900, 1460], [10.0, 812, 1246], [10.6, 812, 1246], [15, 1180, 1190]];
const L_POS: [number, number] = [372, 985];

const LOOK_V: Look = {shirt: '#d6293a', pants: '#2a3a5a', skin: '#f1c9a5', hair: '#5a3a24', hairStyle: 1, coat: true, bag: 'tote', bagCol: '#e0a030'};
const LOOK_D: Look = {shirt: '#ffd23f', pants: '#3a3a44', skin: '#d9a47c', hair: '#1b1b22', hairStyle: 0};
const LOOK_P: Look = {shirt: '#7a808a', pants: '#1b1b22', skin: '#e2b48c', hair: '#2a1d16', hairStyle: 0, hood: true};
const LOOK_R: Look = {shirt: '#4a7a5a', pants: '#5a4a3a', skin: '#a86e45', hair: '#1b1b22', hairStyle: 0, hat: 'beanie', hatCol: '#2a3a5a', bag: 'backpack', bagCol: '#3a3a44'};
const LOOK_L: Look = {shirt: '#3a3a44', pants: '#2a3a5a', skin: '#f3d6bd', hair: '#c98f3a', hairStyle: 0, shades: true};

type Ent = {x: number; y: number; z?: number; el: React.ReactNode; key: string};

const victim = (w: number): Ent => {
  const turned = w >= 4.25 && w < 9.6;
  const notice = w >= 12.8;
  const p: Pose = turned
    ? {facing: 'side', flip: true, wipe: w * 14, stain: clamp01((w - 4.25) / 0.3)}
    : notice ? {facing: 'front', stain: 1, alert: w >= 13.4 ? pop(w, 13.4) : 0} : {facing: 'back', stain: w >= 4.25 ? 1 : 0, bob: Math.sin(w * 1.7) * 0.5};
  return {x: V_POS[0], y: V_POS[1], key: 'V', el: <Person L={LOOK_V} p={p} />};
};
const distractor = (w: number): Ent => {
  const [x, y, dir] = path(w, D_KEYS);
  const hasCup = w < 4.45;
  const spill = clamp01((w - 4.12) / 0.3);
  let p: Pose;
  if (w < 1.0) p = {facing: 'back', cup: 0, bob: Math.sin(w * 2) * 0.5};
  else if (w < 4.05) p = {facing: 'side', walk: w * 9, cup: 1};
  else if (w < 9.4) p = {facing: 'side', cup: hasCup ? 1 : 0, spill, reach: hasCup ? 0 : 0.45 + 0.35 * Math.sin(w * 7)};
  else p = {facing: 'side', flip: true, walk: w * 9};
  if (dir < 0) p.flip = true;
  return {x, y, key: 'D', el: <Person L={LOOK_D} p={p} />};
};
const thief = (w: number): Ent => {
  const [x, y] = path(w, P_KEYS);
  const reach = w < 5.9 ? 0 : w < 6.25 ? (w - 5.9) / 0.35 : w < 6.6 ? 1 : w < 6.9 ? 1 - (w - 6.6) / 0.3 : w >= 9.85 && w < 10.35 ? hold(w, 9.85, 10.15, 0.15) * 0.7 : 0;
  const wallet = (w >= 6.45 && w < 10.12);
  let p: Pose;
  if (w < 5.0) p = {facing: 'front', phone: 1, bob: Math.sin(w * 1.3) * 0.4};
  else if (w < 5.8) p = {facing: 'side', flip: true, walk: w * 9};
  else if (w < 7.4) p = {facing: 'side', flip: true, reach, wallet};
  else if (w < 9.8) p = {facing: 'side', walk: w * 9, wallet};
  else if (w < 10.4) p = {facing: 'side', reach, wallet};
  else p = {facing: 'side', walk: w * 6};
  return {x, y, key: 'P', el: <Person L={LOOK_P} p={p} />};
};
const receiver = (w: number): Ent => {
  const [x, y] = path(w, R_KEYS);
  const reach = w >= 9.95 && w < 10.5 ? hold(w, 9.95, 10.3, 0.15) * 0.7 : 0;
  let p: Pose;
  if (w < 8.2) p = {facing: 'back', bob: Math.sin(w * 1.5 + 2) * 0.5};
  else if (w < 10.0) p = {facing: 'side', flip: true, walk: w * 9};
  else if (w < 10.6) p = {facing: 'side', flip: true, reach, wallet: w >= 10.12 && w < 10.5};
  else p = {facing: 'side', walk: w * 9};
  return {x, y, key: 'R', el: <Person L={LOOK_R} p={p} />};
};
const lookout = (w: number): Ent => {
  const ear = hold(w, 5.0, 7.6, 0.25);
  const p: Pose = {facing: w >= 5.0 && w < 7.8 ? 'front' : w % 6 < 3 ? 'side' : 'front', ear, bob: Math.sin(w * 1.1 + 1) * 0.4};
  return {x: L_POS[0], y: L_POS[1], key: 'L', el: <Person L={LOOK_L} p={p} />};
};

/* ───────────── static props ───────────── */
const PROPS: {x: number; y: number; r: number; el: React.ReactNode; key: string}[] = [
  {x: 210, y: 860, r: 110, el: <Kiosk />, key: 'kiosk'},
  {x: 965, y: 960, r: 40, el: <Pillar />, key: 'p1'},
  {x: 110, y: 1270, r: 40, el: <Pillar />, key: 'p2'},
  {x: 640, y: 1640, r: 40, el: <Pillar />, key: 'p3'},
  {x: 360, y: 1340, r: 60, el: <Bench />, key: 'b1'},
  {x: 930, y: 1640, r: 60, el: <Bench />, key: 'b2'},
  {x: 140, y: 1530, r: 48, el: <Planter />, key: 'pl1'},
  {x: 1000, y: 1250, r: 48, el: <Planter />, key: 'pl2'},
  {x: 470, y: 880, r: 22, el: <Bin />, key: 'bin'},
];

/* keep the crowd out of the actors' way so the replay stays readable */
const KEEP_OUT: [number, number, number][] = (() => {
  const pts: [number, number, number][] = [[V_POS[0], V_POS[1], 46], [L_POS[0], L_POS[1], 34]];
  for (const keys of [D_KEYS, P_KEYS, R_KEYS]) {
    for (let i = 1; i < keys.length; i++) {
      const [, x0, y0] = keys[i - 1];
      const [, x1, y1] = keys[i];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 30));
      for (let j = 0; j <= n; j++) pts.push([lerp(x0, x1, j / n), lerp(y0, y1, j / n), 36]);
    }
  }
  for (const p of PROPS) pts.push([p.x, p.y, p.r]);
  return pts;
})();
const blocked = (x: number, y: number) => KEEP_OUT.some(([px, py, r]) => Math.hypot(px - x, (py - y) * 1.4) < r);

type Crowd = {look: Look; kind: 'stand' | 'walkH' | 'walkV'; x: number; y: number; v: number; facing: 'front' | 'back' | 'side'; flip: boolean; phone: boolean; turn: number};
const CROWD: Crowd[] = (() => {
  const out: Crowd[] = [];
  for (let i = 0; i < N_PEOPLE - 5; i++) {
    const r = (k: number) => rnd(i * 17.3 + k * 3.7);
    const look: Look = {
      shirt: pick(SHIRTS, r(1)), pants: pick(PANTS, r(2)), skin: pick(SKINS, r(3)), hair: pick(HAIRS, r(4)),
      hairStyle: (Math.floor(r(5) * 4) % 4) as 0 | 1 | 2 | 3,
      hat: r(6) < 0.12 ? 'cap' : r(6) < 0.2 ? 'beanie' : null, hatCol: pick(['#1b1b22', '#c8504a', '#2f4a6a', '#e0a030'], r(7)),
      coat: r(8) < 0.25, hood: r(9) < 0.07, shades: r(10) < 0.06,
      bag: null, bagCol: pick(['#5a3a24', '#3a3a44', '#2f4a6a', '#8a5a3a', '#c8504a'], r(11)),
    };
    const kr = r(12);
    const kind: Crowd['kind'] = kr < 0.6 ? 'stand' : kr < 0.9 ? 'walkH' : 'walkV';
    look.bag = kind === 'stand' ? (r(13) < 0.15 ? 'case' : r(13) < 0.3 ? 'backpack' : r(13) < 0.38 ? 'tote' : null)
      : (r(13) < 0.35 ? 'case' : r(13) < 0.55 ? 'backpack' : null);
    let x = 0;
    let y = 0;
    for (let tr = 0; tr < 30; tr++) {
      x = 15 + rnd(i * 7.1 + tr * 13.9) * 1050;
      y = FLOOR + 30 + rnd(i * 5.3 + tr * 11.7) * 1060;
      if (kind === 'walkH' && ((y > 1005 && y < 1105) || (y > 1205 && y < 1285))) continue;
      if (kind === 'walkV' && x > 480 && x < 860) continue;
      if (kind === 'stand' && blocked(x, y)) continue;
      break;
    }
    const fr = r(14);
    out.push({
      look, kind, x, y, v: (kind === 'walkV' ? 28 + r(15) * 30 : 32 + r(15) * 46) * (r(16) < 0.5 ? -1 : 1),
      facing: fr < 0.45 ? 'front' : fr < 0.8 ? 'back' : 'side', flip: r(17) < 0.5, phone: r(18) < 0.28, turn: r(19),
    });
  }
  return out;
})();
const mod = (a: number, n: number) => ((a % n) + n) % n;

const crowdEnts = (w: number): Ent[] => CROWD.map((c, i) => {
  if (c.kind === 'walkH') {
    const x = mod(c.x + c.v * w, W + 160) - 80;
    return {x, y: c.y, key: `c${i}`, el: <Person L={c.look} p={{facing: 'side', flip: c.v < 0, walk: w * (6 + Math.abs(c.v) / 9) + i}} />};
  }
  if (c.kind === 'walkV') {
    const span = 1080;
    const y = FLOOR + 20 + mod(c.y - FLOOR + c.v * w, span);
    const fade = clamp01((y - FLOOR - 20) / 40) * clamp01((FLOOR + 20 + span - y) / 40);
    return {x: c.x, y, key: `c${i}`, el: <g opacity={fade}><Person L={c.look} p={{facing: c.v > 0 ? 'front' : 'back', walk: w * 8 + i}} /></g>};
  }
  // standers: idle bob, a few glance sideways now and then
  const glance = c.turn < 0.35 && mod(w + c.turn * 20, 7) < 2.2;
  return {x: c.x, y: c.y, key: `c${i}`, el: <Person L={c.look} p={{facing: glance ? 'side' : c.facing, flip: c.flip, phone: c.phone && c.facing !== 'back' ? 1 : 0, bob: Math.sin(w * 1.6 + i) * 0.5}} />};
});

/* ───────────── the station set ───────────── */
const Station: React.FC<{w: number}> = ({w}) => {
  const rows = [
    ['08:12', 'NORTHGATE', '2', 'ON TIME'], ['08:15', 'HARBOUR CITY', '4', 'BOARDING'], ['08:20', 'MILLBROOK', '1', 'ON TIME'],
    ['08:26', 'EASTON VALE', '6', 'DELAYED'],
  ];
  const vLines = Array.from({length: 15}).map((_, k) => -700 + k * 175);
  const hLines: number[] = [];
  for (let y = FLOOR + 20, d = 26; y < H; y += d, d *= 1.12) hLines.push(y);
  return (
    <>
      {/* back wall */}
      <rect x={0} y={0} width={W} height={FLOOR} fill={OPAL.wall} />
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k}>
          <path d={`M ${30 + k * 210} 250 L ${30 + k * 210} 90 Q ${120 + k * 210} 10 ${210 + k * 210} 90 L ${210 + k * 210} 250 Z`} fill={OPAL.window} />
          <line x1={120 + k * 210} y1={40} x2={120 + k * 210} y2={250} stroke="#fff" strokeWidth={6} />
          <line x1={30 + k * 210} y1={170} x2={210 + k * 210} y2={170} stroke="#fff" strokeWidth={6} />
        </g>
      ))}
      <rect x={0} y={250} width={W} height={14} fill={OPAL.wallDark} />
      {/* departures board */}
      <rect x={170} y={420} width={740} height={176} rx={10} fill={OPAL.board} stroke="#3a4a6a" strokeWidth={8} />
      {rows.map((r, k) => (
        <g key={k} fontFamily={MONO} fontWeight={900} fontSize={27} fill={OPAL.boardText}>
          <text x={196} y={458 + k * 38}>{r[0]}</text>
          <text x={312} y={458 + k * 38}>{r[1]}</text>
          <text x={650} y={458 + k * 38}>{r[2]}</text>
          <text x={705} y={458 + k * 38} fill={r[3] === 'DELAYED' ? '#ff6a5a' : r[3] === 'BOARDING' && Math.floor(w * 2) % 2 ? '#ffffff' : OPAL.boardText}>{r[3]}</text>
        </g>
      ))}
      {/* platform gates */}
      {[[20, '1'], [930, '6']].map(([x, n]) => (
        <g key={String(n)}>
          <rect x={Number(x)} y={470} width={130} height={170} rx={6} fill="#3a3a44" />
          <rect x={Number(x) + 30} y={436} width={70} height={30} rx={6} fill="#2a8a5a" />
          <text x={Number(x) + 65} y={460} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={22} fill="#fff">{`GATE ${n}`}</text>
        </g>
      ))}
      {/* floor */}
      <rect x={0} y={FLOOR} width={W} height={H - FLOOR} fill={OPAL.floorA} />
      {hLines.map((y, k) => (k % 2 ? <rect key={k} x={0} y={y} width={W} height={Math.min(H - y, 26 * Math.pow(1.12, k))} fill={OPAL.floorB} opacity={0.55} /> : null))}
      {vLines.map((x, k) => <line key={k} x1={540 + (x - 540) * 0.35} y1={FLOOR} x2={x} y2={H} stroke="#cfc6b2" strokeWidth={3} />)}
      <rect x={0} y={FLOOR} width={W} height={10} fill="#c9bea6" />
    </>
  );
};

/* ───────────── composition ───────────── */
export const Observe: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const T = (k: string) => at(plan, k);
  const LS = plan.lineStarts;
  const li = lineAt(plan, s);

  // ── s -> world clock
  const tGo = plan.lineEnds[0] + 0.05;
  const tStop = T('stop');
  const wStop = Math.min(SEARCH + 0.2, tStop - tGo);
  const tRw = T('rewind');
  const RW = 1.1;
  const wSpill0 = 4.2 - (T('spill') - LS[3]) * 0.85;
  const wAt = (t: number): number => {
    if (t < tStop) return t - tGo;
    if (t < tRw) return wStop;
    if (t < LS[3]) return lerp(wStop, wSpill0, ease(clamp01((t - tRw) / Math.min(RW, LS[3] - tRw))));
    if (li <= 3) return 4.2 + (t - T('spill')) * 0.85;
    if (li === 4) return 6.3 + (t - T('dip')) * 0.7;
    if (li === 5) return t < T('hand') ? 6.75 : 6.75 + (t - T('hand')) * 1.1;
    if (li === 6) return 10.0 + (t - T('pass')) * 0.9;
    if (li === 7) return 10.4 + (t - LS[7]) * 0.35;
    if (li === 8) return 4.25 + (t - LS[8]) * 0.45;
    return 5.4 + (t - LS[9]) * 0.3;
  };
  const w = wAt(s);
  const searching = s >= tGo && s < tStop;
  const frozen = (s >= tStop && s < tRw) || (li === 5 && s < T('hand'));
  const rewinding = s >= tRw && s < LS[3];

  // ── director
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 960, z: 1, r: 0, ...c});
  shot(0, 0.01, {z: 1.0});
  shot(tRw, 0.4, {z: 1.0});
  shot(LS[3], 0.7, {x: 548, y: 1028, z: 3.3});
  shot(T('dip') - 0.4, 0.6, {x: 584, y: 1032, z: 3.7});
  shot(T('thief'), 0.25, {x: 596, y: 1030, z: 3.2});
  shot(T('hand'), 0.9, {x: 690, y: 1140, z: 2.2});
  shot(LS[6], 0.5, {x: 780, y: 1200, z: 2.7});
  shot(T('exit'), 1.6, {x: 900, y: 1190, z: 2.1});
  shot(LS[7], 0.6, {x: 620, y: 1120, z: 1.45});
  shot(LS[8], 0.6, {x: 545, y: 1025, z: 2.7});
  shot(LS[9], 0.8, {x: 540, y: 960, z: 1.0});
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const kick = (t0: number, amp: number, decay: number) => (s >= t0 ? amp * Math.exp(-(s - t0) * decay) : 0);
  const shake = kick(tStop, 10, 7) + kick(T('spill'), 6, 8) + kick(T('team'), 6, 8);
  const shx = Math.sin(frame * 2.3) * shake;
  const shy = Math.cos(frame * 2.9) * shake;
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + shx}px, ${960 - cam.y + shy}px) scale(${cam.z})`};
  const toScreen = (x: number, y: number): [number, number] => [540 + (x - cam.x) * cam.z + shx, 960 + (y - cam.y) * cam.z + shy];

  // ── entities, depth-sorted, culled to the view
  const hw = 540 / cam.z + 80;
  const hh = 960 / cam.z + 120;
  const team = [victim(w), distractor(w), thief(w), receiver(w), lookout(w)];
  const ents: Ent[] = [...crowdEnts(w), ...team, ...PROPS.map((p) => ({x: p.x, y: p.y, key: p.key, el: p.el}))]
    .filter((e) => Math.abs(e.x - cam.x) < hw && e.y > cam.y - hh && e.y - 400 < cam.y + hh)
    .sort((a, b) => a.y - b.y);
  const byKey = Object.fromEntries(team.map((e) => [e.key, e]));

  // spilled coffee (stays on the floor)
  const puddle = w >= 4.3 ? clamp01((w - 4.3) / 0.4) : 0;

  // ── labelled boxes (screen space)
  const box = (key: string, label: string, col: string, t0: number, t1 = Infinity) => {
    if (s < t0 || s >= t1) return null;
    const e = byKey[key];
    const k = kAt(e.y);
    const [sx, sy] = toScreen(e.x, e.y);
    const bw = 40 * k * cam.z;
    const bh = 74 * k * cam.z;
    const a = pop(s, t0, 0.3);
    const fs = Math.max(22, Math.min(40, 16 * cam.z));
    return (
      <div key={key + label} style={{position: 'absolute', left: sx - bw / 2, top: sy - bh + 6 * k * cam.z, width: bw, height: bh, border: `${Math.max(4, cam.z * 1.6)}px solid ${col}`,
        borderRadius: 8, transform: `scale(${a})`, boxShadow: '0 0 0 3px rgba(0,0,0,.35)'}}>
        <div style={{position: 'absolute', left: '50%', bottom: '100%', transform: 'translate(-50%, -6px)', background: col, color: '#111', fontFamily: heavy, fontWeight: 900,
          fontSize: fs, padding: '2px 10px', borderRadius: 6, whiteSpace: 'nowrap'}}>{label}</div>
      </div>
    );
  };
  const boxes = [
    box('D', 'DISTRACTION', '#ffd23f', T('spill') + 0.25, LS[4]),
    box('P', 'PICKPOCKET', '#ff4f5e', T('thief'), LS[6]),
    box('P', 'PICKPOCKET', '#ff4f5e', LS[6], LS[8]),
    box('R', 'RECEIVER', '#7be07b', T('pass') + 0.45, LS[8]),
    box('D', 'DISTRACTION', '#ffd23f', T('three'), LS[8]),
  ];

  // ── UI: the case card (timer during the search, CCTV replay clock after)
  const left = Math.max(0, SEARCH - Math.max(0, s - tGo));
  const secs = Math.ceil(left - 1e-6);
  const urgent = searching && secs <= 3;
  const ringK = searching ? left / SEARCH : s < tGo ? 1 : 0;
  const stamp = `08:14:${String(Math.max(0, Math.floor(20 + w))).padStart(2, '0')}`;
  const header = s < tStop ? 'OBSERVATION TEST' : rewinding ? '◀◀ REWINDING' : 'CCTV REPLAY';
  const STEP: Record<number, string> = {3: '1 · DISTRACTION', 4: '2 · THE DIP', 5: '2 · THE DIP', 6: '3 · THE HANDOFF', 7: 'ONE TEAM'};
  const mainTxt = s < tStop ? 'FIND THE PICKPOCKET' : li < 3 ? 'DID YOU FIND HIM?' : li === 9 ? "WHO'S THE LOOKOUT?" : li === 8 ? 'HOLD YOUR BAG FIRST' : STEP[li];
  const sub = s < tStop ? '600 PEOPLE · 1 PICKPOCKET' : li === 9 ? 'COMMENT YOUR GUESS' : li === 8 ? 'SPILLED ON? THINK THEFT' : li >= 3 ? `CAM 07 · ${stamp}` : 'LET’S WATCH IT AGAIN';
  const card = (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 176, background: '#f4f1ea', borderRadius: 14, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 840, height: 46, background: '#1e2a44', display: 'flex', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: '#ff4f5e', opacity: Math.floor(s * 2) % 2 ? 1 : 0.3}} />
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: '#f4f1ea'}}>{header}</span>
      </div>
      <div style={{position: 'absolute', left: 26, top: 60, width: 620, fontFamily: heavy, fontWeight: 900, fontSize: mainTxt.length > 16 ? 46 : 56, lineHeight: 1.05, color: li === 9 ? '#d6293a' : '#1b1b22',
        transform: `scale(${li === 9 ? pop(s, LS[9]) : 1})`, transformOrigin: '0 50%'}}>{mainTxt}</div>
      <div style={{position: 'absolute', left: 28, top: 126, fontFamily: MONO, fontWeight: 900, fontSize: 30, color: '#5a6070'}}>{sub}</div>
      {/* timer ring */}
      <svg width={150} height={150} style={{position: 'absolute', left: 676, top: 36}}>
        <circle cx={75} cy={75} r={56} fill={urgent ? '#ffe0e0' : '#fff'} stroke="#d8d2c4" strokeWidth={12} />
        <circle cx={75} cy={75} r={56} fill="none" stroke={urgent ? '#ff4f5e' : '#2a8a5a'} strokeWidth={12} strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 56 * ringK} 999`} transform="rotate(-90 75 75)" />
        <text x={75} y={93} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={s < tStop ? 54 : 30} fill={urgent ? '#d6293a' : '#1b1b22'}
          transform={urgent ? `translate(75 75) scale(${1 + 0.15 * Math.max(0, 1 - ((s - tGo) % 1) * 3)}) translate(-75 -75)` : undefined}>{s < tStop ? secs : 'STOP'}</text>
      </svg>
    </div>
  );

  // ── captions (2-word chunks)
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
  const line = ep.lines[li];

  const slam = s >= tStop && s < tStop + 1.1 ? <Slam k={(s - tStop) / 1.1} text="STOP" color="#ff4f5e" size={190} top={820} />
    : s >= T('team') && s < T('team') + 1.2 ? <Slam k={(s - T('team')) / 1.2} text="ONE TEAM" color="#ffd23f" size={130} top={1300} />
      : s >= T('lookout') && s < T('lookout') + 1.3 ? <Slam k={(s - T('lookout')) / 1.3} text="?" color="#ff4f5e" size={260} top={760} /> : null;

  // ── tick SFX: one per second of the search
  const ticks = Array.from({length: SEARCH}).map((_, k) => tGo + k);

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, filter: frozen || rewinding ? 'saturate(0.35) brightness(0.92)' : undefined}}>
        <div style={camStyle}>
          <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <Station w={w} />
            {puddle > 0 ? <ellipse cx={540} cy={1056} rx={22 * puddle} ry={6 * puddle} fill={OPAL.coffee} opacity={0.8} /> : null}
            {w >= 4.45 ? <g transform="translate(548 1054) rotate(80)"><path d="M -3.5 -9 L 3.5 -9 L 2.6 0 L -2.6 0 Z" fill="#f4f1ea" stroke="#c9c2b4" strokeWidth={0.6} /></g> : null}
            {/* the splash itself */}
            {w >= 4.12 && w < 4.6 ? Array.from({length: 7}).map((_, k) => {
              const d = (w - 4.12) / 0.48;
              const a = -Math.PI * (0.15 + 0.7 * (k / 6));
              return <circle key={k} cx={545 + Math.cos(a) * d * 26} cy={1010 + Math.sin(a) * d * 22 + d * d * 30} r={3.2 * (1 - d * 0.5)} fill={OPAL.coffee} />;
            }) : null}
            {ents.map((e) => <g key={e.key} transform={`translate(${e.x} ${e.y}) scale(${kAt(e.y)})`}>{e.el}</g>)}
          </svg>
        </div>
      </div>
      {/* rewind: scanlines + tracking band */}
      {rewinding ? (
        <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 3px, transparent 3px 7px)'}}>
          <div style={{position: 'absolute', left: 0, top: mod(s * 2600, H), width: W, height: 70, background: 'rgba(255,255,255,.18)', filter: 'blur(4px)'}} />
          <div style={{position: 'absolute', left: 0, top: 1300, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: 120, color: '#fff', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill'}}>◀◀</div>
        </AbsoluteFill>
      ) : null}
      {frozen && !rewinding && s >= tStop + 0.2 ? (
        <div style={{position: 'absolute', right: 130, top: 1340, fontFamily: heavy, fontWeight: 900, fontSize: 60, color: '#fff', WebkitTextStroke: '8px #111', paintOrder: 'stroke fill'}}>❚❚</div>
      ) : null}
      {boxes}
      {/* ticking timer bar under the card during the search */}
      {s < tStop ? <div style={{position: 'absolute', left: 120, top: 420, width: 840 * ringK, height: 10, borderRadius: 5, background: urgent ? '#ff4f5e' : '#ffd23f'}} /> : null}
      {card}
      {line.note ? (
        <div style={{position: 'absolute', top: 446, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 800, fontSize: 25, letterSpacing: 1.2,
          color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.95), 0 0 12px rgba(0,0,0,.7)', textTransform: 'uppercase'}}>{line.note}</div>
      ) : null}
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
        <Sequence key={`t${k}`} from={Math.round(t * FPS)} durationInFrames={20}><Audio src={staticFile('sfx/tick.wav')} volume={k >= SEARCH - 3 ? 0.9 : 0.45} /></Sequence>
      ))}
      {([
        [tStop, 'sfx/slam.wav', 0.9], [tStop, 'sfx/bell.wav', 0.5], [tRw, 'sfx/scratch.wav', 0.6], [tRw + 0.1, 'sfx/whoosh.wav', 0.6],
        [T('spill'), 'sfx/pop.wav', 0.7], [T('dip'), 'sfx/whoosh.wav', 0.4], [T('thief'), 'sfx/ding.wav', 0.6], [T('pass'), 'sfx/whoosh.wav', 0.5],
        [T('pass') + 0.45, 'sfx/ding.wav', 0.5], [T('three'), 'sfx/pop.wav', 0.6], [T('team'), 'sfx/slam.wav', 0.8], [T('tip'), 'sfx/shine.wav', 0.5],
        [T('lookout'), 'sfx/boom.wav', 0.6],
      ] as Array<[number, string, number]>).map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round(t * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
