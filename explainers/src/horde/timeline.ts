// Horde (1 vs many) timing — pure, no React. Same audio-first rule as Fight:
// every event is pinned to a WORD in the narration.
import type {Timing} from '../fight/timeline';

export type HKind = 'fight' | 'charge' | 'swat' | 'stat' | 'move' | 'beat' | 'flee' | 'eat' | 'winner' | 'release' | 'retreat' | 'flank' | 'swarm' | 'hurt';
export type HEvent = {cue: string; kind: HKind; n?: number; dmg?: number; text?: string; name?: string; back?: boolean};
export type HLine = {text: string; note: string; pause?: number; events: HEvent[]};
export type HordeEpisode = {
  id: string; voice?: string; rate?: string; title: string; stage: 'jungle' | 'park'; hot?: string[]; headline: string[];
  hero: {name: string; art: 'gorilla' | 'napoleon'; color: string; bar: string};
  horde: {name: string; art: 'man' | 'rabbit'; color: string; count: number; label: string; sprites: number};
  lines: HLine[];
};
export type TEvent = HEvent & {t: number; line: number};
export type HPlan = {lineStarts: number[]; lineEnds: number[]; events: TEvent[]; end: number};

export const FPS = 30;
export const GAP = 0.15;
export const END_HOLD = 2.4;
export const SWAT_HIT = 0.16; // the swing connects this long after the cue word

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

export const buildPlan = (ep: HordeEpisode, t: Timing): HPlan => {
  if (t.lines.length !== ep.lines.length) throw new Error(`timing has ${t.lines.length} lines, episode ${ep.lines.length}`);
  const lineStarts: number[] = [];
  const lineEnds: number[] = [];
  const events: TEvent[] = [];
  let cur = 0;
  ep.lines.forEach((ln, i) => {
    if (i > 0) cur += GAP + (ln.pause ?? 0);
    lineStarts.push(cur);
    for (const e of ln.events) {
      let at = t.lines[i].duration;
      if (e.cue !== '$end') {
        const w = t.lines[i].words.find((x) => norm(x.text) === norm(e.cue));
        if (!w) throw new Error(`cue "${e.cue}" not in: ${t.lines[i].words.map((x) => x.text).join(' ')}`);
        at = w.start;
      }
      events.push({...e, t: cur + at, line: i});
    }
    cur += t.lines[i].duration;
    lineEnds.push(cur);
  });
  events.sort((a, b) => a.t - b.t);
  return {lineStarts, lineEnds, events, end: cur + END_HOLD};
};

export const totalFrames = (ep: HordeEpisode, t: Timing) => Math.ceil(buildPlan(ep, t).end * FPS);
export const first = (p: HPlan, kind: HKind) => p.events.find((e) => e.kind === kind);
export const at = (p: HPlan, kind: HKind) => first(p, kind)?.t ?? Infinity;

/** How many of the horde are still in it (the counter). */
export const remaining = (ep: HordeEpisode, p: HPlan, s: number) =>
  Math.max(0, ep.horde.count - p.events.filter((e) => e.kind === 'swat' && !e.back && s >= e.t + SWAT_HIT).reduce((a, e) => a + (e.n ?? 0), 0));

/** The hero's bar (stamina / dignity), 0..100. */
export const heroBar = (p: HPlan, s: number) =>
  Math.max(0, 100 - p.events.filter((e) => e.kind === 'hurt' && s >= e.t).reduce((a, e) => a + (e.dmg ?? 0), 0));

/** Which sprite gets knocked by which swat: the front-most still-standing ones first.
 *  A `back` swat bounces 3 sprites that come straight back (it doesn't work). */
export type Knock = {t: number; back: boolean};
export const knockPlan = (ep: HordeEpisode, p: HPlan): Knock[][] => {
  const N = ep.horde.sprites;
  const knocks: Knock[][] = Array.from({length: N}, () => []);
  const order = Array.from({length: N}, (_, i) => i).sort((a, b) => Math.floor(a / 4) - Math.floor(b / 4) || a - b);
  let next = 0;
  let bc = 0;
  for (const e of p.events.filter((x) => x.kind === 'swat')) {
    if (e.back) {
      for (let j = 0; j < 3; j++) knocks[order[(next + bc + j) % N]].push({t: e.t + SWAT_HIT, back: true});
      bc += 3;
      continue;
    }
    const k = Math.max(1, Math.round(((e.n ?? 0) / ep.horde.count) * N));
    for (let j = 0; j < k && next + j < N; j++) knocks[order[next + j]].push({t: e.t + SWAT_HIT, back: false});
    next += k;
  }
  return knocks;
};
