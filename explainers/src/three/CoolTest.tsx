// 15 s 3D test: "the body clock" acted out instead of charted.
// 2D cartoon cards in a toon-lit 3D study (three.js in Remotion), with a
// screen-space ink pass, depth-of-field and grade. Narration = Time of Death
// lines 2-5 (same voice). Look techniques after the MIT-licensed
// mromidev/claude-animated-shorts skill (separate ink pass, cards excluded from
// world ink, lens blur by depth, every hold creeps). All art is our own.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useFrame, useThree} from '@react-three/fiber';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {PX_M, SKIN_ALIVE, SKIN_COLD, drawDetectiveKneeling, drawDetectiveStanding, drawVictimLying, drawVictimSitting, mix} from './toon';
import timing from '../../episodes/cool-test.timing.json';
import episode from '../../episodes/cool-test.json';

const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';
// lengths come from the one-take narration (episodes/cool-test.json, flow mode)
const W = 1080;
const H = 1920;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smoother = (x: number) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vl = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, k);
const col = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k));

// ───────────────────────── story clock ─────────────────────────
type TLine = {file: string; duration: number; takeStart: number; words: Array<{text: string; start: number}>};
const LINES = (timing as unknown as {lines: TLine[]}).lines;
const LEAD = 0.3;
const STARTS = LINES.map((l) => LEAD + l.takeStart); // one continuous take, re-assembled exactly
const wt = (li: number, word: string, nth = 0) => {
  const ws = LINES[li].words.filter((x) => x.text.toLowerCase().replace(/[^a-z0-9-]/g, '') === word);
  return STARTS[li] + (ws[nth] ? ws[nth].start : 0);
};
const T = {
  ninety: wt(0, 'ninety-eight'), die: wt(1, 'dies'), lose: wt(1, 'cools'), hour: wt(1, 'hour'),
  six: wt(2, 'six'), four: wt(2, 'four'), measured: wt(3, 'taken'), found: wt(3, 'found'),
};
export const COOL_FRAMES = Math.ceil((STARTS[3] + LINES[3].duration + 1.2) * 30);
const TL0 = T.lose; // time-lapse 8 PM -> 12 AM: cools down ... six degrees colder
const TL1 = T.six + 0.1;
const DET0 = wt(3, 'heres') - 0.15;
const DET1 = DET0 + 1.1;
const hoursAt = (s: number) => clamp01((s - TL0) / (TL1 - TL0)) * 4;
const tempAt = (s: number) => 98.6 - 1.5 * hoursAt(s);
const clockAt = (s: number) => (s < T.die ? 19.5 + s * 0.12 : 20 + hoursAt(s)); // 24 h clock

// ───────────────────────── layout (metres) ─────────────────────────
const CHAIR = V(-1.55, 0, -1.7);
const SIT = V(-1.2, 0, -1.22); // just in front of the seat
const LAMP = V(-2.5, 0, -2.45);
const BODY = V(0.15, 0, 0.35);
const KNEEL = V(1.2, 0, -0.3); // behind the body's head, so he never blocks it
const CLOCK = V(-0.35, 2.3, -3.47);
const WIN = V(1.45, 1.75, -3.47);

// ───────────────────────── camera ─────────────────────────
type CamS = {pos: THREE.Vector3; look: THREE.Vector3; fov: number; focus: THREE.Vector3; coc: number};
const camAt = (s: number): CamS => {
  if (s < T.die) {
    const k = smoother(s / T.die);
    return {pos: vl(V(1.9, 1.75, 2.45), V(1.45, 1.66, 1.9), k), look: V(-1.25, 1.02, -1.3), fov: 46, focus: V(-1.2, 1.2, -1.2), coc: 8};
  }
  // orbit the body through the time-lapse
  const u = clamp01((s - T.die) / (T.four - T.die));
  const th = lerp(0.55, 0.18, smoother(u));
  const r = lerp(4.7, 4.1, u);
  const tgt = V(0.1, 0.95, -0.9);
  let c: CamS = {pos: V(tgt.x + Math.sin(th) * r, lerp(2.95, 2.6, u), tgt.z + Math.cos(th) * r), look: tgt, fov: lerp(56, 52, u), focus: BODY.clone().setY(0.3), coc: 0};
  if (s >= T.four - 0.1) {
    const k = easeOut((s - (T.four - 0.1)) / 0.45);
    const creep = Math.min(0.06, (s - T.four) * 0.02);
    c = {...c, fov: lerp(52, 44, k) * (1 - Math.max(0, creep)), look: vl(c.look, V(0.15, 0.35, -0.2), k), coc: 5 * k};
  }
  if (s >= DET0 - 0.15) {
    const k = smoother((s - (DET0 - 0.15)) / 0.9);
    const two: CamS = {pos: V(2.9, 2.1, 3.9), look: V(0.6, 0.7, -0.3), fov: 46, focus: V(0.8, 0.5, 0.0), coc: 5};
    c = {pos: vl(c.pos, two.pos, k), look: vl(c.look, two.look, k), fov: lerp(c.fov, two.fov, k), focus: vl(c.focus, two.focus, k), coc: lerp(c.coc, two.coc, k)};
  }
  if (s >= T.measured - 0.12) {
    const k = easeOut((s - (T.measured - 0.12)) / 0.5);
    const creep = 1 - Math.min(0.05, Math.max(0, s - T.measured - 0.5) * 0.02);
    const cu: CamS = {pos: V(2.25, 1.5, 3.05), look: V(0.85, 0.78, -0.15), fov: 39 * creep, focus: V(0.9, 0.5, 0.0), coc: 10};
    c = {pos: vl(c.pos, cu.pos, k), look: vl(c.look, cu.look, k), fov: lerp(c.fov, cu.fov, k), focus: vl(c.focus, cu.focus, k), coc: lerp(c.coc, cu.coc, k)};
  }
  if (s >= T.found) {
    const k = easeOut((s - T.found) / 0.5);
    c = {...c, fov: lerp(c.fov, 38, k), coc: lerp(c.coc, 7, k)};
  }
  return c;
};
const makeCam = (c: CamS) => {
  const cam = new THREE.PerspectiveCamera(c.fov, W / H, 0.05, 60);
  cam.position.copy(c.pos);
  cam.lookAt(c.look);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};
