// "Who poisoned the rich man's drink?" (2026-11-27): Chain Reaction #5, a whodunit in a
// cut-away dollhouse mansion seen like a toy diorama. During a silent 15 s search, a
// poison vial passes niece -> gardener -> dumbwaiter -> maid -> ice bucket -> dumbwaiter
// -> butler (who never knew) -> the host's glass. Decoys make noise (doctor's green flask,
// chef's salt shaker, aunt's yarn). Then the detective rewinds and traces it backwards.
// Original story + characters. Voice: one Gemini take (Laomedeia). Music: flow_music mystery.
import React from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {CamS, Card, H, Mats, Post, Shot, V, W, camOf, clamp01, easeOut, lerp, makeCam, project, shotCam, smoother, useCanvas, useGradient, vl} from './kit';
import {BAR_TOP, BUCKET_BAR, BUCKET_COUNTER, CAR_Y, DOC_CUP, Drops, FY, GLASS_BAR, Glass3D, IceBucket, Manor, ROOM_LIGHTS, SHAFT, SkyDome, Vial3D, XL, XR, useManorTex} from './manor';
import {CAST, Pose, Who, drawDetective, drawPerson} from './manor-toon';
import {GUESTS, guestAt} from './crowd';
import {PX_M} from './toon';
import timing from '../../episodes/poison.timing.json';
import episode from '../../episodes/poison.json';

const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const OL = '#1b1b22';
const PAPER = '#f4f1ea';
const YEL = '#ffd23f';
const RED = '#d6293a';
const GRN = '#4fe35a';

// ───────────────────────── story clock ─────────────────────────
type TLine = {file: string; duration: number; takeStart: number; pauseBefore: number; words: Array<{text: string; start: number; end: number}>};
const LINES = (timing as unknown as {lines: TLine[]}).lines;
const LEAD = 0.3;
const STARTS: number[] = [];
LINES.reduce((gap, l, i) => { const g = gap + (l.pauseBefore ?? 0); STARTS[i] = LEAD + g + l.takeStart; return g; }, 0);
const lastEnd = (i: number) => STARTS[i] + LINES[i].words[LINES[i].words.length - 1].end;
const wt = (li: number, word: string, nth = 0) => {
  const ws = LINES[li].words.filter((x) => x.text.toLowerCase().replace(/[^a-z0-9-]/g, '') === word);
  return STARTS[li] + (ws[nth] ? ws[nth].start : 0);
};
const T = {
  poisons: wt(0, 'poisons'), rich: wt(0, 'rich'), who: wt(0, 'who'),
  late: STARTS[1], det: wt(2, 'detective'),
  butler3: wt(3, 'butler'), handed: wt(3, 'handed'),
  wasnt: wt(4, 'wasnt'), ice4: wt(4, 'ice'),
  elevator: wt(5, 'elevator'), kitchen5: wt(5, 'kitchen'),
  maid: wt(6, 'maid'), poured: wt(6, 'poured'),
  bottle: wt(7, 'bottle'), gardener7: wt(7, 'gardener'), down: wt(7, 'down'),
  niece: wt(8, 'niece'), started: wt(8, 'started'),
  three: STARTS[9], butler9: wt(9, 'butler'), idea: wt(9, 'idea'),
  doctors: wt(10, 'doctors'), cough: wt(10, 'cough'), chef: wt(10, 'chef'), salt: wt(10, 'salt'),
  once: STARTS[11], didnt: wt(11, 'didnt'),
};
export const POISON_FRAMES = Math.ceil((lastEnd(11) + 2.0) * 30);
const P0 = T.late - 15; // party clock p = 0 here; the host collapses at p = 15 ("Too late!")

// party clock during the replay: each beat rewinds/fast-forwards to the moment the
// narration is about, timed so the key event lands on its word, then plays at `rate`.
type Beat = {s: number; ev: number; at: number; rate: number; dur?: number};
const BEATS: Beat[] = [
  {s: T.late, ev: 15, at: T.late, rate: 0.35, dur: 0.01},
  {s: STARTS[3] - 0.15, ev: 13.2, at: T.handed + 0.1, rate: 0.6},
  {s: STARTS[4], ev: 10.75, at: T.ice4 + 0.05, rate: 0.5},
  {s: STARTS[5] - 0.05, ev: 8.85, at: T.elevator, rate: 1.0, dur: 0.4},
  {s: STARTS[6], ev: 7.45, at: T.poured + 0.1, rate: 0.6},
  {s: STARTS[7], ev: 6.95, at: T.bottle + 0.1, rate: 0.5},
  {s: T.gardener7 - 0.15, ev: 4.6, at: T.gardener7 + 0.35, rate: 1.0, dur: 0.4},
  {s: STARTS[8], ev: 3.2, at: T.niece + 0.15, rate: 0.5},
  {s: T.started - 0.2, ev: 0.45, at: T.started + 0.25, rate: 0.4, dur: 0.4},
  {s: STARTS[9] - 0.1, ev: 15.4, at: STARTS[9] + 0.8, rate: 0.0, dur: 0.9},
  {s: STARTS[10] - 0.05, ev: 5.65, at: T.doctors + 0.4, rate: 0.6},
  {s: T.chef - 0.15, ev: 7.0, at: T.chef + 0.3, rate: 0.7, dur: 0.4},
  {s: STARTS[11] - 0.1, ev: 15.4, at: STARTS[11] + 0.6, rate: 0.0, dur: 0.6},
];
const pAt = (s: number): number => {
  if (s < T.late) return Math.max(0, s - P0);
  let prev = 15;
  let out = 15;
  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    if (b.s > s) break;
    const d = b.dur ?? 0.55;
    const p0 = b.ev - b.rate * Math.max(0, b.at - b.s - d);
    const val = (x: number) => (x < b.s + d ? lerp(prev, p0, smoother((x - b.s) / d)) : p0 + b.rate * (x - b.s - d));
    out = val(s);
    const nx = BEATS[i + 1];
    if (nx && nx.s <= s) prev = val(nx.s);
  }
  return Math.max(0, Math.min(15.6, out));
};

