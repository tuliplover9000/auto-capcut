// Pure timing logic for the Speed Trap format — no React, no Remotion, so it
// can be executed directly (`node scripts/test-timeline.ts`). Everything the
// renderer shows is a function of (frame, episode) computed here.

export type Motion = 'run' | 'dive';

export type Contender = {
  name: string[];
  speed: number;
  art: string;
  note: string;
  verdict: string[];
  motion?: Motion;
  fine?: string;
  fineNote?: string;
};

export type Episode = {
  id: string;
  limit: number;
  unit: string;
  hook: string[];
  outro: string[];
  contenders: Contender[];
};

export type Beat = {
  index: number;
  start: number; // VMS shows the contender's name
  runStart: number; // animal enters
  passFrame: number; // animal reaches the radar / camera
  runEnd: number; // animal has left the frame
  verdictStart: number; // VMS shows the verdict, marker drops on the scale
  end: number;
  ticket: boolean; // over the limit
  overflow: boolean; // too fast for a 2-digit radar sign
};

export const FPS = 30;
export const INTRO = 60;
export const OUTRO = 110;
export const NAME = 22;
export const HOLD = 30; // plain "no ticket" verdict
export const HOLD_TICKET = 96; // flash + citation
export const HOLD_OVERFLOW = 150; // strobes + "240 MPH" + citation
export const RADAR_MAX = 99;
export const SCALE_MAX = 80;
// Overflow camera strobes, as offsets from the pass frame. Two flashes 0.4s
// apart stays well inside the photosensitivity guideline (<= 3 flashes/sec).
export const STROBES = [0, 12];
// The big number lands AFTER the last strobe has fully decayed (~11 frames).
export const OVERFLOW_REVEAL = 18;

// Path of the animal's svg box (left x / top y) across a 1080-wide frame.
export const RUN_X0 = -480;
export const RUN_X1 = 1100;
export const DIVE_FROM: [number, number] = [-300, 140];
export const DIVE_TO: [number, number] = [1150, 1250];
export const ART_W = 460;
export const RADAR_CX = 640; // centre-x the animal must reach to "pass" the radar

/** Faster animals cross the frame faster — speed is FELT, not just printed. */
export const crossFrames = (speed: number) => Math.min(60, Math.max(12, Math.round(1700 / speed)));

/** Fraction of the crossing at which the animal's centre reaches the radar. */
export const passFraction = (motion: Motion = 'run') => {
  const [x0, x1] = motion === 'dive' ? [DIVE_FROM[0], DIVE_TO[0]] : [RUN_X0, RUN_X1];
  return (RADAR_CX - ART_W / 2 - x0) / (x1 - x0);
};

export const buildBeats = (ep: Episode): Beat[] => {
  let f = INTRO;
  return ep.contenders.map((c, index) => {
    const overflow = c.speed > RADAR_MAX;
    const ticket = c.speed > ep.limit;
    const cross = crossFrames(c.speed);
    const start = f;
    const runStart = start + NAME;
    const runEnd = runStart + cross;
    const passFrame = runStart + Math.round(cross * passFraction(c.motion));
    const hold = overflow ? HOLD_OVERFLOW : ticket ? HOLD_TICKET : HOLD;
    const verdictStart = runEnd;
    const end = runEnd + hold;
    f = end;
    return {index, start, runStart, passFrame, runEnd, verdictStart, end, ticket, overflow};
  });
};

export const totalFrames = (ep: Episode) => {
  const b = buildBeats(ep);
  return (b.length ? b[b.length - 1].end : INTRO) + OUTRO;
};

export const outroStart = (ep: Episode) => totalFrames(ep) - OUTRO;

export const beatAt = (beats: Beat[], frame: number) => beats.find((b) => frame >= b.start && frame < b.end);

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** What the 2-digit radar sign reads at `frame` (null = blank). The count
 *  climbs as the animal approaches and locks at the true speed on the pass. */
export const radarValue = (ep: Episode, beats: Beat[], frame: number): number | null => {
  const b = beatAt(beats, frame);
  if (!b || frame < b.runStart) return null;
  const c = ep.contenders[b.index];
  const t = (frame - b.runStart) / Math.max(1, b.passFrame - b.runStart);
  return Math.round(c.speed * easeOut(t));
};