const project = (cam: THREE.PerspectiveCamera, p: THREE.Vector3) => {
  const v = p.clone().project(cam);
  return {x: (v.x * 0.5 + 0.5) * W, y: (1 - (v.y * 0.5 + 0.5)) * H};
};

// ───────────────────────── painted textures ─────────────────────────
const hash = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const canvasTex = (w: number, h: number, paint: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  paint(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};
const useTextures = () => useMemo(() => ({
  wall: canvasTex(512, 512, (c) => {
    c.fillStyle = '#b48a5a'; c.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 128) { c.fillStyle = '#a37a4b'; c.fillRect(x + 20, 0, 44, 512); }
    for (let y = 32; y < 512; y += 96) for (let x = 0; x < 512; x += 128) {
      c.fillStyle = '#d2ae74'; c.beginPath(); c.moveTo(x + 104, y - 16); c.lineTo(x + 116, y); c.lineTo(x + 104, y + 16); c.lineTo(x + 92, y); c.fill();
    }
  }, [4, 2]),
  floor: canvasTex(512, 512, (c) => {
    for (let r = 0; r < 8; r++) {
      const off = (r % 2) * 128;
      for (let k = -1; k < 3; k++) {
        const v = 0.85 + hash(r * 7 + k, 1) * 0.3;
        c.fillStyle = `rgb(${Math.round(132 * v)},${Math.round(84 * v)},${Math.round(48 * v)})`;
        c.fillRect(off + k * 256, r * 64, 256, 64);
        c.fillStyle = 'rgba(40,20,8,.18)';
        for (let g = 0; g < 4; g++) c.fillRect(off + k * 256 + 20, r * 64 + 10 + g * 13 + hash(r, g) * 6, 200, 2);
        c.fillStyle = '#3a2210'; c.fillRect(off + k * 256, r * 64, 4, 64);
      }
      c.fillStyle = '#3a2210'; c.fillRect(0, r * 64, 512, 4);
    }
  }, [4, 4]),
  rug: canvasTex(512, 512, (c) => {
    c.fillStyle = '#1f4466'; c.fillRect(0, 0, 512, 512);
    c.strokeStyle = '#d8ad55'; c.lineWidth = 18; c.beginPath(); c.arc(256, 256, 226, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.arc(256, 256, 196, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#7a2a33'; c.beginPath(); c.arc(256, 256, 70, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#d8ad55'; c.lineWidth = 6; c.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      c.fillStyle = '#d8ad55'; c.beginPath(); c.arc(256 + Math.cos(a) * 150, 256 + Math.sin(a) * 150, 9, 0, Math.PI * 2); c.fill();
    }
  }),
  dial: canvasTex(256, 256, (c) => {
    c.fillStyle = '#f4ecd8'; c.beginPath(); c.arc(128, 128, 124, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#241726';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.save(); c.translate(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); c.rotate(a);
      c.fillRect(-4, -14, 8, i % 3 ? 16 : 28); c.restore();
    }
  }),
}), []);
const useGradient = () => useMemo(() => {
  const t = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}, []);

// ───────────────────────── world ─────────────────────────
type Mats = {toon: (c: string, map?: THREE.Texture) => THREE.MeshToonMaterial};
const Box: React.FC<{p: [number, number, number]; s: [number, number, number]; m: THREE.Material; r?: [number, number, number]}> = ({p, s, m, r}) => (
  <mesh position={p} rotation={r ?? [0, 0, 0]} material={m} castShadow receiveShadow>
    <boxGeometry args={s} />
  </mesh>
);
const World: React.FC<{s: number; mats: Mats; tex: ReturnType<typeof useTextures>}> = ({s, mats, tex}) => {
  const {toon} = mats;
  const m = useMemo(() => ({
    wall: toon('#ffffff', tex.wall), floor: toon('#ffffff', tex.floor), rug: toon('#ffffff', tex.rug),
    trim: toon('#4a2c18'), wood: toon('#5a3720'), chair: toon('#2f6a4f'), chairDark: toon('#24533e'),
    brass: toon('#c9a24a'), shade: new THREE.MeshToonMaterial({color: '#f6d9a0', emissive: '#ffb860', emissiveIntensity: 0.9, side: THREE.DoubleSide}),
    curtain: toon('#8a2733'), frame: toon('#c9a24a'), paint: toon('#5e7a58'), book: toon('#2f5f9a'), cup: toon('#f0ece2'),
    books: ['#8a2733', '#2f5f9a', '#d8ad55', '#3d6b4f', '#6a3f7a', '#c9643a'].map((c) => toon(c)),
  }), [toon, tex]);
  const hr = clockAt(s);
  const night = clamp01((hoursAt(s) + (s >= T.die ? 0.6 : 0)) / 3.2);
  const sky = col('#f08a54', '#141c46', night);
  const dead = s >= T.die;
  const hA = -(((hr % 12) / 12) * Math.PI * 2);
  const mA = -(((hr % 1)) * Math.PI * 2);
  return (
    <group>
      {/* floor + walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m.floor} receiveShadow><planeGeometry args={[7, 7]} /></mesh>
      <mesh position={[0, 1.6, -3.5]} material={m.wall} receiveShadow><planeGeometry args={[7, 3.2]} /></mesh>
      <mesh position={[-3.5, 1.6, 0]} rotation={[0, Math.PI / 2, 0]} material={m.wall} receiveShadow><planeGeometry args={[7, 3.2]} /></mesh>
      <mesh position={[3.5, 1.6, 0]} rotation={[0, -Math.PI / 2, 0]} material={m.wall} receiveShadow><planeGeometry args={[7, 3.2]} /></mesh>
      <Box p={[0, 0.07, -3.47]} s={[7, 0.14, 0.06]} m={m.trim} />
      <Box p={[-3.47, 0.07, 0]} s={[0.06, 0.14, 7]} m={m.trim} />
      <Box p={[3.47, 0.07, 0]} s={[0.06, 0.14, 7]} m={m.trim} />
      {/* rug */}
      <mesh position={[0.1, 0.012, 0.25]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.45, 1.05, 1]} material={m.rug} receiveShadow><circleGeometry args={[1.4, 48]} /></mesh>
      {/* window: sky goes dusk -> night, moon rises */}
      <mesh position={[WIN.x, WIN.y, -3.485]}><planeGeometry args={[1.1, 1.3]} /><meshBasicMaterial color={sky} /></mesh>
      <mesh position={[WIN.x + 0.22, WIN.y + 0.32 - (1 - night) * 0.5, -3.48]}><circleGeometry args={[0.11, 24]} /><meshBasicMaterial color="#f6efcf" transparent opacity={night} /></mesh>
      <Box p={[WIN.x, WIN.y + 0.69, -3.44]} s={[1.3, 0.1, 0.1]} m={m.wood} />
      <Box p={[WIN.x, WIN.y - 0.69, -3.42]} s={[1.36, 0.08, 0.16]} m={m.wood} />
      <Box p={[WIN.x - 0.6, WIN.y, -3.44]} s={[0.1, 1.4, 0.1]} m={m.wood} />
      <Box p={[WIN.x + 0.6, WIN.y, -3.44]} s={[0.1, 1.4, 0.1]} m={m.wood} />
      <Box p={[WIN.x, WIN.y, -3.45]} s={[0.05, 1.3, 0.05]} m={m.wood} />
      <Box p={[WIN.x - 0.86, WIN.y - 0.1, -3.4]} s={[0.36, 1.9, 0.08]} m={m.curtain} />
      <Box p={[WIN.x + 0.86, WIN.y - 0.1, -3.4]} s={[0.36, 1.9, 0.08]} m={m.curtain} />
      {/* wall clock (the time-lapse) */}
      <group position={[CLOCK.x, CLOCK.y, CLOCK.z]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.wood} castShadow><cylinderGeometry args={[0.34, 0.34, 0.08, 40]} /></mesh>
        <mesh position={[0, 0, 0.045]}><circleGeometry args={[0.29, 40]} /><meshBasicMaterial map={tex.dial} /></mesh>
        <mesh position={[0, 0, 0.06]} rotation={[0, 0, hA]}><boxGeometry args={[0.035, 0.32, 0.01]} /><meshBasicMaterial color="#241726" /></mesh>
        <mesh position={[0, 0, 0.065]} rotation={[0, 0, mA]}><boxGeometry args={[0.022, 0.48, 0.01]} /><meshBasicMaterial color="#241726" /></mesh>
        <mesh position={[0, 0, 0.07]}><circleGeometry args={[0.03, 16]} /><meshBasicMaterial color="#b3101f" /></mesh>
      </group>
      {/* picture frame */}
      <Box p={[-1.9, 1.9, -3.46]} s={[0.8, 0.62, 0.05]} m={m.frame} />
      <Box p={[-1.9, 1.9, -3.43]} s={[0.66, 0.48, 0.02]} m={m.paint} />
      {/* bookshelf on the left wall */}
      <group position={[-3.28, 0, 0.6]}>
        <Box p={[0, 1.05, 0]} s={[0.4, 2.1, 1.6]} m={m.wood} />
        {[0.35, 0.85, 1.35, 1.85].map((y, r) => (
          <group key={r}>
            <Box p={[0.04, y - 0.06, 0]} s={[0.36, 0.04, 1.5]} m={m.trim} />
            {Array.from({length: 9}).map((_, i) => {
              const h = 0.28 + hash(r * 9 + i, 2) * 0.12;
              return <Box key={i} p={[0.1, y - 0.04 + h / 2, -0.66 + i * 0.16]} s={[0.24, h, 0.12]} m={m.books[(r * 9 + i) % 6]} />;
            })}
          </group>
        ))}
      </group>
      {/* armchair */}
      <group position={[CHAIR.x, 0, CHAIR.z]} rotation={[0, 0.62, 0]}>
        <Box p={[0, 0.25, 0]} s={[0.95, 0.5, 0.85]} m={m.chair} />
        <Box p={[0, 0.55, 0.05]} s={[0.75, 0.14, 0.7]} m={m.chairDark} />
        <Box p={[0, 0.95, -0.36]} s={[0.95, 1.0, 0.22]} m={m.chair} />
        <Box p={[-0.46, 0.68, 0.02]} s={[0.2, 0.36, 0.84]} m={m.chairDark} />
        <Box p={[0.46, 0.68, 0.02]} s={[0.2, 0.36, 0.84]} m={m.chairDark} />
      </group>
      {/* floor lamp */}
      <group position={[LAMP.x, 0, LAMP.z]}>
        <mesh position={[0, 0.03, 0]} material={m.brass} castShadow><cylinderGeometry args={[0.2, 0.22, 0.05, 24]} /></mesh>
        <mesh position={[0, 0.8, 0]} material={m.brass} castShadow><cylinderGeometry args={[0.025, 0.025, 1.55, 12]} /></mesh>
        <mesh position={[0, 1.62, 0]} material={m.shade}><cylinderGeometry args={[0.2, 0.32, 0.36, 28, 1, true]} /></mesh>
      </group>
      {/* side table + teacup */}
      <group position={[-0.55, 0, -2.25]}>
        <mesh position={[0, 0.62, 0]} material={m.wood} castShadow receiveShadow><cylinderGeometry args={[0.3, 0.3, 0.05, 28]} /></mesh>
        <mesh position={[0, 0.31, 0]} material={m.wood} castShadow><cylinderGeometry args={[0.04, 0.06, 0.6, 12]} /></mesh>
        <mesh position={[0.05, 0.7, 0.02]} material={m.cup} castShadow><cylinderGeometry args={[0.06, 0.045, 0.09, 16]} /></mesh>
      </group>
      {/* the dropped book */}
      {dead ? <Box p={[-0.95, 0.03, 0.85]} s={[0.26, 0.05, 0.2]} m={m.book} r={[0, 0.5, 0]} /> : null}
    </group>
  );
};

