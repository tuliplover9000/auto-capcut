import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import type {Timing} from '../fight/timeline';
import {buildPlan, lineAt, type SLine, type StoryEpisode} from '../story/timeline';
import {Arm, armGeom, COL, FEET, Figure, Heart, Legs, Mood, OL, Orb, Screen, Toaster, Who} from './art';

// BUFFERING / CARGANDO: a fully animated 3-friend skit (Dex, Bolt, Nova + the
// SYSTEM voice) that friends voice by READING THE CAPTIONS as it plays. A
// guide TTS sets every line's timing; the caption panel shows whose line is
// next (with a fill bar) as soon as the previous line ends, then lights the
// words at the pace to say them.
//   mode 'tiktok' - the post: speaker captions with read-ahead, no prompter UI
//   mode 'dub'    - + UP NEXT prompter        'clean' - captions only, no read-ahead
//   mode 'guide'  - + UP NEXT + the AI guide voices
// Gags are keyed to LINE INDICES, so every language version keeps the same 73 lines.
export type BLine = SLine & {speaker: 'DEX' | 'BOLT' | 'NOVA' | 'SYS'; style: string};
export type BufferEpisode = StoryEpisode & {lang?: 'en' | 'es'; intro: number; outro: number; lines: BLine[]};
export type BufferMode = 'tiktok' | 'dub' | 'clean' | 'guide';

const heavy = loadMontserrat('normal', {weights: ['700', '800', '900'], subsets: ['latin', 'latin-ext']}).fontFamily;
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
const norm = (w: string) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9']/g, '');

const STR = {
  en: {title: 'BUFFERING', sub: 'A TECHTOPIA STORY', end: 'THE END', sys: 'SYSTEM', sysNote: 'SYSTEM = anyone, in a robot voice', sign: 'CHARGING STATION',
    tags: {robot: 'ROBOT VOICE', slow: 'ROBOT · SLOWING DOWN', ad: 'TV-AD VOICE', whisper: 'WHISPER', quiet: 'QUIETLY'} as Record<string, string>,
    installing: 'INSTALLING RIZZ.EXE', installed: 'RIZZ.EXE INSTALLED', review: '— review by: THE GUY', tc: 'TERMS & CONDITIONS', accept: 'ACCEPT', accepted: 'ACCEPTED',
    sponsored: 'SPONSORED', less: 'LESS AWKWARD', smack: 'SMACK!', code: 'ENTER 6-DIGIT CODE', trial: 'FREE TRIAL ENDED', charged: 'CHARGED TO: BOLT', next: 'UP NEXT', go: 'GO',
    cues: {critical: 'critical', item: 'this', less: 'less', charging: 'charging', bolt: 'bolt'}},
  es: {title: 'CARGANDO', sub: 'UNA HISTORIA DE TECNOTOPÍA', end: 'FIN', sys: 'SISTEMA', sysNote: 'SISTEMA = cualquiera, con voz de robot', sign: 'ESTACIÓN DE CARGA',
    tags: {robot: 'VOZ DE ROBOT', slow: 'ROBOT · APAGÁNDOSE', ad: 'VOZ DE COMERCIAL', whisper: 'SUSURRANDO', quiet: 'BAJITO'} as Record<string, string>,
    installing: 'INSTALANDO RIZZ.EXE', installed: 'RIZZ.EXE INSTALADO', review: '— reseña de: EL TIPO', tc: 'TÉRMINOS Y CONDICIONES', accept: 'ACEPTAR', accepted: 'ACEPTADO',
    sponsored: 'PATROCINADO', less: 'MENOS INCÓMODO', smack: '¡ZAS!', code: 'INGRESA EL CÓDIGO', trial: 'PRUEBA GRATIS TERMINADA', charged: 'COBRADO A: BOLT', next: 'SIGUE', go: 'YA',
    cues: {critical: 'critico', item: 'esto', less: 'menos', charging: 'cobrando', bolt: 'bolt'}},
};
const ES_SCREEN: Record<string, string> = {'NOVA?': '¿NOVA?', PANIC: 'PÁNICO', 'CRITICAL ERROR': 'ERROR CRÍTICO', SUS: 'MMM...', NERVOUS: 'NERVIOS', HELP: 'AYUDA', SHUTDOWN: 'APAGANDO',
  REBOOTED: 'REINICIADO', 'T&C': 'T Y C', SPONSORED: 'PATROCINADO', STATIC: 'ESTÁTICA', FIXED: 'ARREGLADO', OFFLINE: 'SIN RED', NOPE: 'NEL', WINGMAN: 'CUPIDO',
  OOPS: 'UPS', 'I GOT THIS': 'YO PUEDO', GENIUS: 'GENIO', SHH: 'SHHH', BUFFERING: 'CARGANDO', YES: 'SÍ', LOL: 'JAJA', COFFEE: 'CAFÉ', INSTALLING: 'INSTALANDO'};

