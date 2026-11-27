// Manor diorama set (2026-11-27): a cut-away 3-floor dollhouse mansion on a floating
// garden island, seen like a toy box. 6 rooms + a dumbwaiter ("tiny elevator") shaft on
// the left column. Same look rules as kit.tsx (toon materials, painted textures, ink post).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Mats, V, canvasTex, clamp01, col, hash, lerp} from './kit';

export const RW = 3.4; // room width
export const COLX = [-3.4, 0, 3.4]; // column centres (left, middle, right)
export const HALF = 5.1; // half the house width
export const FY = [0, 2.85, 5.7, 8.55]; // floor levels (F1..F4)
export const CEIL = 2.6;
export const BACK = -2.3; // back wall z
export const FRONT = 0.9; // slab front edge
export const XL = COLX[0];
export const XR = COLX[2];
export const SHAFT = V(-4.72, 0, -1.95); // dumbwaiter shaft centre (x,z), left column
export const CAR_Y = (f: number) => FY[f] + 0.86; // car floor height at each floor
export const BAR_TOP = 0.96;
export const BUCKET_COUNTER = V(-4.0, FY[1] + BAR_TOP, -1.85);
export const BUCKET_BAR = V(-4.0, BAR_TOP, -1.8);
export const GLASS_BAR = V(-2.95, BAR_TOP, -1.72);
export const TABLE = {x0: -1.25, x1: 0.75, z: -1.25, h: 0.78};
export const DOC_CUP = V(-0.55, 0.83, -1.05);

export const useManorTex = () => useMemo(() => {
  const stripes = (a: string, b: string) => canvasTex(256, 256, (c) => {
    c.fillStyle = a; c.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 64) { c.fillStyle = b; c.fillRect(x + 22, 0, 20, 256); }
    for (let y = 24; y < 256; y += 64) for (let x = 0; x < 256; x += 64) { c.fillStyle = b; c.beginPath(); c.arc(x + 54, y, 6, 0, Math.PI * 2); c.fill(); }
  }, [3, 1.5]);
  const planks = (base: number[]) => canvasTex(256, 256, (c) => {
    for (let r = 0; r < 8; r++) for (let k = -1; k < 3; k++) {
      const v = 0.86 + hash(r * 7 + k, 3) * 0.28;
      c.fillStyle = `rgb(${Math.round(base[0] * v)},${Math.round(base[1] * v)},${Math.round(base[2] * v)})`;
      c.fillRect((r % 2) * 64 + k * 128, r * 32, 128, 32);
      c.fillStyle = 'rgba(40,20,8,.35)'; c.fillRect((r % 2) * 64 + k * 128, r * 32, 3, 32);
    }
    c.fillStyle = 'rgba(40,20,8,.35)'; for (let r = 0; r < 8; r++) c.fillRect(0, r * 32, 256, 3);
  }, [3, 2]);
  return {
    library: stripes('#2f5a4a', '#3a6b58'),
    lounge: stripes('#8a3a46', '#9a4a55'),
    dining: stripes('#2f4a7a', '#3a5a8a'),
    bar: stripes('#5a3a5e', '#684870'),
    music: stripes('#3a4a6a', '#46587a'),
    ballroom: stripes('#d8c08a', '#e6d2a0'),
    gallery: stripes('#4a5a3a', '#566848'),
    games: stripes('#6a2a33', '#7a3640'),
    billiards: stripes('#2a4a4a', '#345858'),
    foyer: stripes('#8a6a4a', '#9a7a58'),
    kitchen: canvasTex(256, 256, (c) => {
      c.fillStyle = '#f2ead6'; c.fillRect(0, 0, 256, 256);
      c.strokeStyle = '#d8ccb0'; c.lineWidth = 4;
      for (let i = 0; i <= 256; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.moveTo(0, i); c.lineTo(256, i); c.stroke(); }
    }, [4, 3]),
    glass: canvasTex(256, 256, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#b8e0ff'); g.addColorStop(1, '#e8f6ff');
      c.fillStyle = g; c.fillRect(0, 0, 256, 256);
      c.strokeStyle = '#ffffff'; c.lineWidth = 10; for (let x = 0; x <= 256; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
      c.beginPath(); c.moveTo(0, 128); c.lineTo(256, 128); c.stroke();
    }, [2, 1]),
    wood: planks([150, 96, 56]),
    darkwood: planks([96, 60, 38]),
    checker: canvasTex(128, 128, (c) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? '#f0ece2' : '#2b2e35'; c.fillRect(x * 32, y * 32, 32, 32); } }, [5, 4]),
    marble: canvasTex(128, 128, (c) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? '#f4efe4' : '#d8cfc0'; c.fillRect(x * 32, y * 32, 32, 32); } }, [4, 3]),
    carpet: canvasTex(64, 64, (c) => { c.fillStyle = '#7a2a33'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#8a3640'; for (let i = 0; i < 64; i += 8) c.fillRect(i, 0, 3, 64); }, [6, 4]),
    tile: canvasTex(128, 128, (c) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? '#c9d8b0' : '#a8c090'; c.fillRect(x * 32, y * 32, 32, 32); } }, [5, 4]),
    brick: canvasTex(256, 256, (c) => {
      c.fillStyle = '#e8dcc4'; c.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 16; r++) for (let k = -1; k < 5; k++) {
        const v = 0.9 + hash(r * 5 + k, 9) * 0.2;
        c.fillStyle = `rgb(${Math.round(176 * v)},${Math.round(96 * v)},${Math.round(76 * v)})`;
        c.fillRect((r % 2) * 32 + k * 64 + 3, r * 16 + 3, 58, 11);
      }
    }, [4, 6]),
    slate: canvasTex(128, 128, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < 128; x += 16) { c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x, y + 13, 16, 3); c.fillRect(x, y, 2, 16); }
    }, [6, 4]),
    grass: canvasTex(256, 256, (c) => {
      c.fillStyle = '#6a9a44'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { c.fillStyle = hash(i, 1) > 0.5 ? '#78aa4e' : '#5e8a3a'; c.fillRect(hash(i, 2) * 256, hash(i, 3) * 256, 2, 6); }
    }, [4, 4]),
    dirt: canvasTex(256, 128, (c) => {
      c.fillStyle = '#7a4e30'; c.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 200; i++) { c.fillStyle = hash(i, 4) > 0.5 ? '#8a5a38' : '#5e3a24'; c.beginPath(); c.arc(hash(i, 5) * 256, hash(i, 6) * 128, 2 + hash(i, 7) * 6, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#4f7a34'; c.fillRect(0, 0, 256, 14);
    }, [6, 1]),
    portrait: canvasTex(128, 160, (c) => {
      c.fillStyle = '#3a2a3e'; c.fillRect(0, 0, 128, 160);
      c.fillStyle = '#8a2733'; c.beginPath(); c.ellipse(64, 150, 50, 50, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f2c8a8'; c.beginPath(); c.ellipse(64, 70, 34, 38, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f4f1ea'; c.beginPath(); c.ellipse(64, 86, 30, 9, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#241726'; c.fillRect(48, 62, 7, 7); c.fillRect(74, 62, 7, 7);
    }),
  };
}, []);
type Tex = ReturnType<typeof useManorTex>;

