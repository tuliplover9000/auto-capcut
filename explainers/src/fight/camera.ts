// Fight camera director — pure. Turns the story's events into shots
// (close-up on a special move, track attacker -> target, dutch angle on a
// twist, whip pan on a reversal, extreme close-up on a KO) and blends them.
import {ATTACK, Plan, Side, TimedEvent, other} from './timeline';

export type Cam = {x: number; y: number; z: number; r: number}; // world point at frame centre, zoom, roll (deg)
export type Shot = Cam & {t: number; blend: number};

const W = 1080;
const H = 1920;
const WIDE: Cam = {x: 540, y: 1060, z: 1.0, r: 0};
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export type Head = (side: Side) => [number, number];

export const buildShots = (plan: Plan, head: Head, hookEnd: number): Shot[] => {
  const sh: Shot[] = [];
  const at = (t: number, blend: number, c: Partial<Cam>) => sh.push({t, blend, ...WIDE, ...c});
  const on = (side: Side, z: number, dy = 150): Partial<Cam> => ({x: head(side)[0], y: head(side)[1] + dy, z});
  at(0, 0.01, {z: 1.0, y: 1080});
  at(0.05, Math.max(0.5, hookEnd - 0.1), {z: 1.12, y: 1060}); // slow push through the hook
  const byT = [...plan.events].sort((a, b) => a.t - b.t);
  for (const e of byT) {
    const A: Side = e.who ?? 'L';
    const T: Side = e.target ?? other(A);
    const roll = (s: Side, d: number) => (s === 'L' ? -d : d);
    switch (e.kind) {
      case 'fight':
        at(e.t, 0.08, {z: 1.3});
        at(e.t + 0.3, 0.5, {z: 1.0});
        break;
      case 'move':
        at(e.t, 0.22, {...on(A, 1.7), r: roll(A, 4)});
        break;
      case 'stat':
        at(e.t, 0.35, {z: 1.0, y: 1000});
        break;
      case 'beam': case 'coins': case 'seeds': case 'volley': case 'rain': case 'flash': {
        const a = ATTACK[e.kind]!;
        const [ax] = head(A);
        const [tx, ty] = head(T);
        at(e.t, 0.22, {x: lerp(ax, tx, 0.35), y: ty + 160, z: 1.32});
        at(e.t + a.hits[0] - 0.14, 0.14, {...on(T, 1.55, 120), r: roll(T, -3)});
        at(e.t + a.dur + 0.15, 0.5, {z: 1.05});
        break;
      }
      case 'grow':
        at(e.t, 0.45, {x: head('L')[0] + 60, y: 1180, z: 1.0});
        break;
      case 'stomp':
        at(e.t + 0.28, 0.08, {...on('R', 1.45, 200)});
        at(e.t + 0.95, 0.5, {z: 1.05});
        break;
      case 'charge':
        at(e.t, 0.6, {...on('R', 1.35, 220), r: 3});
        break;
      case 'sunset':
        at(e.t, 1.2, {z: 1.12, y: 1200, r: -4});
        break;
      case 'deer':
        at(e.t, 1.0, {x: head('L')[0] - 40, y: 1160, z: 1.2});
        break;
      case 'chomp':
        at(e.t + 0.1, 0.12, {...on(T, 1.8, -40), r: roll(T, 5)});
        at(e.t + 1.25, 0.55, {z: 1.1});
        break;
      case 'banner':
        at(e.t, 0.3, {...on(A, 1.45), r: roll(A, 3)});
        break;
      case 'deerTurn':
        at(e.t + 0.1, 0.18, {...on('R', 1.35, 160)}); // whip pan
        break;
      case 'blackout':
        at(e.t, 0.15, {z: 1.25, r: -4});
        break;
      case 'power':
        at(e.t, 0.16, {...on('L', 1.6), r: -4}); // whip pan back to the comeback
        break;
      case 'ko':
        at(e.t + 0.38, 0.1, {...on(T, 1.75, 200), r: roll(T, 8)});
        at(e.t + 1.35, 0.6, {z: 1.05});
        break;
      case 'winner':
        at(e.t, 0.4, {z: 1.0, y: 1000});
        break;
      default:
        break;
    }
  }
  return sh.sort((a, b) => a.t - b.t);
};

/** Keep the 1080x1920 world covering the frame for any zoom/roll. */
const clampCam = (c: Cam): Cam => {
  const th = (Math.abs(c.r) * Math.PI) / 180;
  const need = Math.cos(th) + (H / W) * Math.sin(th);
  const z = Math.max(c.z, need, 1);
  const zEff = z / need;
  const hx = W / 2 / zEff;
  const hy = H / 2 / zEff;
  return {x: Math.min(W - hx, Math.max(hx, c.x)), y: Math.min(H - hy, Math.max(hy, c.y)), z, r: c.r};
};

export const camAt = (shots: Shot[], s: number): Cam => {
  let start: Cam = {...WIDE};
  let cur: Cam = {...WIDE};
  for (let i = 0; i < shots.length; i++) {
    const sh = shots[i];
    if (sh.t > s) break;
    const next = shots[i + 1];
    const k = ease(clamp01((s - sh.t) / sh.blend));
    cur = {x: lerp(start.x, sh.x, k), y: lerp(start.y, sh.y, k), z: lerp(start.z, sh.z, k), r: lerp(start.r, sh.r, k)};
    if (next && next.t <= s) {
      const kn = ease(clamp01((next.t - sh.t) / sh.blend));
      start = {x: lerp(start.x, sh.x, kn), y: lerp(start.y, sh.y, kn), z: lerp(start.z, sh.z, kn), r: lerp(start.r, sh.r, kn)};
    }
  }
  return clampCam(cur);
};

/** Hit-stop: on the first hit of every attack (and every KO/chomp) the picture
 *  freezes for FREEZE s, then catches up — audio keeps real time. */
const FREEZE = 0.07;
const CATCH = 0.12;
export const bigHits = (plan: Plan): number[] => {
  const out: number[] = [];
  for (const e of plan.events as TimedEvent[]) {
    const a = ATTACK[e.kind];
    if (!a) continue;
    if (e.kind === 'ko' || e.kind === 'chomp' || (e.dmg ?? 0) > 0) out.push(e.t + a.hits[0]);
  }
  return out.sort((a, b) => a - b);
};
export const visTime = (hits: number[], s: number) => {
  let off = 0;
  for (const h of hits) {
    const d = s - h;
    if (d < 0) break;
    if (d < FREEZE) off += d;
    else if (d < FREEZE + CATCH) off += FREEZE * (1 - (d - FREEZE) / CATCH);
  }
  return s - off;
};
