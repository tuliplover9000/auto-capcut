// "Wake Up Dead Man, but real" rebuilt in 3D (2026-11-26): the lesson ACTED OUT
// (professor reading -> dies -> cools on a time-lapse -> detective takes the reading),
// then a 10 s whodunit with three suspects in the room, the answer/trap counted
// back on the real wall clock, the catch (a window, not a time), the movie callback.
// Voice: one Gemini take (Laomedeia), kid-clear script. Music: flow_music.py.
// Puzzle (HARD): the body is 92.6 F, TAKEN 12:00 AM (small print) vs BODY FOUND 10:00 PM (big lure).
//   6 F down = 4 h; 12 AM - 4 h = 8 PM = B (walking alone 7:30-9). From 10 PM -> 6 PM = A (trap).
//   C found the body but was at dinner with guests 7-9.
import React from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {
  BODY, Blob, CamS, Card, KNEEL, Lights, Mats, Post, SIT, World, Arc, CLOCK, H, W, V, clamp01, col, easeOut, lerp, makeCam, project, smoother, useCanvas, useGradient, useTextures, vl,
} from './kit';
import {SKIN_ALIVE, SKIN_COLD, SUSPECTS, Mood, drawDetectiveKneeling, drawDetectiveStanding, drawSuspect, drawVictimLying, drawVictimSitting, mix} from './toon';
import timing from '../../episodes/tod-3d.timing.json';
import episode from '../../episodes/tod-3d.json';

const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';
const GOOD = '#5fd068';
const BAD = '#ff4f5e';
const YEL = '#ffd23f';
const OL = '#1b1b22';
const PAPER = '#f4f1ea';

// ───────────────────────── story clock (from the one-take narration) ─────────────────────────
type TLine = {file: string; duration: number; takeStart: number; pauseBefore: number; words: Array<{text: string; start: number; end: number}>};
const LINES = (timing as unknown as {lines: TLine[]}).lines;
const LEAD = 0.3;
const STARTS: number[] = [];
LINES.reduce((gap, l, i) => { const g = gap + (l.pauseBefore ?? 0); STARTS[i] = LEAD + g + l.takeStart; return g; }, 0);
const lastEnd = (i: number) => STARTS[i] + LINES[i].words[LINES[i].words.length - 1].end;
const wt = (li: number, word: string, nth = 0) => {
  const ws = LINES[li].words.filter((x) => x.text.toLowerCase().replace(/[^a-z0-9-]/g, '') === word);
  return STARTS[li] + (ws[nth] ? ws[nth].start : 0);
};
const T = {
  reading: wt(0, 'reading'), readbody: wt(1, 'body'),
  flash: STARTS[2], ninety: wt(2, 'ninety-eight'),
  die: wt(3, 'dies'), cools: wt(3, 'cools'), six: wt(4, 'six'), four: wt(4, 'four'),
  heres: wt(5, 'heres'), taken: wt(5, 'taken'), found: wt(5, 'found'),
  turn: STARTS[6], clues: wt(6, 'clues'), test: lastEnd(6) + 0.1,
  b: wt(7, 'b'), midnight: wt(8, 'midnight'), eight: wt(8, 'eight'), walking: wt(8, 'walking'),
  ten: wt(9, 'ten'), sixpm: wt(9, 'six'), isA: wt(9, 'a'), trap: wt(9, 'trap'),
  cline: STARTS[10], dinner: wt(10, 'dinner'),
  catchL: STARTS[11], hot: wt(11, 'hot'), cold: wt(11, 'cold'), clothes: wt(11, 'clothes'), size: wt(11, 'size'), change: wt(11, 'change'),
  exact: wt(12, 'exact'), window1: wt(12, 'window'),
  endL: STARTS[13], confess: wt(13, 'confession'), window2: wt(13, 'window'),
};
const TEST_SECS = 10;
export const TOD3_FRAMES = Math.ceil((lastEnd(13) + 1.6) * 30);
const TL0 = T.cools;
const TL1 = T.six + 0.1;
const DET0 = T.heres - 0.15;
const DET1 = DET0 + 1.1;
const hoursAt = (s: number) => clamp01((s - TL0) / (TL1 - TL0)) * 4;
const phase = (s: number) => (s < T.flash ? 'hook' : s < DET0 ? 'flash' : s < T.turn ? 'reading' : s < T.catchL ? 'test' : s < T.endL ? 'catch' : 'end');

// suspects stand along the back of the room
const SUS_AT = [V(-0.25, 0, -2.6), V(0.75, 0, -2.75), V(1.75, 0, -2.6)];
const DET_STAND = V(2.15, 0, -1.05); // right of the line-up, facing them, clear of the lens

