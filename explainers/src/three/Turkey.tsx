// "The kid who tried to steal a Thanksgiving turkey" (2026-11-26, story short, 3D).
// A boy from the one tiny house on a rich street tries to swipe Mrs. Pemberton's
// windowsill turkey, trips over the gnome, the turkey flies into her hands, he admits
// they're too poor for a turkey, and she calls the whole street: a sunset feast, 12 turkeys.
// Original story + characters. Voice: one Gemini take (Laomedeia). Music: flow_music --key warm.
import React from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Blob, CamS, Card, H, Mats, Post, Shot, V, W, camOf, clamp01, col, easeOut, lerp, makeCam, project, shotCam, smoother, useCanvas, useGradient, vl} from './kit';
import {DOOR, Feast, GNOME, HEDGE, KITCHEN, Kitchen, SILL, Sky, Street, Turkey3D, useStreetTex} from './street';
import {BoyPose, Dish, LadyPose, Mood, SUSPECTS, Suspect, drawBoy, drawLady, drawSuspect} from './toon';
import timing from '../../episodes/turkey.timing.json';
import episode from '../../episodes/turkey.json';

const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const OL = '#1b1b22';
const PAPER = '#f4f1ea';
const YEL = '#ffd23f';

// ───────────────────────── story clock ─────────────────────────
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
  richest: wt(0, 'richest'), cant: wt(0, 'cant'),
  smells: wt(1, 'smells'), fridge: wt(1, 'fridge'), empty: wt(1, 'empty'),
  plan: wt(2, 'plan'), pemb: wt(2, 'pemberton'),
  sneaks: wt(3, 'sneaks'), grabs: wt(3, 'grabs'), heavier: wt(3, 'heavier'),
  wobbles: wt(4, 'wobbles'), trips: wt(4, 'trips'), gnome: wt(4, 'gnome'), flying: wt(4, 'flying'),
  right: STARTS[5], hands: wt(5, 'hands'), busted: STARTS[6],
  run: wt(7, 'run'), sorry: wt(7, 'sorry'), poor: wt(7, 'poor'),
  police: wt(8, 'police'), neighbors: wt(8, 'neighbors'),
  potatoes: wt(9, 'potatoes'), pie: wt(9, 'pie'), second: wt(9, 'second'),
  sunset: STARTS[10], table: wt(10, 'table'), street: wt(10, 'street'),
  kid: STARTS[11], twelve: wt(11, 'twelve'), happy: STARTS[12],
};
export const TURKEY_FRAMES = Math.ceil((lastEnd(12) + 2.2) * 30);

// ───────────────────────── where everyone is ─────────────────────────
const B0 = V(9.2, 0, -3.9); // the boy on the sidewalk outside his tiny house
const HIDE = V(HEDGE.x - 0.1, 0, HEDGE.z - 0.75);
const GRAB = V(SILL.x + 0.5, 0, -5.35);
const FALL = V(GNOME.x + 0.25, 0, GNOME.z + 0.15);
const UP = V(FALL.x - 0.3, 0, FALL.z + 0.05);
const LADY = V(DOOR.x, 0, -4.75); // steps out between the porch columns
const TABLE_Z = -0.75;
const NEIGH: Array<{p: Suspect; dish: Dish; from: THREE.Vector3; to: THREE.Vector3; at: number; seat: number}> = [
  {p: {...SUSPECTS[0], top: '#3d8a5a', top2: '#f6e7cf'}, dish: 'potatoes', from: V(-11.3, 0, -4.6), to: V(-2.0, 0, -2.7), at: T.potatoes, seat: -3.3},
  {p: SUSPECTS[2], dish: 'pie', from: V(17.4, 0, -4.6), to: V(3.3, 0, -2.8), at: T.pie, seat: 2.2},
  {p: {...SUSPECTS[1], top: '#d9772f', top2: '#f0b060'}, dish: 'turkey', from: V(-8, 0, 4.4), to: V(0.8, 0, -1.9), at: T.second, seat: 3.6},
];
const EXTRA: Suspect[] = [
  {letter: '', badge: '#fff', skin: '#c98e64', hair: '#2b2230', style: 'bun', top: '#3f6fb0', top2: '#e6eef8', legs: '#3a3346', skirt: true},
  {letter: '', badge: '#fff', skin: '#f0c8a8', hair: '#8a5a3a', style: 'side', top: '#8a2733', top2: '#ffffff', legs: '#26242e'},
];
const EXTRA_SEAT = [-4.7, 5.0];