// ───────────────────────── the party (everything is a function of p) ─────────────────────────
const F1 = FY[0];
const F2 = FY[1];
const F3 = FY[2];
const track = (p: number, keys: Array<[number, THREE.Vector3]>) => {
  if (p <= keys[0][0]) return {at: keys[0][1].clone(), moving: false};
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, a] = keys[i];
    const [tb, b] = keys[i + 1];
    if (p < tb) return {at: vl(a, b, smoother((p - ta) / (tb - ta))), moving: a.distanceTo(b) > 0.01};
  }
  return {at: keys[keys.length - 1][1].clone(), moving: false};
};
const F4 = FY[3];
const N_CHAIR = V(3.95, F4, -0.95);
const N_HALL = V(1.7, F4, -0.85);
const N_DOOR = V(-1.25, F4, -0.8);
const G_PLANT = V(-3.15, F4, -1.3);
const G_DOOR = V(-2.05, F4, -0.8);
const G_SHAFT = V(-4.15, F4, -1.3);
const MAID = V(-3.95, F2, -1.2);
const CHEF = V(-2.4, F2, -1.25);
const B_BAR = V(-3.45, F1, -1.2);
const B_SHAFT = V(-4.2, F1, -1.3);
const B_HOST = V(1.42, F1, -0.45);
const HOST = V(1.0, F1, -1.2);
const DOC = V(-0.55, F1, -1.8);
const AUNT = V(4.0, F2, -1.15);

