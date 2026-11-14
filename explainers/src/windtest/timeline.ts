// Wind Test timing — pure, no React. Everything is derived from the NARRATION
// word timings (scripts/narrate.py): the gauge lands on each number exactly as
// the narrator says it, and each contender fails exactly when the narrator
// states the consequence. Audio-first: the voice is the clock.

export type Word = {text: string; start: number; end: number};
export type Line = {file: string; duration: number; words: Word[]};
export type Timing = {lines: Line[]};

export type Contender = {art: string; mph: number; fail: string; line: string; cue: string; note: string};
export type WindEpisode = {
  id: string;
  voice?: string;
  rate?: string;
  title: string;
  hook: string;
  contenders: Contender[];
  finale: {mph: number; line: string; cue: string; note: string};
  sting: {line: string; note: string};
};

export const FPS = 30;
export const IDLE_MPH = 3;
export const RAMP = 0.8; // s — gauge climb before a number is spoken
export const EXIT = 0.9; // s — failure / fly-off animation
export const GAP = 0.12; // s — breath between narration lines
export const HOOK_RAMP_START = 0.35; // the gauge is already moving under the hook
export const RAMP_AFTER_FAIL = 0.4;
export const ENTER_AFTER_FAIL = 0.45; // next contender enters while the last flies off
export const STING_PAUSE = 0.3;
export const END_HOLD = 1.2;

export type Beat = {
  index: number; // contender index, or -1 for the finale
  enter: number; // contender pops in (s)
  rampStart: number;
  lineStart: number; // narration line starts
  landing: number; // gauge reaches target == cue word spoken
  fail: number; // consequence spoken -> failure animation starts
  lineEnd: number;
  from: number; // mph at ramp start
  to: number; // mph target
};

export type Plan = {
  hookStart: number;
  hookEnd: number;
  beats: Beat[]; // contenders, then the finale (index -1)
  stingStart: number; // sting line starts (camera already panned down)
  panStart: number;
  end: number;
  lineStarts: number[]; // absolute start of every narration line, in file order
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

/** Offset (s) of the cue word inside a line's audio. */
export const cueOffset = (line: Line, cue: string) => {
  const w = line.words.find((x) => norm(x.text) === norm(cue));
  if (!w) throw new Error(`cue "${cue}" not found in line: ${line.words.map((x) => x.text).join(' ')}`);
  return w.start;
};

/** Offset (s) where the consequence sentence starts: the first word after the
 *  first sentence ("Ten miles an hour. | The dandelion's already gone."). */
export const consequenceOffset = (text: string, line: Line) => {
  const first = text.split(/[.?!]/)[0].trim().split(/\s+/).length;
  return (line.words[first] ?? line.words[line.words.length - 1]).start;
};

export const buildPlan = (ep: WindEpisode, t: Timing): Plan => {
  const L = t.lines;
  if (L.length !== ep.contenders.length + 3) throw new Error(`timing has ${L.length} lines, expected ${ep.contenders.length + 3}`);
  const hookEnd = L[0].duration;
  const lineStarts = [0];
  const beats: Beat[] = [];
  let prevLineEnd = hookEnd;
  let prevFail = 0;
  let mph = IDLE_MPH;
  const specs = [
    ...ep.contenders.map((c, i) => ({index: i, mph: c.mph, cue: c.cue, text: c.line, line: L[i + 1]})),
    {index: -1, mph: ep.finale.mph, cue: ep.finale.cue, text: ep.finale.line, line: L[ep.contenders.length + 1]},
  ];
  // OVERLAPPED for momentum: the gauge starts climbing during the hook, the
  // next contender enters while the last is still flying off, and the next
  // ramp starts right after a failure — narration lines never overlap.
  specs.forEach((s, k) => {
    const cue = cueOffset(s.line, s.cue);
    const rampStart = k === 0 ? HOOK_RAMP_START : prevFail + RAMP_AFTER_FAIL;
    const lineStart = Math.max(prevLineEnd + GAP, rampStart + RAMP - cue);
    const landing = lineStart + cue;
    const fail = s.index >= 0 ? lineStart + consequenceOffset(s.text, s.line) : landing;
    const lineEnd = lineStart + s.line.duration;
    const enter = k === 0 ? 0 : prevFail + ENTER_AFTER_FAIL;
    beats.push({index: s.index, enter, rampStart, lineStart, landing, fail, lineEnd, from: mph, to: s.mph});
    lineStarts.push(lineStart);
    mph = s.mph;
    prevLineEnd = lineEnd;
    prevFail = fail;
  });
  const finale = beats[beats.length - 1];
  const stingStart = finale.lineEnd + STING_PAUSE;
  lineStarts.push(stingStart);
  return {
    hookStart: 0, hookEnd, beats, stingStart, panStart: stingStart - 0.45,
    end: stingStart + L[L.length - 1].duration + END_HOLD, lineStarts,
  };
};

export const totalFrames = (ep: WindEpisode, t: Timing) => Math.ceil(buildPlan(ep, t).end * FPS);

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Gauge reading (mph) at time s — eased climbs, held targets with live gusts. */
export const windAt = (p: Plan, s: number) => {
  let v = IDLE_MPH;
  for (const b of p.beats) {
    if (s < b.rampStart) break;
    const k = Math.min(1, (s - b.rampStart) / Math.max(0.01, b.landing - b.rampStart));
    v = b.from + (b.to - b.from) * easeInOut(k);
  }
  const gust = 1 + 0.025 * Math.sin(s * 7.3) + 0.015 * Math.sin(s * 13.1);
  return Math.max(0, v * gust);
};

/** The number shown on the readout: the eased climb during a ramp, then the
 *  EXACT target once it's spoken (gusts move the needle, never the stat —
 *  a record of 302 must read 302, not 295-310). */
export const readoutAt = (p: Plan, s: number) => {
  let v = IDLE_MPH;
  for (const b of p.beats) {
    if (s < b.rampStart) break;
    if (s >= b.landing) { v = b.to; continue; }
    const k = (s - b.rampStart) / Math.max(0.01, b.landing - b.rampStart);
    v = b.from + (b.to - b.from) * easeInOut(k);
  }
  return Math.round(v);
};

/** Every contender visible at time s (entering, holding, or still flying off). */
export const activeContenders = (p: Plan, s: number) =>
  p.beats.filter((b) => b.index >= 0 && s >= b.enter && s < b.fail + EXIT);

/** Which contender is on stage at time s (index), or null. */
export const contenderAt = (p: Plan, s: number) => {
  const cs = p.beats.filter((b) => b.index >= 0);
  for (let i = cs.length - 1; i >= 0; i--) if (s >= cs[i].enter) return cs[i];
  return null;
};

export const BANDS: Array<[number, string, string]> = [
  // [from mph, label, colour]
  [0, 'BREEZE', '#3fbf6a'],
  [39, 'GALE', '#f2c21b'],
  [74, 'HURRICANE FORCE', '#f28c1b'],
  [111, 'EF2 TORNADO', '#e8452c'],
  [136, 'EF3 TORNADO', '#d1225b'],
  [166, 'EF4 TORNADO', '#a51c8f'],
  [201, 'EF5 TORNADO', '#6a1fb5'],
];
export const bandAt = (mph: number) => [...BANDS].reverse().find(([f]) => mph >= f) ?? BANDS[0];

// Sky + ground drain from sunny to storm as the wind climbs (mph stops).
const SKY: Array<[number, string, string, string]> = [
  // mph, sky top, sky bottom, grass
  [0, '#4fb6f5', '#bfe8ff', '#5cc24a'],
  [50, '#7fa3c4', '#cfdbe4', '#56a844'],
  [110, '#5d6f80', '#9fae9f', '#47873a'],
  [140, '#3f5a4c', '#8f9d63', '#3b6f32'],
  [200, '#352c4a', '#6a5a72', '#2e5229'],
  [302, '#140f22', '#3a2848', '#1c3319'],
];
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, k: number) =>
  '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k).toString(16).padStart(2, '0')).join('');
