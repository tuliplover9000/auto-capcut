import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import type {Timing} from '../fight/timeline';
import {buildPlan, lineAt} from '../story/timeline';
import {Arm, armGeom, COL as BCOL, FEET, Figure, Heart, Legs, Mood, OL, Who} from '../buffer/art';
import type {BLine, BufferEpisode, BufferMode} from '../buffer/Buffering';
import {Dog, Pigeon, RizzBadge, Spark, tierCol} from './art';

// RIZZ METER: in Rizzville everybody's rizz floats over their head as a live
// number. Same caption-reading format as Buffering (friends voice it by
// reading the captions as it plays). Gags are keyed to the 60 LINE INDICES
// in scripts/make_rizzmeter.py.
export type RizzEpisode = BufferEpisode & {lines: BLine[]};

const heavy = loadMontserrat('normal', {weights: ['700', '800', '900'], subsets: ['latin']}).fontFamily;
const W = 1080;
const H = 1920;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const inK = (s: number, t0: number, d = 0.35) => ease(clamp01((s - t0) / d));
const pop = (s: number, t0: number, d = 0.35) => (s < t0 ? 0 : 1 + 0.25 * Math.sin(clamp01((s - t0) / d) * Math.PI) * (1 - clamp01((s - t0) / d)));
const hop = (s: number, t0: number, d: number, h: number) => (s >= t0 && s < t0 + d ? -h * Math.sin((Math.PI * (s - t0)) / d) : 0);
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const rad = (d: number) => (d * Math.PI) / 180;
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const COL: Record<string, string> = {...BCOL, SYS: '#ffd23f'};
const NAME: Record<string, string> = {DEX: 'DEX', BOLT: 'BOLT', NOVA: 'NOVA', SYS: 'METER'};
const TAGS: Record<string, string> = {whisper: 'WHISPER', nervous: 'NERVOUS', quiet: 'QUIETLY'};

type MR = Array<[number, number, Mood]>;
const MOODS: Record<Who, MR> = {
  DEX: [[0, 2, 'neutral'], [3, 3, 'shock'], [4, 5, 'hurt'], [6, 6, 'shock'], [7, 7, 'nervous'], [8, 8, 'neutral'], [9, 10, 'smug'], [11, 11, 'hurt'], [12, 13, 'neutral'],
    [14, 14, 'smug'], [15, 15, 'hurt'], [16, 16, 'neutral'], [17, 17, 'smug'], [18, 18, 'hurt'], [19, 20, 'nervous'], [21, 22, 'shock'], [23, 24, 'neutral'], [25, 25, 'smug'],
    [26, 30, 'nervous'], [31, 32, 'shock'], [33, 34, 'nervous'], [35, 35, 'smug'], [36, 36, 'shock'], [37, 40, 'nervous'], [41, 42, 'shock'], [43, 43, 'nervous'], [44, 46, 'shock'],
    [47, 48, 'happy'], [49, 50, 'nervous'], [51, 51, 'love'], [52, 52, 'happy'], [53, 54, 'smug'], [55, 57, 'happy'], [58, 58, 'smug'], [59, 59, 'shock']],
  BOLT: [[0, 8, 'happy'], [9, 11, 'smug'], [12, 14, 'happy'], [15, 15, 'hurt'], [16, 16, 'smug'], [17, 17, 'happy'], [18, 19, 'shock'], [20, 23, 'smug'], [24, 26, 'happy'],
    [27, 33, 'smug'], [34, 34, 'happy'], [35, 42, 'shock'], [43, 47, 'neutral'], [48, 52, 'happy'], [53, 54, 'smug'], [55, 56, 'nervous'], [57, 59, 'shock']],
  NOVA: [[0, 28, 'neutral'], [29, 29, 'happy'], [30, 30, 'neutral'], [31, 32, 'shock'], [33, 34, 'smug'], [35, 36, 'happy'], [37, 37, 'shock'], [38, 40, 'happy'], [41, 42, 'shock'],
    [43, 47, 'nervous'], [48, 48, 'shock'], [49, 50, 'love'], [51, 56, 'happy'], [57, 57, 'shock'], [58, 59, 'happy']],
};
type PR = Array<[number, number, string]>;
const POSES: Record<Who, PR> = {
  DEX: [[1, 1, 'stretch'], [3, 3, 'shrug'], [5, 5, 'slump'], [7, 7, 'head'], [8, 8, 'cross'], [9, 9, 'pointR'], [10, 10, 'cross'], [11, 11, 'facepalm'], [12, 12, 'shrug'],
    [14, 14, 'lean'], [15, 15, 'panic'], [17, 17, 'grope'], [18, 18, 'cheekR'], [20, 20, 'shrug'], [22, 22, 'pointR'], [25, 25, 'shrug'],
    [28, 28, 'wave'], [30, 30, 'rub'], [32, 32, 'rub'], [33, 33, 'shrug'], [35, 35, 'pointR'], [38, 38, 'head'], [40, 40, 'call'], [41, 42, 'panic'], [44, 44, 'pointUp'],
    [46, 46, 'shrug'], [49, 49, 'rub'], [50, 51, 'clasp'], [52, 52, 'fists'], [54, 54, 'cross'], [58, 58, 'shrug'], [59, 59, 'laugh']],
  BOLT: [[6, 6, 'wave'], [8, 8, 'head'], [10, 10, 'fist'], [11, 11, 'fists'], [13, 13, 'pointR'], [15, 15, 'facepalm'], [16, 16, 'hold'], [18, 18, 'cheeks'], [19, 19, 'pointR'],
    [23, 23, 'shrug'], [26, 26, 'fists'], [27, 27, 'pointR'], [34, 34, 'fists'], [35, 38, 'facepalm'], [39, 39, 'panic'], [40, 41, 'facepalm'], [42, 42, 'cheeks'], [48, 48, 'fists'],
    [53, 53, 'cross'], [54, 54, 'shrug'], [56, 56, 'rub'], [57, 57, 'panic']],
  NOVA: [[29, 29, 'wave'], [32, 32, 'pointUpL'], [33, 34, 'hip'], [35, 36, 'laugh'], [37, 37, 'pointUpL'], [38, 40, 'laugh'], [41, 42, 'cheeks'], [43, 44, 'fist'], [45, 45, 'pointR'],
    [47, 47, 'cheeks'], [49, 50, 'clasp'], [51, 51, 'cheeks'], [52, 52, 'fists'], [53, 54, 'laugh'], [55, 55, 'wave'], [57, 57, 'cheeks'], [58, 59, 'laugh']],
};
const rangeOf = <T,>(r: Array<[number, number, T]>, li: number, d: T): T => r.find(([a, b]) => li >= a && li <= b)?.[2] ?? d;
const armsFor = (pose: string, t: number): [Arm, Arm] => {
  const sw = Math.sin(t * 1.6) * 3;
  switch (pose) {
    case 'talk': return [[10, 8], [30 + 14 * Math.sin(t * 5), 70 + 30 * Math.sin(t * 7)]];
    case 'pointR': return [[8, 6], [92, 0]];
    case 'pointUp': return [[8, 6], [165, -10]];
    case 'pointUpL': return [[135, 0], [8, 6]];
    case 'panic': return [[160 + 10 * Math.sin(t * 14), 25], [160 + 10 * Math.sin(t * 14 + 1), 25]];
    case 'shrug': return [[50, 95], [50, 95]];
    case 'hold': return [[10, 8], [160, 15]];
    case 'facepalm': return [[10, 8], [150, 120]];
    case 'cheekR': return [[10, 8], [150, 120]];
    case 'call': return [[10, 8], [150, 118]];
    case 'cheeks': return [[150, 120], [150, 120]];
    case 'wave': return [[10, 8], [150, 10 + 30 * Math.sin(t * 10)]];
    case 'slump': return [[2, 0], [2, 0]];
    case 'fist': return [[10, 8], [172, 0]];
    case 'fists': return [[165, 10], [165, 10]];
    case 'stretch': return [[170, 10], [170, 10]];
    case 'cross': return [[20, 250], [20, 250]];
    case 'rub': return [[22, 235 + 15 * Math.sin(t * 9)], [22, 235 + 15 * Math.sin(t * 9 + 2)]];
    case 'laugh': return [[25, 215 + 8 * Math.sin(t * 16)], [25, 215 + 8 * Math.sin(t * 16 + 1)]];
    case 'hip': return [[40, 290], [8 + sw, 6]];
    case 'head': return [[10, 8], [170, 47]];
    case 'clasp': return [[30, 245], [30, 245]];
    case 'lean': return [[62, 4], [14, 10]];
    case 'grope': return [[78 + 10 * Math.sin(t * 7), 12], [78 + 10 * Math.sin(t * 7 + 2), 12]];
    default: return [[8 + sw, 6], [8 - sw, 6]];
  }
};

