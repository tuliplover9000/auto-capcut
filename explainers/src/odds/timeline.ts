// Odds Ladder timing — pure, no React. Audio-first like Wind Test: the readout
// lands on each number exactly as the narrator says it (word timings from
// scripts/narrate.py). Lines play back to back; an item line pops its item in
// just before the line starts, rolls the readout up, and lands on the cue word.

export type Word = {text: string; start: number; end: number};
export type Line = {file: string; duration: number; words: Word[]};
export type Timing = {lines: Line[]};

export type Item = {
  art: string;
  odds: number; // the exact number the readout lands on
  cue: string; // the spoken word the readout lands on (punctuation ignored)
  mode?: 'odds' | 'count'; // odds: "1 IN n" + a chip on the rarity bar; count: a plain counter from 0
  prefix?: string; // count mode: the small line above the number
  pill?: string; // count mode: the label under the number (odds mode uses the tier)
  color?: string; // count mode: the accent colour
};
export type OddsLine = {text: string; note: string; pause?: number; item?: Item};
export type OddsEpisode = {
  id: string;
  voice?: string;
  rate?: string;
  title: string;
  headline: string[];
  hot?: string[];
  lines: OddsLine[];
};

export const FPS = 30;
export const GAP = 0.12;
export const RAMP = 0.9; // s — the readout rolls up before the number is spoken
export const ENTER_LEAD = 0.2; // the item pops in just before its line
export const FLY = 0.45; // s — a landed item flies down onto its chip
export const END_HOLD = 1.8;
export const FLOOR = 100; // the first odds roll starts from "1 in 100"

export type Beat = {
  line: number;
  item: Item;
  odds: boolean; // odds mode (chip on the bar)
  enter: number;
  rampStart: number;
  landing: number;
  leave: number; // next item enters (this one flies off) — Infinity for the last
  from: number;
};

export type Plan = {hookEnd: number; lineStarts: number[]; lineEnds: number[]; beats: Beat[]; end: number};

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

export const cueOffset = (line: Line, cue: string) => {
  const w = line.words.find((x) => norm(x.text) === norm(cue));
  if (!w) throw new Error(`cue "${cue}" not found in line: ${line.words.map((x) => x.text).join(' ')}`);
  return w.start;
};

export const buildPlan = (ep: OddsEpisode, t: Timing): Plan => {
  if (t.lines.length !== ep.lines.length) throw new Error(`timing has ${t.lines.length} lines, episode has ${ep.lines.length}`);
  const lineStarts: number[] = [];
  const lineEnds: number[] = [];
  ep.lines.forEach((ln, i) => {
    const start = i === 0 ? 0 : lineEnds[i - 1] + GAP + (ln.pause ?? 0);
    lineStarts.push(start);
    lineEnds.push(start + t.lines[i].duration);
  });
  const hookEnd = lineEnds[0];
  const beats: Beat[] = [];
  let lastOdds = FLOOR;
  ep.lines.forEach((ln, i) => {
    if (!ln.item) return;
    const odds = (ln.item.mode ?? 'odds') === 'odds';
    const landing = lineStarts[i] + cueOffset(t.lines[i], ln.item.cue);
    const prev = beats[beats.length - 1];
    const enter = Math.max(prev ? prev.landing + 0.35 : hookEnd + 0.05, lineStarts[i] - ENTER_LEAD);
    const rampStart = Math.max(enter + 0.12, landing - RAMP);
    if (prev) prev.leave = enter;
    beats.push({line: i, item: ln.item, odds, enter, rampStart, landing, leave: Infinity, from: odds ? lastOdds : 0});
    if (odds) lastOdds = ln.item.odds;
  });
  return {hookEnd, lineStarts, lineEnds, beats, end: lineEnds[lineEnds.length - 1] + END_HOLD};
};

export const totalFrames = (ep: OddsEpisode, t: Timing) => Math.ceil(buildPlan(ep, t).end * FPS);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/** The item on stage at s (the last one that has entered), or null during the hook. */
export const beatAt = (p: Plan, s: number) => {
  let b: Beat | null = null;
  for (const x of p.beats) if (s >= x.enter) b = x;
  return b;
};

/** Readout value of a beat at s: a log-space roll for odds, a linear count for
 *  counters, and EXACTLY the target from the landing on. */
export const valueAt = (b: Beat, s: number) => {
  if (s >= b.landing) return b.item.odds;
  const k = easeOut(clamp01((s - b.rampStart) / Math.max(0.01, b.landing - b.rampStart)));
  if (!b.odds) return Math.round(b.item.odds * k);
  const lo = Math.log10(Math.max(1, b.from));
  const hi = Math.log10(b.item.odds);
  return Math.round(Math.pow(10, lo + (hi - lo) * k));
};

/** Where the rarity bar's marker points (odds) at s. */
export const markerAt = (p: Plan, s: number) => {
  let v = FLOOR * 10; // rests at the bar's left end before the first roll
  for (const b of p.beats) {
    if (!b.odds || s < b.rampStart) continue;
    v = Math.max(1000, valueAt(b, s));
  }
  return v;
};

export type Tier = {name: string; color: string; min: number};
export const TIERS: Tier[] = [
  {name: 'COMMON', color: '#9aa3b5', min: 0},
  {name: 'RARE', color: '#2f9bff', min: 1e3},
  {name: 'EPIC', color: '#b45cff', min: 1e4},
  {name: 'LEGENDARY', color: '#ff9f1a', min: 1e5},
  {name: 'MYTHIC', color: '#ff3d6e', min: 1e6},
  {name: 'IMPOSSIBLE', color: '#f4f6ff', min: 1e8},
];
export const tierOf = (odds: number) => [...TIERS].reverse().find((x) => odds >= x.min) ?? TIERS[0];

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

// n = word TOKENS in the chunk
export type Chunk = {text: string; start: number; end: number; hot: boolean; line: number};

/** Word-by-word captions: <=2 words per chunk, broken at sentence ends; any
 *  digits or an episode "hot" word is set yellow. The hook line gets no
 *  captions — it has its own fixed headline. */
export const captions = (ep: OddsEpisode, t: Timing, p: Plan): Chunk[] => {
  const hot = new Set((ep.hot ?? []).map(norm));
  const out: Chunk[] = [];
  t.lines.forEach((ln, i) => {
    if (i === 0) return;
    const base = p.lineStarts[i];
    const sentenceEnds = new Set<number>();
    let n = 0;
    for (const sent of ep.lines[i].text.split(/(?<=[.?!])\s+/)) {
      n += sent.trim().split(/\s+/).length;
      sentenceEnds.add(n - 1);
    }
    let cur: Word[] = [];
    const flush = () => {
      if (!cur.length) return;
      out.push({
        text: cur.map((w) => w.text).join(' '), start: base + cur[0].start, end: base + cur[cur.length - 1].end, line: i,
        hot: cur.some((w) => /\d/.test(w.text) || hot.has(norm(w.text))),
      });
      cur = [];
    };
    ln.words.forEach((w, wi) => {
      // a number always stands alone: it is the star of its line
      if (/\d/.test(w.text)) { flush(); cur.push(w); flush(); return; }
      cur.push(w);
      if (cur.length >= 2 || sentenceEnds.has(wi) || w.text.length > 8) flush();
    });
    flush();
  });
  out.forEach((c, i) => (c.end = Math.max(c.end + 0.15, Math.min(out[i + 1]?.start ?? c.end + 0.6, c.end + 0.6))));
  return out;
};