// clock face (24 h) + wedges
const clockState = (s: number): {hr: number; arcs: Arc[]} => {
  const p = phase(s);
  if (p === 'flash') return {hr: s < T.die ? 19.5 + (s - T.flash) * 0.1 : 20 + hoursAt(s), arcs: []};
  if (p === 'test' && s >= T.midnight - 0.1 && s < T.ten - 0.15) {
    const hr = 24 - 4 * smoother((s - T.midnight) / Math.max(0.4, T.eight - T.midnight));
    return {hr, arcs: [{from: hr - 12, to: 12, color: GOOD}]};
  }
  if (p === 'test' && s >= T.ten - 0.15 && s < T.cline) {
    const hr = 22 - 4 * smoother((s - T.ten) / Math.max(0.4, T.sixpm - T.ten));
    return {hr, arcs: [{from: hr - 12, to: 10, color: BAD}]};
  }
  if ((p === 'catch' && s >= T.window1 - 0.1) || (p === 'end' && s >= T.window2 - 0.1)) {
    const k = easeOut((s - (p === 'catch' ? T.window1 : T.window2) + 0.1) / 0.5);
    return {hr: 24, arcs: [{from: 6.5, to: 6.5 + 3 * k, color: GOOD}]};
  }
  return {hr: 24, arcs: []};
};

// ───────────────────────── camera: keyed shots, every hold creeps ─────────────────────────
type Shot = {t: number; cam: CamS | ((s: number) => CamS); dur?: number; cut?: boolean; ease?: 'out' | 'smooth'};
const C = (pos: THREE.Vector3, look: THREE.Vector3, fov: number, focus: THREE.Vector3, coc = 0): CamS => ({pos, look, fov, focus, coc});
const lerpCam = (a: CamS, b: CamS, k: number): CamS => ({pos: vl(a.pos, b.pos, k), look: vl(a.look, b.look, k), fov: lerp(a.fov, b.fov, k), focus: vl(a.focus, b.focus, k), coc: lerp(a.coc, b.coc, k)});
const LINEUP = C(V(1.05, 2.3, 3.9), V(0.8, 1.85, -1.7), 52, V(0.75, 1.1, -2.6), 0);
const CLOCK_CU = C(V(-0.35, 1.9, -1.75), V(-0.35, 2.62, -3.47), 40, V(-0.35, 2.3, -3.47), 6);
const closeOn = (p: THREE.Vector3) => C(V(p.x + 0.25, 1.55, p.z + 3.4), V(p.x, 1.2, p.z), 38, V(p.x, 1.3, p.z), 9);
const orbit = (s: number): CamS => {
  const u = clamp01((s - T.die) / (T.four - T.die));
  const th = lerp(0.55, 0.18, smoother(u));
  const r = lerp(4.7, 4.1, u);
  const tgt = V(0.1, 0.95, -0.9);
  return C(V(tgt.x + Math.sin(th) * r, lerp(2.95, 2.6, u), tgt.z + Math.cos(th) * r), tgt, lerp(56, 52, u), BODY.clone().setY(0.3), 0);
};
const catchOrbit = (s: number): CamS => {
  const u = clamp01((s - T.catchL) / 3);
  const th = lerp(0.9, 0.55, u);
  return C(V(BODY.x + Math.sin(th) * 2.6, 1.85, BODY.z + Math.cos(th) * 2.6), V(BODY.x, 0.55, BODY.z - 0.2), 44, BODY.clone().setY(0.3), 7);
};
const SHOTS: Shot[] = [
  {t: 0, cut: true, cam: C(V(1.35, 2.45, 4.6), V(0.95, 1.5, -1.5), 52, V(0.9, 1.1, -2.0))},
  {t: 0.05, dur: T.readbody - 0.3, ease: 'smooth', cam: C(V(1.3, 2.3, 4.15), V(0.95, 1.45, -1.5), 50, V(0.9, 1.1, -2.0))},
  {t: T.readbody - 0.12, dur: 0.5, ease: 'out', cam: C(V(2.25, 1.5, 3.05), V(0.85, 0.78, -0.15), 39, V(0.9, 0.5, 0.0), 8)},
  {t: T.flash - 0.02, cut: true, cam: C(V(1.9, 1.75, 2.45), V(-1.25, 1.02, -1.3), 46, V(-1.2, 1.2, -1.2), 8)},
  {t: T.flash, dur: T.die - T.flash, ease: 'smooth', cam: C(V(1.45, 1.66, 1.9), V(-1.25, 1.02, -1.3), 46, V(-1.2, 1.2, -1.2), 8)},
  {t: T.die - 0.02, cut: true, cam: orbit},
  {t: T.four - 0.1, dur: 0.45, ease: 'out', cam: (s) => ({...orbit(s), fov: 44, look: V(0.15, 0.35, -0.2), coc: 5})},
  {t: DET0 - 0.15, dur: 0.9, ease: 'smooth', cam: C(V(2.9, 2.1, 3.9), V(0.6, 0.7, -0.3), 46, V(0.8, 0.5, 0.0), 5)},
  {t: T.taken - 0.12, dur: 0.5, ease: 'out', cam: C(V(2.25, 1.5, 3.05), V(0.85, 0.78, -0.15), 39, V(0.9, 0.5, 0.0), 10)},
  {t: T.turn - 0.02, cut: true, cam: LINEUP},
  {t: T.b - 0.1, dur: 0.45, ease: 'out', cam: closeOn(SUS_AT[1])},
  {t: T.midnight - 0.12, cut: true, cam: CLOCK_CU},
  {t: T.walking - 0.12, cut: true, cam: closeOn(SUS_AT[1])},
  {t: T.ten - 0.15, cut: true, cam: {...CLOCK_CU, fov: 41}},
  {t: T.isA - 0.12, cut: true, cam: closeOn(SUS_AT[0])},
  {t: T.cline - 0.05, cut: true, cam: closeOn(SUS_AT[2])},
  {t: T.catchL - 0.05, cut: true, cam: catchOrbit},
  {t: T.window1 - 0.15, cut: true, cam: CLOCK_CU},
  {t: T.endL - 0.05, cut: true, cam: C(V(1.3, 2.35, 4.3), V(0.95, 1.6, -1.5), 50, V(0.9, 1.1, -2.0))},
  {t: T.window2 - 0.15, dur: 0.6, ease: 'out', cam: C(V(1.2, 2.0, 1.6), V(-0.1, 1.9, -2.9), 44, CLOCK.clone(), 4)},
];
const camAt = (s: number): CamS => {
  let start: CamS = SHOTS[0].cam as CamS;
  let cur = start;
  for (let i = 0; i < SHOTS.length; i++) {
    const sh = SHOTS[i];
    if (sh.t > s) break;
    const next = SHOTS[i + 1];
    const val = (abs: number): CamS => {
      const u = abs - sh.t;
      const tgt = typeof sh.cam === 'function' ? sh.cam(abs) : sh.cam;
      const d = sh.dur ?? 0.4;
      const k = sh.cut ? 1 : sh.ease === 'smooth' ? smoother(u / d) : easeOut(u / d);
      const c = lerpCam(start, tgt, k);
      const creep = typeof sh.cam === 'function' ? 0 : Math.min(0.06, 0.012 * Math.max(0, u - (sh.cut ? 0 : d)));
      return {...c, fov: c.fov * (1 - creep)};
    };
    cur = val(s);
    if (next && next.t <= s) start = val(next.t);
  }
  return cur;
};