type Key = [number, number | 'roll', number?];

export const RizzMeter: React.FC<{episode: RizzEpisode; timing: Timing; mode: BufferMode}> = ({episode: ep, timing, mode}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const INTRO = ep.intro;
  const plan = buildPlan(ep, timing);
  const LS = plan.lineStarts;
  const LE = plan.lineEnds;
  const N = ep.lines.length;
  const st = s - INTRO; // story time
  const li = lineAt(plan, st);
  const words = (i: number) => timing.lines[i].words;
  const wT = (i: number, w: string) => {
    const hit = words(i).find((x) => norm(x.text) === norm(w)) ?? words(i).find((x) => norm(x.text).startsWith(norm(w)));
    return LS[i] + (hit ?? words(i)[0]).start;
  };
  const cuts = plan.cuts.map((c) => c.t);
  const scene = ep.lines[li].scene;
  const sceneAt = (t: number) => ep.lines[lineAt(plan, t)].scene;

  const talkOf = (spk: string) => {
    if (st < LS[li] || ep.lines[li].speaker !== spk) return 0;
    const t = st - LS[li];
    const on = words(li).some((w) => t >= w.start - 0.02 && t <= w.end + 0.03);
    return on ? 0.45 + 0.55 * Math.abs(Math.sin(t * 21)) : 0;
  };
  const blinkOf = (k: number) => ((st * 0.55 + k * 0.37) % 1 < 0.05 ? 1 : 0);

  // ── key times
  const FY = 1665;
  const wake = LS[1] - 0.35;
  const leanT = LS[14] + 0.1;
  const fallT = LE[14] + 0.2;
  const upT = LS[16] - 0.75;
  const bonkT = LE[17];
  const dogIn = LS[21] - 1.3;
  const dogOut = LS[24];
  const boltJump = LS[48] - 0.1;
  const yesT = wT(52, 'hundred');
  const nineT = wT(57, 'nine');
  const faintT = nineT + 0.5;
  const dogEnd = LS[59] - 1.5;

  // ── rizz tracks: [time, value, tween seconds]
  const TRACK: Record<string, Key[]> = {
    DEX: [[-99, 4], [wT(4, 'three'), 3], [wT(15, 'two'), 2], [wT(18, 'zero'), 0], [wT(31, 'three'), -3], [wT(36, 'ten'), -10], [wT(41, 'forty'), -40, 0.8],
      [LS[50], 'roll'], [yesT, 100, 0.01]],
    BOLT: [[-99, 87], [wT(11, 'eighty'), 88], [LS[56] + 0.2, 9, LE[56] - LS[56]], [nineT, -900, 0.25]],
    NOVA: [[-99, 100], [LS[29] + 0.4, 93], [LE[30] + 0.2, 71], [LE[35] + 0.2, 42], [LE[40] + 0.2, 19], [LS[43] + 0.3, 7], [wT(51, 'yes') + 0.25, 100, 0.6]],
    DOG: [[-99, 95], [wT(59, 'hundred'), 100, 0.3]],
  };
  const shownOf = (who: string) => {
    const ks = TRACK[who];
    let i = 0;
    ks.forEach((k, j) => { if (st >= k[0]) i = j; });
    const [t0, v, dur = 0.5] = ks[i];
    const prev = i > 0 ? ks[i - 1][1] : v;
    if (v === 'roll') return {shown: 'roll' as const, delta: undefined, deltaK: 0, popK: 0};
    const k = clamp01((st - t0) / dur);
    const shown = typeof prev === 'number' && i > 0 ? Math.round(lerp(prev, v, ease(k))) : v;
    const delta = typeof prev === 'number' && i > 0 && dur < 1 ? v - prev : undefined;
    const since = st - t0;
    return {shown, delta, deltaK: i > 0 ? clamp01(since / 1.3) : 0, popK: i > 0 && since >= 0 && since < 0.35 ? Math.sin((since / 0.35) * Math.PI) : 0};
  };

  // ── character placement (FEET at x, y)
  type P = {x: number; y: number; s: number; vis: boolean; dim?: number; rot?: number; legs?: Legs};
  const placeAt = (who: Who, t: number): P => {
    const sc = sceneAt(t);
    const l = lineAt(plan, t);
    if (sc === 'home') {
      if (who === 'DEX') {
        const k = t < wake ? 0 : inK(t, wake, 0.55);
        return {x: 320, y: lerp(1560, FY, k) + hop(t, LS[3], 0.35, 40), s: 1.1, vis: true, rot: lerp(90, 0, k)};
      }
      if (who === 'BOLT') {
        const enter = LS[6] - 0.9;
        return {x: lerp(1400, 720, clamp01((t - enter) / 0.8)), y: FY + hop(t, wT(11, 'eighty'), 0.4, 50), s: 1.1, vis: t >= enter};
      }
      return {x: 0, y: 0, s: 1, vis: false};
    }
    if (sc === 'street') {
      if (who === 'BOLT') return {x: 260, y: FY + hop(t, LS[26], 0.4, 40), s: 1.1, vis: true};
      if (who === 'DEX') {
        let rot = 0;
        if (t >= leanT && t < fallT) rot = -14 * inK(t, leanT, 0.4);
        else if (t >= fallT && t < upT) rot = lerp(-14, -86, ease(clamp01((t - fallT) / 0.35)));
        else if (t >= upT && t < upT + 0.6) rot = lerp(-86, 0, inK(t, upT, 0.5));
        let x = 700;
        if (t >= LS[17] && t < bonkT) x = lerp(700, 835, clamp01((t - LS[17]) / (bonkT - LS[17])));
        else if (t >= bonkT) x = lerp(835, 640, inK(t, LS[19] - 0.9, 1.0));
        if (t >= bonkT && t < bonkT + 1.2) rot = -16 * Math.exp(-(t - bonkT) * 3) * Math.cos((t - bonkT) * 14);
        return {x, y: FY + hop(t, LS[22], 0.35, 50), s: 1.1, vis: true, rot};
      }
      return {x: 0, y: 0, s: 1, vis: false};
    }
    if (sc === 'end') {
      const xs: Record<Who, number> = {BOLT: 240, DEX: 545, NOVA: 850};
      const fk = who === 'BOLT' ? inK(t, faintT, 0.45) : 0;
      const shiver = who === 'BOLT' && l === 56 ? Math.sin(t * 40) * 4 : 0;
      return {x: lerp(xs[who], 850, fk) + shiver, y: FY + 150 * fk + (who === 'NOVA' ? hop(t, LS[55], 0.3, 25) : 0), s: 1.05, vis: true, rot: -88 * fk};
    }
    // park + moment
    if (who === 'NOVA') return {x: 820, y: FY + hop(t, yesT + 0.3, 0.45, 80), s: 1.1, vis: true, legs: t >= yesT + 0.3 && t < yesT + 0.75 ? 'tuck' : undefined};
    if (who === 'DEX') {
      const walk = LS[28] - 1.1;
      const jump = hop(t, yesT + 0.15, 0.5, 140);
      const shake = l === 41 || l === 42 ? Math.sin(t * 50) * 5 : 0;
      return {x: lerp(380, 560, ease(clamp01((t - walk) / 1.0))) + shake, y: FY + jump, s: 1.1, vis: true, legs: jump < 0 ? 'tuck' : undefined};
    }
    // BOLT: crouched behind the bush; pops up for line 48
    const jump = hop(t, boltJump, 0.55, 170);
    const standing = l === 48 && t >= boltJump;
    return {x: 200, y: FY + jump, s: 1.1, vis: true, dim: standing ? 0 : 0.25, legs: jump < 0 ? 'tuck' : standing ? undefined : 'crouch'};
  };
  const place = (who: Who) => {
    const p = placeAt(who, st);
    const q = placeAt(who, st - 1 / 30);
    const walking = p.legs === undefined && Math.abs(p.x - q.x) > 0.8 && Math.abs(p.rot ?? 0) < 20;
    return {...p, legs: p.legs ?? (walking ? ('walk' as Legs) : ('stand' as Legs))};
  };
  const crouchOf = (l: Legs) => (l === 'crouch' ? 70 : l === 'tuck' ? 40 : 0);
  const headOf = (who: string): [number, number] => {
    if (who === 'SYS') return [540, 1180];
    if (who === 'DOG') {
      const d = dogNow();
      return [d.x + d.face * 108 * d.s, d.y - 176 * d.s];
    }
    const p = place(who as Who);
    const d = (FEET - crouchOf(p.legs) + 26) * p.s;
    const r = rad(p.rot ?? 0);
    return [p.x + d * Math.sin(r), p.y - d * Math.cos(r)];
  };

  // the dog: crosses the street (21-23), naps in the park, struts in at the end
  type DogP = {x: number; y: number; s: number; face: 1 | -1; pose: 'stand' | 'walk' | 'lie' | 'cover'; vis: boolean; shades?: boolean; back?: boolean};
  function dogNow(): DogP {
    if (scene === 'street') {
      if (st < dogIn || st > dogOut + 1.5) return {x: 0, y: 0, s: 1, face: 1, pose: 'stand', vis: false};
      if (st < dogOut) {
        const k = clamp01((st - dogIn) / 1.2);
        return {x: lerp(1260, 900, k), y: FY, s: 1.0, face: -1, pose: k < 1 ? 'walk' : 'stand', vis: true};
      }
      return {x: lerp(900, 1320, clamp01((st - dogOut) / 1.4)), y: FY, s: 1.0, face: 1, pose: 'walk', vis: true};
    }
    if (scene === 'park' || scene === 'moment') return {x: 430, y: 1440, s: 0.55, face: 1, pose: li >= 42 && li <= 43 ? 'cover' : 'lie', vis: true, back: true};
    if (scene === 'end' && st >= dogEnd) {
      const k = clamp01((st - dogEnd) / 1.2);
      return {x: lerp(1260, 700, k), y: FY + 10, s: 1.0, face: -1, pose: k < 1 ? 'walk' : 'stand', vis: true, shades: true};
    }
    return {x: 0, y: 0, s: 1, face: 1, pose: 'stand', vis: false};
  }
  const dog = dogNow();

  const poseOf = (who: Who): [Arm, Arm] => {
    let pose = rangeOf(POSES[who], li, 'idle');
    const speaking = ep.lines[li].speaker === who && st >= LS[li];
    if (pose === 'idle' && speaking && talkOf(who) > 0) pose = 'talk';
    if (who === 'DEX' && scene === 'home' && st < wake) pose = 'idle';
    if (who === 'DEX' && li === 14 && st >= fallT) pose = 'panic';
    if (who === 'BOLT' && scene === 'end' && st > faintT) pose = 'slump';
    return armsFor(pose, st + (who === 'BOLT' ? 0.7 : who === 'NOVA' ? 1.4 : 0));
  };
  const handWorld = (who: Who, side: -1 | 1): [number, number] => {
    const p = place(who);
    const [aL, aR] = poseOf(who);
    const g = armGeom(side, side < 0 ? aL : aR);
    return [p.x + g.ha[0] * p.s, p.y + (g.ha[1] - FEET + crouchOf(p.legs)) * p.s];
  };
  const badgeOf = (who: string): [number, number] => {
    const [hx, hy] = headOf(who);
    if (who === 'DOG') return [hx - dog.face * 20, hy - 120 * dog.s];
    const p = place(who as Who);
    return [hx, hy - (who === 'BOLT' ? 240 : 205) * p.s + Math.sin(st * 2.2 + hx * 0.01) * 6];
  };

  // ── camera
  type Cam = {x: number; y: number; z: number};
  const WIDE: Cam = {x: 540, y: 1180, z: 1};
  const camFor = (i: number): Cam => {
    const spk = ep.lines[i].speaker;
    const [hx, hy] = headOf(spk);
    if (i === 31 || i === 36) {
      const [bx, by] = badgeOf('DEX');
      return {x: bx, y: by + 140, z: i === 31 ? 1.55 : 1.4};
    }
    if (i === 44) {
      const [bx, by] = badgeOf('NOVA');
      return {x: bx - 60, y: by + 110, z: 1.9};
    }
    if (i === 21) return {x: 860, y: FY - 300, z: 1.3};
    if (i === 59) return {x: 680, y: FY - 260, z: 1.5};
    if (i === 14 || i === 15) return {x: 500, y: 1260, z: 1.06};
    if (i === 17) return {x: 760, y: 1150, z: 1.15};
    if (i === 49) return {x: 690, y: 1120, z: 1.12};
    if (spk === 'SYS' || i === 41 || i === 42 || i === 57) return WIDE;
    return {x: lerp(540, hx, 0.3), y: lerp(1180, hy, 0.2), z: 1.07};
  };
  const camNow = (): Cam => {
    const cur = camFor(li);
    const prev = li > 0 && !cuts.includes(LS[li]) ? camFor(li - 1) : WIDE;
    const k = inK(st, LS[li] - 0.15, 0.45);
    return {x: lerp(prev.x, cur.x, k), y: lerp(prev.y, cur.y, k), z: lerp(prev.z, cur.z, k)};
  };
  const cam = st < 0 ? WIDE : camNow();
  const kick = (t0: number, amp: number, d: number) => (st >= t0 ? amp * Math.exp(-(st - t0) * d) : 0);
  const shake = kick(fallT + 0.35, 16, 6) + kick(bonkT, 20, 6) + kick(wT(31, 'three'), 8, 6) + kick(wT(41, 'forty'), 16, 5) + kick(LS[42], 10, 3) + kick(boltJump, 8, 6)
    + kick(yesT, 10, 5) + kick(nineT, 26, 4) + kick(faintT + 0.45, 12, 6) + kick(LS[3], 5, 6);
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + Math.sin(frame * 2.3) * shake}px, ${1180 - cam.y + Math.cos(frame * 2.9) * shake}px) scale(${cam.z})`};

  // ── backgrounds
  const floor = (top: number, a: string, b: string) => (
    <g>
      <rect x={0} y={top} width={W} height={H - top} fill={a} />
      {Array.from({length: 9}).map((_, k) => <path key={k} d={`M ${540 + (k - 4) * 90} ${top} L ${540 + (k - 4) * 260} ${H}`} stroke={b} strokeWidth={4} />)}
      {[0, 1, 2, 3].map((k) => <rect key={`h${k}`} x={0} y={top + 40 + k * k * 34} width={W} height={4} fill={b} />)}
    </g>
  );
  const skyline = (y0: number, cols: [string, string], tags: boolean) => (
    <g>
      {Array.from({length: 13}).map((_, k) => {
        const bw = 60 + hash(k + 3) * 50;
        const bx = k * 88 - 20;
        const bh = 180 + hash(k + 11) * 260;
        return (
          <g key={k}>
            <rect x={bx} y={y0 - bh} width={bw} height={bh} fill={k % 2 ? cols[0] : cols[1]} />
            {Array.from({length: Math.floor(bh / 40)}).map((__, r) => [0, 1].map((c) => (
              hash(k * 17 + r * 5 + c) > 0.5 ? <rect key={`${r}-${c}`} x={bx + 12 + c * (bw / 2 - 6)} y={y0 - bh + 16 + r * 40} width={12} height={16} fill="#fff3c4" opacity={0.7} /> : null
            )))}
            {tags && hash(k + 40) > 0.45 ? (
              <g transform={`translate(${bx + bw / 2} ${y0 - bh - 26 + Math.sin(st * 2 + k) * 4})`}>
                <rect x={-22} y={-13} width={44} height={26} rx={7} fill="#0e1424" stroke={tierCol(Math.floor(hash(k + 7) * 100))} strokeWidth={3} />
                <text y={8} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={17} fill={tierCol(Math.floor(hash(k + 7) * 100))}>{Math.floor(hash(k + 7) * 100)}</text>
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
  const homeBg = (
    <g>
      <rect x={0} y={0} width={W} height={H} fill="#2f5d73" />
      {[0, 1, 2, 3, 4, 5, 6].map((k) => <rect key={k} x={k * 170 - 20} y={0} width={70} height={1500} fill="#2a5468" />)}
      <defs>
        <linearGradient id="rzsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fd3ff" /><stop offset="1" stopColor="#ffd9a8" /></linearGradient>
        <clipPath id="rzwin"><rect x={168} y={588} width={744} height={444} rx={12} /></clipPath>
      </defs>
      <rect x={160} y={580} width={760} height={460} rx={18} fill="#1d3a4a" />
      <g clipPath="url(#rzwin)">
        <rect x={160} y={580} width={760} height={460} fill="url(#rzsky)" />
        <circle cx={760} cy={680} r={50} fill="#fff1a8" />
        <g transform="translate(160 0)">{skyline(1040, ['#5a7fa8', '#6b8fb8'], true)}</g>
      </g>
      <rect x={536} y={580} width={8} height={460} fill="#1d3a4a" />
      <rect x={160} y={808} width={760} height={8} fill="#1d3a4a" />
      {/* poster */}
      <g transform="translate(130 1220) rotate(-4)">
        <rect x={-70} y={-110} width={140} height={190} rx={8} fill="#ff7a3d" stroke={OL} strokeWidth={5} />
        <text y={-60} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={26} fill="#fff">RIZZ</text>
        <text y={-30} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={26} fill="#fff">101</text>
        {[0, 1, 2].map((j) => <rect key={j} x={-48} y={-6 + j * 22} width={96 - j * 18} height={8} rx={4} fill="#ffd9a8" />)}
      </g>
      {floor(1500, '#7a5a44', '#684b38')}
    </g>
  );
  const bedBack = (
    <g>
      <rect x={880} y={1300} width={70} height={360} rx={14} fill="#8a5a3a" stroke={OL} strokeWidth={6} />
      <rect x={380} y={1520} width={560} height={100} rx={20} fill="#f4f1ea" stroke={OL} strokeWidth={6} />
      <ellipse cx={850} cy={1515} rx={70} ry={34} fill="#ffffff" stroke={OL} strokeWidth={5} />
    </g>
  );
  const blanketK = st < wake ? 0 : inK(st, wake, 0.6);
  const bedFront = (
    <g>
      <path d={`M ${370 + 200 * blanketK} ${1510 + 40 * blanketK} Q ${560 + 120 * blanketK} ${1470 + 50 * blanketK} ${790} ${1500 + 20 * blanketK} L 800 1640 L ${370 + 200 * blanketK} 1640 Z`} fill="#2fb7a6" stroke={OL} strokeWidth={6} />
      {[0, 1, 2].map((j) => <circle key={j} cx={470 + j * 110 + 70 * blanketK} cy={1580} r={14} fill="#1f7f74" />)}
      <rect x={370} y={1630} width={580} height={70} rx={12} fill="#8a5a3a" stroke={OL} strokeWidth={6} />
      {st < wake ? [0, 1, 2].map((j) => {
        const k = ((st * 0.5 + j / 3) % 1);
        return <text key={j} x={880 + k * 60} y={1360 - k * 150} fontFamily={heavy} fontWeight={900} fontSize={36 + k * 30} fill="#ffffff" opacity={1 - k}>Z</text>;
      }) : null}
    </g>
  );
  const busFall = st >= fallT && scene === 'street' ? -78 * ease(clamp01((st - fallT) / 0.45)) : st >= leanT && st < fallT ? -6 * inK(st, leanT, 0.4) : 0;
  const streetBg = (
    <g>
      <defs>
        <linearGradient id="rzst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62c4ff" /><stop offset="1" stopColor="#c9ecff" /></linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="url(#rzst)" />
      {skyline(1100, ['#7d93c9', '#8ea4d6'], true)}
      {/* leaderboard billboard */}
      <g transform="translate(540 705)">
        <rect x={-6} y={110} width={12} height={360} fill="#3a4560" />
        <rect x={-330} y={-110} width={660} height={240} rx={18} fill="#0e1424" stroke="#ffd23f" strokeWidth={8} />
        <text y={-62} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={38} fill="#ffd23f" letterSpacing={3}>RIZZ LEADERBOARD</text>
        {[['#1', 'NOVA', '100', '#ffd23f'], ['#2', 'SOME DOG', '95', '#ffd23f'], ['#8,402,117', 'DEX', String(shownOf('DEX').shown), '#ff4f5e']].map(([r, n, v, c], j) => (
          <g key={j} transform={`translate(0 ${-14 + j * 48})`}>
            <text x={-300} y={14} fontFamily={heavy} fontWeight={800} fontSize={j === 2 ? 26 : 30} fill="#c9d3df">{r}</text>
            <text x={j === 2 ? -110 : -200} y={14} fontFamily={heavy} fontWeight={900} fontSize={30} fill="#fff">{n}</text>
            <text x={300} y={14} textAnchor="end" fontFamily={heavy} fontWeight={900} fontSize={34} fill={c}>{v === 'roll' ? '??' : v}</text>
          </g>
        ))}
      </g>
      {/* shopfronts */}
      {[0, 1, 2, 3].map((k) => (
        <g key={`s${k}`} transform={`translate(${k * 280 - 20} 1110)`}>
          <rect x={0} y={0} width={270} height={400} fill={['#e8443a', '#3fae6a', '#7a4fd6', '#ffb02e'][k]} stroke={OL} strokeWidth={5} />
          <rect x={20} y={110} width={230} height={170} rx={8} fill="#c9ecff" stroke={OL} strokeWidth={5} />
          <path d={`M 0 0 L 270 0 L 250 70 L 20 70 Z`} fill="#f4f1ea" stroke={OL} strokeWidth={5} />
          {[0, 1, 2, 3, 4].map((j) => <rect key={j} x={14 + j * 50} y={4} width={26} height={62} fill={['#e8443a', '#3fae6a', '#7a4fd6', '#ffb02e'][k]} opacity={0.6} />)}
        </g>
      ))}
      {floor(1500, '#b9b2a2', '#a39c8c')}
      <rect x={0} y={1500} width={W} height={18} fill="#8a8476" />
    </g>
  );
  const streetProps = (
    <g>
      {/* bus-stop sign Dex leans on (tips over) */}
      <g transform={`translate(560 1660) rotate(${busFall})`}>
        <rect x={-9} y={-430} width={18} height={430} fill="#5a6070" stroke={OL} strokeWidth={4} />
        <rect x={-60} y={-500} width={120} height={84} rx={12} fill="#2f6fd6" stroke={OL} strokeWidth={5} />
        <text y={-446} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={36} fill="#fff">BUS</text>
      </g>
      {/* lamp post Dex walks into */}
      <g transform={`translate(950 1660) rotate(${st >= bonkT ? 3 * Math.exp(-(st - bonkT) * 3) * Math.sin((st - bonkT) * 30) : 0})`}>
        <rect x={-14} y={-760} width={28} height={760} fill="#3a4560" stroke={OL} strokeWidth={4} />
        <path d="M -14 -760 Q -14 -820 -80 -820 L -110 -820" fill="none" stroke="#3a4560" strokeWidth={22} />
        <path d="M -150 -830 L -70 -830 L -82 -790 L -138 -790 Z" fill="#ffd23f" stroke={OL} strokeWidth={4} />
      </g>
    </g>
  );
  const parkBg = (
    <g>
      <defs>
        <linearGradient id="rzpk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fd8ff" /><stop offset="1" stopColor="#e3f7ff" /></linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="url(#rzpk)" />
      {[0, 1, 2].map((k) => {
        const x = ((st * (14 + k * 6) + k * 400) % 1400) - 200;
        return <g key={k} transform={`translate(${x} ${640 + k * 90})`}><ellipse rx={90} ry={34} fill="#fff" /><ellipse cx={50} cy={-20} rx={60} ry={34} fill="#fff" /></g>;
      })}
      {skyline(1180, ['#a9c4e8', '#b9d2f0'], false)}
      <rect x={0} y={1150} width={W} height={400} fill="#5fb35f" />
      {[0, 1, 2, 3, 4, 5].map((k) => <ellipse key={k} cx={k * 210 + 40} cy={1170} rx={140} ry={70} fill={k % 2 ? '#4f9f52' : '#56a95a'} />)}
      {[[90, 1120], [990, 1100]].map(([x, y], k) => (
        <g key={`t${k}`}>
          <rect x={x - 22} y={y} width={44} height={330} fill="#7a5a3a" stroke={OL} strokeWidth={5} />
          <circle cx={x} cy={y - 40} r={130} fill="#3f9a4f" stroke={OL} strokeWidth={6} />
          <circle cx={x - 60} cy={y + 10} r={80} fill="#4aa85a" stroke={OL} strokeWidth={5} />
        </g>
      ))}
      <rect x={0} y={1500} width={W} height={H - 1500} fill="#6cc26c" />
      <path d="M 380 1920 Q 520 1600 600 1500 L 720 1500 Q 760 1640 980 1920 Z" fill="#e8d9b0" />
      {/* the bench Nova tripped over (twice) */}
      <g transform="translate(870 1560)">
        <rect x={-190} y={-150} width={380} height={34} rx={8} fill="#c27a3a" stroke={OL} strokeWidth={5} />
        <rect x={-190} y={-100} width={380} height={34} rx={8} fill="#c27a3a" stroke={OL} strokeWidth={5} />
        <rect x={-200} y={-30} width={400} height={30} rx={8} fill="#a9652e" stroke={OL} strokeWidth={5} />
        {[-170, 170].map((x) => <rect key={x} x={x - 9} y={-150} width={18} height={250} fill="#3a4560" stroke={OL} strokeWidth={4} />)}
      </g>
    </g>
  );
  const bush = (
    <g transform="translate(200 1690)">
      {[[-110, -60, 80], [-40, -110, 95], [50, -90, 90], [110, -40, 70], [0, -30, 100]].map(([x, y, r], k) => (
        <circle key={k} cx={x} cy={y + (scene === 'park' && Math.abs(st - boltJump) < 0.5 ? Math.sin(st * 40 + k) * 6 : 0)} r={r} fill={k % 2 ? '#3f9a4f' : '#4aa85a'} stroke={OL} strokeWidth={6} />
      ))}
    </g>
  );
  const pigeons = scene === 'park' ? [[650, 1735], [715, 1752], [770, 1728]].map(([x, y], k) => {
    const fly = st >= LS[42] + 0.3 + k * 0.12 ? clamp01((st - LS[42] - 0.3 - k * 0.12) / 1.6) : 0;
    return <Pigeon key={k} x={x} y={y} s={1.1} t={st} k={k} fly={fly} />;
  }) : null;

  // ── characters
  const figure = (who: Who, k: number) => {
    const p = place(who);
    if (!p.vis) return null;
    let mood = rangeOf(MOODS[who], li, 'neutral' as Mood);
    if (who === 'BOLT' && scene === 'end' && st > faintT) mood = 'dead';
    if (who === 'DEX' && li === 14 && st >= fallT) mood = 'shock';
    if (who === 'DEX' && st >= bonkT && st < bonkT + 0.9 && scene === 'street') mood = 'dead';
    const sweat = who === 'DEX' && (mood === 'nervous' || (li >= 31 && li <= 42)) ? 1 : who === 'BOLT' && li >= 55 && li <= 57 ? 1 : 0;
    const [armL, armR] = poseOf(who);
    const blink = who === 'DEX' && scene === 'home' && st < wake ? 1 : who === 'DEX' && li === 1 ? 0.6 : blinkOf(k);
    const gaze = who === 'BOLT' && scene !== 'end' ? 0.7 : who === 'NOVA' && scene === 'park' && st < LS[28] - 0.5 ? 0.6 : who === 'DEX' && li === 21 ? 0.8 : 0;
    const shades = who === 'DEX' && scene === 'street' && st >= LS[17] - 0.25 && st < bonkT + 0.15;
    const crouch = crouchOf(p.legs);
    return (
      <g key={who}>
        <Figure who={who} x={p.x} y={p.y} s={p.s} rot={p.rot ?? 0} dim={p.dim ?? 0} mood={mood} talk={talkOf(who)} blink={blink} t={st} sweat={sweat}
          armL={armL} armR={armR} legs={p.legs} phase={st * 14} hold={who === 'DEX' && li === 40 ? 'phone' : null} gaze={gaze} />
        {shades ? (
          <g transform={`translate(${p.x} ${p.y}) rotate(${p.rot ?? 0}) scale(${p.s}) translate(0 ${-FEET + crouch})`}>
            <path d="M -54 -30 L 54 -30 L 50 -10 Q 30 2 10 -10 L 0 -18 L -10 -10 Q -30 2 -50 -10 Z" fill="#14141c" stroke={OL} strokeWidth={4} />
            <path d="M -40 -24 L -26 -24" stroke="#5a6a8a" strokeWidth={4} strokeLinecap="round" />
          </g>
        ) : null}
      </g>
    );
  };
  const badge = (who: string, dim = 0) => {
    const [bx, by] = badgeOf(who);
    const b = shownOf(who);
    const sz = who === 'DOG' ? (scene === 'street' || scene === 'end' ? 0.85 : 0.6) : 0.95;
    return <RizzBadge key={`b${who}`} x={bx} y={by} s={sz} shown={b.shown} t={st} frame={frame} delta={b.delta} deltaK={b.deltaK} popK={b.popK} dim={dim} font={heavy} />;
  };
  const showBadge = (who: Who) => place(who).vis && !(who === 'DEX' && scene === 'home' && st < wT(0, 'above') - 0.1);
  const dexBadgeIn = scene === 'home' ? pop(st, wT(0, 'above') - 0.1, 0.4) : 1;

  // ── gags
  const gags: React.ReactNode[] = [];
  if (li === 16 && st >= wT(16, 'sunglasses') - 0.1) {
    const [hx, hy] = handWorld('BOLT', 1);
    gags.push(
      <g key="shades" transform={`translate(${hx} ${hy - 30}) scale(${pop(st, wT(16, 'sunglasses') - 0.1) * 1.4})`}>
        <path d="M -54 -20 L 54 -20 L 50 0 Q 30 12 10 0 L 0 -8 L -10 0 Q -30 12 -50 0 Z" fill="#14141c" stroke={OL} strokeWidth={4} />
        <path d="M -40 -14 L -26 -14" stroke="#9fb0d0" strokeWidth={4} strokeLinecap="round" />
        <Spark x={60} y={-30} r={16 * (0.6 + 0.4 * Math.sin(st * 9))} col="#fff6c2" />
      </g>,
    );
  }
  if (scene === 'street' && st >= bonkT && st < LS[19]) {
    const [hx, hy] = headOf('DEX');
    gags.push(
      <g key="stars">
        {[0, 1, 2].map((j) => {
          const a = st * 5 + j * (Math.PI * 2 / 3);
          return <Spark key={j} x={hx + Math.cos(a) * 90} y={hy - 110 + Math.sin(a) * 24} r={20} />;
        })}
        {st < bonkT + 0.8 ? (
          <g transform={`translate(${hx + 80} ${hy - 40}) rotate(10) scale(${pop(st, bonkT, 0.3)})`} opacity={1 - clamp01((st - bonkT - 0.55) / 0.25)}>
            <path d={Array.from({length: 18}).map((_, j) => `${j ? 'L' : 'M'} ${Math.cos((j / 18) * Math.PI * 2) * (j % 2 ? 70 : 115)} ${Math.sin((j / 18) * Math.PI * 2) * (j % 2 ? 48 : 78)}`).join(' ') + ' Z'} fill="#ffd23f" stroke={OL} strokeWidth={6} />
            <text y={18} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={52} fill="#ff4f5e" stroke={OL} strokeWidth={3}>BONK</text>
          </g>
        ) : null}
      </g>,
    );
  }
  if (scene === 'street' && st >= fallT + 0.3 && st < fallT + 1.1) {
    gags.push(
      <g key="thud" transform={`translate(330 1600) rotate(-8) scale(${pop(st, fallT + 0.3, 0.3)})`} opacity={1 - clamp01((st - fallT - 0.85) / 0.25)}>
        <text textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={70} fill="#fff" stroke={OL} strokeWidth={8} paintOrder="stroke">THUD</text>
      </g>,
    );
  }
  if (li === 42) {
    const k = pop(st, LS[42]);
    gags.push(
      <g key="warn" transform={`translate(540 1470) rotate(-3) scale(${k})`}>
        <rect x={-380} y={-90} width={760} height={180} rx={20} fill="#ff4f5e" stroke={OL} strokeWidth={7} />
        <rect x={-360} y={-70} width={720} height={140} rx={14} fill="none" stroke="#ffd23f" strokeWidth={6} strokeDasharray="30 18" strokeDashoffset={-st * 80} />
        <text y={-10} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={58} fill="#fff">⚠ RIZZ CRITICAL</text>
        <text y={48} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={38} fill="#ffd23f">PLEASE LOOK AWAY</text>
      </g>,
    );
  }
  if (li === 50) {
    gags.push(
      <g key="calc" transform={`translate(540 1470) scale(${pop(st, LS[50])})`}>
        <rect x={-260} y={-50} width={520} height={100} rx={18} fill="#0e1424" stroke="#b98cff" strokeWidth={6} />
        <text y={16} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={44} fill="#b98cff">CALCULATING{'.'.repeat(1 + (Math.floor(st * 3) % 3))}</text>
      </g>,
    );
  }
  // fireworks + hearts for the yes
  const fx: React.ReactNode[] = [];
  if (scene === 'moment' && st >= yesT) {
    [[300, 760, 0, '#ffd23f'], [800, 680, 0.35, '#ff5d8f'], [540, 560, 0.7, '#3fd6c3'], [200, 520, 1.1, '#b98cff'], [880, 900, 1.5, '#ffd23f'], [420, 860, 1.9, '#ff7a3d']].forEach(([x, y, d, c], j) => {
      const t = st - yesT - (d as number);
      const tt = t % 2.4;
      if (t < 0 || tt > 1.3) return;
      const r = 40 + 190 * ease(clamp01(tt / 0.8));
      fx.push(
        <g key={`fw${j}`} transform={`translate(${x} ${y})`} opacity={1 - clamp01((tt - 0.7) / 0.6)}>
          {Array.from({length: 14}).map((_, q) => {
            const a = (q / 14) * Math.PI * 2;
            return <path key={q} d={`M ${Math.cos(a) * r * 0.55} ${Math.sin(a) * r * 0.55} L ${Math.cos(a) * r} ${Math.sin(a) * r}`} stroke={c as string} strokeWidth={10} strokeLinecap="round" />;
          })}
        </g>,
      );
    });
    Array.from({length: 12}).forEach((_, j) => {
      const t = st - yesT - j * 0.3;
      if (t < 0) return;
      fx.push(<Heart key={`h${j}`} x={100 + hash(j) * 880 + Math.sin(t * 2 + j) * 30} y={1450 - ((t * 120) % 900)} s={0.8 + hash(j + 4) * 1.2} op={0.75} />);
    });
  }
  const confetti = scene === 'moment' && st >= yesT ? Array.from({length: 46}).map((_, j) => {
    const t = st - yesT;
    const x = hash(j) * W + Math.sin(t * 3 + j) * 40;
    const y = -40 + ((t * (260 + hash(j + 9) * 260) + hash(j + 3) * 300) % 1900);
    return <rect key={`c${j}`} x={x} y={y} width={18} height={30} rx={4} fill={['#ffd23f', '#ff5d8f', '#3fd6c3', '#b98cff', '#ff7a3d'][j % 5]} transform={`rotate(${t * 200 + j * 40} ${x + 9} ${y + 15})`} />;
  }) : null;
  const boom = scene === 'end' && st >= nineT && st < nineT + 1.2 ? (() => {
    const [bx, by] = badgeOf('BOLT');
    const k = pop(st, nineT, 0.3);
    return (
      <g transform={`translate(${bx} ${by}) scale(${k})`} opacity={1 - clamp01((st - nineT - 0.8) / 0.4)}>
        <path d={Array.from({length: 22}).map((_, j) => `${j ? 'L' : 'M'} ${Math.cos((j / 22) * Math.PI * 2) * (j % 2 ? 110 : 190)} ${Math.sin((j / 22) * Math.PI * 2) * (j % 2 ? 90 : 150)}`).join(' ') + ' Z'} fill="#ff7a3d" stroke={OL} strokeWidth={7} />
        <text y={26} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={80} fill="#ffd23f" stroke={OL} strokeWidth={5}>BOOM</text>
      </g>
    );
  })() : null;
  const shadow = (who: Who) => {
    const p = place(who);
    if (!p.vis || Math.abs(p.rot ?? 0) > 30) return null;
    return <ellipse key={`sh${who}`} cx={p.x} cy={FY + 8} rx={95 * p.s * (p.y < FY - 5 ? 0.7 : 1)} ry={16} fill="#000" opacity={0.22} />;
  };
  const dogEl = dog.vis ? <Dog x={dog.x} y={dog.y} s={dog.s} face={dog.face} pose={dog.pose} t={st} shades={dog.shades} /> : null;

  // ── stage
  const stage = (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      {scene === 'home' ? homeBg : scene === 'street' ? streetBg : parkBg}
      {scene === 'home' ? (
        <g>
          {bedBack}
          {shadow('BOLT')}
          {figure('DEX', 0)}
          {bedFront}
          {figure('BOLT', 1)}
          {showBadge('DEX') ? <g transform={`translate(${badgeOf('DEX')[0]} ${badgeOf('DEX')[1]}) scale(${dexBadgeIn}) translate(${-badgeOf('DEX')[0]} ${-badgeOf('DEX')[1]})`}>{badge('DEX')}</g> : null}
          {showBadge('BOLT') ? badge('BOLT') : null}
        </g>
      ) : scene === 'street' ? (
        <g>
          {streetProps}
          {shadow('BOLT')}{shadow('DEX')}
          {figure('BOLT', 1)}
          {figure('DEX', 0)}
          {dogEl}
          {badge('BOLT')}{badge('DEX')}
          {dog.vis ? badge('DOG') : null}
        </g>
      ) : scene === 'end' ? (
        <g>
          {shadow('BOLT')}{shadow('DEX')}{shadow('NOVA')}
          {figure('DEX', 0)}{figure('NOVA', 2)}
          {dogEl}
          {figure('BOLT', 1)}
          {badge('DEX')}{badge('NOVA')}{badge('BOLT')}
          {dog.vis ? badge('DOG') : null}
          {boom}
        </g>
      ) : (
        <g>
          {fx}
          {dogEl}
          {dog.vis ? badge('DOG') : null}
          {shadow('NOVA')}{shadow('DEX')}
          {figure('NOVA', 2)}
          {figure('BOLT', 1)}
          {figure('DEX', 0)}
          {bush}
          {pigeons}
          {badge('NOVA')}{badge('DEX')}
          {badge('BOLT', place('BOLT').dim ?? 0)}
        </g>
      )}
      {gags}
      {confetti}
    </svg>
  );

  // ── overlays
  const tint = scene === 'moment' ? inK(st, LS[49] - 0.3, 0.8) * (st >= yesT ? 1 - inK(st, yesT, 0.6) * 0.5 : 1) : 0;
  const alarm = li === 42 || (li === 41 && st >= wT(41, 'forty')) ? 0.5 + 0.5 * Math.sin(st * 10) : 0;
  const wipeAt = cuts.find((c) => c !== LS[49] && st >= c - 0.35 && st < c + 0.35);
  const wipeK = wipeAt !== undefined ? (st - wipeAt + 0.35) / 0.7 : -1;

  // ── captions (same reading UI as Buffering)
  const readAhead = mode !== 'clean';
  const shownLine = (() => {
    if (st < LS[0] - 0.6) return -1;
    if (!readAhead) return st >= LS[li] - 0.12 && st < LE[li] + 0.6 ? li : -1;
    return li + 1 < N && st >= LE[li] + 0.25 ? li + 1 : li;
  })();
  const capBox = (i: number) => {
    const ln = ep.lines[i];
    const col = COL[ln.speaker];
    const live = st >= LS[i];
    const t = st - LS[i];
    const ws = words(i);
    const said = live ? ws.filter((w) => t >= w.start).length : 0;
    const disp = ln.text.split(' ');
    const lit = Math.round((said / ws.length) * disp.length);
    const len = ln.text.length;
    let fs = 64;
    while (fs > 34) {
      const per = Math.floor(840 / (fs * 0.6));
      const rows = Math.ceil(len / per) + (len > per ? 0.4 : 0);
      if (rows * fs * 1.18 <= 200) break;
      fs -= 2;
    }
    const tag = TAGS[ln.style];
    const ready = !live ? clamp01(1 - (LS[i] - st) / 0.8) : 1;
    return (
      <div style={{position: 'absolute', left: 100, top: 240, width: 880, minHeight: 230, boxSizing: 'border-box', padding: '20px 22px 18px', borderRadius: 22,
        background: 'rgba(8,12,24,0.88)', border: `5px solid ${live ? col : '#3a4560'}`, boxShadow: live ? `0 0 28px ${col}55` : 'none'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10}}>
          <div style={{background: col, color: OL, fontFamily: heavy, fontWeight: 900, fontSize: 32, padding: '4px 16px', borderRadius: 10, letterSpacing: 2,
            opacity: live ? 1 : 0.55 + 0.45 * ready}}>{NAME[ln.speaker]}</div>
          {tag ? <div style={{color: col, fontFamily: heavy, fontWeight: 800, fontSize: 24, letterSpacing: 2}}>({tag})</div> : null}
          {readAhead && !live ? (
            <div style={{marginLeft: 'auto', width: 120, height: 12, borderRadius: 6, background: '#24324a', overflow: 'hidden'}}>
              <div style={{width: `${ready * 100}%`, height: '100%', background: col}} />
            </div>
          ) : null}
          {(mode === 'dub' || mode === 'guide') && live && t < ws[ws.length - 1].end ? <div style={{marginLeft: 'auto', fontFamily: heavy, fontWeight: 900, fontSize: 24, color: '#ff4f5e', letterSpacing: 2}}>● GO</div> : null}
        </div>
        <div style={{fontFamily: heavy, fontWeight: 800, fontSize: fs, lineHeight: 1.16, color: '#fff'}}>
          {disp.map((w, j) => <span key={j} style={{color: j < lit ? '#ffffff' : mode === 'clean' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)'}}>{w}{j < disp.length - 1 ? ' ' : ''}</span>)}
        </div>
      </div>
    );
  };

  // ── intro + outro cards
  const introK = s < INTRO ? 1 - inK(s, INTRO - 0.5, 0.45) : 0;
  const total = INTRO + plan.end + ep.outro;
  const outroK = s >= total - ep.outro + 0.6 ? inK(s, total - ep.outro + 0.6, 0.5) : 0;
  const titleCard = (k: number, title: string, sub: string, extra?: React.ReactNode) => (
    <div style={{position: 'absolute', inset: 0, background: `rgba(8,10,24,${0.92 * k})`, opacity: k, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <svg width={300} height={190} style={{marginBottom: 10, overflow: 'visible'}}>
        <RizzBadge x={150} y={100} s={1.25} shown={s < 1.6 ? 'roll' : 100} t={s} frame={frame} popK={s >= 1.6 && s < 1.95 ? Math.sin(((s - 1.6) / 0.35) * Math.PI) : 0} font={heavy} />
      </svg>
      <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 150, color: '#fff', letterSpacing: 4, WebkitTextStroke: '6px #111', paintOrder: 'stroke fill', textShadow: '0 0 40px #ffd23f', textAlign: 'center', lineHeight: 1}}>{title}</div>
      <div style={{fontFamily: heavy, fontWeight: 800, fontSize: 40, color: '#ffd23f', letterSpacing: 6, marginTop: 14}}>{sub}</div>
      {extra}
    </div>
  );
  const castRow = (
    <div style={{display: 'flex', gap: 14, marginTop: 50, flexWrap: 'wrap', justifyContent: 'center', width: 900}}>
      {(['DEX', 'BOLT', 'NOVA', 'SYS'] as const).map((k) => (
        <div key={k} style={{background: COL[k], color: OL, fontFamily: heavy, fontWeight: 900, fontSize: 30, padding: '6px 18px', borderRadius: 10}}>{NAME[k]}</div>
      ))}
      {mode !== 'clean' ? <div style={{width: '100%', textAlign: 'center', fontFamily: heavy, fontWeight: 700, fontSize: 28, color: '#c9d3df', marginTop: 10}}>METER = anyone, in a smooth game-show voice</div> : null}
    </div>
  );

  // ── audio
  const sfx: Array<[number, string, number]> = [
    [0.1, 'sfx/whoosh.wav', 0.5], [0.5, 'sfx/shine.wav', 0.4], [1.6, 'sfx/ding.wav', 0.5], [INTRO - 0.6, 'sfx/bell.wav', 0.5],
    [wT(0, 'above') - 0.1, 'sfx/pop.wav', 0.6], [wake, 'sfx/whoosh.wav', 0.4], [wT(2, 'four'), 'sfx/tick.wav', 0.6],
    [wT(4, 'three'), 'sfx/fail.wav', 0.5], [LS[3], 'sfx/scratch.wav', 0.35], [LS[6] - 0.9, 'sfx/whoosh.wav', 0.6],
    [wT(8, 'eighty'), 'sfx/shine.wav', 0.5], [wT(11, 'eighty'), 'sfx/ding.wav', 0.6], [wT(11, 'eighty'), 'sfx/coins.wav', 0.3],
    ...cuts.filter((c) => c !== LS[49]).map((c) => [c - 0.35, 'sfx/whoosh.wav', 0.6] as [number, string, number]),
    [fallT, 'sfx/crack.wav', 0.5], [fallT + 0.35, 'sfx/slam.wav', 0.7], [wT(15, 'two'), 'sfx/fail.wav', 0.45],
    [wT(16, 'sunglasses') - 0.1, 'sfx/shine.wav', 0.6], [bonkT, 'sfx/clank.wav', 0.9], [bonkT, 'sfx/punch.wav', 0.5], [wT(18, 'zero'), 'sfx/fail.wav', 0.5],
    [dogIn + 0.6, 'sfx/shine.wav', 0.5], [wT(21, 'ninety'), 'sfx/ding.wav', 0.6], [LS[22], 'sfx/scratch.wav', 0.4],
    [wT(31, 'three'), 'sfx/fail.wav', 0.6], [wT(31, 'three'), 'sfx/zap.wav', 0.4], [wT(36, 'ten'), 'sfx/overload.wav', 0.4], [wT(36, 'ten'), 'sfx/fail.wav', 0.4],
    [LS[40] + 0.1, 'sfx/tick.wav', 0.4], [wT(41, 'forty'), 'sfx/overload.wav', 0.6], [wT(41, 'forty'), 'sfx/boom.wav', 0.35],
    [LS[42] + 0.3, 'sfx/whoosh.wav', 0.5], [LS[44], 'sfx/tick.wav', 0.5], [LS[43] + 0.3, 'sfx/fail.wav', 0.25],
    [boltJump, 'sfx/pop.wav', 0.7], [LS[49] - 0.4, 'sfx/shine.wav', 0.4],
    [LS[50], 'sfx/printer.wav', 0.35], ...[0, 1, 2, 3, 4, 5].map((j) => [LS[50] + 0.2 + j * 0.3, 'sfx/tick.wav', 0.4] as [number, string, number]),
    [wT(51, 'yes') + 0.25, 'sfx/ding.wav', 0.5], [yesT, 'sfx/powerup.wav', 0.5], [yesT, 'sfx/shine.wav', 0.6], [yesT + 0.1, 'sfx/boom.wav', 0.3], [yesT + 0.8, 'sfx/boom.wav', 0.2],
    [LS[56] + 0.2, 'sfx/powerdown.wav', 0.5], [nineT, 'sfx/boom.wav', 0.8], [nineT, 'sfx/overload.wav', 0.4], [faintT + 0.45, 'sfx/slam.wav', 0.7],
    [dogEnd + 0.8, 'sfx/shine.wav', 0.6], [wT(59, 'hundred'), 'sfx/ding.wav', 0.6], [wT(59, 'hundred') + 0.1, 'sfx/bell.wav', 0.5],
  ];

  return (
    <AbsoluteFill style={{background: '#0b0f1e', overflow: 'hidden'}}>
      <div style={camStyle}>{stage}</div>
      {tint > 0 ? <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 60% 55%, rgba(255,93,143,${0.16 * tint}) 0%, rgba(40,0,30,${0.5 * tint}) 85%)`}} /> : null}
      {alarm > 0 ? <div style={{position: 'absolute', inset: 0, boxShadow: `inset 0 0 ${160 + 120 * alarm}px rgba(255,40,60,${0.55 * alarm})`, background: `rgba(255,40,60,${0.1 * alarm})`}} /> : null}
      {wipeK >= 0 ? (
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          {[0, 1, 2].map((j) => {
            const x = lerp(-1700, 1500, ease(clamp01(wipeK * 1.1 - j * 0.05)));
            return <rect key={j} x={x + j * 160} y={-200} width={900} height={2400} fill={['#ffd23f', '#3fd6c3', '#ff7a3d'][j]} transform="skewX(-18)" />;
          })}
        </svg>
      ) : null}
      {shownLine >= 0 && introK < 0.5 && outroK < 0.5 ? capBox(shownLine) : null}
      {introK > 0 ? titleCard(introK, 'RIZZ METER', 'A RIZZVILLE STORY', castRow) : null}
      {outroK > 0 ? titleCard(outroK, 'THE END', 'RIZZ: 100') : null}

      <Audio src={staticFile(`music/${ep.id}.wav`)} volume={mode === 'guide' ? 0.3 : 0.34} />
      {mode === 'guide' ? timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round((INTRO + LS[i]) * fps)}><Audio src={staticFile(ln.file)} /></Sequence>
      )) : null}
      {sfx.map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round((INTRO + t) * fps))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const rizzFrames = (ep: RizzEpisode, t: Timing) => Math.ceil((ep.intro + buildPlan(ep, t).end + ep.outro) * 30);