export const skyAt = (mph: number) => {
  for (let i = 1; i < SKY.length; i++) {
    if (mph <= SKY[i][0]) {
      const k = (mph - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]);
      return {top: mix(SKY[i - 1][1], SKY[i][1], k), bottom: mix(SKY[i - 1][2], SKY[i][2], k), grass: mix(SKY[i - 1][3], SKY[i][3], k)};
    }
  }
  const z = SKY[SKY.length - 1];
  return {top: z[1], bottom: z[2], grass: z[3]};
};

// n = word TOKENS in the chunk (a TTS token can contain a space: "Moore, Oklahoma")
export type Chunk = {text: string; start: number; end: number; hot: boolean; n: number};
const NUMBER_WORDS = new Set(['ten', 'fifty', 'forty', 'hundred', 'two', 'three', 'a', 'and', '1999']);

/** Word-by-word captions: chunks of <=3 words, broken at sentence ends;
 *  number phrases are flagged "hot" (the number is the star). */
export const captions = (ep: WindEpisode, t: Timing, p: Plan): Chunk[] => {
  const texts = [ep.hook, ...ep.contenders.map((c) => c.line), ep.finale.line, ep.sting.line];
  const out: Chunk[] = [];
  t.lines.forEach((ln, i) => {
    const base = p.lineStarts[i];
    const sentenceEnds = new Set<number>();
    let n = 0;
    for (const sent of texts[i].split(/(?<=[.?!])\s+/)) {
      n += sent.trim().split(/\s+/).length;
      sentenceEnds.add(n - 1);
    }
    let cur: Word[] = [];
    const flush = () => {
      if (!cur.length) return;
      const firstSentence = texts[i].split(/[.?!]/)[0].toLowerCase();
      const hot = cur.some((w) => /\d/.test(w.text)) ||
        (i >= 1 && cur.every((w) => NUMBER_WORDS.has(norm(w.text)) || /miles|hour/.test(norm(w.text))) &&
          cur.some((w) => firstSentence.includes(norm(w.text))));
      out.push({text: cur.map((w) => w.text).join(' '), start: base + cur[0].start, end: base + cur[cur.length - 1].end, hot, n: cur.length});
      cur = [];
    };
    ln.words.forEach((w, wi) => {
      cur.push(w);
      // <=2 words per chunk: punchier, and each can be set BIG
      if (cur.length >= 2 || sentenceEnds.has(wi) || w.text.length > 8) flush();
    });
    flush();
  });
  // each chunk stays up until the next one starts (no flicker gaps)
  if (out.length) out[0].start = 0; // a caption on frame 0: the hook is readable before the voice starts
  out.forEach((c, i) => (c.end = Math.max(c.end + 0.15, Math.min(out[i + 1]?.start ?? c.end + 0.6, c.end + 0.6))));
  return out;
};