// ───────────────────────── 3D scene ─────────────────────────
const Cast: React.FC<{s: number; camPos: THREE.Vector3}> = ({s, camPos}) => {
  const sit = useCanvas(600, 1000);
  const lie = useCanvas(1000, 500);
  const det = useCanvas(600, 1000);
  const sus = [useCanvas(600, 1000), useCanvas(600, 1000), useCanvas(600, 1000)];
  const p = phase(s);
  const coldK = p === 'flash' ? clamp01(hoursAt(s) / 4) : 1;
  const alive = p === 'flash' && s < T.die;
  if (alive) { drawVictimSitting(sit.ctx, {skin: mix(SKIN_ALIVE, SKIN_COLD, 0), dead: false, frost: 0}); sit.t.needsUpdate = true; }
  else { drawVictimLying(lie.ctx, {skin: mix(SKIN_ALIVE, SKIN_COLD, coldK), dead: true, frost: p === 'flash' ? clamp01((hoursAt(s) - 2.4) / 1.4) : 1}); lie.t.needsUpdate = true; }
  // detective
  let detAt: THREE.Vector3 | null = null;
  if (p === 'hook') {
    if (s < T.readbody - 0.1) { detAt = DET_STAND; drawDetectiveStanding(det.ctx, 0); }
    else { detAt = KNEEL; drawDetectiveKneeling(det.ctx, easeOut((s - T.readbody) / 0.4), s >= T.readbody + 0.35 ? '92.6' : '--.-'); }
  } else if (p === 'reading') {
    if (s < DET1) {
      const k = smoother((s - DET0) / (DET1 - DET0));
      detAt = V(lerp(3.0, KNEEL.x, k), 0, lerp(-1.5, KNEEL.z, k));
      drawDetectiveStanding(det.ctx, (s - DET0) * 11);
    } else { detAt = KNEEL; drawDetectiveKneeling(det.ctx, easeOut((s - DET1 - 0.1) / 0.5), s >= T.taken ? '92.6' : '--.-'); }
  } else if (p === 'end') { detAt = DET_STAND; drawDetectiveStanding(det.ctx, 0); }
  if (detAt) det.t.needsUpdate = true;
  // suspects
  const showSus = p === 'hook' || p === 'test' || p === 'end';
  const moods: Mood[] = ['neutral', 'smirk', 'neutral'];
  const glow = [0, 0, 0];
  if (p === 'test') {
    if (s >= T.b) { glow[1] = 0.35; moods[1] = 'worried'; }
    if (s >= T.isA && s < T.cline) { glow[0] = 0.35; moods[0] = 'shock'; }
    if (s >= T.cline) { moods[2] = s >= T.dinner ? 'happy' : 'worried'; }
  }
  if (p === 'end' && s >= T.confess) { moods[1] = 'shock'; glow[1] = 0.3; }
  if (p === 'hook') { moods[0] = 'worried'; moods[2] = 'worried'; }
  if (showSus) SUSPECTS.forEach((u, i) => { drawSuspect(sus[i].ctx, u, moods[i], glow[i]); sus[i].t.needsUpdate = true; });
  const night = p === 'flash' ? clamp01((hoursAt(s) + (s >= T.die ? 0.6 : 0)) / 3.2) : 1;
  const tint = col('#fff1e0', '#c9d4ff', night * 0.8);
  return (
    <group>
      {alive ? <Card tex={sit.t} wpx={600} hpx={1000} at={SIT} cam={camPos} tint={tint} /> : <><Blob at={BODY} rx={0.95} rz={0.42} o={0.35} /><Card tex={lie.t} wpx={1000} hpx={500} at={BODY} cam={camPos} tint={tint} lie /></>}
      {detAt ? <><Blob at={detAt} rx={0.34} rz={0.16} /><Card tex={det.t} wpx={600} hpx={1000} at={detAt} cam={camPos} tint={tint} /></> : null}
      {showSus ? SUS_AT.map((at, i) => <React.Fragment key={i}><Blob at={at} rx={0.34} rz={0.16} /><Card tex={sus[i].t} wpx={600} hpx={1000} at={at} cam={camPos} tint={tint} /></React.Fragment>) : null}
    </group>
  );
};

