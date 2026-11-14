// Fight timing — pure, no React. Audio-first: every event is pinned to a WORD
// in the narration (scripts/narrate.py word timings), so the beam fires on
// "beam" and the deer bites on "love".

export type Word = {text: string; start: number; end: number};
export type Line = {file: string; duration: number; words: Word[]};
export type Timing = {lines: Line[]};

export type Side = 'L' | 'R';
export type EventKind =
  | 'fight' | 'move' | 'beam' | 'stat' | 'coins' | 'seeds' | 'grow' | 'stomp' | 'shrink' | 'charge' | 'sunset'
  | 'deer' | 'chomp' | 'banner' | 'deerTurn' | 'winner';
export type FightEvent = {cue: string; kind: EventKind; who?: Side; target?: Side; dmg?: number; name?: string; text?: string};
export type FightLine = {text: string; note: string; pause?: number; events: FightEvent[]};
export type FightEpisode = {
  id: string; voice?: string; rate?: string; title: string;
  fighters: Record<Side, {name: string; color: string}>;
  lines: FightLine[];
};

export const FPS = 30;
export const GAP = 0.15; // breath between narration lines
export const END_HOLD = 2.4; // the winner card
// attack travel: when the hit lands after the attack event
export const ATTACK: Partial<Record<EventKind, {dur: number; hits: number[]}>> = {
  beam: {dur: 0.9, hits: [0.4]},
  coins: {dur: 1.4, hits: [0.55, 0.8, 1.05]},
  seeds: {dur: 1.4, hits: [0.25, 0.45, 0.65, 0.85, 1.05]},
  stomp: {dur: 0.7, hits: [0.32]},
  chomp: {dur: 0.6, hits: [0.22]},
};

export type TimedEvent = FightEvent & {t: number; line: number};
export type Hit = {t: number; target: Side; dmg: number};
export type Plan = {lineStarts: number[]; lineEnds: number[]; events: TimedEvent[]; hits: Hit[]; end: number};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
export const other = (s: Side): Side => (s === 'L' ? 'R' : 'L');

export const cueTime = (line: Line, cue: string) => {
  if (cue === '$end') return line.duration;
  const w = line.words.find((x) => norm(x.text) === norm(cue));
  if (!w) throw new Error(`cue "${cue}" not in: ${line.words.map((x) => x.text).join(' ')}`);
  return w.start;
};

export const buildPlan = (ep: FightEpisode, t: Timing): Plan => {
  if (t.lines.length !== ep.lines.length) throw new Error(`timing has ${t.lines.length} lines, episode ${ep.lines.length}`);
  const lineStarts: number[] = [];
  const lineEnds: number[] = [];
  const events: TimedEvent[] = [];
  const hits: Hit[] = [];
  let cur = 0;
  ep.lines.forEach((ln, i) => {
    if (i > 0) cur += GAP + (ln.pause ?? 0);
    lineStarts.push(cur);
    for (const e of ln.events) {
      const at = cur + cueTime(t.lines[i], e.cue);
      events.push({...e, t: at, line: i});
      const a = ATTACK[e.kind];
      if (a) {
        const target = e.target ?? other(e.who ?? 'L');
        const total = e.kind === 'chomp' ? 999 : e.dmg ?? 0;
        a.hits.forEach((h) => hits.push({t: at + h, target, dmg: total / a.hits.length}));
      }
    }
    cur += t.lines[i].duration;
    lineEnds.push(cur);
  });
  events.sort((a, b) => a.t - b.t);
  hits.sort((a, b) => a.t - b.t);
  return {lineStarts, lineEnds, events, hits, end: cur + END_HOLD};
};

export const totalFrames = (ep: FightEpisode, t: Timing) => Math.ceil(buildPlan(ep, t).end * FPS);

/** HP 0..100 at time s. */
export const hpAt = (p: Plan, side: Side, s: number) =>
  Math.max(0, 100 - p.hits.filter((h) => h.target === side && h.t <= s).reduce((a, h) => a + h.dmg, 0));
/** The pale "damage ghost" that drains after the real bar (fighting-game style). */
export const ghostAt = (p: Plan, side: Side, s: number) => Math.max(hpAt(p, side, s), hpAt(p, side, s - 0.55));

/** Seconds since the most recent event of a kind (and side), or null. */
export const since = (p: Plan, s: number, kind: EventKind, side?: Side) => {
  let best: number | null = null;
  for (const e of p.events) {
    if (e.kind !== kind || e.t > s) continue;
    if (side && (e.who ?? e.target) !== side) continue;
    best = s - e.t;
  }
  return best;
};
export const eventOf = (p: Plan, kind: EventKind, side?: Side) =>
  p.events.find((e) => e.kind === kind && (!side || (e.who ?? e.target) === side));

/** Recoil 0..1 for a fighter: spikes on every hit, decays fast. */
export const recoilAt = (p: Plan, side: Side, s: number) =>
  Math.max(0, ...p.hits.filter((h) => h.target === side && h.t <= s).map((h) => Math.exp(-(s - h.t) * 7)));

export const lineAt = (p: Plan, s: number) => {
  let i = 0;
  p.lineStarts.forEach((st, k) => { if (s >= st - 0.05) i = k; });
  return i;
};

export type Chunk = {text: string; start: number; end: number; hot: boolean; n: number};
const HOT = new Set(['sixteen', 'thirty-seven', 'two', 'thousand', 'house', 'deer', 'winner', 'dead', 'bigger', 'sets', 'solar', 'beam', 'rain']);

/** <=2-word captions, broken at sentence ends; key words "hot" (yellow). */
export const captions = (ep: FightEpisode, t: Timing, p: Plan): Chunk[] => {
  const out: Chunk[] = [];
  t.lines.forEach((ln, i) => {
    const base = p.lineStarts[i];
    const ends = new Set<number>();
    let n = 0;
    for (const sent of ep.lines[i].text.split(/(?<=[.?!])\s+/)) {
      n += sent.trim().split(/\s+/).length;
      ends.add(n - 1);
    }
    let cur: Word[] = [];
    const flush = () => {
      if (!cur.length) return;
      out.push({text: cur.map((w) => w.text).join(' '), start: base + cur[0].start, end: base + cur[cur.length - 1].end,
        hot: cur.some((w) => HOT.has(norm(w.text))), n: cur.length});
      cur = [];
    };
    ln.words.forEach((w, wi) => {
      cur.push(w);
      if (cur.length >= 2 || ends.has(wi) || w.text.length > 8) flush();
    });
    flush();
  });
  if (out.length) out[0].start = 0;
  out.forEach((c, i) => (c.end = Math.max(c.end + 0.15, Math.min(out[i + 1]?.start ?? c.end + 0.6, c.end + 0.6))));
  return out;
};