type Actor = {who: Who | 'det' | number; at: THREE.Vector3; pose: Pose; roll?: number};
type PartyState = {
  actors: Actor[]; carY: number; vialCar: THREE.Vector3 | null; bucket: THREE.Vector3; green: number;
  glass: THREE.Vector3 | null; glassIce: number; cube: THREE.Vector3 | null; drops: null | {from: THREE.Vector3; to: THREE.Vector3; color: string};
  yarn: THREE.Vector3 | null; hostDown: number;
};
const carYAt = (p: number) => {
  if (p < 4.8) return CAR_Y(3);
  if (p < 6.6) return lerp(CAR_Y(3), CAR_Y(1), smoother((p - 4.8) / 1.8));
  if (p < 8.3) return CAR_Y(1);
  if (p < 9.4) return lerp(CAR_Y(1), CAR_Y(0), smoother((p - 8.3) / 1.1));
  return CAR_Y(0);
};
/** world position of a hand drawn at design (hx, hy) on a card standing at `at`, facing `cam` */
const handPos = (at: THREE.Vector3, cam: THREE.Vector3, hx: number, hy: number, scale = 1) => {
  const yaw = Math.atan2(cam.x - at.x, cam.z - at.z);
  const dx = (hx - 300) * scale * PX_M;
  const dy = (975 - hy) * scale * PX_M;
  return V(at.x + Math.cos(yaw) * dx, at.y + dy, at.z - Math.sin(yaw) * dx);
};
const party = (p: number, cam: THREE.Vector3): PartyState => {
  const A: Actor[] = [];
  // niece: hollow book -> walks the vial across the crowded music room -> back to her chair
  {
    const tr = track(p, [[0, N_CHAIR], [0.8, N_CHAIR], [1.6, N_HALL], [2.8, N_DOOR], [3.5, N_DOOR], [4.6, N_HALL], [5.4, N_CHAIR]]);
    let pose: Pose = {arms: 'read', prop: 'book', face: 'neutral', eye: -0.4};
    if (p >= 0.3 && p < 0.8) pose = {arms: 'read', prop: 'bookVial', face: 'sly', eye: -1};
    else if (p >= 0.8 && p < 2.8) pose = {arms: 'hold', prop: 'vial', face: 'happy', walk: p * 11, eye: -1};
    else if (p >= 2.8 && p < 3.2) pose = {arms: 'give', dir: -1, prop: 'vial', face: 'sly', eye: -1};
    else if (p >= 3.2 && p < 3.5) pose = {arms: 'give', dir: -1, face: 'smirk', eye: -1};
    else if (p >= 3.5 && p < 5.4) pose = {face: 'happy', walk: p * 11};
    else if (p >= 5.4) pose = {arms: 'read', prop: 'book', face: 'smirk', eye: -0.4};
    A.push({who: 'niece', at: tr.at, pose});
  }
  // gardener: waters plants -> takes the vial at the doorway -> drops it in the dumbwaiter
  {
    const tr = track(p, [[0, G_PLANT], [1.9, G_PLANT], [2.8, G_DOOR], [3.4, G_DOOR], [4.3, G_SHAFT], [4.9, G_SHAFT], [5.9, G_PLANT]]);
    let pose: Pose = {arms: 'hold', prop: 'can', face: 'neutral', eye: -0.6};
    if (p >= 1.9 && p < 2.8) pose = {face: 'neutral', walk: p * 11, eye: 1};
    else if (p >= 2.8 && p < 3.2) pose = {arms: 'give', dir: 1, face: 'sly', eye: 1};
    else if (p >= 3.2 && p < 3.4) pose = {arms: 'give', dir: 1, prop: 'vial', face: 'sly', eye: 1};
    else if (p >= 3.4 && p < 4.3) pose = {arms: 'hold', prop: 'vial', face: 'neutral', walk: p * 11, eye: -1};
    else if (p >= 4.3 && p < 4.6) pose = {arms: 'give', dir: -1, prop: 'vial', face: 'sly', eye: -1};
    else if (p >= 4.6 && p < 4.9) pose = {arms: 'give', dir: -1, face: 'smirk', eye: -1};
    else if (p >= 4.9 && p < 5.9) pose = {face: 'smirk', walk: p * 11};
    A.push({who: 'gardener', at: tr.at, pose});
  }
  // maid: takes the vial out of the dumbwaiter, pours it over the ice, sends the bucket down
  {
    let pose: Pose = {face: 'neutral', eye: -1};
    if (p >= 6.6 && p < 6.9) pose = {arms: 'give', dir: -1, face: 'sly', eye: -1};
    else if (p >= 6.9 && p < 7.2) pose = {arms: 'hold', prop: 'vial', face: 'sly', eye: 0.6};
    else if (p >= 7.2 && p < 7.9) pose = {arms: 'pour', prop: 'vial', face: 'sly', eye: -0.4};
    else if (p >= 7.95 && p < 8.3) pose = {arms: 'give', dir: -1, face: 'sly', eye: -1};
    else if (p >= 8.3) pose = {face: 'smirk', eye: 1};
    A.push({who: 'maid', at: MAID, pose});
  }
  // chef: stirs; DECOY — shakes salt loudly right next to the maid
  {
    const shake = p >= 6.4 && p < 7.8;
    A.push({who: 'chef', at: CHEF, pose: shake ? {arms: 'shake', prop: 'shaker', face: 'happy', phase: p} : {arms: 'hold', prop: 'spoon', face: 'happy', phase: p, eye: -0.5}});
  }
  // butler: bucket out of the dumbwaiter -> one ice cube into the glass -> carries it to the host
  {
    const tr = track(p, [[0, B_BAR], [9.35, B_BAR], [9.7, B_SHAFT], [10.0, B_SHAFT], [10.35, B_BAR], [11.0, B_BAR], [11.7, V(-2.0, F1, -0.8)], [12.2, V(-1.4, F1, -0.6)], [12.9, B_HOST]]);
    let pose: Pose = {face: 'neutral', eye: 0.5};
    if (tr.moving && p < 10.4) pose = {face: 'neutral', walk: p * 11, eye: -1};
    if (p >= 9.7 && p < 10.0) pose = {arms: 'give', dir: -1, face: 'neutral', eye: -1};
    else if (p >= 10.35 && p < 11.0) pose = {arms: 'hold', prop: 'tongs', face: 'neutral', eye: 0.3};
    else if (p >= 11.0 && p < 12.9) pose = {arms: 'tray', prop: 'trayGlass', face: 'happy', walk: p * 11};
    else if (p >= 12.9 && p < 13.2) pose = {arms: 'give', dir: -1, prop: 'glass', face: 'happy', eye: -1};
    else if (p >= 13.2 && p < 15) pose = {face: 'happy', eye: -1};
    else if (p >= 15) pose = {arms: 'up', face: 'shock', eye: -1};
    A.push({who: 'butler', at: tr.at, pose});
  }
  // host: drinks, wobbles, collapses onto the table at p = 15
  let hostDown = 0;
  {
    let pose: Pose = {face: 'happy', eye: -1, sit: true};
    let roll = 0;
    if (p >= 13.2 && p < 13.6) pose = {arms: 'hold', prop: 'glass', face: 'happy', sit: true};
    else if (p >= 13.6 && p < 14.4) pose = {arms: 'drink', prop: 'glass', face: 'happy', sit: true};
    else if (p >= 14.4 && p < 15) { pose = {arms: 'hold', prop: 'glass', face: 'dizzy', sit: true}; roll = Math.sin(p * 14) * 0.12; }
    else if (p >= 15) { hostDown = easeOut((p - 15) / 0.3); pose = {face: 'dizzy', sit: true}; roll = hostDown * 0.62; }
    A.push({who: 'host', at: HOST, pose, roll});
  }
  // doctor: DECOY — pours a green flask into his OWN cup, glancing at the host
  {
    const pour = p >= 5.2 && p < 6.2;
    A.push({who: 'doctor', at: DOC, pose: pour ? {arms: 'pour', prop: 'flask', face: 'sly', eye: 1, sit: true} : {arms: 'hold', prop: 'flask', face: p >= 15 ? 'shock' : 'neutral', eye: 1, sit: true}});
  }
  // aunt: knits; DECOY — drops her yarn, which bounces away
  {
    const drop = p >= 8.6 && p < 9.8;
    A.push({who: 'aunt', at: AUNT, pose: {arms: 'knit', prop: 'needles', phase: drop ? 0 : p, face: drop ? 'shock' : 'happy', sit: true, eye: drop ? -1 : 0}});
  }
  // the crowd
  for (const g of GUESTS) { const r = guestAt(g, p); A.push({who: g.id, at: r.at, pose: r.pose}); }
  // props
  const carY = carYAt(p);
  let vialCar: THREE.Vector3 | null = null;
  if (p >= 4.6 && p < 6.9) vialCar = V(SHAFT.x, carY + 0.03, SHAFT.z + 0.05);
  let bucket = BUCKET_COUNTER.clone();
  if (p >= 7.95 && p < 8.3) bucket = vl(BUCKET_COUNTER, V(SHAFT.x, CAR_Y(1) + 0.03, SHAFT.z), smoother((p - 7.95) / 0.35));
  else if (p >= 8.3 && p < 9.75) bucket = V(SHAFT.x, carY + 0.03, SHAFT.z);
  else if (p >= 9.75 && p < 10.2) bucket = vl(V(SHAFT.x, CAR_Y(0) + 0.03, SHAFT.z), BUCKET_BAR, smoother((p - 9.75) / 0.45));
  else if (p >= 10.2) bucket = BUCKET_BAR.clone();
  const green = clamp01((p - 7.3) / 0.5);
  let drops: PartyState['drops'] = null;
  if (p >= 7.3 && p < 7.85) drops = {from: handPos(MAID, cam, 470, 330), to: BUCKET_COUNTER.clone().setY(BUCKET_COUNTER.y + 0.24), color: GRN};
  else if (p >= 5.3 && p < 6.15) drops = {from: handPos(DOC, cam, 440, 260 + 150), to: DOC_CUP.clone().setY(DOC_CUP.y + 0.08), color: GRN};
  let cube: THREE.Vector3 | null = null;
  if (p >= 10.55 && p < 10.9) { const k = (p - 10.55) / 0.35; cube = vl(BUCKET_BAR.clone().setY(BAR_TOP + 0.25), GLASS_BAR.clone().setY(BAR_TOP + 0.14), k); cube.y += Math.sin(k * Math.PI) * 0.18; }
  const glass = p < 11.0 ? GLASS_BAR.clone() : null;
  let yarn: THREE.Vector3 | null = null;
  if (p >= 8.6) { const k = clamp01((p - 8.6) / 1.2); yarn = V(lerp(3.85, 2.4, easeOut(k)), F2 + 0.09 + Math.abs(Math.sin(k * 9)) * (1 - k) * 0.4, lerp(-0.95, -0.3, k)); }
  return {actors: A, carY, vialCar, bucket, green, glass, glassIce: p >= 10.9 ? 1 : 0, cube, drops, yarn, hostDown};
};