const sunAt = (s: number) => (s < T.sunset ? 0 : clamp01((s - T.sunset) / Math.max(1, T.street - T.sunset + 0.6)) * 2); // 0 golden, 1 sunset, 2 dusk
const tri = (k: number, a: string, b: string, c: string) => (k < 1 ? col(a, b, k) : col(b, c, k - 1));

// ───────────────────────── camera ─────────────────────────
const C = camOf;
const boyAt = (s: number): THREE.Vector3 => {
  if (s < T.sneaks) return s < T.plan - 0.3 ? B0 : HIDE;
  if (s < T.grabs - 0.1) return vl(HIDE, GRAB, smoother((s - T.sneaks) / Math.max(0.3, T.grabs - 0.1 - T.sneaks)));
  if (s < T.wobbles) return GRAB;
  if (s < T.trips) { // step out from under the porch line first, then sideways to the gnome
    const k = smoother((s - T.wobbles) / Math.max(0.3, T.trips - T.wobbles));
    return V(lerp(GRAB.x, GNOME.x - 0.35, k), 0, lerp(GRAB.z, -4.62, clamp01(k * 4)));
  }
  if (s < STARTS[7]) return FALL;
  if (s < T.sunset) return UP;
  return V(0.3, 0, TABLE_Z);
};
// turkey flight: from the boy's arms to her hands
const FLY0 = V(GNOME.x - 0.2, 0.75, -4.6);
const FLY1 = V(LADY.x + 0.02, 1.02, LADY.z + 0.2);
const flyK = (s: number) => clamp01((s - (T.trips + 0.12)) / Math.max(0.5, T.hands - T.trips - 0.12));
const flyPos = (s: number) => { const k = flyK(s); const p = vl(FLY0, FLY1, k); p.y += Math.sin(k * Math.PI) * 2.4; return p; };