const B: React.FC<{p: [number, number, number]; s: [number, number, number]; m: THREE.Material; r?: [number, number, number]; noShadow?: boolean}> = ({p, s, m, r, noShadow}) => (
  <mesh position={p} rotation={r ?? [0, 0, 0]} material={m} castShadow={!noShadow} receiveShadow>
    <boxGeometry args={s} />
  </mesh>
);
const Cyl: React.FC<{p: [number, number, number]; r: [number, number]; h: number; m: THREE.Material; seg?: number; rot?: [number, number, number]}> = ({p, r, h, m, seg = 20, rot}) => (
  <mesh position={p} rotation={rot ?? [0, 0, 0]} material={m} castShadow receiveShadow><cylinderGeometry args={[r[0], r[1], h, seg]} /></mesh>
);
const Ball: React.FC<{p: [number, number, number]; r: number; m: THREE.Material; s?: [number, number, number]}> = ({p, r, m, s}) => (
  <mesh position={p} scale={s ?? [1, 1, 1]} material={m} castShadow receiveShadow><sphereGeometry args={[r, 18, 12]} /></mesh>
);

/** one room box: floor, back wall (wallpaper), partial side walls */
const Room: React.FC<{x: number; f: number; wall: THREE.Material; floor: THREE.Material; m: Mats}> = ({x, f, wall, floor, m}) => {
  const y = FY[f];
  const trim = m.toon('#3a2418');
  return (
    <group position={[x, y, 0]}>
      <mesh position={[0, 0.002, (BACK + FRONT) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow><planeGeometry args={[RW, FRONT - BACK]} /></mesh>
      <mesh position={[0, CEIL / 2, BACK]} material={wall} receiveShadow><planeGeometry args={[RW, CEIL]} /></mesh>
      <B p={[0, 0.07, BACK + 0.03]} s={[RW, 0.14, 0.06]} m={trim} noShadow />
      <B p={[0, CEIL - 0.08, BACK + 0.04]} s={[RW, 0.1, 0.08]} m={m.toon('#e8dcc4')} noShadow />
    </group>
  );
};
const Window: React.FC<{p: [number, number, number]; w: number; h: number; m: Mats; sky: string}> = ({p, w, h, m, sky}) => {
  const fr = m.toon('#f4ecd8');
  return (
    <group position={p}>
      <mesh position={[0, 0, 0.005]}><planeGeometry args={[w, h]} /><meshBasicMaterial color={sky} /></mesh>
      <mesh position={[w * 0.18, h * 0.22, 0.008]}><circleGeometry args={[Math.min(w, h) * 0.11, 20]} /><meshBasicMaterial color="#f6efcf" /></mesh>
      <B p={[0, h / 2, 0.04]} s={[w + 0.12, 0.08, 0.08]} m={fr} noShadow />
      <B p={[0, -h / 2, 0.06]} s={[w + 0.2, 0.08, 0.14]} m={fr} noShadow />
      <B p={[-w / 2, 0, 0.04]} s={[0.08, h, 0.08]} m={fr} noShadow />
      <B p={[w / 2, 0, 0.04]} s={[0.08, h, 0.08]} m={fr} noShadow />
      <B p={[0, 0, 0.04]} s={[0.05, h, 0.05]} m={fr} noShadow />
      <B p={[0, 0, 0.04]} s={[w, 0.05, 0.05]} m={fr} noShadow />
    </group>
  );
};
const Shelf: React.FC<{p: [number, number, number]; w: number; h: number; m: Mats}> = ({p, w, h, m}) => {
  const books = useMemo(() => ['#8a2733', '#2f5f9a', '#d8ad55', '#3d6b4f', '#6a3f7a', '#c9643a'].map((c) => m.toon(c)), [m]);
  const rows = Math.floor(h / 0.48);
  const n = Math.floor(w / 0.13);
  return (
    <group position={p}>
      <B p={[0, h / 2, 0]} s={[w, h, 0.4]} m={m.toon('#4a2c18')} />
      {Array.from({length: rows}).map((_, r) => (
        <group key={r}>
          {Array.from({length: n}).map((__, i) => {
            const bh = 0.26 + hash(r * 13 + i, 5) * 0.12;
            return <B key={i} p={[-w / 2 + 0.1 + i * 0.13, 0.12 + r * 0.48 + bh / 2, 0.12]} s={[0.11, bh, 0.24]} m={books[(r * 5 + i) % 6]} noShadow />;
          })}
          <B p={[0, 0.1 + r * 0.48, 0.12]} s={[w - 0.04, 0.04, 0.32]} m={m.toon('#5a3720')} noShadow />
        </group>
      ))}
    </group>
  );
};
const Armchair: React.FC<{p: [number, number, number]; c: string; m: Mats; rot?: number}> = ({p, c, m, rot = 0}) => {
  const a = m.toon(c);
  const b = m.toon(new THREE.Color(c).multiplyScalar(0.8).getStyle());
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <B p={[0, 0.24, 0]} s={[0.9, 0.48, 0.8]} m={a} />
      <B p={[0, 0.5, 0.05]} s={[0.7, 0.12, 0.66]} m={b} />
      <B p={[0, 0.9, -0.34]} s={[0.9, 0.95, 0.2]} m={a} />
      <B p={[-0.44, 0.64, 0.02]} s={[0.18, 0.34, 0.8]} m={b} />
      <B p={[0.44, 0.64, 0.02]} s={[0.18, 0.34, 0.8]} m={b} />
    </group>
  );
};
const Plant: React.FC<{p: [number, number, number]; s?: number; m: Mats; leaf?: string}> = ({p, s = 1, m, leaf = '#4f8a3a'}) => (
  <group position={p} scale={s}>
    <Cyl p={[0, 0.2, 0]} r={[0.2, 0.15]} h={0.4} m={m.toon('#c9643a')} />
    <Ball p={[0, 0.62, 0]} r={0.32} m={m.toon(leaf)} s={[1, 1.15, 1]} />
    <Ball p={[0.2, 0.82, 0.05]} r={0.2} m={m.toon('#5f9a44')} />
    <Ball p={[-0.18, 0.86, -0.05]} r={0.18} m={m.toon('#3f7a34')} />
  </group>
);

/** the dumbwaiter car (open front box) */
export const Car: React.FC<{y: number; m: Mats}> = ({y, m}) => {
  const w = m.toon('#c08850');
  return (
    <group position={[SHAFT.x, y, SHAFT.z]}>
      <B p={[0, 0, 0]} s={[0.56, 0.04, 0.48]} m={w} />
      <B p={[0, 0.52, 0]} s={[0.56, 0.04, 0.48]} m={w} />
      <B p={[-0.27, 0.26, 0]} s={[0.03, 0.52, 0.48]} m={w} />
      <B p={[0.27, 0.26, 0]} s={[0.03, 0.52, 0.48]} m={w} />
      <B p={[0, 0.26, -0.23]} s={[0.56, 0.52, 0.03]} m={w} />
      <mesh position={[0, 3.5, 0]} material={m.toon('#2b2e35')}><cylinderGeometry args={[0.008, 0.008, 6.4, 4]} /></mesh>
    </group>
  );
};
export const IceBucket: React.FC<{p: THREE.Vector3; m: Mats; green: number; cubes?: number}> = ({p, m, green, cubes = 4}) => {
  const ice = useMemo(() => new THREE.MeshToonMaterial({color: col('#e8f6ff', '#9af59a', green), emissive: '#4fe35a', emissiveIntensity: green * 0.5}), [green]);
  return (
    <group position={p}>
      <Cyl p={[0, 0.11, 0]} r={[0.15, 0.12]} h={0.22} m={m.toon('#c9ced8')} />
      <Cyl p={[0, 0.215, 0]} r={[0.16, 0.16]} h={0.02} m={m.toon('#a8adb8')} />
      {Array.from({length: cubes}).map((_, i) => (
        <B key={i} p={[Math.cos(i * 1.7) * 0.06, 0.23 + (i % 2) * 0.03, Math.sin(i * 1.7) * 0.06]} s={[0.07, 0.07, 0.07]} m={ice} r={[i, i * 0.5, 0]} noShadow />
      ))}
    </group>
  );
};
export const Glass3D: React.FC<{p: THREE.Vector3; m: Mats; ice?: number}> = ({p, m, ice = 0}) => (
  <group position={p}>
    <Cyl p={[0, 0.07, 0]} r={[0.05, 0.042]} h={0.14} m={m.toon('#e9f6ff')} />
    <Cyl p={[0, 0.06, 0]} r={[0.046, 0.04]} h={0.09} m={m.toon('#d9902f')} />
    {ice > 0 ? <B p={[0, 0.12, 0]} s={[0.05, 0.05, 0.05]} m={m.toon('#c8f8c8')} r={[0.4, 0.6, 0]} noShadow /> : null}
  </group>
);
export const Vial3D: React.FC<{p: THREE.Vector3; rot?: number}> = ({p, rot = 0}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#4fe35a'}), []);
  return (
    <group position={p} rotation={[0, 0, rot]}>
      <mesh position={[0, 0.05, 0]} material={mat}><cylinderGeometry args={[0.028, 0.03, 0.09, 10]} /></mesh>
      <mesh position={[0, 0.11, 0]}><cylinderGeometry args={[0.014, 0.014, 0.04, 8]} /><meshBasicMaterial color="#8a5a3a" /></mesh>
    </group>
  );
};
export const Drops: React.FC<{from: THREE.Vector3; to: THREE.Vector3; t: number; n?: number; color?: string}> = ({from, to, t, n = 6, color = '#4fe35a'}) => (
  <>
    {Array.from({length: n}).map((_, i) => {
      const u = (t * 2.2 + i / n) % 1;
      const p = from.clone().lerp(to, u);
      p.y -= Math.sin(u * Math.PI) * -0.02;
      return <mesh key={i} position={p} ref={(o: THREE.Object3D | null) => { if (o) o.layers.set(1); }}><sphereGeometry args={[0.022, 8, 6]} /><meshBasicMaterial color={color} /></mesh>;
    })}
  </>
);

/** the whole diorama: 4 floors x 3 rooms. fire = fireplace flicker phase */
export const Manor: React.FC<{m: Mats; tex: Tex; carY: number; fire: number; sky: string; yarn: THREE.Vector3 | null}> = ({m, tex, carY, fire, sky, yarn}) => {
  const mt = useMemo(() => ({
    cut: m.toon('#f4ecd8'), brick: m.toon('#ffffff', tex.brick), slate: m.toon('#5f6f8f', tex.slate),
    grass: m.toon('#ffffff', tex.grass), dirt: m.toon('#ffffff', tex.dirt), rock: m.toon('#5a4a46'), brass: m.toon('#c9a24a'), cloth: m.toon('#f4f1ea'), shaft: m.toon('#2a1c14'),
    felt: m.toon('#2f7a4a'), black: m.toon('#1e1a22'), white: m.toon('#f4f1ea'),
  }), [m, tex]);
  const T = (t: THREE.Texture) => m.toon('#ffffff', t);
  const H = FY[3] + CEIL;
  const fireMat = useMemo(() => new THREE.MeshBasicMaterial({color: col('#ff8a2a', '#ffd25a', 0.5 + 0.5 * Math.sin(fire * 9))}), [fire]);
  const [L, M, R] = COLX;
  const F = FY;
  const rooms: Array<Array<[THREE.Texture, THREE.Texture]>> = [
    [[tex.bar, tex.darkwood], [tex.dining, tex.wood], [tex.foyer, tex.marble]],
    [[tex.kitchen, tex.checker], [tex.gallery, tex.wood], [tex.lounge, tex.wood]],
    [[tex.billiards, tex.carpet], [tex.ballroom, tex.marble], [tex.games, tex.darkwood]],
    [[tex.glass, tex.tile], [tex.music, tex.wood], [tex.library, tex.darkwood]],
  ];
  const painting = (x: number, y: number, c: string, w = 0.6, h = 0.5) => (
    <group key={`p${x}_${y}`}><B p={[x, y, BACK + 0.03]} s={[w + 0.1, h + 0.1, 0.05]} m={mt.brass} /><B p={[x, y, BACK + 0.06]} s={[w, h, 0.02]} m={m.toon(c)} noShadow /></group>
  );
  return (
    <group>
      {/* floating island */}
      <mesh position={[0, -0.02, 0.4]} rotation={[-Math.PI / 2, 0, 0]} material={mt.grass} receiveShadow><planeGeometry args={[14.4, 7.8]} /></mesh>
      <B p={[0, -0.7, 0.4]} s={[14.4, 1.36, 7.8]} m={mt.dirt} />
      <mesh position={[0, -1.95, 0.4]} material={mt.rock} castShadow><cylinderGeometry args={[5.4, 1.4, 1.4, 7]} /></mesh>
      <B p={[R, 0.005, 2.8]} s={[1.1, 0.02, 3.6]} m={m.toon('#d8ccb0')} noShadow />
      {[-6.4, 6.4].map((x) => <B key={x} p={[x, 0.35, -0.4]} s={[0.7, 0.7, 5.6]} m={m.toon('#3f7a34')} />)}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 6.0, 0, 3.4]}>
          <Cyl p={[0, 0.7, 0]} r={[0.04, 0.05]} h={1.4} m={m.toon('#2b2e35')} />
          <mesh position={[0, 1.5, 0]}><sphereGeometry args={[0.13, 12, 8]} /><meshBasicMaterial color="#ffe2a0" /></mesh>
        </group>
      ))}
      {[[-6.2, 2.6], [6.3, 2.7]].map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <Cyl p={[0, 0.5, 0]} r={[0.1, 0.14]} h={1.0} m={m.toon('#5a3a22')} />
          <Ball p={[0, 1.4, 0]} r={0.7} m={m.toon('#3f7a34')} />
          <Ball p={[0.25, 1.85, 0.1]} r={0.45} m={m.toon('#4f8a3a')} />
        </group>
      ))}

      {/* shell: slabs (cream cut edges), back + side walls (brick), roof */}
      {F.map((y, f) => (
        <group key={f}>
          <B p={[0, y - 0.13, -0.4]} s={[2 * HALF + 0.3, 0.26, 2.6]} m={mt.cut} />
          {f > 0 ? <>
            <B p={[(SHAFT.x + 0.3 + HALF + 0.15) / 2, y - 0.13, -2.0]} s={[HALF + 0.15 - SHAFT.x - 0.3, 0.26, 0.6]} m={mt.cut} />
            <B p={[-HALF, y - 0.13, -2.0]} s={[0.3, 0.26, 0.6]} m={mt.cut} />
          </> : <B p={[0, y - 0.13, -2.0]} s={[2 * HALF + 0.3, 0.26, 0.6]} m={mt.cut} />}
        </group>
      ))}
      <B p={[0, H + 0.12, -0.7]} s={[2 * HALF + 0.3, 0.24, FRONT - BACK]} m={mt.cut} />
      <B p={[0, H / 2, BACK - 0.14]} s={[2 * HALF + 0.3, H + 0.26, 0.22]} m={mt.brick} />
      {[-1, 1].map((sd) => <B key={sd} p={[sd * (HALF + 0.05), H / 2, -1.5]} s={[0.22, H + 0.26, 1.8]} m={mt.brick} />)}
      {[-1, 1].map((sd) => <B key={`e${sd}`} p={[sd * (HALF + 0.05), H / 2, -0.6]} s={[0.24, H + 0.26, 0.06]} m={mt.cut} noShadow />)}
      {F.map((y, f) => [-1.7, 1.7].map((x) => (
        <group key={`w${f}_${x}`}>
          <B p={[x, y + CEIL / 2, (BACK - 1.45) / 2]} s={[0.14, CEIL, -1.45 - BACK]} m={mt.cut} />
          <B p={[x, y + CEIL - 0.25, -0.9]} s={[0.14, 0.5, 1.1]} m={mt.cut} noShadow />
          <B p={[x, y + CEIL / 2, -0.15]} s={[0.14, CEIL, 0.3]} m={mt.cut} />
        </group>
      )))}
      <mesh position={[0, H + 1.05, -0.7]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[1.75, 1, 1.0]} material={mt.slate} castShadow>
        <cylinderGeometry args={[1.1, 1.1, 2 * HALF + 0.9, 3]} />
      </mesh>
      <B p={[3.2, H + 1.9, -1.4]} s={[0.55, 1.4, 0.55]} m={m.toon('#8a4a3a')} />
      <B p={[-3.4, H + 1.7, -1.2]} s={[0.5, 1.1, 0.5]} m={m.toon('#8a4a3a')} />

      {rooms.map((row, f) => row.map(([w, fl], c) => <Room key={`r${f}_${c}`} x={COLX[c]} f={f} wall={T(w)} floor={T(fl)} m={m} />))}

      {/* dumbwaiter shaft (cut open through every floor) */}
      <B p={[SHAFT.x, H / 2, SHAFT.z - 0.26]} s={[0.6, H, 0.04]} m={mt.shaft} noShadow />
      {[-1, 1].map((sd) => <B key={sd} p={[SHAFT.x + sd * 0.31, H / 2, SHAFT.z]} s={[0.04, H, 0.5]} m={m.toon('#5a3720')} noShadow />)}
      <Car y={carY} m={m} />

      {/* F1: bar | dining | foyer */}
      <B p={[-3.5, BAR_TOP / 2, -1.82]} s={[1.6, BAR_TOP, 0.5]} m={m.toon('#5a3720')} />
      <B p={[-3.5, BAR_TOP + 0.02, -1.82]} s={[1.7, 0.05, 0.56]} m={m.toon('#3a2418')} />
      <B p={[-2.6, 1.6, BACK + 0.15]} s={[1.4, 0.06, 0.26]} m={m.toon('#3a2418')} />
      {Array.from({length: 6}).map((_, i) => <Cyl key={i} p={[-3.1 + i * 0.2, 1.78, BACK + 0.15]} r={[0.05, 0.05]} h={0.3} m={m.toon(['#3d8a5a', '#8a2733', '#d9902f', '#2f5f9a'][i % 4])} />)}
      <B p={[(TABLE.x0 + TABLE.x1) / 2, TABLE.h, TABLE.z]} s={[TABLE.x1 - TABLE.x0, 0.06, 0.9]} m={mt.cloth} />
      <B p={[(TABLE.x0 + TABLE.x1) / 2, TABLE.h - 0.14, TABLE.z + 0.45]} s={[TABLE.x1 - TABLE.x0, 0.26, 0.02]} m={mt.cloth} noShadow />
      {[TABLE.x0 + 0.1, TABLE.x1 - 0.1].map((x) => <B key={x} p={[x, TABLE.h / 2, TABLE.z]} s={[0.07, TABLE.h, 0.7]} m={m.toon('#4a2c18')} />)}
      <Cyl p={[0.1, TABLE.h + 0.12, TABLE.z]} r={[0.2, 0.2]} h={0.2} m={m.toon('#f6e7cf')} />
      <Cyl p={[0.1, TABLE.h + 0.24, TABLE.z]} r={[0.21, 0.21]} h={0.04} m={m.toon('#ff8fbf')} />
      <mesh position={[0.1, TABLE.h + 0.3, TABLE.z]}><sphereGeometry args={[0.05, 10, 8]} /><meshBasicMaterial color="#d6293a" /></mesh>
      {[-1.0, 0.55].map((x) => <group key={x}><Cyl p={[x, TABLE.h + 0.15, TABLE.z - 0.2]} r={[0.02, 0.03]} h={0.26} m={mt.brass} /><mesh position={[x, TABLE.h + 0.32, TABLE.z - 0.2]}><sphereGeometry args={[0.035, 8, 6]} /><meshBasicMaterial color="#ffd25a" /></mesh></group>)}
      <B p={[1.25, 0.7, TABLE.z - 0.15]} s={[0.1, 1.4, 0.6]} m={m.toon('#6a2a33')} />
      <Cyl p={[M, 2.08, -1.2]} r={[0.32, 0.12]} h={0.1} m={mt.brass} />
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[M + Math.cos(i * 1.256) * 0.3, 2.18, -1.2 + Math.sin(i * 1.256) * 0.3]}><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color="#ffe2a0" /></mesh>)}
      <B p={[-0.2, 1.75, BACK + 0.03]} s={[0.66, 0.82, 0.05]} m={mt.brass} />
      <mesh position={[-0.2, 1.75, BACK + 0.06]}><planeGeometry args={[0.52, 0.66]} /><meshBasicMaterial map={tex.portrait} /></mesh>
      <B p={[R + 0.3, 1.2, BACK + 0.04]} s={[1.3, 2.4, 0.08]} m={m.toon('#5a3720')} />
      <B p={[R + 0.3, 1.15, BACK + 0.09]} s={[1.1, 2.2, 0.04]} m={m.toon('#7a4a2a')} />
      <Cyl p={[R + 1.35, 0.85, -1.9]} r={[0.03, 0.04]} h={1.7} m={m.toon('#3a2418')} />
      <Ball p={[R + 1.35, 1.55, -1.9]} r={0.18} m={m.toon('#2f5f9a')} s={[1, 1.4, 1]} />
      <mesh position={[R, 0.012, -0.7]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.6, 0.7, 1]}><circleGeometry args={[0.9, 32]} /><meshToonMaterial color="#8a2733" /></mesh>
      <Window p={[R - 1.0, 1.6, BACK + 0.01]} w={0.6} h={1.1} m={m} sky={sky} />

      {/* F2: kitchen | gallery | lounge */}
      <B p={[-4.0, F[1] + BAR_TOP / 2, -1.85]} s={[0.9, BAR_TOP, 0.5]} m={m.toon('#e8e2d2')} />
      <B p={[-4.0, F[1] + BAR_TOP + 0.02, -1.85]} s={[0.96, 0.05, 0.56]} m={m.toon('#7a8a9a')} />
      <B p={[-2.4, F[1] + 0.45, -1.85]} s={[1.0, 0.9, 0.6]} m={m.toon('#2b2e35')} />
      <B p={[-2.4, F[1] + 0.92, -1.85]} s={[1.02, 0.04, 0.62]} m={m.toon('#4a4650')} />
      <Cyl p={[-2.45, F[1] + 1.12, -1.8]} r={[0.24, 0.22]} h={0.36} m={m.toon('#b3294a')} />
      <B p={[-2.4, F[1] + 2.0, -2.05]} s={[1.1, 0.5, 0.5]} m={m.toon('#c9ced8')} />
      {painting(M - 0.9, F[1] + 1.6, '#c9643a')}{painting(M, F[1] + 1.7, '#3d6b4f', 0.7, 0.8)}{painting(M + 0.9, F[1] + 1.6, '#2f5f9a')}
      <B p={[M, F[1] + 0.45, -1.75]} s={[0.4, 0.9, 0.4]} m={mt.white} />
      <Ball p={[M, F[1] + 1.05, -1.75]} r={0.18} m={m.toon('#c9a24a')} />
      <B p={[R - 0.8, F[1] + 0.6, BACK + 0.2]} s={[1.2, 1.2, 0.36]} m={m.toon('#e8dcc4')} />
      <B p={[R - 0.8, F[1] + 0.4, BACK + 0.3]} s={[0.7, 0.7, 0.3]} m={m.toon('#1a1014')} />
      <mesh position={[R - 0.8, F[1] + 0.3, BACK + 0.46]} material={fireMat}><coneGeometry args={[0.2, 0.38, 8]} /></mesh>
      <Armchair p={[R + 0.6, F[1], -1.55]} c="#3d6b4f" m={m} />
      <B p={[R + 1.4, F[1] + 1.0, BACK + 0.25]} s={[0.45, 2.0, 0.4]} m={m.toon('#5a3720')} />
      <mesh position={[R + 1.4, F[1] + 1.55, BACK + 0.46]}><circleGeometry args={[0.15, 20]} /><meshBasicMaterial color="#f4ecd8" /></mesh>
      {yarn ? <Ball p={[yarn.x, yarn.y, yarn.z]} r={0.09} m={m.toon('#b3294a')} /> : null}

      {/* F3: billiards | ballroom | card room */}
      <B p={[L + 0.4, F[2] + 0.72, -1.75]} s={[1.9, 0.12, 0.9]} m={mt.felt} />
      <B p={[L + 0.4, F[2] + 0.35, -1.75]} s={[1.6, 0.7, 0.6]} m={m.toon('#4a2c18')} />
      {[0, 1, 2, 3].map((i) => <mesh key={i} position={[L + 0.0 + i * 0.25, F[2] + 0.83, -1.65 - (i % 2) * 0.2]}><sphereGeometry args={[0.05, 10, 8]} /><meshToonMaterial color={['#f4f1ea', '#d6293a', '#ffd23f', '#2f5f9a'][i]} /></mesh>)}
      <Cyl p={[M, F[2] + 2.3, -1.2]} r={[0.38, 0.16]} h={0.14} m={mt.brass} />
      {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} position={[M + Math.cos(i * 1.047) * 0.36, F[2] + 2.38, -1.2 + Math.sin(i * 1.047) * 0.36]}><sphereGeometry args={[0.05, 8, 6]} /><meshBasicMaterial color="#ffe2a0" /></mesh>)}
      <Window p={[M - 0.9, F[2] + 1.5, BACK + 0.01]} w={0.7} h={1.4} m={m} sky={sky} />
      <Window p={[M + 0.9, F[2] + 1.5, BACK + 0.01]} w={0.7} h={1.4} m={m} sky={sky} />
      <Cyl p={[R + 0.2, F[2] + 0.72, -1.75]} r={[0.5, 0.5]} h={0.05} m={mt.felt} />
      <Cyl p={[R + 0.2, F[2] + 0.36, -1.75]} r={[0.06, 0.12]} h={0.72} m={m.toon('#4a2c18')} />
      {painting(R + 1.0, F[2] + 1.7, '#8a2733')}

      {/* F4: conservatory | music room | library */}
      <B p={[L + 0.3, F[3] + 0.42, -1.95]} s={[1.4, 0.06, 0.5]} m={m.toon('#8a5a38')} />
      <Plant p={[L - 0.1, F[3] + 0.45, -1.95]} s={0.55} m={m} />
      <Plant p={[L + 0.7, F[3] + 0.45, -1.95]} s={0.5} m={m} leaf="#6aa04a" />
      <Plant p={[L + 1.3, F[3], -1.9]} s={0.9} m={m} />
      <Plant p={[-4.75, F[3], 0.4]} s={0.6} m={m} leaf="#5f9a44" />
      {[0, 1, 2].map((i) => <mesh key={i} position={[L - 0.4 + i * 0.25, F[3] + 0.5, -1.0 + i * 0.1]}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color={['#ff5fa2', '#ffd23f', '#ff8a2a'][i]} /></mesh>)}
      <B p={[M - 0.7, F[3] + 0.5, -1.95]} s={[1.3, 1.0, 0.5]} m={mt.black} />
      <B p={[M - 0.7, F[3] + 0.78, -1.68]} s={[1.2, 0.06, 0.16]} m={mt.white} noShadow />
      <B p={[M - 0.7, F[3] + 1.3, -2.12]} s={[1.3, 0.6, 0.1]} m={mt.black} />
      {painting(M + 0.9, F[3] + 1.7, '#d8ad55')}
      <Shelf p={[R - 0.6, F[3], BACK + 0.22]} w={1.6} h={2.4} m={m} />
      <Shelf p={[R + 1.2, F[3], BACK + 0.22]} w={0.9} h={2.4} m={m} />
      <Armchair p={[R + 0.7, F[3], -1.45]} c="#8a2733" m={m} />
      <group position={[R + 1.45, F[3], -0.8]}>
        <Cyl p={[0, 0.7, 0]} r={[0.02, 0.02]} h={1.4} m={mt.brass} />
        <mesh position={[0, 1.45, 0]}><cylinderGeometry args={[0.14, 0.22, 0.24, 16, 1, true]} /><meshBasicMaterial color="#f6d9a0" side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  );
};

