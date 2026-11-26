// Shared 3D kit for the explainer engine: painted study set, toon materials, light rig,
// camera-facing 2D cards, and the post chain (ink -> lens blur -> grade).
// Extracted from CoolTest (2026-11-26) so every 3D episode shares one look.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useFrame} from '@react-three/fiber';
import {PX_M} from './toon';

export const W = 1080;
export const H = 1920;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const smoother = (x: number) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const vl = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, k);
export const col = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k));


export const CHAIR = V(-1.55, 0, -1.7);
export const SIT = V(-1.2, 0, -1.22); // just in front of the seat
export const LAMP = V(-2.5, 0, -2.45);
export const BODY = V(0.15, 0, 0.35);
export const KNEEL = V(1.2, 0, -0.3); // behind the body's head, so he never blocks it
export const CLOCK = V(-0.35, 2.3, -3.47);
export const WIN = V(1.45, 1.75, -3.47);


/** lamp + window light + sky fill. night 0 = dusk, 1 = deep night. flicker 0..1 scales the lamp. */
export const Lights: React.FC<{night: number; flicker?: number}> = ({night, flicker = 1}) => (
  <>
    <hemisphereLight args={[col('#ffe6cc', '#6c80c4', night), '#3a2418', lerp(1.05, 0.8, night)]} />
    <pointLight position={[LAMP.x + 0.05, 1.5, LAMP.z + 0.1]} color="#ffb76b" intensity={lerp(9, 7, night) * flicker} distance={9} decay={1.4}
      castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.004} />
    <directionalLight position={[WIN.x + 1.5, 3.6, -7]} color={col('#ff9a5a', '#8ea6ff', night)} intensity={lerp(1.7, 1.5, night)}
      castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-0.0008} />
  </>
);
export type CamS = {pos: THREE.Vector3; look: THREE.Vector3; fov: number; focus: THREE.Vector3; coc: number};
export const makeCam = (c: CamS) => {
  const cam = new THREE.PerspectiveCamera(c.fov, W / H, 0.05, 60);
  cam.position.copy(c.pos);
  cam.lookAt(c.look);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};
export const project = (cam: THREE.PerspectiveCamera, p: THREE.Vector3) => {
  const v = p.clone().project(cam);
  return {x: (v.x * 0.5 + 0.5) * W, y: (1 - (v.y * 0.5 + 0.5)) * H};
};

export const hash = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
export const canvasTex = (w: number, h: number, paint: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
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
export const useTextures = () => useMemo(() => ({
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
export const useGradient = () => useMemo(() => {
  const t = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}, []);

export type Mats = {toon: (c: string, map?: THREE.Texture) => THREE.MeshToonMaterial};
export const Box: React.FC<{p: [number, number, number]; s: [number, number, number]; m: THREE.Material; r?: [number, number, number]}> = ({p, s, m, r}) => (
  <mesh position={p} rotation={r ?? [0, 0, 0]} material={m} castShadow receiveShadow>
    <boxGeometry args={s} />
  </mesh>
);
export type Arc = {from: number; to: number; color: string; k?: number}; // clock-face wedge, hours on the 12 h dial
export const World: React.FC<{hr: number; night: number; book: boolean; arcs?: Arc[]; mats: Mats; tex: ReturnType<typeof useTextures>}> = ({hr, night, book, arcs = [], mats, tex}) => {
  const {toon} = mats;
  const m = useMemo(() => ({
    wall: toon('#ffffff', tex.wall), floor: toon('#ffffff', tex.floor), rug: toon('#ffffff', tex.rug),
    trim: toon('#4a2c18'), wood: toon('#5a3720'), chair: toon('#2f6a4f'), chairDark: toon('#24533e'),
    brass: toon('#c9a24a'), shade: new THREE.MeshToonMaterial({color: '#f6d9a0', emissive: '#ffb860', emissiveIntensity: 0.9, side: THREE.DoubleSide}),
    curtain: toon('#8a2733'), frame: toon('#c9a24a'), paint: toon('#5e7a58'), book: toon('#2f5f9a'), cup: toon('#f0ece2'),
    books: ['#8a2733', '#2f5f9a', '#d8ad55', '#3d6b4f', '#6a3f7a', '#c9643a'].map((c) => toon(c)),
  }), [toon, tex]);
  const sky = col('#f08a54', '#141c46', night);
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
        {arcs.map((a, i) => {
          const len = ((a.to - a.from) / 12) * Math.PI * 2 * (a.k ?? 1);
          return len > 0.001 ? (
            <mesh key={i} position={[0, 0, 0.05 + i * 0.002]}>
              <ringGeometry args={[0.03, 0.27, 48, 1, Math.PI / 2 - (a.to / 12) * Math.PI * 2, len]} />
              <meshBasicMaterial color={a.color} transparent opacity={0.6} depthWrite={false} />
            </mesh>
          ) : null;
        })}
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
      {book ? <Box p={[-0.95, 0.03, 0.85]} s={[0.26, 0.05, 0.2]} m={m.book} r={[0, 0.5, 0]} /> : null}
    </group>
  );
};

/** camera-facing 2D card. lie = lying card (tilted back onto the floor) */
export const Card: React.FC<{tex: THREE.Texture; wpx: number; hpx: number; at: THREE.Vector3; cam: THREE.Vector3; tint: THREE.Color; lie?: boolean; soleOff?: number}> = ({tex, wpx, hpx, at, cam, tint, lie, soleOff = 25}) => {
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
export const Blob: React.FC<{at: THREE.Vector3; rx: number; rz: number; o?: number}> = ({at, rx, rz, o = 0.4}) => (
  <mesh ref={(o: THREE.Object3D | null) => { if (o) o.layers.set(1); }} position={[at.x, 0.016, at.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[rx, rz, 1]}>
    <circleGeometry args={[1, 32]} />
    <meshBasicMaterial color="#0c0818" transparent opacity={o} depthWrite={false} />
  </mesh>
);
export const useCanvas = (w: number, h: number) => useMemo(() => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return {cv, ctx: cv.getContext('2d')!, t};
}, [w, h]);

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
export const Post: React.FC<{focus: number; coc: number}> = ({focus, coc}) => {
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