const SHOTS: Shot[] = [
  {t: 0, cut: true, cam: C(V(-12, 3.6, 7.5), V(2, 2.0, -6), 50, V(0, 2, -6))},
  {t: 0.05, dur: T.cant - 0.3, ease: 'smooth', cam: C(V(5.6, 2.1, 4.6), V(8.9, 1.5, -5.6), 46, B0.clone().setY(0.8), 3)},
  {t: T.cant - 0.12, dur: 0.5, ease: 'out', cam: C(V(9.7, 1.05, -1.0), V(9.2, 0.78, -3.9), 40, B0.clone().setY(0.8), 8)},
  {t: STARTS[1] - 0.02, cut: true, cam: C(V(10.5, 1.15, -1.1), V(8.4, 1.15, -4.6), 46, V(9.2, 0.9, -3.9), 6)},
  {t: T.fridge - 0.12, cut: true, cam: C(V(KITCHEN.x + 1.3, 1.35, 1.7), V(KITCHEN.x + 0.35, 1.0, -1.4), 46, V(KITCHEN.x + 0.6, 1.0, -1.3), 7)},
  {t: STARTS[2] - 0.02, cut: true, cam: C(V(HEDGE.x + 1.0, 1.15, -1.2), V(HEDGE.x - 0.1, 0.72, -5.3), 40, HIDE.clone().setY(0.8), 8)},
  {t: T.pemb - 0.12, cut: true, cam: C(V(SILL.x + 1.0, 1.35, -3.6), V(SILL.x, 0.95, -5.9), 40, SILL.clone(), 9)},
  {t: T.sneaks - 0.1, cut: true, cam: (s) => { const b = boyAt(s); return C(V(b.x + 1.1, 2.1, -2.0), V(b.x - 0.5, 0.55, -5.3), 46, b.clone().setY(0.6), 4); }},
  {t: T.grabs - 0.12, dur: 0.45, ease: 'out', cam: C(V(SILL.x + 1.2, 1.15, -3.3), V(SILL.x + 0.35, 0.8, -5.4), 42, GRAB.clone().setY(0.8), 8)},
  {t: T.heavier - 0.1, dur: 0.4, ease: 'out', cam: C(V(SILL.x + 1.0, 0.9, -3.4), V(SILL.x + 0.5, 0.72, -5.35), 36, GRAB.clone().setY(0.7), 10)},
  {t: T.wobbles - 0.05, cut: true, cam: C(V(4.6, 0.85, -1.5), V(0.1, 0.85, -4.9), 50, V(0.6, 0.7, -4.7), 3)},
  {t: T.trips + 0.1, cut: true, cam: (s) => { const p = flyPos(s); return C(V(3.9, 1.05, -1.6), p, 48, p, 4); }},
  {t: T.hands - 0.1, cut: true, cam: C(V(1.45, 1.45, -3.0), V(LADY.x, 1.25, LADY.z), 38, LADY.clone().setY(1.3), 9)},
  {t: T.busted - 0.04, dur: 0.18, ease: 'out', cam: C(V(1.25, 1.55, -3.4), V(LADY.x, 1.45, LADY.z), 31, LADY.clone().setY(1.5), 10)},
  {t: STARTS[7] - 0.02, cut: true, cam: C(V(1.5, 1.3, -0.1), V(1.5, 0.95, -4.6), 50, UP.clone().setY(0.8), 4)},
  {t: T.poor - 0.12, dur: 0.5, ease: 'out', cam: C(V(2.25, 0.95, -3.1), V(UP.x, 0.78, UP.z), 38, UP.clone().setY(0.8), 9)},
  {t: STARTS[8] - 0.02, cut: true, cam: C(V(1.35, 1.55, -3.3), V(LADY.x, 1.4, LADY.z), 40, LADY.clone().setY(1.4), 8)},
  {t: T.neighbors - 0.1, cut: true, cam: C(V(1.5, 5.2, 9.5), V(1.5, 1.4, -5), 52, V(0, 1, -5), 0)},
  {t: STARTS[9] - 0.02, cut: true, cam: C(V(0.4, 2.3, 6.8), V(0.4, 1.2, -2.2), 50, V(0.4, 1, -2.5), 3)},
  {t: T.sunset - 0.02, cut: true, cam: C(V(0, 3.0, 6.8), V(0, 1.1, -0.6), 50, V(0, 0.9, -0.6), 0)},
  {t: T.sunset + 0.05, dur: T.kid - T.sunset, ease: 'smooth', cam: C(V(0, 5.6, 9.2), V(0, 0.9, -0.6), 50, V(0, 0.9, -0.6), 0)},
  {t: T.kid - 0.02, cut: true, cam: C(V(0.7, 1.85, 2.0), V(0.3, 1.0, -0.75), 40, V(0.3, 1.0, -0.75), 8)},
  {t: T.twelve - 0.12, dur: 0.7, ease: 'out', cam: C(V(0, 5.4, 9.8), V(0, 0.8, -0.3), 52, V(0, 0.8, -0.3), 0)},
];