/** camera-facing 2D card. lie = lying card (tilted back onto the floor) */
const Card: React.FC<{tex: THREE.Texture; wpx: number; hpx: number; at: THREE.Vector3; cam: THREE.Vector3; tint: THREE.Color; lie?: boolean; soleOff?: number}> = ({tex, wpx, hpx, at, cam, tint, lie, soleOff = 25}) => {
  const w = wpx * PX_M;
  const h = hpx * PX_M;
  const yaw = Math.atan2(cam.x - at.x, cam.z - at.z);
  const setLayer = (o: THREE.Object3D | null) => { if (o) o.layers.set(1); };
  return (
    <group position={[at.x, 0, at.z]} rotation={[0, yaw, 0]}>
      <mesh ref={setLayer} position={[0, lie ? 0.26 : h / 2 - soleOff * PX_M, 0]} rotation={[lie ? -1.13 : 0, 0, 0]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} color={tint} alphaTest={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
const Blob: React.FC<{at: THREE.Vector3; rx: number; rz: number; o?: number}> = ({at, rx, rz, o = 0.4}) => (
  <mesh ref={(o: THREE.Object3D | null) => { if (o) o.layers.set(1); }} position={[at.x, 0.016, at.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[rx, rz, 1]}>
    <circleGeometry args={[1, 32]} />
    <meshBasicMaterial color="#0c0818" transparent opacity={o} depthWrite={false} />
  </mesh>
);
const useCanvas = (w: number, h: number) => useMemo(() => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return {cv, ctx: cv.getContext('2d')!, t};
}, [w, h]);

const Cast: React.FC<{s: number; camPos: THREE.Vector3}> = ({s, camPos}) => {
  const sit = useCanvas(600, 1000);
  const lie = useCanvas(1000, 500);
  const det = useCanvas(600, 1000);
  const k = clamp01(hoursAt(s) / 4);
  const skin = mix(SKIN_ALIVE, SKIN_COLD, k);
  const dead = s >= T.die;
  if (!dead) { drawVictimSitting(sit.ctx, {skin, dead: false, frost: 0}); sit.t.needsUpdate = true; }
  else { drawVictimLying(lie.ctx, {skin, dead: true, frost: clamp01((hoursAt(s) - 2.4) / 1.4)}); lie.t.needsUpdate = true; }
  const walking = s >= DET0 && s < DET1;
  const kneel = s >= DET1;
  const detAt = walking ? V(lerp(3.0, KNEEL.x, smoother((s - DET0) / (DET1 - DET0))), 0, lerp(-1.5, KNEEL.z, smoother((s - DET0) / (DET1 - DET0)))) : KNEEL;
  if (walking) { drawDetectiveStanding(det.ctx, (s - DET0) * 11); det.t.needsUpdate = true; }
  if (kneel) { drawDetectiveKneeling(det.ctx, easeOut((s - DET1 - 0.1) / 0.5), s >= T.measured ? '92.6' : '--.-'); det.t.needsUpdate = true; }
  // card light: warm lamp-lit early, cooler as the night comes in
  const tint = col('#fff1e0', '#c9d4ff', clamp01(hoursAt(s) / 4) * 0.8);
  return (
    <group>
      {!dead ? <Card tex={sit.t} wpx={600} hpx={1000} at={SIT} cam={camPos} tint={tint} /> : null}
      {dead ? <><Blob at={BODY} rx={0.95} rz={0.42} o={0.35} /><Card tex={lie.t} wpx={1000} hpx={500} at={BODY} cam={camPos} tint={tint} lie /></> : null}
      {walking || kneel ? <><Blob at={detAt} rx={0.34} rz={0.16} /><Card tex={det.t} wpx={600} hpx={1000} at={detAt} cam={camPos} tint={tint} /></> : null}
    </group>
  );
};

// ───────────────────────── post: ink -> lens blur -> grade ─────────────────────────
const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const LIN = `uniform float near; uniform float far; float lin(float z){ float n = z * 2. - 1.; return 2. * near * far / (far + near - n * (far - near)); }`;
const INK_FS = `
varying vec2 vUv; uniform sampler2D tColor; uniform sampler2D tDepthA; uniform sampler2D tNormal; uniform sampler2D tDepthN; uniform vec2 res; uniform float inkPx;
${LIN}
vec3 nrm(vec2 uv){ return texture2D(tNormal, uv).xyz * 2. - 1.; }
float dN(vec2 uv){ return lin(texture2D(tDepthN, uv).x); }
void main(){
  vec3 c = texture2D(tColor, vUv).rgb;
  float da = lin(texture2D(tDepthA, vUv).x);
  float d0 = dN(vUv);
  float e = 0.;
  if (da > d0 - 0.03) {
    vec2 px = vec2(inkPx) / res;
    vec3 n0 = nrm(vUv);
    float dl = dN(vUv - vec2(px.x, 0.)), dr = dN(vUv + vec2(px.x, 0.));
    float dd = dN(vUv - vec2(0., px.y)), du = dN(vUv + vec2(0., px.y));
    float lap = max(abs(dl + dr - 2. * d0), abs(dd + du - 2. * d0)) / d0;
    float nd = max(max(1. - dot(n0, nrm(vUv - vec2(px.x, 0.))), 1. - dot(n0, nrm(vUv + vec2(px.x, 0.)))),
                   max(1. - dot(n0, nrm(vUv - vec2(0., px.y))), 1. - dot(n0, nrm(vUv + vec2(0., px.y)))));
    e = max(smoothstep(0.012, 0.03, lap), smoothstep(0.22, 0.4, nd));
    e *= 1. - smoothstep(6., 14., d0) * 0.35;
  }
  gl_FragColor = vec4(mix(c, vec3(0.004, 0.003, 0.006), e), 1.);
}`;
const FINAL_FS = `
varying vec2 vUv; uniform sampler2D tInk; uniform sampler2D tDepthA; uniform vec2 res; uniform float focus; uniform float cocPx;
uniform float exposure; uniform float sat; uniform vec3 lift; uniform float vig;
${LIN}
float coc(float d){ return cocPx * clamp(abs(d - focus) / max(d, 0.01) * 1.8, 0., 1.); }
void main(){
  float d = lin(texture2D(tDepthA, vUv).x);
  float c0 = coc(d);
  vec3 acc = texture2D(tInk, vUv).rgb; float ws = 1.;
  if (cocPx > 0.3) {
    for (int i = 0; i < 24; i++) {
      float a = float(i) * 2.39996;
      float r = sqrt((float(i) + .5) / 24.) * max(c0, 0.);
      vec2 o = vec2(cos(a), sin(a)) * r / res;
      float ds = lin(texture2D(tDepthA, vUv + o).x);
      float w = ds < d - 0.05 ? clamp(coc(ds) / max(r, 0.5), 0., 1.) : 1.;
      acc += texture2D(tInk, vUv + o).rgb * w; ws += w;
    }
  }
  vec3 c = acc / ws * exposure;
  c = c / (1. + 0.18 * c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, sat) + lift * (1. - l);
  vec2 q = vUv - .5; q.x *= 0.75;
  c *= 1. - vig * smoothstep(0.3, 0.75, length(q));
  gl_FragColor = vec4(c, 1.);
  #include <colorspace_fragment>
}`;
const Post: React.FC<{focus: number; coc: number}> = ({focus, coc}) => {
  const st = useMemo(() => {
    const mk = (w: number, h: number) => {
      const rt = new THREE.WebGLRenderTarget(w, h, {type: THREE.HalfFloatType, samples: 4});
      rt.depthTexture = new THREE.DepthTexture(w, h);
      rt.depthTexture.type = THREE.UnsignedIntType;
      return rt;
    };
    const uni = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, {value: v}]));
    const ink = new THREE.ShaderMaterial({vertexShader: QUAD_VS, fragmentShader: INK_FS, depthTest: false, depthWrite: false,
      uniforms: uni({tColor: null, tDepthA: null, tNormal: null, tDepthN: null, res: new THREE.Vector2(), inkPx: 1.6, near: 0.05, far: 60})});
    const fin = new THREE.ShaderMaterial({vertexShader: QUAD_VS, fragmentShader: FINAL_FS, depthTest: false, depthWrite: false,
      uniforms: uni({tInk: null, tDepthA: null, res: new THREE.Vector2(), focus: 3, cocPx: 0, near: 0.05, far: 60, exposure: 1.15, sat: 1.12, lift: new THREE.Vector3(0.012, 0.016, 0.04), vig: 0.32})});
    const quad = (mat: THREE.Material) => { const sc = new THREE.Scene(); sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)); return sc; };
    return {mk, ink, fin, inkScene: quad(ink), finScene: quad(fin), ortho: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
      normalMat: new THREE.MeshNormalMaterial(), rts: null as null | {a: THREE.WebGLRenderTarget; n: THREE.WebGLRenderTarget; i: THREE.WebGLRenderTarget; w: number; h: number}};
  }, []);
  useFrame(({gl, scene, camera}) => {
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    if (!st.rts || st.rts.w !== size.x || st.rts.h !== size.y) {
      const i = new THREE.WebGLRenderTarget(size.x, size.y, {type: THREE.HalfFloatType});
      st.rts = {a: st.mk(size.x, size.y), n: st.mk(size.x, size.y), i, w: size.x, h: size.y};
    }
    const {a, n, i} = st.rts;
    const scale = size.y / 1920;
    camera.layers.enableAll();
    gl.setRenderTarget(a); gl.clear(); gl.render(scene, camera);
    camera.layers.set(0);
    scene.overrideMaterial = st.normalMat;
    gl.setRenderTarget(n); gl.clear(); gl.render(scene, camera);
    scene.overrideMaterial = null;
    camera.layers.enableAll();
    st.ink.uniforms.tColor.value = a.texture; st.ink.uniforms.tDepthA.value = a.depthTexture;
    st.ink.uniforms.tNormal.value = n.texture; st.ink.uniforms.tDepthN.value = n.depthTexture;
    st.ink.uniforms.res.value.set(size.x, size.y); st.ink.uniforms.inkPx.value = 1.7 * scale;
    gl.setRenderTarget(i); gl.render(st.inkScene, st.ortho);
    st.fin.uniforms.tInk.value = i.texture; st.fin.uniforms.tDepthA.value = a.depthTexture;
    st.fin.uniforms.res.value.set(size.x, size.y); st.fin.uniforms.focus.value = focus; st.fin.uniforms.cocPx.value = coc * scale;
    gl.setRenderTarget(null); gl.render(st.finScene, st.ortho);
  }, 1);
  return null;
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
  const mats = useMemo<Mats>(() => {
    const cache = new Map<string, THREE.MeshToonMaterial>();
    return {toon: (color, map) => {
      const key = color + (map ? map.uuid : '');
      if (!cache.has(key)) cache.set(key, new THREE.MeshToonMaterial({color, map, gradientMap: grad}));
      return cache.get(key)!;
    }};
  }, [grad]);
  const night = clamp01((hoursAt(s) + (s >= T.die ? 0.6 : 0)) / 3.2);
  const flicker = s > T.die - 0.16 && s < T.die ? (Math.floor(s * 30) % 2 ? 0.1 : 0.6) : 1;
  return (
    <>
      <hemisphereLight args={[col('#ffe6cc', '#6c80c4', night), '#3a2418', lerp(1.05, 0.8, night)]} />
      <pointLight position={[LAMP.x + 0.05, 1.5, LAMP.z + 0.1]} color="#ffb76b" intensity={lerp(9, 7, night) * flicker} distance={9} decay={1.4}
        castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.004} />
      <directionalLight position={[WIN.x + 1.5, 3.6, -7]} color={col('#ff9a5a', '#8ea6ff', night)} intensity={lerp(1.7, 1.5, night)}
        castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-0.0008} />
      <World s={s} mats={mats} tex={tex} />
      <Cast s={s} camPos={c.pos} />
      <Post focus={c.focus.distanceTo(c.pos)} coc={c.coc} />
    </>
  );
};