// ───────────────────────── the detective ─────────────────────────
type DetSpot = {s: number; at: THREE.Vector3; arms: 'magnifier' | 'point' | 'tip' | 'down'; dir?: -1 | 1};
const DET: DetSpot[] = [
  {s: T.det - 0.15, at: V(-0.75, F1, 0.4), arms: 'magnifier'},
  {s: STARTS[3] - 0.15, at: V(0.05, F1, 0.45), arms: 'point', dir: 1},
  {s: STARTS[4], at: V(-2.2, F1, 0.4), arms: 'magnifier'},
  {s: STARTS[6], at: V(-1.45, F2, 0.45), arms: 'point', dir: -1},
  {s: T.gardener7 - 0.15, at: V(-2.0, F4, 0.45), arms: 'point', dir: -1},
  {s: STARTS[8], at: V(-0.35, F4, 0.45), arms: 'magnifier'},
  {s: T.started - 0.2, at: V(2.55, F4, 0.45), arms: 'point', dir: 1},
  {s: STARTS[9] - 0.1, at: V(XR - 1.2, F1, 2.5), arms: 'tip'},
  {s: STARTS[10] - 0.05, at: V(-1.45, F1, 0.45), arms: 'point', dir: 1},
  {s: T.chef - 0.15, at: V(-1.35, F2, 0.45), arms: 'point', dir: -1},
  {s: STARTS[11] - 0.1, at: V(0.0, F1, 0.45), arms: 'tip'},
];
const detAt = (s: number): DetSpot | null => {
  let cur: DetSpot | null = null;
  for (const d of DET) if (d.s <= s) cur = d;
  return cur;
};

// ───────────────────────── camera ─────────────────────────
const C = camOf;
const orbit = (yaw: number, dist: number, height: number, look: THREE.Vector3, fov: number): CamS =>
  C(V(look.x + Math.sin(yaw) * dist, height, look.z + Math.cos(yaw) * dist), look, fov, look.clone(), 1.0);
const WIDE_LOOK = V(0, 7.15, -0.6);
const WIDE = (s: number) => orbit(Math.sin(s * 0.33) * 0.04, 29.5, 10.0, WIDE_LOOK, 40);
/** a room close-up: x = what to centre, f = floor, z = how close */
const room = (x: number, f: number, dist = 7.0, dx = 0.35, fov = 36, lookZ = -1.0): CamS =>
  C(V(x + dx, FY[f] + 2.45, dist), V(x, FY[f] + 1.85, lookZ), fov, V(x, FY[f] + 1.0, -1.0), 3.5);
const SHOTS: Shot[] = [
  {t: 0, cut: true, cam: (s) => { const k = smoother(s / Math.max(1, T.who - 0.1)); return orbit(lerp(-0.62, 0, k), lerp(21, 29.5, k), lerp(15, 10.0, k), vl(V(2.0, 5.0, -0.6), WIDE_LOOK, k), 40); }},
  {t: T.who - 0.1, dur: 0.3, ease: 'smooth', cam: WIDE},
  {t: T.late - 0.05, dur: 0.45, ease: 'out', cam: room(0.4, 0, 6.6)},
  {t: STARTS[3] - 0.15, dur: 0.4, ease: 'out', cam: room(0.9, 0, 6.0, 0.3)},
  {t: STARTS[4] - 0.02, dur: 0.45, ease: 'out', cam: room(-3.3, 0, 6.4, 0.3)},
  {t: T.ice4 - 0.1, dur: 0.35, ease: 'out', cam: C(V(-2.35, 1.5, 1.0), V(-3.05, 1.2, -1.7), 34, GLASS_BAR, 6)},
  {t: STARTS[5] - 0.05, dur: 0.35, ease: 'out', cam: C(V(-3.3, 3.2, 13), V(-3.6, 3.2, -1.2), 36, V(SHAFT.x, 2.0, SHAFT.z), 1.5)},
  {t: STARTS[6] - 0.02, dur: 0.45, ease: 'out', cam: room(-3.2, 1, 6.4, 0.3)},
  {t: STARTS[7] - 0.02, dur: 0.3, ease: 'out', cam: room(-4.0, 1, 6.2, 0.4)},
  {t: T.gardener7 - 0.15, dur: 0.45, ease: 'out', cam: room(-3.3, 3, 6.4, 0.3)},
  {t: STARTS[8] - 0.02, dur: 0.45, ease: 'out', cam: room(-1.65, 3, 6.2, 0.2)},
  {t: T.started - 0.2, dur: 0.4, ease: 'out', cam: room(3.8, 3, 6.4, 0.3)},
  {t: STARTS[9] - 0.12, dur: 0.6, ease: 'smooth', cam: WIDE},
  {t: STARTS[10] - 0.05, dur: 0.45, ease: 'out', cam: room(-0.45, 0, 6.2, 0.3)},
  {t: T.chef - 0.15, dur: 0.45, ease: 'out', cam: room(-2.6, 1, 6.2, 0.3)},
  {t: STARTS[11] - 0.1, dur: 0.45, ease: 'out', cam: room(1.0, 0, 6.6, 0.3)},
  {t: T.didnt + 0.3, dur: 1.4, ease: 'smooth', cam: WIDE},
];