// ───────────────────────── 3D scene ─────────────────────────
const Cast: React.FC<{s: number; camPos: THREE.Vector3; tint: THREE.Color}> = ({s, camPos, tint}) => {
  const boy = useCanvas(600, 1000);
  const lady = useCanvas(600, 1000);
  const nb = [useCanvas(600, 1000), useCanvas(600, 1000), useCanvas(600, 1000)];
  const ex = [useCanvas(600, 1000), useCanvas(600, 1000)];
  const feast = s >= T.sunset;
  const inKitchen = s >= T.fridge - 0.12 && s < STARTS[2] - 0.02;
  // the boy
  let pose: BoyPose = 'stand';
  let mood: Parameters<typeof drawBoy>[2] = 'sad';
  let roll = 0;
  let walk = 0;
  if (s < STARTS[1]) mood = 'sad';
  else if (s < T.fridge - 0.12) { pose = 'sniff'; mood = 'sniff'; }
  else if (s < STARTS[2]) mood = 'sad';
  else if (s < T.sneaks) { pose = 'sneak'; mood = 'sneaky'; }
  else if (s < T.grabs - 0.1) { pose = 'sneak'; mood = 'sneaky'; walk = (s - T.sneaks) * 10; }
  else if (s < T.trips) {
    pose = 'carry'; mood = s >= T.heavier ? 'shock' : 'sneaky';
    if (s >= T.heavier - 0.1) roll = Math.sin(s * 9) * 0.13;
    if (s >= T.wobbles) walk = (s - T.wobbles) * 9;
  } else if (s < STARTS[7]) { pose = 'fall'; mood = 'shock'; roll = -lerp(0, 1.45, easeOut((s - T.trips) / 0.35)); }
  else if (s < T.sunset) {
    roll = -1.45 * (1 - easeOut((s - STARTS[7]) / 0.4));
    pose = s >= T.sorry ? 'sorry' : 'stand';
    mood = s >= T.neighbors ? 'shock' : s >= T.sorry ? 'sorry' : 'sad';
    if (s >= STARTS[9]) { pose = 'stand'; mood = 'happy'; }
  } else { pose = 'happy'; mood = 'happy'; }
  drawBoy(boy.ctx, pose, mood, walk);
  boy.t.needsUpdate = true;
  const bAt = inKitchen ? V(KITCHEN.x - 0.4, 0, -0.4) : boyAt(s);
  // Mrs. Pemberton
  const ladyOn = s >= T.gnome - 0.2;
  let lp: LadyPose = 'stand';
  let lm: Parameters<typeof drawLady>[2] = 'shock';
  let lAt = LADY;
  if (ladyOn) {
    if (s < T.flying) lAt = vl(V(DOOR.x, 0, DOOR.z - 0.4), LADY, smoother((s - (T.gnome - 0.2)) / 0.6));
    if (s >= T.hands) { lp = 'catch'; lm = 'shock'; }
    if (s >= T.busted) lm = 'stern';
    if (s >= T.poor) lm = 'soft';
    if (s >= T.police - 0.3) { lp = 'phone'; lm = 'soft'; }
    if (s >= STARTS[9]) { lp = 'open'; lm = 'happy'; }
    if (feast) { lp = 'open'; lm = 'happy'; lAt = V(-1.1, 0, TABLE_Z); }
    drawLady(lady.ctx, lp, lm);
    lady.t.needsUpdate = true;
  }
  // neighbors
  const nOn = NEIGH.map((n) => s >= n.at - 1.1);
  NEIGH.forEach((n, i) => {
    if (!nOn[i] && !feast) return;
    drawSuspect(nb[i].ctx, n.p, 'happy' as Mood, 0, {noBadge: true, dish: feast ? undefined : n.dish});
    nb[i].t.needsUpdate = true;
  });
  if (feast) EXTRA.forEach((p, i) => { drawSuspect(ex[i].ctx, p, 'happy' as Mood, 0, {noBadge: true}); ex[i].t.needsUpdate = true; });
  // the turkey
  let turkeyAt: THREE.Vector3 | null = SILL;
  let turkeyRot: [number, number, number] = [0, 0.3, 0];
  if (s >= T.grabs && s < T.trips + 0.12) { turkeyAt = bAt.clone().add(V(0, 0.62, 0.12)); turkeyRot = [0, 0.3, roll * 0.8]; }
  else if (s >= T.trips + 0.12 && s < T.hands) { turkeyAt = flyPos(s); const k = flyK(s); turkeyRot = [k * 9, k * 4, k * 6]; }
  else if (s >= T.hands && s < T.police - 0.3) turkeyAt = V(LADY.x + 0.02, 1.02, LADY.z + 0.2);
  else if (s >= T.police - 0.3) turkeyAt = s < T.sunset ? V(DOOR.x + 1.0, 0.2, DOOR.z + 0.5) : null;
  if (inKitchen) turkeyAt = null;
  return (
    <group>
      <Blob at={bAt} rx={0.3} rz={0.14} />
      <Card tex={boy.t} wpx={600} hpx={1000} at={bAt} cam={camPos} tint={tint} roll={roll} />
      {ladyOn ? <><Blob at={lAt} rx={0.34} rz={0.16} /><Card tex={lady.t} wpx={600} hpx={1000} at={lAt} cam={camPos} tint={tint} /></> : null}
      {NEIGH.map((n, i) => {
        if (!nOn[i] && !feast) return null;
        const at = feast ? V(n.seat, 0, TABLE_Z) : vl(n.from, n.to, smoother((s - (n.at - 1.1)) / 1.6));
        return <React.Fragment key={i}><Blob at={at} rx={0.34} rz={0.16} /><Card tex={nb[i].t} wpx={600} hpx={1000} at={at} cam={camPos} tint={tint} /></React.Fragment>;
      })}
      {feast ? EXTRA.map((_, i) => <React.Fragment key={`x${i}`}><Card tex={ex[i].t} wpx={600} hpx={1000} at={V(EXTRA_SEAT[i], 0, TABLE_Z)} cam={camPos} tint={tint} /></React.Fragment>) : null}
      <TurkeySlot s={s} at={turkeyAt} rot={turkeyRot} />
    </group>
  );
};
const MatsCtx = React.createContext<Mats | null>(null);
const TurkeySlot: React.FC<{s: number; at: THREE.Vector3 | null; rot: [number, number, number]}> = ({at, rot}) => {
  const m = React.useContext(MatsCtx);
  return at && m ? <Turkey3D m={m} p={at} rot={rot} /> : null;
};