const Scene: React.FC<{s: number; c: CamS}> = ({s, c}) => {
  const {camera, scene} = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.copy(c.pos);
  cam.fov = c.fov;
  cam.near = 0.05;
  cam.far = 60;
  cam.lookAt(c.look);
  cam.updateProjectionMatrix();
  scene.background = new THREE.Color('#1a1426');
  const tex = useTextures();
  const grad = useGradient();
  const mats = React.useMemo<Mats>(() => {
    const cache = new Map<string, THREE.MeshToonMaterial>();
    return {toon: (color, map) => {
      const key = color + (map ? map.uuid : '');
      if (!cache.has(key)) cache.set(key, new THREE.MeshToonMaterial({color, map, gradientMap: grad}));
      return cache.get(key)!;
    }};
  }, [grad]);
  const p = phase(s);
  const night = p === 'flash' ? clamp01((hoursAt(s) + (s >= T.die ? 0.6 : 0)) / 3.2) : 1;
  const flicker = s > T.die - 0.16 && s < T.die ? (Math.floor(s * 30) % 2 ? 0.1 : 0.6) : 1;
  const ck = clockState(s);
  return (
    <>
      <Lights night={night} flicker={flicker} />
      <World hr={ck.hr} night={night} book={!(p === 'flash' && s < T.die)} arcs={ck.arcs} mats={mats} tex={tex} />
      <Cast s={s} camPos={c.pos} />
      <Post focus={c.focus.distanceTo(c.pos)} coc={c.coc} />
    </>
  );
};