// ───────────────────────── 3D scene ─────────────────────────
const MatsCtx = React.createContext<Mats | null>(null);
const ActorCard: React.FC<{a: Actor; camPos: THREE.Vector3; tint: THREE.Color; glow: number}> = ({a, camPos, tint, glow}) => {
  const cv = useCanvas(600, 1000);
  const last = React.useRef('');
  const ps = a.pose;
  const wq = ps.walk === undefined ? undefined : Math.round(ps.walk / (Math.PI / 3)) * (Math.PI / 3);
  const pq = ps.phase === undefined ? undefined : Math.round(ps.phase * 30) / 30;
  const key = JSON.stringify([a.who, ps.arms, ps.prop, ps.face, ps.dir, ps.sit, Math.round((ps.eye ?? 0) * 2), wq === undefined ? -1 : Math.round(wq / (Math.PI / 3)) % 6, pq ?? -1, Math.round(glow * 20)]);
  if (key !== last.current) {
    const pose = {...ps, walk: wq, phase: pq};
    if (a.who === 'det') drawDetective(cv.ctx, {arms: pose.arms as 'magnifier', dir: pose.dir});
    else drawPerson(cv.ctx, typeof a.who === 'number' ? GUESTS[a.who].look : CAST[a.who], {...pose, glow, tint: '#ffd23f'});
    cv.t.needsUpdate = true;
    last.current = key;
  }
  return (
    <>
      <mesh ref={(o: THREE.Object3D | null) => { if (o) o.layers.set(1); }} position={[a.at.x, a.at.y + 0.016, a.at.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.3, 0.15, 1]}>
        <circleGeometry args={[1, 24]} /><meshBasicMaterial color="#0c0818" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <Card tex={cv.t} wpx={600} hpx={1000} at={a.at} cam={camPos} tint={tint} roll={a.roll ?? 0} />
    </>
  );
};
const Scene: React.FC<{s: number; c: CamS; st: PartyState; glow: Partial<Record<Who, number>>; det: DetSpot | null}> = ({s, c, st, glow, det}) => {
  const {camera, scene} = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.copy(c.pos);
  cam.fov = c.fov;
  cam.near = 0.05;
  cam.far = 60; // must match the post pass's depth linearisation
  cam.lookAt(c.look);
  cam.updateProjectionMatrix();
  const tex = useManorTex();
  const grad = useGradient();
  const mats = React.useMemo<Mats>(() => {
    const cache = new Map<string, THREE.MeshToonMaterial>();
    return {toon: (color, map) => {
      const key = color + (map ? map.uuid : '');
      if (!cache.has(key)) cache.set(key, new THREE.MeshToonMaterial({color, map, gradientMap: grad}));
      return cache.get(key)!;
    }};
  }, [grad]);
  scene.background = new THREE.Color('#2a2350');
  scene.fog = null;
  const tint = new THREE.Color('#fff6ea');
  return (
    <MatsCtx.Provider value={mats}>
      <SkyDome top="#1d2150" bottom="#7a4a8a" at={c.pos} />
      <hemisphereLight args={['#f4e8ff', '#3a2a3a', 1.05]} />
      <directionalLight position={[6, 14, 12]} color="#fff0dc" intensity={1.6}
        castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={12} shadow-camera-bottom={-4} shadow-bias={-0.0008} />
      {ROOM_LIGHTS.map(([x, f, color], i) => <pointLight key={i} position={[x, FY[f] + 2.2, -0.4]} color={color} intensity={5.5} distance={5.5} decay={1.4} />)}
      <Manor m={mats} tex={tex} carY={st.carY} fire={s} sky="#2f3a7a" yarn={st.yarn} />
      <IceBucket p={st.bucket} m={mats} green={st.green} />
      {st.glass ? <Glass3D p={st.glass} m={mats} ice={st.glassIce} /> : null}
      <Glass3D p={DOC_CUP} m={mats} />
      {st.cube ? <mesh position={st.cube}><boxGeometry args={[0.06, 0.06, 0.06]} /><meshToonMaterial color="#b8f8b8" emissive="#4fe35a" emissiveIntensity={0.4} /></mesh> : null}
      {st.vialCar ? <Vial3D p={st.vialCar} /> : null}
      {st.drops ? <Drops from={st.drops.from} to={st.drops.to} t={s} color={st.drops.color} /> : null}
      {st.actors.map((a) => <ActorCard key={String(a.who)} a={a} camPos={c.pos} tint={tint} glow={typeof a.who === 'string' ? glow[a.who as Who] ?? 0 : 0} />)}
      {det ? <ActorCard a={{who: 'det', at: det.at, pose: {arms: det.arms as never, dir: det.dir}}} camPos={c.pos} tint={tint} glow={0} /> : null}
      <Post focus={c.focus.distanceTo(c.pos)} coc={c.coc} />
    </MatsCtx.Provider>
  );
};