const Scene: React.FC<{s: number; c: CamS}> = ({s, c}) => {
  const {camera, scene} = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.copy(c.pos);
  cam.fov = c.fov;
  cam.near = 0.05;
  cam.far = 60; // must match the post pass's depth linearisation
  cam.lookAt(c.look);
  cam.updateProjectionMatrix();
  const tex = useStreetTex();
  const grad = useGradient();
  const mats = React.useMemo<Mats>(() => {
    const cache = new Map<string, THREE.MeshToonMaterial>();
    return {toon: (color, map) => {
      const key = color + (map ? map.uuid : '');
      if (!cache.has(key)) cache.set(key, new THREE.MeshToonMaterial({color, map, gradientMap: grad}));
      return cache.get(key)!;
    }};
  }, [grad]);
  const sun = sunAt(s);
  const top = tri(sun, '#6fa3e0', '#5a6fb8', '#24305e');
  const hor = tri(sun, '#ffd9a0', '#ff9a5a', '#d97a6a');
  scene.background = hor;
  scene.fog = new THREE.Fog(hor, 30, 58);
  const lights = clamp01(sun - 1);
  const tint = tri(sun, '#fff4e4', '#ffe0c8', '#d8dcff');
  const tipK = s >= T.trips ? easeOut((s - T.trips) / 0.3) : 0;
  const doorK = s >= T.gnome - 0.45 ? easeOut((s - (T.gnome - 0.45)) / 0.4) : 0;
  const doorsN = s >= T.neighbors ? easeOut((s - T.neighbors) / 0.5) : 0;
  const tableK = s >= T.table - 0.4 ? clamp01((s - (T.table - 0.4)) / 1.1) : 0;
  return (
    <MatsCtx.Provider value={mats}>
      <Sky top={`#${top.getHexString()}`} horizon={`#${hor.getHexString()}`} />
      <hemisphereLight args={[tri(sun, '#fff0d8', '#ffc8a0', '#7f90d0'), '#4a3a2a', lerp(1.15, 0.75, sun / 2)]} />
      <directionalLight position={[-14, lerp(9, 3.5, sun / 2), 9]} color={tri(sun, '#ffd8a0', '#ff8a4a', '#8ea6ff')} intensity={lerp(2.3, 0.7, sun / 2)}
        castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0008} />
      {lights > 0 ? [-4, 0, 4].map((x) => <pointLight key={x} position={[x, 2.6, 0.2]} color="#ffc27a" intensity={4 * lights} distance={7} decay={1.5} />) : null}
      <Street m={mats} tex={tex} glow={clamp01(sun * 0.7)} tip={tipK} doorOpen={doorK} doorsN={doorsN} />
      <Kitchen m={mats} tex={tex} open={s >= T.fridge - 0.12 && s < STARTS[2] ? easeOut((s - T.fridge + 0.12) / 0.4) : 0} />
      <Feast m={mats} k={tableK} lights={lights} />
      <Cast s={s} camPos={c.pos} tint={tint} />
      <Post focus={c.focus.distanceTo(c.pos)} coc={c.coc} />
    </MatsCtx.Provider>
  );
};