/** gradient sky dome around the diorama (layer 1 so it gets no ink) */
export const SkyDome: React.FC<{top: string; bottom: string; at: THREE.Vector3}> = ({top, bottom, at}) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {top: {value: new THREE.Color(top)}, bottom: {value: new THREE.Color(bottom)}},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float k = smoothstep(-0.35, 0.6, vP.y); gl_FragColor = vec4(mix(bottom, top, k), 1.); }',
  }), [top, bottom]);
  return (
    <group position={[at.x, 0, at.z]}>
      <mesh ref={(o: THREE.Object3D | null) => { if (o) o.layers.set(1); }} material={mat} position={[0, 3, 0]}><sphereGeometry args={[50, 32, 16]} /></mesh>
      {Array.from({length: 70}).map((_, i) => {
        const a = hash(i, 11) * Math.PI * 2;
        const e = 0.1 + hash(i, 12) * 1.2;
        const r = 46;
        return (
          <mesh key={i} ref={(o: THREE.Object3D | null) => { if (o) o.layers.set(1); }} position={[Math.cos(a) * r * Math.cos(e * 0.6), 3 + Math.sin(e * 0.6) * r, Math.sin(a) * r * Math.cos(e * 0.6) - 0]}>
            <sphereGeometry args={[0.06 + hash(i, 13) * 0.08, 6, 4]} /><meshBasicMaterial color="#fff6d8" transparent opacity={lerp(0.4, 1, hash(i, 14))} />
          </mesh>
        );
      })}
    </group>
  );
};
export const ROOM_LIGHTS: Array<[number, number, string]> = [];
for (let f = 0; f < 4; f++) for (let c = 0; c < 3; c++) ROOM_LIGHTS.push([COLX[c], f, ['#ffc27a', '#ffd08a', '#fff0d0', '#ffb070'][(f + c) % 4]]);