// mood + pose ranges: [fromLine, toLine, value]
type MR = Array<[number, number, Mood]>;
const MOODS: Record<Who, MR> = {
  DEX: [[0, 0, 'neutral'], [1, 4, 'shock'], [5, 11, 'neutral'], [12, 12, 'nervous'], [13, 13, 'shock'], [14, 21, 'smug'], [22, 30, 'nervous'], [31, 31, 'robot'],
    [32, 33, 'nervous'], [34, 34, 'robot'], [35, 39, 'shock'], [40, 40, 'robot'], [41, 41, 'neutral'], [42, 44, 'nervous'], [45, 45, 'shock'], [46, 49, 'ad'],
    [50, 50, 'hurt'], [51, 52, 'shock'], [53, 53, 'happy'], [54, 55, 'nervous'], [56, 56, 'shock'], [57, 57, 'love'], [58, 58, 'happy'], [59, 59, 'nervous'],
    [60, 61, 'love'], [62, 62, 'shock'], [63, 66, 'love'], [67, 68, 'smug'], [69, 72, 'happy']],
  BOLT: [[0, 13, 'happy'], [14, 20, 'smug'], [21, 21, 'nervous'], [22, 27, 'smug'], [28, 36, 'happy'], [37, 39, 'smug'], [40, 48, 'shock'], [49, 53, 'smug'],
    [54, 57, 'neutral'], [58, 58, 'shock'], [59, 66, 'happy'], [67, 68, 'smug'], [69, 72, 'shock']],
  NOVA: [[0, 29, 'neutral'], [30, 35, 'smug'], [36, 45, 'shock'], [46, 53, 'happy'], [54, 54, 'shock'], [55, 55, 'smug'], [56, 59, 'happy'], [60, 72, 'happy']],
};
type PR = Array<[number, number, string]>;
const POSES: Record<Who, PR> = {
  DEX: [[0, 0, 'stretch'], [1, 2, 'idle'], [3, 4, 'panic'], [5, 7, 'idle'], [8, 8, 'shrug'], [9, 9, 'idle'], [10, 10, 'pointR'], [11, 11, 'idle'], [12, 12, 'facepalm'],
    [13, 13, 'idle'], [14, 20, 'cross'], [21, 21, 'facepalm'], [22, 27, 'idle'], [28, 28, 'wave'], [29, 30, 'rub'], [31, 31, 'robot'], [32, 33, 'shrug'], [34, 34, 'robot'],
    [35, 35, 'facepalm'], [36, 39, 'panic'], [40, 40, 'robot'], [41, 41, 'idle'], [42, 43, 'tap'], [44, 44, 'idle'], [45, 45, 'panic'], [46, 49, 'jazz'], [50, 50, 'cheekL'],
    [51, 53, 'idle'], [54, 54, 'rub'], [55, 58, 'idle'], [59, 59, 'rub'], [60, 61, 'fist'], [62, 62, 'shrug'], [63, 63, 'idle'], [64, 66, 'phone'], [67, 68, 'cross'], [69, 72, 'laugh']],
  BOLT: [[0, 4, 'idle'], [5, 5, 'wave'], [6, 12, 'idle'], [13, 20, 'hold'], [21, 21, 'shrug'], [22, 22, 'pointR'], [23, 23, 'idle'], [24, 24, 'pointR'], [25, 26, 'idle'],
    [27, 27, 'pointR'], [28, 36, 'idle'], [37, 39, 'shrug'], [40, 48, 'facepalm'], [49, 49, 'idle'], [50, 50, 'idle'], [51, 52, 'cross'], [53, 53, 'fist'], [54, 57, 'idle'],
    [58, 58, 'fists'], [59, 66, 'idle'], [67, 68, 'cross'], [69, 69, 'idle'], [70, 70, 'panic'], [71, 71, 'facepalm'], [72, 72, 'panic']],
  NOVA: [[0, 28, 'idle'], [29, 29, 'wave'], [30, 34, 'hip'], [35, 35, 'pointL'], [36, 45, 'cheeks'], [46, 53, 'laugh'], [54, 54, 'cheekR'], [55, 55, 'forehead'],
    [56, 59, 'hip'], [60, 60, 'clasp'], [61, 66, 'idle'], [67, 72, 'laugh']],
};
const rangeOf = <T,>(r: Array<[number, number, T]>, li: number, d: T): T => r.find(([a, b]) => li >= a && li <= b)?.[2] ?? d;
const armsFor = (pose: string, t: number): [Arm, Arm] => {
  const sw = Math.sin(t * 1.6) * 3;
  switch (pose) {
    case 'talk': return [[10, 8], [30 + 14 * Math.sin(t * 5), 70 + 30 * Math.sin(t * 7)]];
    case 'pointR': return [[8, 6], [92, 0]];
    case 'pointL': return [[92, 0], [8, 6]];
    case 'panic': return [[160 + 10 * Math.sin(t * 14), 25], [160 + 10 * Math.sin(t * 14 + 1), 25]];
    case 'shrug': return [[50, 95], [50, 95]];
    case 'hold': return [[10, 8], [160, 15]];
    case 'facepalm': return [[10, 8], [150, 120]];
    case 'cheekL': return [[150, 120], [10, 8]];
    case 'cheekR': return [[10, 8], [150, 120]];
    case 'cheeks': return [[150, 120], [150, 120]];
    case 'wave': return [[10, 8], [150, 10 + 30 * Math.sin(t * 10)]];
    case 'robot': {
      const j = Math.sign(Math.sin(t * 5)) * 8;
      return [[85 + j, 5], [85 - j, 5]];
    }
    case 'slump': return [[2, 0], [2, 0]];
    case 'fist': return [[10, 8], [172, 0]];
    case 'fists': return [[165, 10], [165, 10]];
    case 'stretch': return [[170, 10], [170, 10]];
    case 'cross': return [[20, 250], [20, 250]];
    case 'jazz': return [[120, 30 + 25 * Math.sin(t * 12)], [120, 30 + 25 * Math.sin(t * 12 + 1.5)]];
    case 'rub': return [[22, 235 + 15 * Math.sin(t * 9)], [22, 235 + 15 * Math.sin(t * 9 + 2)]];
    case 'laugh': return [[25, 215 + 8 * Math.sin(t * 16)], [25, 215 + 8 * Math.sin(t * 16 + 1)]];
    case 'phone': return [[22, 240], [30, 230]];
    case 'hip': return [[40, 290], [8 + sw, 6]];
    case 'forehead': return [[10, 8], [170, 47]];
    case 'clasp': return [[30, 245], [30, 245]];
    case 'tap': return [[8, 6], [80, 10 + 15 * Math.sin(t * 20)]];
    default: return [[8 + sw, 6], [8 - sw, 6]];
  }
};

