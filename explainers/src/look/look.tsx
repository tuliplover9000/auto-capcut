// Shared "look" layer for the explainer engine (2026-11-26 quality pass).
// Targets come from the measured style bible of 20 viral cartoon shorts
// (github.com/mromidev/claude-animated-shorts, references/STYLE_BIBLE.md):
//  - camera holds most of the time; moves are EASE-OUT BURSTS (peak speed on
//    the first frame, settled in ~10-14 frames), slow push-in during holds
//  - no hard cuts between places: whip pans with motion blur instead
//  - warm key light + blue shadows, vignette, grain; background soft-focus,
//    parallax layers so the flat SVG world reads as having depth
// Everything is deterministic in time (no Math.random) so renders are stable.
import React from 'react';

export const W = 1080;
export const H = 1920;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ───────────────────────── camera ─────────────────────────
export type Cam = {x: number; y: number; z: number};
/** A camera beat: at t, burst toward (x,y,z). cut = jump (used under a whip). */
export type Burst = Cam & {t: number; dur?: number; cut?: boolean};
export const BASE: Cam = {x: 540, y: 960, z: 1.0};

const PUSH_RATE = 0.008; // zoom per second while holding
const PUSH_MAX = 0.035;
const BURST = 0.45; // s; cubic ease-out over 0.45 s = ~27 px/frame peak at 720p for a 180 px move

const clampCam = (c: Cam): Cam => {
  const z = Math.max(1, c.z);
  const hx = W / 2 / z;
  const hy = H / 2 / z;
  return {x: Math.min(W - hx, Math.max(hx, c.x)), y: Math.min(H - hy, Math.max(hy, c.y)), z};
};

/** Camera at time s. Each burst eases OUT from wherever the camera was, then keeps
 *  pushing in slowly until the next burst. A tiny slow wander keeps holds alive. */
export const camAt = (bursts: Burst[], s: number, base: Cam = BASE, guard?: {world: number; screen: number}): Cam => {
  const c = camRaw(bursts, s, base);
  // guard: world row `guard.world` may never rise above screen row `guard.screen`
  // (keeps zoomed content out from under the fixed card + captions)
  if (guard) c.y = Math.min(c.y, guard.world + (960 - guard.screen) / c.z);
  return c;
};
const camRaw = (bursts: Burst[], s: number, base: Cam): Cam => {
  const list = [...bursts].sort((a, b) => a.t - b.t);
  let start: Cam = {...base};
  let cur: Cam = {...base};
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b.t > s) break;
    const next = list[i + 1];
    const valueAt = (u: number): Cam => {
      const d = b.dur ?? BURST;
      const k = b.cut ? 1 : easeOut(clamp01(u / d));
      const push = 1 + Math.min(PUSH_MAX, PUSH_RATE * Math.max(0, u - (b.cut ? 0 : d)));
      return {x: lerp(start.x, b.x, k), y: lerp(start.y, b.y, k), z: lerp(start.z, b.z, k) * push};
    };
    cur = valueAt(s - b.t);
    if (next && next.t <= s) start = valueAt(next.t - b.t);
  }
  return clampCam({x: cur.x + 4 * Math.sin(s * 0.7), y: cur.y + 4 * Math.cos(s * 0.53), z: cur.z});
};

/** Bursts from story events: move PART of the way (pull) toward each event's
 *  focus point, so moves stay small and the frame never lurches. */
export const burstsFrom = (
  events: Array<{kind: string; t: number}>,
  focus: Record<string, Partial<Cam> & {lead?: number}>,
  pull = 0.55,
): Burst[] => {
  const out: Burst[] = [];
  for (const e of events) {
    const f = focus[e.kind];
    if (!f) continue;
    out.push({
      t: e.t - (f.lead ?? 0.08),
      x: lerp(BASE.x, f.x ?? BASE.x, pull),
      y: lerp(BASE.y, f.y ?? BASE.y, pull),
      z: f.z ?? 1.04,
    });
  }
  return out;
};

/** CSS transform for a layer at parallax depth d (0 = fixed, 1 = world, >1 = foreground). */
export const layerStyle = (cam: Cam, d: number, shx = 0, shy = 0): React.CSSProperties => {
  const x = 540 + (cam.x - 540) * d;
  const y = 960 + (cam.y - 960) * d;
  const z = 1 + (cam.z - 1) * d;
  return {position: 'absolute', inset: 0, transformOrigin: `${x}px ${y}px`,
    transform: `translate(${540 - x + shx * d}px, ${960 - y + shy * d}px) scale(${z})`};
};

// ───────────────────────── whip transitions ─────────────────────────
export const WHIP = 0.3; // s total, centred on the scene boundary
/** If s is inside a whip around one of the boundaries, return its state. */
export const whipAt = (bounds: number[], s: number) => {
  for (let i = 0; i < bounds.length; i++) {
    const b = bounds[i];
    if (s >= b - WHIP / 2 && s < b + WHIP / 2) {
      const u = (s - (b - WHIP / 2)) / WHIP;
      return {b, u, p: easeInOut(u), dir: i % 2 ? -1 : 1, blur: 46 * Math.sin(Math.PI * u)};
    }
  }
  return null;
};