// ───────────────────────── overlays ─────────────────────────
const pop = (frame: number, at: number, fps: number) => spring({frame: frame - Math.round(at * fps), fps, config: {damping: 10, stiffness: 220}});
const Tag: React.FC<{x: number; y: number; k?: number; bg?: string; fg?: string; border?: string; size?: number; rot?: number; children: React.ReactNode}> = ({x, y, k = 1, bg = OL, fg = '#fff', border = OL, size = 40, rot = 0, children}) => (k <= 0.01 ? null : (
  <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${k})`, fontFamily: heavy, fontWeight: 900, fontSize: size, lineHeight: 1.05, textAlign: 'center',
    background: bg, color: fg, border: `5px solid ${border}`, borderRadius: 16, padding: '6px 20px', whiteSpace: 'nowrap', boxShadow: '0 8px 0 rgba(0,0,0,.3)'}}>{children}</div>
));
const Arrow: React.FC<{x: number; y: number; k: number; t: number}> = ({x, y, k, t}) => (k <= 0.01 ? null : (
  <svg width={120} height={170} style={{position: 'absolute', left: x - 60, top: y - 170 + Math.sin(t * 7) * 10, transform: `scale(${k})`, overflow: 'visible'}}>
    <path d="M60 160 L18 100 L44 100 L44 10 L76 10 L76 100 L102 100 Z" fill={YEL} stroke={OL} strokeWidth={9} strokeLinejoin="round" />
  </svg>
));
const Puff: React.FC<{x: number; y: number; k: number}> = ({x, y, k}) => (k <= 0 || k >= 1 ? null : (
  <svg width={400} height={240} style={{position: 'absolute', left: x - 200, top: y - 160, overflow: 'visible', opacity: 1 - k}}>
    {Array.from({length: 7}).map((_, i) => { const a = (i / 7) * Math.PI * 2; const r = 40 + k * 110; return <circle key={i} cx={200 + Math.cos(a) * r} cy={140 + Math.sin(a) * r * 0.45} r={34 * (1 - k * 0.5)} fill="#f4f1ea" stroke={OL} strokeWidth={5} />; })}
  </svg>
));

export const Poison: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const c = shotCam(SHOTS, s);
  const pc = makeCam(c);
  const at = (v: THREE.Vector3) => project(pc, v);
  const ok = (q: {x: number; y: number}) => q.x > 60 && q.x < W - 60 && q.y > 470 && q.y < 1860;
  const p = pAt(s);
  const dp = p - pAt(s - 1 / fps);
  const st = party(p, c.pos);
  if (s >= T.didnt - 0.05) { const b = st.actors.find((a) => a.who === 'butler')!; b.pose = {arms: 'wipe', face: 'relief', eye: 0}; }
  const det = s >= T.det - 0.15 && s < T.didnt + 0.3 ? detAt(s) : null;
  const actor = (w: Who) => st.actors.find((a) => a.who === w)!;
  const head = (w: Who, up = 1.95) => at(actor(w).at.clone().add(V(0, actor(w).pose.sit ? up - 0.55 : up, 0)));
  // helper glows during the reveal
  const glow: Partial<Record<Who, number>> = {};
  const g = (w: Who, from: number, to: number) => { if (s >= from && s < to) glow[w] = 0.55 * clamp01((s - from) / 0.25); };
  g('maid', T.maid, STARTS[7]);
  g('gardener', T.gardener7, STARTS[8]);
  g('niece', T.niece, STARTS[9] - 0.1);
  if (s >= T.three + 0.4 && s < STARTS[10] - 0.05) { glow.niece = 0.55; glow.gardener = 0.55; glow.maid = 0.55; }

  const ov: React.ReactNode[] = [];
  // hook
  if (s >= T.rich - 0.1 && s < T.late) {
    const q = head('host', 2.1);
    if (ok(q)) ov.push(<Arrow key="arr" x={q.x} y={q.y} k={pop(frame, T.rich - 0.1, fps)} t={s} />);
  }
  if (s >= T.who && s < T.late) {
    const left = Math.max(0, T.late - s);
    const n = Math.ceil(left - 0.001);
    const hot = left < 3.5;
    ov.push(
      <div key="timer" style={{position: 'absolute', left: 540, top: 205, transform: `translate(-50%,-50%) scale(${hot ? 1 + 0.06 * Math.sin(s * 20) : 1})`, display: 'flex', alignItems: 'center', gap: 18,
        background: hot ? RED : OL, border: `6px solid ${PAPER}`, borderRadius: 999, padding: '10px 34px', boxShadow: '0 10px 0 rgba(0,0,0,.35)'}}>
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 92, color: '#fff', minWidth: 110, textAlign: 'center'}}>{n}</span>
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 44, color: YEL, lineHeight: 1}}>WHO DID<br />IT?</span>
      </div>,
    );
  }
  if (s >= T.late && s < STARTS[2]) ov.push(<Tag key="late" x={540} y={720} k={pop(frame, T.late, fps)} bg={RED} fg="#fff" size={96} rot={-5}>TOO LATE!</Tag>);
  // detective arrives
  if (det) {
    const q = at(det.at.clone().setY(det.at.y + 1.0));
    const k = clamp01((s - det.s) / 0.45);
    if (ok(q)) ov.push(<Puff key={`puff${det.s}`} x={q.x} y={q.y + 60} k={k} />);
  }
  if (s >= T.det && s < STARTS[3] - 0.15) {
    const q = at(V(-0.75, F1 + 2.15, 0.4));
    if (ok(q)) ov.push(<Tag key="det" x={Math.min(820, Math.max(260, q.x))} y={q.y} k={pop(frame, T.det, fps)} bg={PAPER} fg={OL} size={40}>THE DETECTIVE</Tag>);
  }
  // butler
  if (s >= T.butler3 && s < STARTS[4]) {
    const q = head('butler', 2.2);
    if (ok(q)) ov.push(<Tag key="b?" x={Math.min(900, q.x)} y={q.y} k={pop(frame, T.butler3, fps)} bg={YEL} fg={OL} size={46} rot={-4}>THE BUTLER?</Tag>);
  }
  if (s >= T.wasnt && s < T.ice4 - 0.1) ov.push(<Tag key="nope" x={540} y={1260} k={pop(frame, T.wasnt, fps)} bg={RED} fg="#fff" size={84} rot={-6}>NOPE</Tag>);
  if (s >= T.ice4 && s < STARTS[5] - 0.05) {
    const q = at(GLASS_BAR.clone().setY(BAR_TOP + 0.5));
    if (ok(q)) ov.push(<Tag key="ice" x={q.x} y={q.y - 40} k={pop(frame, T.ice4, fps)} bg={GRN} fg={OL} size={60} rot={-4}>POISON ICE</Tag>);
  }
  if (s >= T.elevator && s < STARTS[6]) {
    const q = at(V(SHAFT.x + 0.4, st.carY + 0.75, SHAFT.z));
    if (ok(q)) ov.push(<Tag key="elev" x={Math.max(330, q.x + 230)} y={q.y} k={pop(frame, T.elevator, fps)} bg={PAPER} fg={OL} size={40}>TINY ELEVATOR ↓</Tag>);
  }
  const helper = (w: Who, n: number, from: number, to: number) => {
    if (s < from || s >= to) return;
    const q = head(w, 2.25);
    if (ok(q)) ov.push(<Tag key={`h${w}`} x={Math.min(880, Math.max(200, q.x))} y={q.y} k={pop(frame, from, fps)} bg={YEL} fg={OL} size={42} rot={n % 2 ? -4 : 4}>HELPER #{n}</Tag>);
  };
  helper('maid', 1, T.maid, STARTS[7]);
  helper('gardener', 2, T.gardener7, STARTS[8]);
  helper('niece', 3, T.niece, STARTS[9] - 0.12);
  if (s >= T.started && s < STARTS[9] - 0.12) ov.push(<Tag key="boss" x={540} y={1420} k={pop(frame, T.started, fps)} bg={RED} fg="#fff" size={56} rot={-4}>SHE STARTED IT</Tag>);
  // the map: the whole chain on the diorama
  if (s >= T.three && s < STARTS[10] - 0.05) {
    const pts = [V(3.95, F4 + 1.1, -0.95), V(1.7, F4 + 1.1, -0.85), V(-1.7, F4 + 1.1, -0.8), V(SHAFT.x, F4 + 1.0, SHAFT.z), V(SHAFT.x, F2 + 1.0, SHAFT.z), V(-3.95, F2 + 1.1, -1.2), V(SHAFT.x, F2 + 0.9, SHAFT.z),
      V(SHAFT.x, F1 + 1.0, SHAFT.z), V(-3.3, F1 + 1.1, -1.5), V(-1.7, F1 + 1.1, -0.8), V(1.0, F1 + 1.0, -1.2)].map(at);
    const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ');
    const k = clamp01((s - T.three - 0.6) / 1.6);
    ov.push(
      <svg key="map" width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={d} fill="none" stroke={OL} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 1`} />
        <path d={d} fill="none" stroke={GRN} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 1`} />
      </svg>,
    );
    (['niece', 'gardener', 'maid'] as Who[]).forEach((w, i) => {
      const q = head(w, 2.15);
      const n = [3, 2, 1][i];
      if (ok(q)) ov.push(<div key={`n${w}`} style={{position: 'absolute', left: q.x - 34, top: q.y - 34, width: 68, height: 68, borderRadius: 99, background: YEL, border: `6px solid ${OL}`,
        fontFamily: heavy, fontWeight: 900, fontSize: 42, lineHeight: '56px', textAlign: 'center', color: OL, transform: `scale(${pop(frame, T.three + 0.2 + i * 0.25, fps)})`}}>{n}</div>);
    });
    ov.push(<Tag key="3" x={540} y={560} k={pop(frame, T.three + 0.1, fps)} bg={YEL} fg={OL} size={58} rot={-3}>3 ACCOMPLICES</Tag>);
    if (s >= T.butler9) { const q = head('butler', 2.15); if (ok(q)) ov.push(<Tag key="noid" x={Math.min(900, q.x + 40)} y={q.y} k={pop(frame, T.butler9, fps)} bg={PAPER} fg={OL} size={34}>HAD NO IDEA</Tag>); }
  }
  if (s >= T.cough && s < T.chef - 0.15) { const q = head('doctor', 2.25); if (ok(q)) ov.push(<Tag key="cough" x={Math.max(250, q.x)} y={q.y} k={pop(frame, T.cough, fps)} bg={PAPER} fg="#2f8a3a" border="#2f8a3a" size={44} rot={-4}>COUGH SYRUP</Tag>); }
  if (s >= T.salt && s < STARTS[11] - 0.1) { const q = head('chef', 2.6); if (ok(q)) ov.push(<Tag key="salt" x={Math.max(240, q.x)} y={q.y} k={pop(frame, T.salt, fps)} bg={PAPER} fg={OL} size={44} rot={4}>JUST SALT</Tag>); }
  if (s >= T.didnt) ov.push(<Tag key="ng" x={540} y={1280} k={pop(frame, T.didnt, fps)} bg="#2f8a3a" fg="#fff" size={76} rot={-5}>NOT GUILTY</Tag>);
  // rewind / fast-forward badge
  const rew = s > T.late + 0.3 && dp < -0.004;
  const ffw = s > T.late + 0.3 && dp > 1.8 / fps;
  if (rew || ffw) ov.push(<div key="rw" style={{position: 'absolute', left: 60, top: 1790, fontFamily: heavy, fontWeight: 900, fontSize: 40, color: '#fff', background: 'rgba(20,20,30,.75)', borderRadius: 12, padding: '6px 16px'}}>{rew ? '◀◀ REWIND' : '▶▶ FAST FORWARD'}</div>);

  // captions: 1-2 words, never across a sentence/comma break
  const chunks: Array<{t: number; e: number; text: string}> = [];
  LINES.forEach((ln, li) => {
    const ws = ln.words;
    const toks = (episode as {lines: Array<{text: string}>}).lines[li].text.split(/\s+/);
    const stop = (i: number) => toks.length === ws.length && /[.,!?]$/.test(toks[i]);
    for (let i = 0; i < ws.length; i += 2) {
      const a = ws[i];
      const b = ws[i + 1];
      const long = a.text.length > 7 || (b && b.text.length > 7) || stop(i);
      const take = long ? [a] : b ? [a, b] : [a];
      if (long) i -= 1;
      const next = ws[i + (long ? 1 : 2)];
      chunks.push({t: STARTS[li] + a.start, e: next ? STARTS[li] + next.start : STARTS[li] + a.end + 0.25, text: take.map((x) => x.text).join(' ')});
    }
  });
  const cap = chunks.find((k) => s >= k.t && s < k.e);
  const capSize = cap ? Math.min(118, 820 / (cap.text.length * 0.78)) : 0;
  const capPop = cap ? 0.6 + 0.4 * spring({frame: frame - Math.round(cap.t * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;

  // sfx: the real chain is SILENT; only decoys make noise during the search
  const sp = (pp: number) => P0 + pp;
  const sfx: Array<[number, string, number]> = [
    [T.rich, 'sfx/pop.wav', 0.3], [T.who, 'sfx/tick.wav', 0.3],
    ...[0, 0.13, 0.26, 0.4, 0.55].map((k) => [sp(5.3 + k), 'sfx/pop.wav', 0.32] as [number, string, number]), // doctor: glug glug
    ...Array.from({length: 6}).map((_, k) => [sp(6.45 + k * 0.22), 'sfx/tick.wav', 0.4] as [number, string, number]), // chef: shake shake
    [sp(1.15), 'sfx/crack.wav', 0.35], [sp(9.75), 'sfx/crack.wav', 0.3], [sp(2.35), 'sfx/pop.wav', 0.3], [sp(2.6), 'sfx/pop.wav', 0.25], [sp(2.85), 'sfx/pop.wav', 0.2], [sp(11.6), 'sfx/clank.wav', 0.25],
    [sp(8.62), 'sfx/pop.wav', 0.4], [sp(8.95), 'sfx/pop.wav', 0.28], [sp(9.25), 'sfx/pop.wav', 0.2], // yarn bounces
    [T.late - 0.02, 'sfx/boom.wav', 0.5], [T.late, 'sfx/slam.wav', 0.45],
    [T.det - 0.15, 'sfx/whoosh.wav', 0.35], [T.det, 'sfx/shine.wav', 0.3],
    [STARTS[3] - 0.15, 'sfx/scratch.wav', 0.35], [T.butler3, 'sfx/pop.wav', 0.3],
    [STARTS[4], 'sfx/scratch.wav', 0.35], [T.wasnt, 'sfx/fail.wav', 0.3], [T.ice4, 'sfx/zap.wav', 0.3],
    [STARTS[5], 'sfx/scratch.wav', 0.3], [T.elevator, 'sfx/pop.wav', 0.25],
    [STARTS[6], 'sfx/scratch.wav', 0.3], [T.maid, 'sfx/ding.wav', 0.4],
    [STARTS[7], 'sfx/scratch.wav', 0.25], [T.gardener7, 'sfx/ding.wav', 0.4],
    [STARTS[8], 'sfx/scratch.wav', 0.3], [T.niece, 'sfx/ding.wav', 0.45], [T.started, 'sfx/slam.wav', 0.45],
    [STARTS[9] - 0.1, 'sfx/whoosh.wav', 0.4], [T.three + 0.1, 'sfx/shine.wav', 0.4],
    [STARTS[10] - 0.05, 'sfx/scratch.wav', 0.3], [T.cough, 'sfx/pop.wav', 0.3], [T.salt, 'sfx/pop.wav', 0.3],
    [T.didnt, 'sfx/slam.wav', 0.45], [T.didnt + 0.1, 'sfx/shine.wav', 0.35],
  ];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={W} height={H} dpr={1} flat shadows={{type: THREE.PCFSoftShadowMap}} gl={{antialias: false, preserveDrawingBuffer: true}}>
        <Scene s={s} c={c} st={st} glow={glow} det={det} />
      </ThreeCanvas>
      {(rew || ffw) ? <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(120,160,255,.10) 0 3px, transparent 3px 9px)', mixBlendMode: 'screen'}} /> : null}
      {ov}
      {cap ? (
        <div style={{position: 'absolute', top: 330, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: capSize, lineHeight: 1,
          color: '#fff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`, paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: 'nowrap',
          transform: `scale(${capPop})`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}
      <Audio src={staticFile('music/poison.wav')} volume={0.36} />
      {LINES.map((ln, i) => <Sequence key={i} from={Math.round(STARTS[i] * fps)}><Audio src={staticFile(ln.file)} /></Sequence>)}
      {sfx.map(([t, f, v], i) => <Sequence key={`s${i}`} from={Math.max(0, Math.round(t * fps))} durationInFrames={60}><Audio src={staticFile(f)} volume={v} /></Sequence>)}
    </AbsoluteFill>
  );
};