export const Buffering: React.FC<{episode: BufferEpisode; timing: Timing; mode: BufferMode}> = ({episode: ep, timing, mode}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const S = STR[ep.lang ?? 'en'];
  const es = ep.lang === 'es';
  const scr = (x: string) => (es ? ES_SCREEN[x] ?? x : x);
  const NAME: Record<string, string> = {DEX: 'DEX', BOLT: 'BOLT', NOVA: 'NOVA', SYS: S.sys};
  const INTRO = ep.intro;
  const plan = buildPlan(ep, timing);
  const LS = plan.lineStarts;
  const LE = plan.lineEnds;
  const N = ep.lines.length;
  const st = s - INTRO; // story time
  const li = lineAt(plan, st);
  const words = (i: number) => timing.lines[i].words;
  const wT = (i: number, w: string) => {
    const hit = words(i).find((x) => norm(x.text) === norm(w));
    return LS[i] + (hit ?? words(i)[0]).start;
  };
  const cuts = plan.cuts.map((c) => c.t);
  const scene = ep.lines[li].scene;

  // mouth flap for whoever owns the line being spoken
  const talkOf = (spk: string) => {
    if (st < LS[li] || ep.lines[li].speaker !== spk) return 0;
    const t = st - LS[li];
    const on = words(li).some((w) => t >= w.start - 0.02 && t <= w.end + 0.03);
    return on ? 0.45 + 0.55 * Math.abs(Math.sin(t * 21)) : 0;
  };
  const blinkOf = (k: number) => ((st * 0.55 + k * 0.37) % 1 < 0.05 ? 1 : 0);

  // ── character placement (x, FEET y, scale, legs)
  type P = {x: number; y: number; s: number; vis: boolean; dim?: number; rot?: number; legs?: Legs};
  const FY = 1665;
  const smackT = LS[50] - 0.85;
  const placeAt = (who: Who, t: number): P => {
    const l = lineAt(plan, t);
    const sc = ep.lines[l].scene;
    if (sc === 'home') {
      const enter = LS[5] - 0.9;
      if (who === 'DEX') return {x: t < enter ? 440 : lerp(440, 300, inK(t, enter, 0.6)), y: FY + hop(t, LS[4], 0.35, 40), s: 1.1, vis: true};
      if (who === 'BOLT') return {x: lerp(1400, 650, clamp01((t - enter) / 0.8)), y: FY + hop(t, LS[13] - 0.1, 0.4, 50), s: 1.1, vis: t >= enter};
      return {x: 0, y: 0, s: 1, vis: false};
    }
    if (sc === 'end') {
      const xs: Record<Who, number> = {BOLT: 240, DEX: 545, NOVA: 850};
      // Bolt faints at the very end: tips over and lands flat across the front of the frame
      const fk = who === 'BOLT' ? inK(t, LE[72] + 0.3, 0.45) : 0;
      return {x: lerp(xs[who], 850, fk), y: FY + (who === 'DEX' ? hop(t, LS[68], 0.3, 20) : 0) + 150 * fk, s: 1.05, vis: true, rot: -88 * fk};
    }
    // cafe + moment
    const walk = LS[28] - 1.1;
    if (who === 'NOVA') return {x: 790, y: FY + (l >= 46 && l <= 48 ? Math.abs(Math.sin(t * 9)) * -10 : 0), s: 1.1, vis: true};
    if (who === 'DEX') {
      const k = clamp01((t - walk) / 1.0);
      const knock = t >= smackT ? 16 * Math.exp(-(t - smackT) * 4) * Math.sin((t - smackT) * 26) : 0;
      const slump = l === 40 ? 10 * inK(t, LE[40] - 0.7, 0.5) : l === 41 ? 10 * (1 - inK(t, LS[41] - 0.2, 0.3)) : 0;
      const jump = hop(t, LS[60] + 0.35, 0.5, 120);
      return {x: lerp(390, 540, ease(k)), y: FY + jump, s: 1.1, vis: true, rot: knock + slump, legs: t < walk ? 'crouch' : jump < 0 ? 'tuck' : undefined};
    }
    // BOLT: crouched behind the plant; runs in to fix Dex (49-53); back behind the plant; jumps up at 58
    if (sc === 'moment') {
      const back = clamp01((t - (LS[54] - 1.3)) / 0.8);
      const jump = hop(t, LS[58] - 0.1, 0.55, 170);
      const standing = t >= LS[58] - 0.1;
      return {x: lerp(330, 160, back), y: FY + jump, s: 1.1, vis: true, dim: standing ? 0 : 0.25, legs: back < 1 ? undefined : jump < 0 ? 'tuck' : standing ? undefined : 'crouch'};
    }
    const run = clamp01((t - (LS[49] - 0.5)) / 0.6);
    const lunge = t >= smackT - 0.15 && t < smackT + 0.3 ? Math.sin(Math.PI * clamp01((t - smackT + 0.15) / 0.45)) * 70 : 0;
    if (run > 0) return {x: lerp(160, 330, run) + lunge, y: FY, s: 1.1, vis: true};
    return {x: 160, y: FY, s: 1.1, vis: true, legs: 'crouch'};
  };
  const place = (who: Who) => {
    const p = placeAt(who, st);
    const q = placeAt(who, st - 1 / 30);
    const walking = p.legs === undefined && Math.abs(p.x - q.x) > 0.8;
    return {...p, legs: p.legs ?? (walking ? ('walk' as Legs) : ('stand' as Legs))};
  };
  const crouchOf = (l: Legs) => (l === 'crouch' ? 70 : l === 'tuck' ? 40 : 0);
  const headOf = (who: string): [number, number] => {
    if (who === 'SYS') return scene === 'home' && li === 9 ? [960, 1280] : [880, 720];
    const p = place(who as Who);
    return [p.x, p.y - (FEET - crouchOf(p.legs) + 26) * p.s];
  };
  const poseOf = (who: Who): [Arm, Arm] => {
    let pose = rangeOf(POSES[who], li, 'idle');
    const speaking = ep.lines[li].speaker === who && st >= LS[li];
    if (pose === 'idle' && speaking && talkOf(who) > 0) pose = 'talk';
    if (who === 'DEX' && li === 40 && st > LE[40] - 0.7) pose = 'slump';
    if (who === 'BOLT' && li >= 49 && li <= 50 && st >= smackT - 0.45 && st < smackT + 0.35) return st < smackT - 0.05 ? [[8, 6], [175, 10]] : [[8, 6], [75, 0]];
    if (who === 'BOLT' && scene === 'end' && st > LE[72] + 0.3) pose = 'slump';
    return armsFor(pose, st + (who === 'BOLT' ? 0.7 : who === 'NOVA' ? 1.4 : 0));
  };
  const handWorld = (who: Who, side: -1 | 1): [number, number] => {
    const p = place(who);
    const [aL, aR] = poseOf(who);
    const g = armGeom(side, side < 0 ? aL : aR);
    return [p.x + g.ha[0] * p.s, p.y + (g.ha[1] - FEET + crouchOf(p.legs)) * p.s];
  };

  // ── forehead screens
  const spin = st * 1.6;
  const screenOf = (who: Who): Screen => {
    const T = (text: string, col: string, extra: Partial<Screen> = {}): Screen => ({text: scr(text), col, ...extra});
    if (who === 'DEX') {
      if (li === 0) return T('ZZZ', '#8aa0c0');
      if (li <= 2) return T('NOVA?', '#ff5d8f');
      if (li <= 4) return T('PANIC', '#ff4f5e', {flash: true});
      if (li === 12) return T('CRITICAL ERROR', '#ff4f5e', {flash: true});
      if (li <= 21) return T(li >= 14 ? 'SUS' : 'OK', '#3fd6c3');
      if (li <= 25) return T('NERVOUS', '#ffd23f');
      if (li <= 30) {
        const k = clamp01((st - LS[26]) / (LE[30] - LS[26]));
        return {text: `${scr('INSTALLING')} ${Math.floor(k * 99)}%`, col: '#b98cff', bar: k};
      }
      if (li === 31 || li === 34) return T('RIZZ.EXE', '#ff5df2', {flash: true});
      if (li <= 39) return T(li >= 35 ? 'HELP' : 'ERROR', '#ff4f5e');
      if (li === 40) return T('SHUTDOWN', '#ff4f5e', {bar: 1 - clamp01((st - LS[40]) / (LE[40] - LS[40]))});
      if (li === 41) return T('REBOOTED', '#6fe3ff', {spin});
      if (li <= 44) return T('T&C', '#ffd23f');
      if (li === 45) return T('!!!', '#ff4f5e', {flash: true});
      if (li <= 49) return T('SPONSORED', '#ffd23f');
      if (li <= 53) return st < LS[51] ? T('STATIC', '#aaaaaa', {flash: true}) : T('FIXED', '#5fd068');
      if (li <= 56) return T(li === 54 ? 'OFFLINE' : '...', '#3fd6c3');
      if (li <= 66) return {heart: true, text: li >= 64 ? 'NOVA' : '', col: '#ff5d8f'};
      if (li <= 68) return T('NOPE', '#ffd23f');
      return {heart: true, col: '#ff5d8f'};
    }
    if (who === 'BOLT') {
      if (li <= 20) return T('COOL', '#ffb02e');
      if (li === 21) return T('...', '#ffb02e');
      if (li <= 39) return T('WINGMAN', '#ffb02e');
      if (li <= 48) return T('OOPS', '#ff4f5e', {flash: true});
      if (li <= 53) return T(li >= 51 ? 'GENIUS' : 'I GOT THIS', '#ffb02e');
      if (li <= 57) return T('SHH', '#8aa0c0');
      if (li <= 66) return T('!!!', '#ffb02e');
      if (li <= 68) return T('GENIUS', '#ffb02e');
      return T('-$400', '#ff4f5e', {flash: li === 69 && st >= wT(69, S.cues.bolt)});
    }
    // NOVA: she has been buffering at Dex all along (the little spinner)
    if (li >= 55 && li <= 59) return T('BUFFERING', '#b98cff', {spin});
    if (li >= 60) return {heart: true, text: scr('YES'), col: '#ff5d8f'};
    if (li >= 46 && li <= 48) return T('LOL', '#b98cff');
    return st >= LS[28] - 1 ? {spin, col: '#b98cff'} : T('COFFEE', '#b98cff');
  };

  // ── camera: gentle push toward each speaker, big push-ins on the gags
  type Cam = {x: number; y: number; z: number};
  const WIDE: Cam = {x: 540, y: 1180, z: 1};
  const camFor = (i: number): Cam => {
    const spk = ep.lines[i].speaker;
    const [hx, hy] = headOf(spk);
    if (i === 12) return {x: hx, y: hy - 60, z: 1.5};
    if (i === 56) {
      const p = place('NOVA');
      return {x: p.x, y: p.y - (FEET + 84) * p.s - 20, z: 2.1};
    }
    if (i === 54) return {x: 640, y: 1150, z: 1.12};
    if (i === 69 || i === 40 || i === 41) return WIDE;
    if (spk === 'SYS') return WIDE;
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
  const shake = kick(smackT, 22, 6) + kick(wT(12, S.cues.critical), 8, 6) + kick(LS[4], 6, 6) + kick(wT(69, S.cues.bolt), 14, 6) + kick(LS[72], 10, 6) + kick(LS[58], 8, 6) + kick(LE[72] + 0.75, 12, 6);
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + Math.sin(frame * 2.3) * shake}px, ${1180 - cam.y + Math.cos(frame * 2.9) * shake}px) scale(${cam.z})`};

  // ── backgrounds
  const city = (
    <g>
      <rect x={130} y={590} width={820} height={520} rx={18} fill="#1a1440" stroke="#0a0820" strokeWidth={14} />
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff8a5d" /><stop offset="0.55" stopColor="#b14fd6" /><stop offset="1" stopColor="#2a1f6a" /></linearGradient>
        <clipPath id="win"><rect x={138} y={598} width={804} height={504} rx={12} /></clipPath>
      </defs>
      <g clipPath="url(#win)">
        <rect x={130} y={590} width={820} height={520} fill="url(#sky)" />
        {Array.from({length: 14}).map((_, k) => {
          const bw = 50 + hash(k) * 50;
          const bx = 130 + k * 62 - 10;
          const bh = 160 + hash(k + 9) * 280;
          return (
            <g key={k}>
              <rect x={bx} y={1110 - bh} width={bw} height={bh} fill={k % 2 ? '#1c1648' : '#251d5a'} />
              {Array.from({length: Math.floor(bh / 34)}).map((__, r) => [0, 1].map((c) => (
                hash(k * 31 + r * 7 + c) > 0.45 ? <rect key={`${r}-${c}`} x={bx + 10 + c * (bw / 2 - 4)} y={1110 - bh + 14 + r * 34} width={10} height={14} fill={hash(k + r) > 0.5 ? '#ffd23f' : '#6fe3ff'} opacity={0.85} /> : null
              )))}
            </g>
          );
        })}
        {[0, 1, 2].map((k) => {
          const x = 130 + (((st + 2) * (70 + k * 40) + k * 300) % 1000);
          const y = 680 + k * 70;
          return <g key={k} transform={`translate(${x} ${y})`}><rect x={-26} y={-8} width={52} height={16} rx={8} fill="#f4f1ea" /><rect x={-34} y={-2} width={10} height={4} fill="#ff4f5e" /></g>;
        })}
      </g>
      <rect x={536} y={590} width={8} height={520} fill="#0a0820" />
    </g>
  );
  const floor = (top: number, a: string, b: string) => (
    <g>
      <rect x={0} y={top} width={W} height={H - top} fill={a} />
      {Array.from({length: 9}).map((_, k) => <path key={k} d={`M ${540 + (k - 4) * 90} ${top} L ${540 + (k - 4) * 260} ${H}`} stroke={b} strokeWidth={4} />)}
      {[0, 1, 2, 3].map((k) => <rect key={`h${k}`} x={0} y={top + 40 + k * k * 34} width={W} height={4} fill={b} />)}
    </g>
  );
  const homeBg = (
    <g>
      <rect x={0} y={0} width={W} height={H} fill="#2b2156" />
      {city}
      <rect x={60} y={1150} width={46} height={340} rx={8} fill="#3d3478" />
      {floor(1500, '#3a3166', '#2e2756')}
      <ellipse cx={540} cy={1680} rx={420} ry={60} fill="#4a3f80" />
    </g>
  );
  const homeFront = (
    <g>
      <rect x={850} y={1330} width={260} height={400} rx={10} fill="#33385e" stroke={OL} strokeWidth={6} />
      <rect x={838} y={1316} width={280} height={28} rx={8} fill="#c9d3df" stroke={OL} strokeWidth={5} />
      <rect x={880} y={1380} width={190} height={130} rx={10} fill="#2a2e4e" />
      <circle cx={1050} cy={1445} r={8} fill="#c9d3df" />
    </g>
  );
  const neonOn = Math.sin(st * 13) > -0.92 || st % 5 > 0.4;
  const cafeBg = (
    <g>
      <rect x={0} y={0} width={W} height={H} fill="#123039" />
      <rect x={0} y={560} width={W} height={260} fill="#0d252d" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <g key={k} transform={`translate(${120 + k * 170} 900)`}>
          <rect x={-34} y={-60} width={68} height={110} rx={10} fill="#0d252d" stroke="#1f5560" strokeWidth={5} />
          <rect x={-12} y={-72} width={24} height={14} rx={3} fill="#1f5560" />
          <rect x={-24} y={-48 + 86 * (1 - (0.3 + 0.7 * hash(k)))} width={48} height={86 * (0.3 + 0.7 * hash(k))} rx={5} fill={hash(k) > 0.5 ? '#5fd068' : '#ffd23f'} opacity={0.75} />
        </g>
      ))}
      <g opacity={neonOn ? 1 : 0.35}>
        <text x={540} y={700} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={es ? 58 : 64} fill="none" stroke="#6fe3ff" strokeWidth={10} opacity={0.25}>{S.sign}</text>
        <text x={540} y={700} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={es ? 58 : 64} fill="#dffaff" stroke="#6fe3ff" strokeWidth={3}>{S.sign}</text>
        <path d="M 520 718 L 548 718 L 532 744 L 556 744 L 512 790 L 526 756 L 504 756 Z" fill="#ffd23f" />
      </g>
      {[200, 880].map((x, k) => (
        <g key={k}>
          <rect x={x - 2} y={560} width={4} height={60 + k * 20} fill="#0a1a20" />
          <path d={`M ${x - 44} ${640 + k * 20} Q ${x} ${590 + k * 20} ${x + 44} ${640 + k * 20} Z`} fill="#ffb02e" stroke={OL} strokeWidth={4} />
          <ellipse cx={x} cy={652 + k * 20} rx={60} ry={14} fill="#ffd23f" opacity={0.25} />
        </g>
      ))}
      {/* wall chargers people plug into */}
      {[0, 1].map((k) => (
        <g key={`w${k}`} transform={`translate(${380 + k * 330} 1120)`}>
          <rect x={-30} y={-40} width={60} height={80} rx={10} fill="#1f5560" stroke={OL} strokeWidth={4} />
          <circle cx={-10} cy={-6} r={5} fill={OL} /><circle cx={10} cy={-6} r={5} fill={OL} />
          <circle cx={0} cy={22} r={6} fill={Math.sin(st * 4 + k) > 0 ? '#5fd068' : '#1a3a40'} />
        </g>
      ))}
      {floor(1500, '#0d2a32', '#0a1f25')}
    </g>
  );
  const cafeFront = (
    <g>
      {/* Nova's high table + plugged-in coffee */}
      <rect x={968} y={1430} width={20} height={240} fill="#5a3a24" stroke={OL} strokeWidth={4} />
      <ellipse cx={978} cy={1672} rx={70} ry={14} fill="#5a3a24" stroke={OL} strokeWidth={4} />
      <ellipse cx={978} cy={1428} rx={110} ry={22} fill="#8a5a3a" stroke={OL} strokeWidth={5} />
      <g transform="translate(978 1370)">
        <path d="M -30 -40 L 30 -40 L 24 46 L -24 46 Z" fill="#f4f1ea" stroke={OL} strokeWidth={5} />
        <path d="M 30 -22 Q 54 -18 50 4 Q 46 20 26 18" fill="none" stroke={OL} strokeWidth={6} />
        <rect x={-14} y={-8} width={28} height={18} rx={4} fill="#5fd068" />
        <path d="M -10 -46 Q 0 -76 -16 -96" stroke="#ffffff" strokeWidth={5} fill="none" opacity={0.5 + 0.3 * Math.sin(st * 3)} />
      </g>
      <path d="M 1002 1416 Q 1060 1500 1080 1520" stroke={OL} strokeWidth={8} fill="none" />
      {/* the plant Bolt hides behind */}
      <g transform="translate(225 1500)">
        {[-62, -32, -4, 26, 56].map((a, k) => (
          <path key={k} transform={`rotate(${a + Math.sin(st * 1.3 + k) * 3 + (scene === 'moment' && Math.abs(st - LS[58]) < 0.6 ? Math.sin(st * 30) * 8 : 0)})`} d="M 0 0 Q -36 -110 0 -210 Q 36 -110 0 0 Z" fill={k % 2 ? '#3fae6a' : '#2f8f56'} stroke={OL} strokeWidth={5} />
        ))}
        <path d="M -95 0 L 95 0 L 74 175 L -74 175 Z" fill="#e8443a" stroke={OL} strokeWidth={6} />
        <rect x={-105} y={-12} width={210} height={26} rx={6} fill="#c22f27" stroke={OL} strokeWidth={5} />
      </g>
    </g>
  );

  // ── characters + devices
  const figure = (who: Who, k: number) => {
    const p = place(who);
    if (!p.vis) return null;
    const m = rangeOf(MOODS[who], li, 'neutral' as Mood);
    const speaking = ep.lines[li].speaker === who && st >= LS[li];
    const style = ep.lines[li].style;
    let mood: Mood = who === 'DEX' && speaking && (style === 'robot' || style === 'slow') ? (li === 40 && st > LE[40] - 0.6 ? 'dead' : 'robot') : m;
    if (who === 'DEX' && li === 40 && st > LE[40]) mood = 'dead';
    if (who === 'BOLT' && scene === 'end' && st > LE[72] + 0.3) mood = 'dead';
    const sweat = who === 'DEX' && (m === 'nervous' || (li >= 35 && li <= 39)) ? 1 : 0;
    const [armL, armR] = poseOf(who);
    return <Figure key={who} who={who} x={p.x} y={p.y} s={p.s} rot={p.rot ?? 0} dim={p.dim ?? 0} mood={mood} talk={talkOf(who)} blink={li === 0 ? 0.6 : blinkOf(k)} screen={screenOf(who)} t={st} sweat={sweat}
      armL={armL} armR={armR} legs={p.legs} phase={st * 14} hold={(who === 'DEX' && li >= 64 && li <= 66) ? 'phone' : null}
      gaze={who === 'NOVA' && st < LS[28] - 1 ? -0.6 : who === 'BOLT' && scene !== 'end' ? 0.7 : 0} />;
  };
  const sysTalk = talkOf('SYS');
  const orbK = st < LS[1] - 0.3 ? 0 : inK(st, LS[1] - 0.3, 0.4);
  const orb = scene === 'home' && li === 9 ? null : <Orb x={880} y={scene === 'home' ? 720 : 780} s={0.9} talk={sysTalk} t={st} k={orbK} />;

  // ── gag props
  const gags: React.ReactNode[] = [];
  if (li >= 13 && li <= 21 && st >= wT(13, S.cues.item)) {
    const k = pop(st, wT(13, S.cues.item));
    const [hx, hy] = handWorld('BOLT', 1);
    gags.push(
      <g key="rizz" transform={`translate(${hx} ${hy - 90}) scale(${k * 0.85})`}>
        <circle r={110} fill="#ff5df2" opacity={0.15 + 0.08 * Math.sin(st * 6)} />
        <rect x={-74} y={-74} width={148} height={148} rx={32} fill="#ff5df2" stroke={OL} strokeWidth={6} />
        <rect x={-74} y={-74} width={148} height={60} rx={32} fill="#ffffff" opacity={0.18} />
        <text y={34} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={96} fill="#fff" stroke={OL} strokeWidth={4}>R</text>
        <rect x={-100} y={-138} width={200} height={44} rx={10} fill={OL} />
        <text y={-106} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={28} fill="#ff5df2">RIZZ.EXE v2.0</text>
        {li >= 19 ? (
          <g transform="translate(0 -180)">
            {[-2, -1, 0, 1, 2].map((j) => {
              const sk = pop(st, LS[19] + 0.2 + (j + 2) * 0.09);
              return <path key={j} transform={`translate(${j * 42} 0) scale(${sk})`} d="M 0 -18 L 5 -6 L 18 -6 L 8 3 L 12 16 L 0 8 L -12 16 L -8 3 L -18 -6 L -5 -6 Z" fill="#ffd23f" stroke={OL} strokeWidth={3} />;
            })}
            {li >= 21 ? <text y={-34} textAnchor="middle" fontFamily={heavy} fontWeight={800} fontSize={26} fill="#fff" stroke={OL} strokeWidth={6} paintOrder="stroke" opacity={inK(st, LS[21])}>{S.review}</text> : null}
          </g>
        ) : null}
      </g>,
    );
  }
  if (li >= 26 && li <= 30) {
    const k = clamp01((st - LS[26]) / (LE[30] - LS[26]));
    const done = k >= 1;
    gags.push(
      <g key="install" transform={`translate(540 880) scale(${pop(st, LS[26])})`}>
        <rect x={-300} y={-60} width={600} height={120} rx={20} fill="#0b1422" stroke="#b98cff" strokeWidth={6} />
        <text x={-270} y={-14} fontFamily={heavy} fontWeight={900} fontSize={30} fill="#fff">{done ? S.installed : S.installing}</text>
        <text x={270} y={-14} textAnchor="end" fontFamily={heavy} fontWeight={900} fontSize={30} fill="#b98cff">{done ? '100%' : `${Math.floor(k * 99)}%`}</text>
        <rect x={-270} y={10} width={540} height={26} rx={13} fill="#24324a" />
        <rect x={-270} y={10} width={540 * (done ? 1 : k)} height={26} rx={13} fill="#b98cff" />
      </g>,
    );
  }
  const dexHead = headOf('DEX');
  if (li === 31 || li === 34) {
    const k = pop(st, LS[li]);
    gags.push(
      <g key={`pick${li}`} transform={`translate(${dexHead[0] + 10} ${dexHead[1] - 250}) scale(${k})`}>
        {li === 31 ? [0, 1, 2].map((j) => (
          <path key={j} d={`M ${-30 - j * 26} ${-j * 22} Q 0 ${-40 - j * 46} ${30 + j * 26} ${-j * 22}`} fill="none" stroke="#ff5df2" strokeWidth={12} strokeLinecap="round" opacity={(st * 3 + j) % 3 < 2 ? 1 : 0.3} />
        )) : es ? (
          <g>
            <rect x={-170} y={-70} width={340} height={70} rx={35} fill="#f4f1ea" stroke={OL} strokeWidth={6} />
            <circle cx={-128} cy={-36} r={16} fill="none" stroke={OL} strokeWidth={6} />
            <path d="M -116 -24 L -104 -12" stroke={OL} strokeWidth={6} strokeLinecap="round" />
            <text x={-86} y={-24} fontFamily={heavy} fontWeight={800} fontSize={30} fill={OL}>{'nova'.slice(0, Math.max(0, Math.min(4, Math.floor((st - LS[34]) * 4))))}{Math.floor(st * 3) % 2 ? '|' : ''}</text>
          </g>
        ) : (
          <g>
            <rect x={-110} y={-80} width={220} height={90} rx={14} fill="#2b2f45" stroke={OL} strokeWidth={6} />
            {Array.from({length: 18}).map((_, j) => <rect key={j} x={-96 + (j % 6) * 33} y={-68 + Math.floor(j / 6) * 26} width={26} height={20} rx={4} fill={(Math.floor(st * 6) + j) % 7 === 0 ? '#ff5df2' : '#c9d3df'} />)}
          </g>
        )}
      </g>,
    );
  }
  if (li >= 42 && li <= 44) {
    const k = pop(st, LS[42]);
    const accepted = st >= LS[43] + 0.3;
    gags.push(
      <g key="tc" transform={`translate(560 900) scale(${k})`}>
        <rect x={-270} y={-150} width={540} height={300} rx={18} fill="#f4f1ea" stroke={OL} strokeWidth={6} />
        <text y={-104} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={es ? 30 : 34} fill={OL}>{S.tc}</text>
        <defs><clipPath id="tcc"><rect x={-240} y={-90} width={480} height={140} /></clipPath></defs>
        <g clipPath="url(#tcc)">
          {Array.from({length: 40}).map((_, j) => <rect key={j} x={-240} y={-86 + j * 18 - (st - LS[42]) * 40} width={160 + hash(j) * 300} height={8} rx={4} fill="#b9b2a2" />)}
        </g>
        <g transform={`translate(0 100) scale(${accepted ? pop(st, LS[43] + 0.3) : 1})`}>
          <rect x={-120} y={-30} width={240} height={60} rx={14} fill={accepted ? '#5fd068' : '#2f6fd6'} stroke={OL} strokeWidth={5} />
          <text y={12} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={32} fill="#fff">{accepted ? S.accepted : S.accept}</text>
        </g>
      </g>,
    );
  }
  if (li >= 46 && li <= 48) {
    gags.push(
      <g key="ad">
        <g transform={`translate(540 820) rotate(-4) scale(${pop(st, LS[46])})`}>
          <rect x={-270} y={-46} width={540} height={92} rx={16} fill="#ffd23f" stroke={OL} strokeWidth={6} />
          <text y={18} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={es ? 44 : 50} fill={OL}>{S.sponsored}</text>
        </g>
        {li === 46 && st >= wT(46, S.cues.less) - 0.3 ? (
          <g transform={`translate(${Math.min(900, dexHead[0] + 250)} ${dexHead[1] + 40}) scale(${pop(st, wT(46, S.cues.less) - 0.3)})`}>
            <path transform={`rotate(${st * 30})`} d={Array.from({length: 24}).map((_, j) => `${j ? 'L' : 'M'} ${Math.cos((j / 24) * Math.PI * 2) * (j % 2 ? 76 : 106)} ${Math.sin((j / 24) * Math.PI * 2) * (j % 2 ? 76 : 106)}`).join(' ') + ' Z'} fill="#ff4f5e" stroke={OL} strokeWidth={5} />
            <text y={-4} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={36} fill="#fff">50%</text>
            <text y={26} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={es ? 17 : 20} fill="#fff">{S.less}</text>
          </g>
        ) : null}
      </g>,
    );
  }
  if (st >= smackT && st < smackT + 1.0) {
    const k = pop(st, smackT, 0.3);
    gags.push(
      <g key="smack" transform={`translate(${dexHead[0] - 120} ${dexHead[1] - 130}) rotate(-12) scale(${k})`} opacity={1 - clamp01((st - smackT - 0.7) / 0.3)}>
        <path d={Array.from({length: 20}).map((_, j) => `${j ? 'L' : 'M'} ${Math.cos((j / 20) * Math.PI * 2) * (j % 2 ? 90 : 150)} ${Math.sin((j / 20) * Math.PI * 2) * (j % 2 ? 60 : 100)}`).join(' ') + ' Z'} fill="#ffd23f" stroke={OL} strokeWidth={7} />
        <text y={22} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={66} fill="#ff4f5e" stroke={OL} strokeWidth={4}>{S.smack}</text>
      </g>,
    );
  }
  if (li >= 61 && li <= 66) {
    const digits = ['', '', '', '', '', ''];
    if (li >= 64) {
      const t = st - LS[64];
      const ws = words(64);
      ['4', '8', '2', '♥'].forEach((d, j) => {
        const w = ws[j];
        if (w && t >= w.start) digits[j] = d;
      });
    }
    gags.push(
      <g key="code" transform={`translate(540 860) scale(${pop(st, LS[61])})`}>
        <rect x={-300} y={-80} width={600} height={160} rx={20} fill="#0b1422" stroke="#6fe3ff" strokeWidth={6} />
        <text y={-34} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={28} fill="#6fe3ff">{S.code}</text>
        {digits.map((d, j) => (
          <g key={j} transform={`translate(${-225 + j * 90} 30)`}>
            <rect x={-34} y={-34} width={68} height={68} rx={12} fill="#16223a" stroke={d ? (d === '♥' ? '#ff5d8f' : '#6fe3ff') : '#2c3a55'} strokeWidth={4} />
            {d === '♥' ? <Heart x={0} y={4} s={1.3} /> : <text y={16} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={44} fill="#fff">{d}</text>}
          </g>
        ))}
      </g>,
    );
  }
  if (li >= 69 && st >= wT(69, S.cues.bolt)) {
    const t0 = wT(69, S.cues.bolt);
    gags.push(
      <g key="bill" transform={`translate(330 870) rotate(-6) scale(${pop(st, t0, 0.3)})`}>
        <path d="M -190 -110 L 190 -110 L 190 100 L 158 120 L 126 100 L 94 120 L 62 100 L 30 120 L -2 100 L -34 120 L -66 100 L -98 120 L -130 100 L -162 120 L -190 100 Z" fill="#f4f1ea" stroke={OL} strokeWidth={6} />
        <text y={-62} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={es ? 22 : 26} fill={OL}>{S.trial}</text>
        <text y={14} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={80} fill="#ff4f5e">-$400</text>
        <text y={70} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={26} fill={OL}>{S.charged}</text>
      </g>,
    );
  }
  // floating hearts for the yes
  const hearts = scene === 'moment' && st >= LS[60] ? Array.from({length: 14}).map((_, j) => {
    const t = st - LS[60] - j * 0.35;
    if (t < 0) return null;
    const y = 1450 - ((t * 120) % 900);
    return <Heart key={j} x={100 + hash(j) * 880 + Math.sin(t * 2 + j) * 30} y={y} s={0.8 + hash(j + 4) * 1.2} op={0.75} />;
  }) : null;
  const shadow = (who: Who) => {
    const p = place(who);
    return p.vis ? <ellipse key={`sh${who}`} cx={p.x} cy={FY + 8} rx={95 * p.s * (p.y < FY - 5 ? 0.7 : 1)} ry={16} fill="#000" opacity={0.22} /> : null;
  };

  // ── stage
  const stage = (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      {scene === 'home' ? homeBg : cafeBg}
      {scene === 'home' ? (
        <g>
          {shadow('DEX')}{shadow('BOLT')}
          {figure('DEX', 0)}
          {figure('BOLT', 1)}
          {homeFront}
          <Toaster x={960} y={1270} s={1.0} talk={li === 9 ? sysTalk : 0} t={st} />
        </g>
      ) : scene === 'end' ? (
        <g>{shadow('BOLT')}{shadow('DEX')}{shadow('NOVA')}{figure('DEX', 0)}{figure('NOVA', 2)}{figure('BOLT', 1)}</g>
      ) : (
        <g>
          {hearts}
          {shadow('NOVA')}{shadow('DEX')}{shadow('BOLT')}
          {figure('NOVA', 2)}
          {figure('BOLT', 1)}
          {figure('DEX', 0)}
          {cafeFront}
        </g>
      )}
      {orb}
      {gags}
    </svg>
  );

  // ── overlays: moment tint, shutdown blackout, scene wipes
  const tint = scene === 'moment' ? inK(st, LS[54] - 0.3, 0.8) * (st >= LS[61] ? 1 - inK(st, LS[61], 0.5) * 0.6 : 1) : 0;
  const offA = LE[40] + 0.15;
  const offZ = LS[41] - 0.25;
  const black = st >= offA && st < LS[41] + 0.2 ? (st < offZ ? inK(st, offA, 0.25) : 1 - inK(st, offZ, 0.4)) : 0;
  const wipeAt = cuts.find((c) => c !== LS[54] && st >= c - 0.35 && st < c + 0.35);
  const wipeK = wipeAt !== undefined ? (st - wipeAt + 0.35) / 0.7 : -1;

  // ── captions
  const readAhead = mode !== 'clean';
  const shownLine = (() => {
    if (st < LS[0] - 0.6) return -1;
    if (!readAhead) return st >= LS[li] - 0.12 && st < LE[li] + 0.6 ? li : -1;
    return li + 1 < N && st >= LE[li] + 0.25 ? li + 1 : li; // show the next line as soon as this one is said
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
    const tag = S.tags[ln.style];
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
          {(mode === 'dub' || mode === 'guide') && live && t < ws[ws.length - 1].end ? <div style={{marginLeft: 'auto', fontFamily: heavy, fontWeight: 900, fontSize: 24, color: '#ff4f5e', letterSpacing: 2}}>● {S.go}</div> : null}
        </div>
        <div style={{fontFamily: heavy, fontWeight: 800, fontSize: fs, lineHeight: 1.16, color: '#fff'}}>
          {disp.map((w, j) => <span key={j} style={{color: j < lit ? '#ffffff' : mode === 'clean' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)'}}>{w}{j < disp.length - 1 ? ' ' : ''}</span>)}
        </div>
      </div>
    );
  };
  const nextIdx = shownLine >= 0 ? shownLine + 1 : 0;
  const upNext = (mode === 'dub' || mode === 'guide') && st >= -0.6 && nextIdx < N ? (
    <div style={{position: 'absolute', left: 100, top: 1610, width: 880, boxSizing: 'border-box', padding: '14px 20px', borderRadius: 16, background: 'rgba(8,12,24,0.8)', border: '3px dashed #3a4560'}}>
      <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 22, letterSpacing: 3, color: '#8aa0c0'}}>{S.next} · <span style={{color: COL[ep.lines[nextIdx].speaker]}}>{NAME[ep.lines[nextIdx].speaker]}</span></div>
      <div style={{fontFamily: heavy, fontWeight: 700, fontSize: 30, lineHeight: 1.2, color: '#c9d3df', marginTop: 4}}>{ep.lines[nextIdx].text}</div>
    </div>
  ) : null;

  // ── intro + outro cards
  const introK = s < INTRO ? 1 - inK(s, INTRO - 0.5, 0.45) : 0;
  const total = INTRO + plan.end + ep.outro;
  const outroK = s >= total - ep.outro + 0.6 ? inK(s, total - ep.outro + 0.6, 0.5) : 0;
  const titleCard = (k: number, sub: string, extra?: React.ReactNode) => (
    <div style={{position: 'absolute', inset: 0, background: `rgba(8,10,24,${0.92 * k})`, opacity: k, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <svg width={120} height={120} style={{marginBottom: 20}}>
        {Array.from({length: 8}).map((_, j) => {
          const a = (j / 8) * Math.PI * 2;
          const age = (j - Math.floor(s * 10) % 8 + 8) % 8;
          return <circle key={j} cx={60 + Math.cos(a) * 40} cy={60 + Math.sin(a) * 40} r={11} fill="#b98cff" opacity={1 - age / 9} />;
        })}
      </svg>
      <div style={{fontFamily: heavy, fontWeight: 900, fontSize: es ? 130 : 150, color: '#fff', letterSpacing: 4, WebkitTextStroke: '6px #111', paintOrder: 'stroke fill', textShadow: '0 0 40px #b98cff'}}>{S.title}{es ? '...' : ''}</div>
      <div style={{fontFamily: heavy, fontWeight: 800, fontSize: 40, color: '#b98cff', letterSpacing: 6, marginTop: 6}}>{sub}</div>
      {extra}
    </div>
  );
  const castRow = (
    <div style={{display: 'flex', gap: 14, marginTop: 50, flexWrap: 'wrap', justifyContent: 'center', width: 900}}>
      {(['DEX', 'BOLT', 'NOVA', 'SYS'] as const).map((k) => (
        <div key={k} style={{background: COL[k], color: OL, fontFamily: heavy, fontWeight: 900, fontSize: 30, padding: '6px 18px', borderRadius: 10}}>{NAME[k]}</div>
      ))}
      {mode !== 'clean' ? <div style={{width: '100%', textAlign: 'center', fontFamily: heavy, fontWeight: 700, fontSize: 28, color: '#c9d3df', marginTop: 10}}>{S.sysNote}</div> : null}
    </div>
  );

  // ── audio
  const sfx: Array<[number, string, number]> = [
    [0.1, 'sfx/whoosh.wav', 0.5], [0.5, 'sfx/shine.wav', 0.4], [INTRO - 0.6, 'sfx/bell.wav', 0.5],
    [LS[1] - 0.3, 'sfx/powerup.wav', 0.3], [LS[3] + 0.1, 'sfx/ding.wav', 0.5], [LS[4], 'sfx/fail.wav', 0.4],
    [LS[5] - 0.9, 'sfx/whoosh.wav', 0.6], [LS[9], 'sfx/ding.wav', 0.4], [wT(12, S.cues.critical), 'sfx/fail.wav', 0.5],
    [wT(13, S.cues.item), 'sfx/shine.wav', 0.6], [wT(13, S.cues.item), 'sfx/powerup.wav', 0.4],
    ...[0, 1, 2, 3, 4].map((j) => [LS[19] + 0.2 + j * 0.09, 'sfx/pop.wav', 0.4] as [number, string, number]),
    [LS[21] - 0.5, 'sfx/scratch.wav', 0.45],
    ...cuts.filter((c) => c !== LS[54]).map((c) => [c - 0.35, 'sfx/whoosh.wav', 0.6] as [number, string, number]),
    [LS[54] - 0.4, 'sfx/shine.wav', 0.4],
    [LS[26], 'sfx/printer.wav', 0.3], [LS[31], 'sfx/zap.wav', 0.5], [LS[34], 'sfx/zap.wav', 0.5],
    [LS[40], 'sfx/powerdown.wav', 0.6], [LS[41] - 0.9, 'sfx/powerup.wav', 0.5], [LS[41] - 0.5, 'sfx/bell.wav', 0.4],
    [LS[42], 'sfx/printer.wav', 0.3], [LS[43] + 0.3, 'sfx/ding.wav', 0.6], [LS[46], 'sfx/bell.wav', 0.4], [wT(46, S.cues.less) - 0.3, 'sfx/coins.wav', 0.4],
    [smackT, 'sfx/punch.wav', 0.9], [smackT + 0.02, 'sfx/slam.wav', 0.5], [LS[51] + 0.1, 'sfx/ding.wav', 0.5],
    [LS[56], 'sfx/shine.wav', 0.5], [LS[58] - 0.1, 'sfx/pop.wav', 0.6], [LS[60] + 0.3, 'sfx/shine.wav', 0.5], [LS[60] + 0.35, 'sfx/whoosh.wav', 0.4],
    [LS[61], 'sfx/ding.wav', 0.5], [LS[64] - 0.6, 'sfx/ding.wav', 0.5],
    ...[0, 1, 2, 3].map((j) => [LS[64] + (words(64)[j]?.start ?? 0), j === 3 ? 'sfx/pop.wav' : 'sfx/tick.wav', 0.6] as [number, string, number]),
    [wT(69, S.cues.charging), 'sfx/coins.wav', 0.6], [wT(69, S.cues.bolt), 'sfx/slam.wav', 0.8], [wT(69, S.cues.bolt) + 0.2, 'sfx/fail.wav', 0.4], [LS[72], 'sfx/crack.wav', 0.5],
    [LE[72] + 0.75, 'sfx/boom.wav', 0.5],
  ];

  return (
    <AbsoluteFill style={{background: '#0b0f1e', overflow: 'hidden'}}>
      <div style={camStyle}>{stage}</div>
      {tint > 0 ? <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 60% 55%, rgba(255,93,143,${0.18 * tint}) 0%, rgba(40,0,30,${0.55 * tint}) 85%)`}} /> : null}
      {black > 0 ? (
        <div style={{position: 'absolute', inset: 0, background: '#000', opacity: black, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
          {st > offA + 0.5 ? (
            <>
              <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 56, color: '#6fe3ff', letterSpacing: 6}}>DEX OS</div>
              <div style={{width: 360, height: 14, borderRadius: 7, background: '#1a2232', marginTop: 24, overflow: 'hidden'}}>
                <div style={{width: `${clamp01((st - offA - 0.5) / (offZ - offA - 0.5)) * 100}%`, height: '100%', background: '#6fe3ff'}} />
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      {wipeK >= 0 ? (
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          {[0, 1, 2].map((j) => {
            const x = lerp(-1700, 1500, ease(clamp01(wipeK * 1.1 - j * 0.05)));
            return <rect key={j} x={x + j * 160} y={-200} width={900} height={2400} fill={['#b98cff', '#3fd6c3', '#ff7a3d'][j]} transform="skewX(-18)" />;
          })}
        </svg>
      ) : null}
      {shownLine >= 0 && introK < 0.5 && outroK < 0.5 ? capBox(shownLine) : null}
      {introK < 0.5 && outroK < 0.5 ? upNext : null}
      {introK > 0 ? titleCard(introK, S.sub, castRow) : null}
      {outroK > 0 ? titleCard(outroK, S.end) : null}

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

export const bufferFrames = (ep: BufferEpisode, t: Timing) => Math.ceil((ep.intro + buildPlan(ep, t).end + ep.outro) * 30);