/** Renders the outgoing frame (frozen just before b) and the incoming one (from b)
 *  side by side, panned across together with horizontal motion blur. */
export const Whip: React.FC<{state: NonNullable<ReturnType<typeof whipAt>>; render: (t: number) => React.ReactNode; fps: number}> = ({state, render, fps}) => {
  const {b, p, dir, blur} = state;
  const off = -dir * W * p;
  const id = `whip${Math.round(b * 1000)}`;
  return (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={id} x="-10%" y="0" width="120%" height="100%">
          <feGaussianBlur stdDeviation={`${blur.toFixed(1)} 0`} />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: blur > 0.5 ? `url(#${id})` : undefined}}>
        <div style={{position: 'absolute', inset: 0, transform: `translateX(${off}px)`}}>{render(b - 3 / fps)}</div>
        <div style={{position: 'absolute', inset: 0, transform: `translateX(${off + dir * W}px)`}}>{render(b + 0.001)}</div>
      </div>
    </>
  );
};

// ───────────────────────── light + grade ─────────────────────────
export type Light = {
  kx: number; ky: number; // key light position, % of frame
  warm: number; // key strength 0..1
  cool: number; // blue shadow strength 0..1
  angle: number; // deg, direction shadows fall toward
  vig?: number;
};
export const LIGHT_NIGHT: Light = {kx: 26, ky: 30, warm: 0.42, cool: 0.4, angle: 125, vig: 0.42};
export const LIGHT_LAB: Light = {kx: 50, ky: 36, warm: 0.3, cool: 0.32, angle: 160, vig: 0.36};

/** Light rig over the world (under the UI card/captions). */
export const Grade: React.FC<{light: Light; frame: number}> = ({light: L, frame}) => (
  <>
    {/* warm key pool */}
    <div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen',
      background: `radial-gradient(ellipse 75% 45% at ${L.kx}% ${L.ky}%, rgba(255,186,120,${L.warm}) 0%, rgba(255,170,110,${L.warm * 0.35}) 45%, rgba(255,170,110,0) 80%)`}} />
    {/* blue shadow side */}
    <div style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply',
      background: `linear-gradient(${L.angle}deg, rgba(60,80,170,0) 35%, rgba(40,60,160,${L.cool}) 100%)`}} />
    {/* vignette */}
    <div style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply',
      background: `radial-gradient(ellipse 85% 70% at 50% 52%, rgba(0,0,0,0) 55%, rgba(10,8,20,${L.vig ?? 0.4}) 100%)`}} />
    {/* film grain (deterministic seed per frame) */}
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'overlay', opacity: 0.09}}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 24} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter="url(#grain)" />
    </svg>
  </>
);

// ───────────────────────── depth helpers ─────────────────────────
const hash = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Soft out-of-focus light blobs far behind the action (use at depth ~0.5). */
export const Bokeh: React.FC<{s: number; n?: number; cols?: string[]; alpha?: number}> = ({s, n = 11, cols = ['#ffb86b', '#7fb2ff', '#ffe3a8'], alpha = 0.16}) => (
  <svg width={W} height={H} style={{position: 'absolute', left: -60, top: -60, width: W + 120, height: H + 120, filter: 'blur(16px)'}} viewBox={`-60 -60 ${W + 120} ${H + 120}`}>
    {Array.from({length: n}).map((_, i) => (
      <circle key={i} cx={hash(i, 1) * W + 30 * Math.sin(s * 0.2 + i)} cy={hash(i, 2) * H} r={50 + hash(i, 3) * 110}
        fill={cols[i % cols.length]} opacity={alpha * (0.6 + 0.4 * Math.sin(s * 0.5 + i * 1.7))} />
    ))}
  </svg>
);

/** Foreground dust motes, blurred and drifting (use at depth ~1.35). */
export const Dust: React.FC<{s: number; n?: number; col?: string}> = ({s, n = 22, col = '#ffe9c4'}) => (
  <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, filter: 'blur(3px)'}}>
    {Array.from({length: n}).map((_, i) => {
      const y = ((hash(i, 5) * (H + 200) - s * (14 + hash(i, 6) * 22)) % (H + 200) + H + 200) % (H + 200) - 100;
      const x = hash(i, 4) * W + 26 * Math.sin(s * 0.6 + i * 2.1);
      return <circle key={i} cx={x} cy={y} r={3 + hash(i, 7) * 9} fill={col} opacity={0.18 + 0.22 * hash(i, 8)} />;
    })}
  </svg>
);

/** SVG <defs> for a soft "lit object" drop shadow; apply with filter="url(#lift)". */
export const LiftDefs: React.FC = () => (
  <defs>
    <filter id="lift" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="10" dy="18" stdDeviation="10" floodColor="#0a0c24" floodOpacity="0.45" />
    </filter>
  </defs>
);