// ───────────────────────── overlays ─────────────────────────
const pop = (frame: number, at: number, fps: number) => spring({frame: frame - Math.round(at * fps), fps, config: {damping: 10, stiffness: 220}});
const Tag: React.FC<{x: number; y: number; k?: number; bg?: string; fg?: string; border?: string; size?: number; children: React.ReactNode; rot?: number; strike?: boolean}> = ({x, y, k = 1, bg = OL, fg = '#fff', border = OL, size = 34, children, rot = 0, strike}) => (k <= 0.01 ? null : (
  <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${k})`, fontFamily: heavy, fontWeight: 900, fontSize: size,
    background: bg, color: fg, border: `5px solid ${border}`, borderRadius: 14, padding: '6px 18px', whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.1,
    boxShadow: '0 8px 0 rgba(0,0,0,.3)', textDecoration: strike ? 'line-through' : undefined}}>{children}</div>
));
const fmt = (hr: number) => { const h = Math.floor(hr) % 24; const m = Math.floor(((hr % 1) * 60) / 5) * 5; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };

export const TodThree: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const c = camAt(s);
  const pc = makeCam(c);
  const p = phase(s);
  const inView = (q: {x: number; y: number}) => q.x > 40 && q.x < W - 40 && q.y > 560 && q.y < 1650;
  const ov: React.ReactNode[] = [];
  const at = (v: THREE.Vector3) => project(pc, v);

  // hook: "?" over the suspects while he reads people
  if (p === 'hook' && s >= T.reading - 0.4 && s < T.readbody) {
    SUS_AT.forEach((v, i) => { const q = at(V(v.x, 2.12, v.z)); if (inView(q)) ov.push(<Tag key={`q${i}`} x={q.x} y={q.y} k={pop(frame, T.reading - 0.4 + i * 0.12, fps)} bg={PAPER} fg={OL} size={46}>?</Tag>); });
  }
  // flashback label + temperature bubble + clock label
  if (p === 'flash' && s < T.flash + 1.6) ov.push(<Tag key="early" x={540} y={1250} k={pop(frame, T.flash, fps)} bg={YEL} fg={OL} size={36}>EARLIER THAT NIGHT</Tag>);
  if (p === 'flash' || p === 'reading') {
    const dead = s >= T.die;
    const hrs = p === 'flash' ? hoursAt(s) : 4;
    const temp = 98.6 - 1.5 * hrs;
    const cold = clamp01(hrs / 4);
    const b = at(dead ? V(BODY.x - 0.05, 0.95, BODY.z) : V(SIT.x + 0.75, 1.55, SIT.z + 0.3)); // alive: beside his head, not on it
    const bx = Math.min(860, Math.max(220, b.x));
    const by = Math.min(1600, Math.max(720, b.y));
    if (s < DET1 + 0.4) {
      ov.push(
        <div key="bub" style={{position: 'absolute', left: bx, top: by, transform: `translate(-50%, -100%) scale(${pop(frame, dead ? T.die + 0.1 : T.flash + 0.3, fps)})`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 12, background: PAPER, border: `6px solid ${OL}`, borderRadius: 40, padding: '8px 24px 8px 14px', boxShadow: '0 10px 0 rgba(0,0,0,.3)'}}>
            <span style={{fontSize: 0}}>.</span>
            <div style={{width: 16, height: 64, borderRadius: 8, border: `4px solid ${OL}`, background: `linear-gradient(to top, ${cold > 0.5 ? '#3f8fe0' : '#e8344a'} ${Math.round(30 + 60 * (temp - 90) / 9)}%, #fff 0)`}} />
            <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 62, color: `rgb(${Math.round(lerp(214, 40, cold))},${Math.round(lerp(40, 110, cold))},${Math.round(lerp(58, 220, cold))})`}}>{temp.toFixed(1)}°F</span>
          </div>
          {dead && Math.floor(hrs + 1e-6) >= 1 ? <div style={{position: 'absolute', left: '50%', top: -52, transform: 'translateX(-50%)', fontFamily: heavy, fontWeight: 900, fontSize: 40, color: YEL, WebkitTextStroke: '8px #111', paintOrder: 'stroke fill', whiteSpace: 'nowrap'}}>+{Math.min(4, Math.floor(hrs + 1e-6))} HR{Math.floor(hrs + 1e-6) > 1 ? 'S' : ''}</div> : null}
        </div>,
      );
    }
    if (p === 'flash' && dead) {
      const q = at(V(CLOCK.x, CLOCK.y - 0.5, CLOCK.z));
      ov.push(<div key="clk" style={{position: 'absolute', left: Math.min(860, Math.max(220, q.x)), top: Math.max(610, q.y), transform: 'translate(-50%, 0)', fontFamily: MONO, fontWeight: 900, fontSize: 38, color: '#fff', background: 'rgba(17,17,26,.85)', padding: '4px 16px', borderRadius: 10, border: `3px solid ${YEL}`}}>{fmt(clockState(s).hr)}</div>);
    }
  }
  // the reading: taken ✓ / found ✗
  if (p === 'reading' && s >= T.taken) {
    const q = at(V(0.75, 0.95, 0.05));
    const x = Math.min(860, Math.max(220, q.x));
    const y = Math.min(1500, Math.max(780, q.y));
    ov.push(<Tag key="tk" x={x} y={y - 80} k={pop(frame, T.taken, fps)} bg={GOOD} fg={OL}>TAKEN 12:00 AM ✓</Tag>);
    if (s >= T.found) ov.push(<Tag key="fd" x={x} y={y + 10} k={pop(frame, T.found, fps)} bg={PAPER} fg="#d6293a" border="#d6293a" size={30} rot={-3} strike>WHEN IT WAS FOUND</Tag>);
  }
  if (p === 'hook' && s >= T.readbody + 0.35) {
    const q = at(V(0.75, 0.95, 0.05));
    ov.push(<Tag key="hk" x={Math.min(860, Math.max(220, q.x))} y={Math.min(1500, Math.max(780, q.y)) - 80} k={pop(frame, T.readbody + 0.35, fps)} bg={YEL} fg={OL}>READ THE BODY</Tag>);
  }
  // the test: suspect clue tags
  const CLUE = [
    ['HOME ALONE', '5 – 7 PM'],
    ['WALKING ALONE', '7:30 – 9 PM'],
    ['DINNER 7 – 9 PM', 'FOUND BODY 10 PM'],
  ];
  if (p === 'test') {
    const onClk = (s >= T.midnight - 0.12 && s < T.walking - 0.12) || (s >= T.ten - 0.15 && s < T.isA - 0.12);
    SUS_AT.forEach((v, i) => {
      const q = at(V(v.x, 2.05, v.z));
      if (!inView(q) || onClk) return;
      const hiB = i === 1 && s >= T.b;
      const hiA = i === 0 && s >= T.isA && s < T.cline;
      const hiC = i === 2 && s >= T.dinner;
      const border = hiB ? GOOD : hiA ? BAD : hiC ? GOOD : SUSPECTS[i].badge;
      ov.push(
        <div key={`clue${i}`} style={{position: 'absolute', left: Math.min(W - 160, Math.max(160, q.x)), top: q.y, transform: `translate(-50%, -100%) scale(${pop(frame, T.clues + i * 0.15, fps)})`,
          background: 'rgba(17,17,26,.9)', border: `5px solid ${border}`, borderRadius: 14, padding: '4px 10px', textAlign: 'center', whiteSpace: 'nowrap', boxShadow: '0 8px 0 rgba(0,0,0,.3)', maxWidth: 296}}>
          <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 22, color: SUSPECTS[i].badge}}>{SUSPECTS[i].letter} · {CLUE[i][0]}</div>
          <div style={{fontFamily: heavy, fontWeight: 900, fontSize: i === 2 ? 23 : 28, color: '#fff'}}>{CLUE[i][1]}</div>
        </div>,
      );
    });
    // answer marks on the close-ups
    const bq = at(V(SUS_AT[1].x, 1.02, SUS_AT[1].z));
    if (s >= T.walking && s < T.ten - 0.15 && inView(bq)) ov.push(<Tag key="b8" x={bq.x} y={bq.y} k={pop(frame, T.walking, fps)} bg={GOOD} fg={OL} size={40}>8 PM ✓</Tag>);
    const aq = at(V(SUS_AT[0].x, 1.3, SUS_AT[0].z));
    if (s >= T.trap && s < T.cline && inView(aq)) ov.push(<Tag key="trap" x={aq.x} y={aq.y} k={pop(frame, T.trap, fps)} bg={PAPER} fg={BAD} border={BAD} size={84} rot={-12}>TRAP!</Tag>);
    const cq = at(V(SUS_AT[2].x, 1.3, SUS_AT[2].z));
    if (s >= T.dinner && inView(cq)) ov.push(<Tag key="din" x={cq.x} y={cq.y} k={pop(frame, T.dinner, fps)} bg={GOOD} fg={OL} size={40} rot={-4}>AT DINNER AT 8 ✓</Tag>);
    // clock close-ups: the count-back, written out
    const onClock = (s >= T.midnight - 0.1 && s < T.walking - 0.12) || (s >= T.ten - 0.15 && s < T.isA - 0.12);
    if (onClock) {
      const ans = s < T.ten - 0.15;
      const q = at(V(CLOCK.x, CLOCK.y - 0.5, CLOCK.z));
      ov.push(<Tag key="cnt" x={540} y={Math.min(1500, Math.max(980, q.y + 40))} bg={ans ? GOOD : BAD} fg={OL} size={50}>
        {ans ? '12 AM − 4 HRS' : '10 PM − 4 HRS'} = {fmt(clockState(s).hr)}</Tag>);
    }
  }
  // the catch: everything changes the cooling rate
  if (p === 'catch') {
    const chips: Array<[string, number, string]> = [['HOT ROOM', T.hot, '#ff4f5e'], ['COLD ROOM', T.cold, '#3fa0ff'], ['CLOTHES', T.clothes, '#b07cff'], ['BODY SIZE', T.size, '#ff9a1f']];
    if (s < T.window1 - 0.15) {
      chips.forEach(([t, at0, cl], i) => { if (s >= at0) ov.push(<Tag key={`ch${i}`} x={i % 2 ? 760 : 320} y={760 + Math.floor(i / 2) * 110} k={pop(frame, at0, fps)} bg={cl} fg={OL} size={40}>{t}</Tag>); });
      if (s >= T.change) {
        const rates = ['0.8', '1.1', '1.5', '2.0', '2.6'];
        const r = rates[Math.floor((s - T.change) * 6) % rates.length];
        ov.push(<Tag key="rate" x={540} y={1180} k={pop(frame, T.change, fps)} bg={PAPER} fg={OL} size={56}>{r}°F / HOUR?</Tag>);
      }
    } else {
      ov.push(<Tag key="win" x={540} y={1180} k={pop(frame, T.window1, fps)} bg={GOOD} fg={OL} size={50}>TIME WINDOW · 6:30 – 9:30 PM</Tag>);
      if (s >= T.exact) ov.push(<Tag key="ex" x={540} y={1300} k={pop(frame, T.window1 + 0.3, fps)} bg={PAPER} fg={BAD} border={BAD} size={34} strike>EXACTLY 8:00 PM</Tag>);
    }
  }
  // ending: confession + the window
  if (p === 'end') {
    const bq = at(V(SUS_AT[1].x, 2.1, SUS_AT[1].z));
    if (s >= T.confess && s < T.window2 - 0.15 && inView(bq)) ov.push(<Tag key="conf" x={Math.min(820, Math.max(260, bq.x))} y={bq.y} k={pop(frame, T.confess, fps)} bg={PAPER} fg={OL} size={44}>OKAY, I DID IT!</Tag>);
    if (s >= T.window2) ov.push(<Tag key="slam" x={540} y={1180} k={pop(frame, T.window2, fps)} bg={BAD} fg="#fff" size={50} rot={-4}>A WINDOW, NOT A TIME.</Tag>);
  }

  // header card (series style)
  const answered = s >= T.b;
  const counting = s >= T.test && s < T.test + TEST_SECS;
  const left = Math.max(0, TEST_SECS - Math.max(0, s - T.test));
  const ringK = s < T.test ? 1 : left / TEST_SECS;
  const urgent = counting && left <= 2;
  const head = p === 'hook' || p === 'end' ? 'WAKE UP DEAD MAN · THE MOVIE' : p === 'test' ? (answered ? 'THE ANSWER' : 'YOUR TURN') : p === 'catch' ? 'THE CATCH' : 'REAL LIFE · FORENSIC SCIENCE';
  const title = p === 'hook' ? (s >= T.readbody ? 'THEY READ THE BODY' : 'HE READS PEOPLE')
    : p === 'flash' ? (s < T.die ? 'ALIVE = 98.6°F' : s < T.six ? '−1.5°F EVERY HOUR' : '6° COLDER = 4 HOURS')
      : p === 'reading' ? 'COUNT FROM THE READING'
        : p === 'test' ? (answered ? 'B DID IT' : 'WHO DID IT?')
          : p === 'catch' ? (s >= T.window1 ? 'A WINDOW, NOT A TIME' : 'BODIES COOL DIFFERENTLY')
            : 'DETECTIVES GET A WINDOW';
  const caseOn = p === 'test';
  const cardH = caseOn ? 300 : 140;
  const midHi = caseOn && s >= T.midnight;
  const tenHi = caseOn && s >= T.ten - 0.15 && s < T.cline;
  const card = (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: cardH, background: PAPER, borderRadius: 14, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{height: 46, background: p === 'hook' || p === 'end' ? '#4a1420' : '#1e2a44', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: YEL}} />
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: PAPER}}>{head}</span>
      </div>
      <div style={{position: 'absolute', left: 26, top: 62, fontFamily: heavy, fontWeight: 900, fontSize: title.length > 19 ? 44 : 52, color: answered && caseOn ? '#2a8a5a' : OL, whiteSpace: 'nowrap'}}>{title}</div>
      {caseOn && !answered ? (
        <svg width={120} height={120} style={{position: 'absolute', left: 706, top: 52}}>
          <circle cx={60} cy={60} r={44} fill={urgent ? '#ffe0e0' : '#fff'} stroke="#d8d2c4" strokeWidth={10} />
          <circle cx={60} cy={60} r={44} fill="none" stroke={urgent ? BAD : '#2a8a5a'} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 44 * ringK} 999`} transform="rotate(-90 60 60)" />
          <text x={60} y={76} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={46} fill={urgent ? '#d6293a' : OL}>{s < T.test ? TEST_SECS : Math.ceil(left - 1e-6)}</text>
        </svg>
      ) : null}
      {caseOn ? (
        <div style={{position: 'absolute', left: 18, top: 136, width: 804, height: 150, display: 'flex', gap: 16}}>
          <div style={{flex: 1, border: `4px solid ${OL}`, borderRadius: 12, padding: '6px 14px', background: '#fff'}}>
            <div style={{fontFamily: MONO, fontWeight: 900, fontSize: 22, color: '#5a6070'}}>BODY TEMP</div>
            <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 64, color: BAD, lineHeight: 1}}>92.6°F</div>
            <div style={{display: 'inline-block', marginTop: 6, fontFamily: MONO, fontWeight: 900, fontSize: 20, color: midHi ? OL : '#5a6070', background: midHi ? GOOD : 'transparent', padding: '0 4px'}}>TAKEN 12:00 AM</div>
          </div>
          <div style={{flex: 1.1, border: `${tenHi ? 8 : 4}px solid ${tenHi ? BAD : OL}`, borderRadius: 12, padding: '6px 14px', background: YEL}}>
            <div style={{fontFamily: MONO, fontWeight: 900, fontSize: 26, color: OL}}>BODY FOUND</div>
            <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 76, color: OL, lineHeight: 1.05}}>10:00 PM</div>
          </div>
        </div>
      ) : null}
    </div>
  );
  const capTop = caseOn ? 570 : 430;

  // captions: 1-2 words, never across a sentence/comma break
  const chunks: Array<{t: number; e: number; text: string}> = [];
  LINES.forEach((ln, li) => {
    const ws = ln.words;
    const toks = (episode as {lines: Array<{text: string}>}).lines[li].text.split(/\s+/);
    const stop = (i: number) => toks.length === ws.length && /[.,!?]$/.test(toks[i]);
    for (let i = 0; i < ws.length; i += 2) {
      const a = ws[i];
      const b = ws[i + 1];
      const long = a.text.length > 7 || (b && b.text.length > 7) || stop(i);
      const take = long ? [a] : b ? [a, b] : [a];
      if (long) i -= 1;
      const next = ws[i + (long ? 1 : 2)];
      chunks.push({t: STARTS[li] + a.start, e: next ? STARTS[li] + next.start : STARTS[li] + a.end + 0.25, text: take.map((x) => x.text).join(' ')});
    }
  });
  const cap = chunks.find((k) => s >= k.t && s < k.e);
  const capSize = cap ? Math.min(112, 820 / (cap.text.length * 0.78)) : 0;
  const capPop = cap ? 0.6 + 0.4 * spring({frame: frame - Math.round(cap.t * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;

  // sound: few, soft
  const sfx: Array<[number, string, number]> = [
    [T.readbody - 0.1, 'sfx/whoosh.wav', 0.25], [T.flash, 'sfx/whoosh.wav', 0.25], [T.die - 0.18, 'sfx/powerdown.wav', 0.3],
    ...Array.from({length: 18}).map((_, k) => TL0 + k * ((TL1 - TL0) / 18)).map((t) => [t, 'sfx/tick.wav', 0.18] as [number, string, number]),
    [T.taken, 'sfx/ding.wav', 0.35], [T.turn, 'sfx/whoosh.wav', 0.3],
    ...Array.from({length: TEST_SECS}).map((_, k) => [T.test + k, 'sfx/tick.wav', k >= TEST_SECS - 3 ? 0.55 : 0.3] as [number, string, number]),
    [T.b, 'sfx/ding.wav', 0.5], [T.walking, 'sfx/pop.wav', 0.3], [T.trap, 'sfx/pop.wav', 0.35], [T.dinner, 'sfx/ding.wav', 0.3],
    ...Array.from({length: 8}).map((_, k) => [T.midnight + k * ((T.eight - T.midnight) / 8), 'sfx/tick.wav', 0.25] as [number, string, number]),
    ...[T.hot, T.cold, T.clothes, T.size].map((t) => [t, 'sfx/pop.wav', 0.25] as [number, string, number]),
    [T.window1, 'sfx/shine.wav', 0.35], [T.confess, 'sfx/pop.wav', 0.3], [T.window2, 'sfx/ding.wav', 0.4],
  ];

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={W} height={H} dpr={1} flat shadows={{type: THREE.PCFSoftShadowMap}} gl={{antialias: false, preserveDrawingBuffer: true}}>
        <Scene s={s} c={c} />
      </ThreeCanvas>
      {ov}
      {card}
      {cap ? (
        <div style={{position: 'absolute', top: capTop, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: capSize, lineHeight: 1,
          color: '#fff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`, paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: 'nowrap',
          transform: `scale(${capPop})`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}
      {s >= T.test + TEST_SECS && s < T.b ? <div style={{position: 'absolute', left: 0, top: 1150, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: 120, color: '#fff', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill'}}>TIME!</div> : null}
      <div style={{position: 'absolute', left: 0, bottom: 560, width: W, textAlign: 'center', fontFamily: MONO, fontWeight: 900, fontSize: 20, color: 'rgba(255,255,255,.55)'}}>
        {p === 'hook' ? 'ORIGINAL ART · NOT FROM THE FILM' : p === 'flash' ? 'RULE OF THUMB · ROOM TEMP, FIRST ~12 HRS' : ''}
      </div>
      <Audio src={staticFile('music/tod-3d.wav')} volume={0.36} />
      {LINES.map((ln, i) => <Sequence key={i} from={Math.round(STARTS[i] * fps)}><Audio src={staticFile(ln.file)} /></Sequence>)}
      {sfx.map(([t, f, v], i) => <Sequence key={`s${i}`} from={Math.max(0, Math.round(t * fps))} durationInFrames={60}><Audio src={staticFile(f)} volume={v} /></Sequence>)}
    </AbsoluteFill>
  );
};