/** Text the 2-digit sign actually displays. Overflow can't fit: it flickers. */
export const radarText = (v: number | null, frame: number): string => {
  if (v === null) return '--';
  if (v > RADAR_MAX) return Math.floor(frame / 4) % 2 ? 'ER' : '--';
  return String(v).padStart(2, ' ');
};

/** The overhead message board is the narrator. */
export const vmsLines = (ep: Episode, beats: Beat[], frame: number): string[] => {
  if (frame < INTRO) return ep.hook;
  const b = beatAt(beats, frame);
  if (!b) return ep.outro;
  const c = ep.contenders[b.index];
  if (frame < b.verdictStart) return c.name;
  if (b.overflow && frame < b.verdictStart + OVERFLOW_REVEAL) return c.name;
  if (b.overflow && frame < b.verdictStart + OVERFLOW_REVEAL + 50) return [`${c.speed} ${ep.unit}`];
  return c.verdict;
};

/** Scale max: 0..SCALE_MAX until the outro, then zooms out to fit the fastest. */
export const scaleMax = (ep: Episode, frame: number) => {
  const top = Math.max(SCALE_MAX, ...ep.contenders.map((c) => c.speed + 20));
  const t = (frame - outroStart(ep)) / 36;
  return SCALE_MAX + (top - SCALE_MAX) * easeOut(t);
};

export type SfxEvent = {frame: number; sfx: string; volume: number};

/** Sound design, derived from the same beats so audio can never drift. */
export const sfxEvents = (ep: Episode, beats: Beat[]): SfxEvent[] => {
  const ev: SfxEvent[] = [{frame: 0, sfx: 'vms', volume: 0.5}];
  for (const b of beats) {
    ev.push({frame: b.start, sfx: 'vms', volume: 0.45});
    for (let f = b.runStart; f < b.passFrame; f += 3) ev.push({frame: f, sfx: 'tick', volume: 0.25});
    ev.push({frame: Math.max(b.runStart, b.passFrame - 6), sfx: 'whoosh', volume: 0.7});
    if (b.ticket) ev.push({frame: b.passFrame, sfx: 'shutter', volume: 0.9});
    if (b.overflow) {
      ev.push({frame: b.passFrame, sfx: 'overload', volume: 0.8});
      for (const s of STROBES.slice(1)) ev.push({frame: b.passFrame + s, sfx: 'shutter', volume: 0.8});
      ev.push({frame: b.verdictStart + OVERFLOW_REVEAL, sfx: 'vms', volume: 0.6});
    }
    ev.push({frame: b.verdictStart, sfx: b.ticket ? 'vms' : 'pop', volume: 0.6});
    if (b.ticket) ev.push({frame: citationIn(b), sfx: 'printer', volume: 0.55});
  }
  ev.push({frame: outroStart(ep), sfx: 'vms', volume: 0.5});
  return ev.sort((a, z) => a.frame - z.frame);
};

/** Citation card slides in after the flash (later for overflow, after the
 *  VMS has shown the real number). */
export const citationIn = (b: Beat) => (b.overflow ? b.verdictStart + OVERFLOW_REVEAL + 40 : b.passFrame + 10);

/** Camera flash opacity at `frame` (0..0.92). */
export const flashAmount = (beats: Beat[], frame: number) => {
  let a = 0;
  for (const b of beats) {
    if (!b.ticket) continue;
    for (const s of b.overflow ? STROBES : [0]) {
      const f0 = b.passFrame + s;
      const d = frame - f0;
      const v = d < -1 || d > 11 ? 0 : d <= 1 ? 0.6 + 0.32 * Math.max(0, d) : 0.92 * (1 - (d - 1) / 10);
      a = Math.max(a, v);
    }
  }
  return a;
};

/** Every frame index where a flash peaks — used to check the strobe rate. */
export const flashPeaks = (beats: Beat[]) =>
  beats.filter((b) => b.ticket).flatMap((b) => (b.overflow ? STROBES : [0]).map((s) => b.passFrame + s + 1));
export const citationOut = (b: Beat) => b.end - 10;