// ───────────────────────── composition ─────────────────────────
export const CoolTest: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const c = camAt(s);
  const pcam = makeCam(c);
  const dead = s >= T.die;
  const temp = tempAt(s);
  const hrs = hoursAt(s);
  const cold = clamp01(hrs / 4);
  // temperature bubble over the victim
  const bubbleAt = project(pcam, dead ? V(BODY.x - 0.05, 0.95, BODY.z) : V(SIT.x, 1.9, SIT.z));
  const bubbleK = s < 0.35 ? 0 : spring({frame: frame - Math.round((dead ? T.die + 0.1 : 0.35) * fps), fps, config: {damping: 11, stiffness: 200}});
  const stepPop = (() => {
    const h = Math.floor(hrs + 1e-6);
    const t0 = TL0 + (h / 4) * (TL1 - TL0);
    return h > 0 && s - t0 < 0.3 ? 1 + 0.18 * Math.sin(((s - t0) / 0.3) * Math.PI) : 1;
  })();
  const safe = (p: {x: number; y: number}, top = 640) => ({x: Math.min(860, Math.max(220, p.x)), y: Math.min(1700, Math.max(top, p.y))});
  const clockLab = project(pcam, V(CLOCK.x, CLOCK.y - 0.5, CLOCK.z));
  const hr = clockAt(s);
  const hh = Math.floor(hr) % 12 || 12;
  const mm = Math.floor((hr % 1) * 60 / 5) * 5;
  const ampm = Math.floor(hr) >= 24 || Math.floor(hr) < 12 ? 'AM' : 'PM';
  const clockText = `${hh}:${String(mm).padStart(2, '0')} ${ampm}`;
  const probeAt = project(pcam, V(0.75, 0.95, 0.05));
  // header card text
  const title = s < T.die ? 'ALIVE = 98.6°F' : s < T.six ? '−1.5°F EVERY HOUR' : s < DET0 ? '6° COLDER = 4 HOURS' : 'COUNT FROM THE READING';
  // captions: 1-2 words at a time
  const chunks: Array<{t: number; e: number; text: string}> = [];
  LINES.forEach((ln, li) => {
    const ws = ln.words;
    // never pair words across a sentence/comma break ("TRICK. COUNT" read as one phrase)
    const toks = (episode as {lines: Array<{text: string}>}).lines[li].text.split(/\s+/);
    const stop = (i: number) => toks.length === ws.length && /[.,!?]$/.test(toks[i]);
    for (let i = 0; i < ws.length; i += 2) {
      const a = ws[i];
      const b = ws[i + 1];
      const long = a.text.length > 7 || (b && b.text.length > 7) || stop(i);
      const take = long ? [a] : b ? [a, b] : [a];
      if (long) i -= 1;
      const next = ws[i + (long ? 1 : 2)];
      chunks.push({t: STARTS[li] + a.start, e: next ? STARTS[li] + next.start : STARTS[li] + ln.duration, text: take.map((x) => x.text).join(' ')});
    }
  });
  const cap = chunks.find((k) => s >= k.t && s < k.e);
  const capSize = cap ? Math.min(118, 820 / (cap.text.length * 0.78)) : 0;
  const capPop = cap ? 0.6 + 0.4 * spring({frame: frame - Math.round(cap.t * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;
  const tick = Array.from({length: 18}).map((_, k) => TL0 + k * 0.24).filter((t) => t < TL1);
  // few, soft effects: the clock ticks ARE the story; nothing chops the flow
  const sfx: Array<[number, string, number]> = [
    [T.die - 0.18, 'sfx/powerdown.wav', 0.3], [T.die + 0.02, 'sfx/whoosh.wav', 0.25],
    ...tick.map((t) => [t, 'sfx/tick.wav', 0.22] as [number, string, number]),
    ...[1, 2, 3, 4].map((h) => [TL0 + (h / 4) * (TL1 - TL0), 'sfx/pop.wav', 0.25] as [number, string, number]),
    [T.measured, 'sfx/ding.wav', 0.4],
  ];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={W} height={H} dpr={1} flat shadows={{type: THREE.PCFSoftShadowMap}} gl={{antialias: false, preserveDrawingBuffer: true}}>
        <Scene s={s} c={c} />
      </ThreeCanvas>
      {/* temperature bubble */}
      {bubbleK > 0 && s < DET1 + 0.4 ? (
        <div style={{position: 'absolute', left: safe(bubbleAt, 700).x, top: safe(bubbleAt, 700).y, transform: `translate(-50%, -100%) scale(${bubbleK * stepPop})`, transformOrigin: '50% 100%'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14, background: '#f4f1ea', border: '6px solid #1b1b22', borderRadius: 40, padding: '10px 26px 10px 16px', boxShadow: '0 10px 0 rgba(0,0,0,.3)'}}>
            <svg width={34} height={84} viewBox="0 0 34 84">
              <rect x={9} y={4} width={16} height={58} rx={8} fill="#fff" stroke="#1b1b22" strokeWidth={4} />
              <circle cx={17} cy={68} r={13} fill={cold > 0.5 ? '#3f8fe0' : '#e8344a'} stroke="#1b1b22" strokeWidth={4} />
              <rect x={13} y={12 + (1 - (temp - 90) / 9) * 44} width={8} height={56 - (1 - (temp - 90) / 9) * 44} fill={cold > 0.5 ? '#3f8fe0' : '#e8344a'} />
            </svg>
            <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 66, color: `rgb(${Math.round(lerp(214, 40, cold))},${Math.round(lerp(40, 110, cold))},${Math.round(lerp(58, 220, cold))})`}}>{temp.toFixed(1)}°F</span>
          </div>
          {dead && Math.floor(hrs + 1e-6) >= 1 ? (
            <div style={{position: 'absolute', left: '50%', top: -58, transform: 'translateX(-50%)', fontFamily: heavy, fontWeight: 900, fontSize: 40, color: '#ffd23f', WebkitTextStroke: '8px #111', paintOrder: 'stroke fill', whiteSpace: 'nowrap'}}>
              {`+${Math.min(4, Math.floor(hrs + 1e-6))} HR${Math.floor(hrs + 1e-6) > 1 ? 'S' : ''}`}
            </div>
          ) : null}
        </div>
      ) : null}
      {/* clock label */}
      {dead && s < DET0 ? (
        <div style={{position: 'absolute', left: safe(clockLab, 600).x, top: safe(clockLab, 600).y, transform: 'translate(-50%, 0)', fontFamily: MONO, fontWeight: 900, fontSize: 34, color: '#fff',
          background: 'rgba(17,17,26,.82)', padding: '4px 14px', borderRadius: 10, border: '3px solid #ffd23f', whiteSpace: 'nowrap'}}>{clockText}</div>
      ) : null}
      {/* reading tags */}
      {s >= T.measured ? (
        <div style={{position: 'absolute', left: safe(probeAt, 760).x, top: safe(probeAt, 760).y - 40, transform: `translate(-50%, -100%) scale(${spring({frame: frame - Math.round(T.measured * fps), fps, config: {damping: 10, stiffness: 220}})})`,
          fontFamily: heavy, fontWeight: 900, fontSize: 40, background: '#5fd068', color: '#1b1b22', padding: '8px 20px', borderRadius: 14, border: '5px solid #1b1b22', whiteSpace: 'nowrap'}}>TAKEN 12:00 AM ✓</div>
      ) : null}
      {s >= T.found ? (
        <div style={{position: 'absolute', left: safe(probeAt, 760).x, top: safe(probeAt, 760).y + 40, transform: `translate(-50%, 0) rotate(-3deg) scale(${spring({frame: frame - Math.round(T.found * fps), fps, config: {damping: 10, stiffness: 220}})})`,
          fontFamily: heavy, fontWeight: 900, fontSize: 34, background: '#f4f1ea', color: '#d6293a', padding: '6px 18px', borderRadius: 12, border: '5px solid #d6293a', whiteSpace: 'nowrap', textDecoration: 'line-through'}}>WHEN IT WAS FOUND</div>
      ) : null}
      {/* header card (series style) */}
      <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 140, background: '#f4f1ea', borderRadius: 14, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
        <div style={{height: 46, background: '#1e2a44', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 12}}>
          <div style={{width: 16, height: 16, borderRadius: 8, background: '#ffd23f'}} />
          <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: '#f4f1ea'}}>REAL LIFE · FORENSIC PATHOLOGY</span>
        </div>
        <div style={{position: 'absolute', left: 26, top: 64, fontFamily: heavy, fontWeight: 900, fontSize: 52, color: '#1b1b22', whiteSpace: 'nowrap'}}>{title}</div>
      </div>
      {cap ? (
        <div style={{position: 'absolute', top: 430, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: capSize, lineHeight: 1,
          color: '#fff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`, paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: 'nowrap',
          transform: `scale(${capPop})`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}
      {/* audio */}
      <Audio src={staticFile('music/cool-test.wav')} volume={0.36} />
      {LINES.map((ln, i) => <Sequence key={i} from={Math.round(STARTS[i] * fps)}><Audio src={staticFile(ln.file)} /></Sequence>)}
      {sfx.map(([t, f, v], i) => <Sequence key={`s${i}`} from={Math.max(0, Math.round(t * fps))} durationInFrames={60}><Audio src={staticFile(f)} volume={v} /></Sequence>)}
    </AbsoluteFill>
  );
};
