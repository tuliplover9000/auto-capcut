// Story (narrated true story) timing — pure, no React. Same audio-first rule as
// Fight/Horde: every event is pinned to a WORD in the narration, and each line
// names the scene it plays in (a scene change = a whip pan at the line start).
import type {Timing} from '../fight/timeline';

export type SEvent = {cue: string; kind: string; text?: string};
export type SLine = {text: string; scene: string; chapter: string; note: string; pause?: number; events: SEvent[]};
export type StoryEpisode = {id: string; voice?: string; rate?: string; title: string; hot?: string[]; lines: SLine[]};
export type STEvent = SEvent & {t: number; line: number};
export type SPlan = {lineStarts: number[]; lineEnds: number[]; events: STEvent[]; cuts: {t: number; from: string; to: string}[]; end: number};

export const FPS = 30;
export const GAP = 0.15;
export const END_HOLD = 1.6;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

export const buildPlan = (ep: StoryEpisode, t: Timing): SPlan => {
  if (t.lines.length !== ep.lines.length) throw new Error(`timing has ${t.lines.length} lines, episode ${ep.lines.length}`);
  const lineStarts: number[] = [];
  const lineEnds: number[] = [];
  const events: STEvent[] = [];
  const cuts: SPlan['cuts'] = [];
  let cur = 0;
  ep.lines.forEach((ln, i) => {
    if (i > 0) cur += GAP + (ln.pause ?? 0);
    lineStarts.push(cur);
    if (i > 0 && ln.scene !== ep.lines[i - 1].scene) cuts.push({t: cur, from: ep.lines[i - 1].scene, to: ln.scene});
    for (const e of ln.events) {
      const w = t.lines[i].words.find((x) => norm(x.text) === norm(e.cue));
      if (!w) throw new Error(`line ${i}: cue "${e.cue}" not in: ${t.lines[i].words.map((x) => x.text).join(' ')}`);
      events.push({...e, t: cur + w.start, line: i});
    }
    cur += t.lines[i].duration;
    lineEnds.push(cur);
  });
  events.sort((a, b) => a.t - b.t);
  return {lineStarts, lineEnds, events, cuts, end: cur + END_HOLD};
};

export const totalFrames = (ep: StoryEpisode, t: Timing) => Math.ceil(buildPlan(ep, t).end * FPS);
export const at = (p: SPlan, kind: string) => p.events.find((e) => e.kind === kind)?.t ?? Infinity;
export const lineAt = (p: SPlan, s: number) => p.lineStarts.reduce((a, st, i) => (s >= st - 0.05 ? i : a), 0);