// ───────────────────────── overlays ─────────────────────────
const pop = (frame: number, at: number, fps: number) => spring({frame: frame - Math.round(at * fps), fps, config: {damping: 10, stiffness: 220}});
const Tag: React.FC<{x: number; y: number; k?: number; bg?: string; fg?: string; border?: string; size?: number; rot?: number; children: React.ReactNode}> = ({x, y, k = 1, bg = OL, fg = '#fff', border = OL, size = 40, rot = 0, children}) => (k <= 0.01 ? null : (
  <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${k})`, fontFamily: heavy, fontWeight: 900, fontSize: size,
    background: bg, color: fg, border: `5px solid ${border}`, borderRadius: 16, padding: '6px 20px', whiteSpace: 'nowrap', boxShadow: '0 8px 0 rgba(0,0,0,.3)'}}>{children}</div>
));
const Wisps: React.FC<{x: number; y: number; s: number; n?: number; color?: string; h?: number}> = ({x, y, s, n = 3, color = '#fff3dc', h = 160}) => (
  <svg width={300} height={h + 40} style={{position: 'absolute', left: x - 150, top: y - h - 20, overflow: 'visible'}}>
    {Array.from({length: n}).map((_, i) => {
      const ph = (s * 0.9 + i / n) % 1;
      const ox = 150 + (i - (n - 1) / 2) * 46;
      const d = `M ${ox} ${h} q 22 -${h * 0.25} 0 -${h * 0.5} q -22 -${h * 0.25} 0 -${h * 0.5}`;
      return <path key={i} d={d} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" opacity={Math.sin(ph * Math.PI) * 0.85}
        transform={`translate(0 ${-ph * 40})`} />;
    })}
  </svg>
);

export const Turkey: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const c = shotCam(SHOTS, s);
  const pc = makeCam(c);
  const at = (v: THREE.Vector3) => project(pc, v);
  const ok = (q: {x: number; y: number}) => q.x > 60 && q.x < W - 60 && q.y > 520 && q.y < 1500;
  const ov: React.ReactNode[] = [];
  if (s >= T.richest && s < STARTS[1] && s < T.cant - 0.12) ov.push(<Tag key="rich" x={540} y={1180} k={pop(frame, T.richest, fps)} bg={YEL} fg={OL}>THE RICHEST STREET IN TOWN</Tag>);
  if (s >= T.cant && s < STARTS[1]) ov.push(<Tag key="no" x={540} y={1250} k={pop(frame, T.cant + 0.3, fps)} bg={PAPER} fg="#d6293a" border="#d6293a" rot={-4}>NO TURKEY</Tag>);
  if (s >= T.smells && s < T.fridge - 0.12) {
    [V(7.4, 1.5, -4.6), V(7.9, 1.2, -4.4)].forEach((v, i) => { const q = at(v); if (ok(q)) ov.push(<Wisps key={`w${i}`} x={q.x} y={q.y} s={s + i * 0.4} color="#ffe2b0" />); });
    const q = at(V(B0.x, 1.45, B0.z));
    if (ok(q)) ov.push(<Tag key="mmm" x={q.x - 40} y={q.y - 60} k={pop(frame, T.smells + 0.2, fps)} bg={PAPER} fg={OL} size={36}>MMM...</Tag>);
  }
  if (s >= T.empty && s < STARTS[2] - 0.02) ov.push(<Tag key="empty" x={540} y={1180} k={pop(frame, T.empty, fps)} bg="#d6293a" fg="#fff" size={70} rot={-6}>EMPTY</Tag>);
  if (s >= T.pemb - 0.12 && s < T.sneaks - 0.1) {
    const q = at(V(SILL.x, SILL.y + 0.25, SILL.z));
    if (ok(q)) ov.push(<Wisps key="steam" x={q.x} y={q.y} s={s} />);
    ov.push(<Tag key="pem" x={540} y={1250} k={pop(frame, T.pemb, fps)} bg={PAPER} fg="#7a3f9a" border="#7a3f9a" size={36}>MRS. PEMBERTON'S TURKEY</Tag>);
  }
  if (s >= T.heavier && s < T.wobbles - 0.05) {
    const q = at(boyAt(s).clone().setY(1.25));
    if (ok(q)) ov.push(<Tag key="hv" x={q.x + 120} y={q.y - 40} k={pop(frame, T.heavier, fps)} bg={YEL} fg={OL} size={44} rot={6}>SO HEAVY!</Tag>);
  }
  if (s >= T.trips && s < T.trips + 0.7) {
    const q = at(FALL.clone().setY(0.9));
    if (ok(q)) ov.push(<Tag key="trip" x={q.x} y={q.y - 120} k={pop(frame, T.trips, fps)} bg="#d6293a" fg="#fff" size={60} rot={-8}>TRIP!</Tag>);
  }
  if (s >= T.busted && s < STARTS[7] - 0.02) ov.push(<Tag key="bust" x={540} y={1330} k={pop(frame, T.busted, fps)} bg="#d6293a" fg="#fff" size={96} rot={-6}>BUSTED!</Tag>);
  if (s >= T.police && s < T.neighbors - 0.1) ov.push(<Tag key="ring" x={760} y={760} k={pop(frame, T.police + 0.2, fps)} bg={YEL} fg={OL} size={44} rot={8}>RING RING!</Tag>);
  if (s >= T.neighbors && s < STARTS[9] - 0.02) {
    [V(-11 + 0.7, 2.7, -5.4), V(-22 + 0.7, 2.7, -5.4), V(18 + 0.7, 2.7, -5.4)].forEach((v, i) => { const q = at(v); if (ok(q)) ov.push(<Tag key={`r${i}`} x={q.x} y={q.y} k={pop(frame, T.neighbors + 0.1 + i * 0.12, fps)} bg={YEL} fg={OL} size={30}>RING!</Tag>); });
  }
  if (s >= STARTS[9] && s < T.sunset - 0.02) {
    const labels = ['MASHED POTATOES', 'PIE', 'TURKEY #2'];
    NEIGH.forEach((n, i) => {
      if (s < n.at) return;
      const p = vl(n.from, n.to, smoother((s - (n.at - 1.1)) / 1.6)).setY(2.15);
      const q = at(p);
      if (ok(q)) ov.push(<Tag key={`d${i}`} x={Math.min(860, Math.max(220, q.x))} y={q.y} k={pop(frame, n.at, fps)} bg={PAPER} fg={OL} size={40}>{labels[i]}</Tag>);
    });
  }
  if (s >= T.twelve) ov.push(<Tag key="12" x={540} y={1040} k={pop(frame, T.twelve, fps)} bg={YEL} fg={OL} size={84} rot={-4}>12 TURKEYS</Tag>);
  if (s >= T.happy) ov.push(<Tag key="hap" x={540} y={1190} k={pop(frame, T.happy, fps)} bg="#d9772f" fg="#fff" size={58} rot={3}>HAPPY THANKSGIVING!</Tag>);

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
  const capSize = cap ? Math.min(118, 820 / (cap.text.length * 0.78)) : 0;
  const capPop = cap ? 0.6 + 0.4 * spring({frame: frame - Math.round(cap.t * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;

  const sfx: Array<[number, string, number]> = [
    [STARTS[1], 'sfx/whoosh.wav', 0.2], [T.fridge - 0.1, 'sfx/whoosh.wav', 0.25], [T.empty, 'sfx/fail.wav', 0.25],
    [T.pemb, 'sfx/shine.wav', 0.3], ...Array.from({length: 6}).map((_, k) => [T.sneaks + k * 0.28, 'sfx/tick.wav', 0.15] as [number, string, number]),
    [T.grabs, 'sfx/pop.wav', 0.35], [T.heavier, 'sfx/powerdown.wav', 0.2], [T.trips, 'sfx/boom.wav', 0.3], [T.trips + 0.12, 'sfx/whoosh.wav', 0.45],
    [T.hands, 'sfx/pop.wav', 0.45], [T.busted, 'sfx/slam.wav', 0.55], [T.police, 'sfx/ding.wav', 0.3], [T.police + 0.25, 'sfx/ding.wav', 0.3],
    [T.potatoes, 'sfx/pop.wav', 0.3], [T.pie, 'sfx/pop.wav', 0.3], [T.second, 'sfx/pop.wav', 0.3], [T.table, 'sfx/shine.wav', 0.35],
    [T.twelve, 'sfx/ding.wav', 0.45], [T.happy, 'sfx/shine.wav', 0.4],
  ];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={W} height={H} dpr={1} flat shadows={{type: THREE.PCFSoftShadowMap}} gl={{antialias: false, preserveDrawingBuffer: true}}>
        <Scene s={s} c={c} />
      </ThreeCanvas>
      {ov}
      {cap ? (
        <div style={{position: 'absolute', top: 330, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: capSize, lineHeight: 1,
          color: '#fff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`, paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: 'nowrap',
          transform: `scale(${capPop})`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}
      <Audio src={staticFile('music/turkey.wav')} volume={0.36} />
      {LINES.map((ln, i) => <Sequence key={i} from={Math.round(STARTS[i] * fps)}><Audio src={staticFile(ln.file)} /></Sequence>)}
      {sfx.map(([t, f, v], i) => <Sequence key={`s${i}`} from={Math.max(0, Math.round(t * fps))} durationInFrames={60}><Audio src={staticFile(f)} volume={v} /></Sequence>)}
    </AbsoluteFill>
  );
};
