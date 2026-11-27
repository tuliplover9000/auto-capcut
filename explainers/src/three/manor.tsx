// Manor diorama set (2026-11-27): a cut-away 3-floor dollhouse mansion on a floating
// garden island, seen like a toy box. 6 rooms + a dumbwaiter ("tiny elevator") shaft on
// the left column. Same look rules as kit.tsx (toon materials, painted textures, ink post).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Mats, V, canvasTex, clamp01, col, hash, lerp} from './kit';

export const RW = 4.2; // room width
export const FY = [0, 2.85, 5.7]; // floor levels
export const CEIL = 2.6;
export const BACK = -2.3; // back wall z
export const FRONT = 0.9; // slab front edge
export const XL = -2.1;
export const XR = 2.1;
export const SHAFT = V(-3.75, 0, -1.95); // dumbwaiter shaft centre (x,z)
export const CAR_Y = (f: number) => FY[f] + 0.86; // car floor height at each floor
export const BAR_TOP = 0.96;
export const BUCKET_COUNTER = V(-2.95, FY[1] + BAR_TOP, -1.85);
export const BUCKET_BAR = V(-2.95, BAR_TOP, -1.8);
export const GLASS_BAR = V(-1.85, BAR_TOP, -1.72);
export const DOC_CUP = V(1.55, 0.83, -1.05);
export const TABLE = {x0: 0.75, x1: 3.15, z: -1.25, h: 0.78};

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

/** the whole diorama. fire = fireplace flicker phase */
export const Manor: React.FC<{m: Mats; tex: Tex; carY: number; fire: number; sky: string; yarn: THREE.Vector3 | null}> = ({m, tex, carY, fire, sky, yarn}) => {
  const mt = useMemo(() => ({
    cut: m.toon('#f4ecd8'), brick: m.toon('#ffffff', tex.brick), slate: m.toon('#5f6f8f', tex.slate), wood: m.toon('#ffffff', tex.wood), dark: m.toon('#ffffff', tex.darkwood),
    lib: m.toon('#ffffff', tex.library), lounge: m.toon('#ffffff', tex.lounge), dining: m.toon('#ffffff', tex.dining), bar: m.toon('#ffffff', tex.bar),
    kitchen: m.toon('#ffffff', tex.kitchen), glass: m.toon('#ffffff', tex.glass), checker: m.toon('#ffffff', tex.checker), tile: m.toon('#ffffff', tex.tile),
    grass: m.toon('#ffffff', tex.grass), dirt: m.toon('#ffffff', tex.dirt), rock: m.toon('#5a4a46'), brass: m.toon('#c9a24a'), cloth: m.toon('#f4f1ea'),
    shaft: m.toon('#2a1c14'),
  }), [m, tex]);
  const H = FY[2] + CEIL; // top of top floor
  const fireMat = useMemo(() => new THREE.MeshBasicMaterial({color: col('#ff8a2a', '#ffd25a', 0.5 + 0.5 * Math.sin(fire * 9))}), [fire]);
  const W2 = RW;
  return (
    <group>
      {/* ── floating island ── */}
      <mesh position={[0, -0.02, 0.3]} rotation={[-Math.PI / 2, 0, 0]} material={mt.grass} receiveShadow><planeGeometry args={[12.4, 7.6]} /></mesh>
      <B p={[0, -0.7, 0.3]} s={[12.4, 1.36, 7.6]} m={mt.dirt} />
      <mesh position={[0, -1.95, 0.3]} material={mt.rock} castShadow><cylinderGeometry args={[4.6, 1.2, 1.4, 7]} /></mesh>
      {/* path, hedges, lamps, trees */}
      <B p={[XR - 0.2, 0.005, 2.6]} s={[1.0, 0.02, 3.4]} m={m.toon('#d8ccb0')} noShadow />
      {[-5.4, 5.4].map((x) => <B key={x} p={[x, 0.35, -0.4]} s={[0.7, 0.7, 5.6]} m={m.toon('#3f7a34')} />)}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 5.0, 0, 3.4]}>
          <Cyl p={[0, 0.7, 0]} r={[0.04, 0.05]} h={1.4} m={m.toon('#2b2e35')} />
          <mesh position={[0, 1.5, 0]}><sphereGeometry args={[0.13, 12, 8]} /><meshBasicMaterial color="#ffe2a0" /></mesh>
        </group>
      ))}
      {[[-5.2, 2.8], [5.3, 2.9]].map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <Cyl p={[0, 0.5, 0]} r={[0.1, 0.14]} h={1.0} m={m.toon('#5a3a22')} />
          <Ball p={[0, 1.4, 0]} r={0.7} m={m.toon('#3f7a34')} />
          <Ball p={[0.25, 1.85, 0.1]} r={0.45} m={m.toon('#4f8a3a')} />
        </group>
      ))}
      {[-5.6, -4.6, 5.6].map((x, i) => <Ball key={x} p={[x, 0.28, 1.4 + (i % 2) * 0.6]} r={0.3} m={m.toon(['#c9452f', '#e0a83a', '#ff8fbf'][i])} s={[1.2, 0.8, 1]} />)}

      {/* ── house shell: slabs (cut edges cream), outer walls (brick), roof ── */}
      {FY.map((y, f) => (
        <group key={f}>
          <B p={[0, y - 0.13, -0.8 + 0.6]} s={[2 * W2 + 0.3, 0.26, FRONT + 0.8 - 0.6 + 1.4]} m={mt.cut} />
          {f > 0 ? <>
            <B p={[(-3.45 + W2) / 2 + 0.07, y - 0.13, -2.0]} s={[W2 + 3.45 + 0.15, 0.26, 0.6]} m={mt.cut} />
            <B p={[-4.2, y - 0.13, -2.0]} s={[0.3, 0.26, 0.6]} m={mt.cut} />
          </> : <B p={[0, y - 0.13, -2.0]} s={[2 * W2 + 0.3, 0.26, 0.6]} m={mt.cut} />}
        </group>
      ))}
      <B p={[0, H + 0.12, -0.7]} s={[2 * W2 + 0.3, 0.24, FRONT - BACK + 0.0]} m={mt.cut} />
      <B p={[0, H / 2, BACK - 0.14]} s={[2 * W2 + 0.3, H + 0.26, 0.22]} m={mt.brick} />
      {[-1, 1].map((sd) => <B key={sd} p={[sd * (W2 + 0.05), H / 2, (BACK - 0.6) / 2 - 0.05]} s={[0.22, H + 0.26, -BACK - 0.6 + 0.1]} m={mt.brick} />)}
      {[-1, 1].map((sd) => <B key={`e${sd}`} p={[sd * (W2 + 0.05), H / 2, -0.6]} s={[0.24, H + 0.26, 0.06]} m={mt.cut} noShadow />)}
      {/* centre wall with doorways */}
      {FY.map((y, f) => (
        <group key={`c${f}`}>
          <B p={[0, y + CEIL / 2, (BACK - 1.45) / 2]} s={[0.16, CEIL, -1.45 - BACK]} m={mt.cut} />
          <B p={[0, y + CEIL - 0.25, -0.9]} s={[0.16, 0.5, 1.1]} m={mt.cut} noShadow />
          <B p={[0, y + CEIL / 2, -0.15]} s={[0.16, CEIL, 0.3]} m={mt.cut} />
        </group>
      ))}
      {/* roof: gable along x, open-front cut */}
      <mesh position={[0, H + 1.05, -0.7]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[1.75, 1, 1.0]} material={mt.slate} castShadow>
        <cylinderGeometry args={[1.1, 1.1, 2 * W2 + 0.9, 3]} />
      </mesh>
      <B p={[2.6, H + 1.9, -1.4]} s={[0.55, 1.4, 0.55]} m={m.toon('#8a4a3a')} />
      <B p={[-2.8, H + 1.7, -1.2]} s={[0.5, 1.1, 0.5]} m={m.toon('#8a4a3a')} />

      {/* ── dumbwaiter shaft (cut open through every floor) ── */}
      <B p={[SHAFT.x, H / 2, SHAFT.z - 0.26]} s={[0.6, H, 0.04]} m={mt.shaft} noShadow />
      {[-1, 1].map((sd) => <B key={sd} p={[SHAFT.x + sd * 0.31, H / 2, SHAFT.z]} s={[0.04, H, 0.5]} m={m.toon('#5a3720')} noShadow />)}
      <Car y={carY} m={m} />

      {/* ═════ F1 left: the bar ═════ */}
      <Room x={XL} f={0} wall={mt.bar} floor={mt.dark} m={m} />
      <B p={[-2.5, BAR_TOP / 2, -1.82]} s={[1.6, BAR_TOP, 0.5]} m={m.toon('#5a3720')} />
      <B p={[-2.5, BAR_TOP + 0.02, -1.82]} s={[1.7, 0.05, 0.56]} m={m.toon('#3a2418')} />
      <B p={[-1.5, 1.6, BACK + 0.15]} s={[1.6, 0.06, 0.26]} m={m.toon('#3a2418')} />
      {Array.from({length: 7}).map((_, i) => <Cyl key={i} p={[-2.2 + i * 0.2, 1.78, BACK + 0.15]} r={[0.05, 0.05]} h={0.3} m={m.toon(['#3d8a5a', '#8a2733', '#d9902f', '#2f5f9a'][i % 4])} />)}
      <Window p={[-1.0, 1.7, BACK + 0.01]} w={0.8} h={1.0} m={m} sky={sky} />

      {/* ═════ F1 right: dining room ═════ */}
      <Room x={XR} f={0} wall={mt.dining} floor={mt.wood} m={m} />
      <B p={[(TABLE.x0 + TABLE.x1) / 2, TABLE.h, TABLE.z]} s={[TABLE.x1 - TABLE.x0, 0.06, 0.9]} m={mt.cloth} />
      <B p={[(TABLE.x0 + TABLE.x1) / 2, TABLE.h - 0.14, TABLE.z + 0.45]} s={[TABLE.x1 - TABLE.x0, 0.26, 0.02]} m={mt.cloth} noShadow />
      {[TABLE.x0 + 0.1, TABLE.x1 - 0.1].map((x) => <B key={x} p={[x, TABLE.h / 2, TABLE.z]} s={[0.07, TABLE.h, 0.7]} m={m.toon('#4a2c18')} />)}
      {/* cake + candles + plates */}
      <Cyl p={[2.4, TABLE.h + 0.12, TABLE.z]} r={[0.2, 0.2]} h={0.2} m={m.toon('#f6e7cf')} />
      <Cyl p={[2.4, TABLE.h + 0.24, TABLE.z]} r={[0.21, 0.21]} h={0.04} m={m.toon('#ff8fbf')} />
      <mesh position={[2.4, TABLE.h + 0.3, TABLE.z]}><sphereGeometry args={[0.05, 10, 8]} /><meshBasicMaterial color="#d6293a" /></mesh>
      {[1.0, 3.0].map((x) => <group key={x}><Cyl p={[x, TABLE.h + 0.15, TABLE.z - 0.2]} r={[0.02, 0.03]} h={0.26} m={mt.brass} /><mesh position={[x, TABLE.h + 0.32, TABLE.z - 0.2]}><sphereGeometry args={[0.035, 8, 6]} /><meshBasicMaterial color="#ffd25a" /></mesh></group>)}
      {[1.55, 3.3].map((x) => <Cyl key={x} p={[x, TABLE.h + 0.04, TABLE.z + 0.18]} r={[0.13, 0.12]} h={0.02} m={m.toon('#ffffff')} />)}
      {/* chairs */}
      {[1.55].map((x) => <B key={x} p={[x, 0.6, TABLE.z - 0.75]} s={[0.5, 1.2, 0.1]} m={m.toon('#6a2a33')} />)}
      <B p={[3.75, 0.7, TABLE.z - 0.15]} s={[0.1, 1.4, 0.6]} m={m.toon('#6a2a33')} />
      {/* chandelier + portrait */}
      <Cyl p={[1.95, 2.35, -1.2]} r={[0.01, 0.01]} h={0.5} m={mt.brass} />
      <Cyl p={[1.95, 2.08, -1.2]} r={[0.32, 0.12]} h={0.1} m={mt.brass} />
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[1.95 + Math.cos(i * 1.256) * 0.3, 2.18, -1.2 + Math.sin(i * 1.256) * 0.3]}><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color="#ffe2a0" /></mesh>)}
      <B p={[3.0, 1.75, BACK + 0.03]} s={[0.66, 0.82, 0.05]} m={mt.brass} />
      <mesh position={[3.0, 1.75, BACK + 0.06]}><planeGeometry args={[0.52, 0.66]} /><meshBasicMaterial map={tex.portrait} /></mesh>
      <Window p={[1.0, 1.65, BACK + 0.01]} w={0.9} h={1.2} m={m} sky={sky} />

      {/* ═════ F2 left: kitchen ═════ */}
      <Room x={XL} f={1} wall={mt.kitchen} floor={mt.checker} m={m} />
      <B p={[-2.75, FY[1] + BAR_TOP / 2, -1.85]} s={[1.3, BAR_TOP, 0.5]} m={m.toon('#e8e2d2')} />
      <B p={[-2.75, FY[1] + BAR_TOP + 0.02, -1.85]} s={[1.36, 0.05, 0.56]} m={m.toon('#7a8a9a')} />
      {/* stove + pot */}
      <B p={[-1.15, FY[1] + 0.45, -1.85]} s={[1.0, 0.9, 0.6]} m={m.toon('#2b2e35')} />
      <B p={[-1.15, FY[1] + 0.92, -1.85]} s={[1.02, 0.04, 0.62]} m={m.toon('#4a4650')} />
      <Cyl p={[-1.2, FY[1] + 1.12, -1.8]} r={[0.24, 0.22]} h={0.36} m={m.toon('#b3294a')} />
      <B p={[-1.15, FY[1] + 2.0, -2.05]} s={[1.1, 0.5, 0.5]} m={m.toon('#c9ced8')} />
      {[-0.5, -0.3].map((x, i) => <Cyl key={x} p={[x, FY[1] + 1.7 - i * 0.1, BACK + 0.1]} r={[0.14, 0.14]} h={0.04} m={m.toon('#3a3036')} rot={[Math.PI / 2, 0, 0]} />)}

      {/* ═════ F2 right: lounge ═════ */}
      <Room x={XR} f={1} wall={mt.lounge} floor={mt.wood} m={m} />
      <B p={[1.2, FY[1] + 0.6, BACK + 0.2]} s={[1.3, 1.2, 0.36]} m={m.toon('#e8dcc4')} />
      <B p={[1.2, FY[1] + 0.4, BACK + 0.3]} s={[0.8, 0.7, 0.3]} m={m.toon('#1a1014')} />
      <mesh position={[1.2, FY[1] + 0.3, BACK + 0.46]} material={fireMat}><coneGeometry args={[0.22, 0.4, 8]} /></mesh>
      <B p={[1.2, FY[1] + 1.25, BACK + 0.24]} s={[1.5, 0.08, 0.44]} m={m.toon('#5a3720')} />
      <Armchair p={[2.75, FY[1], -1.55]} c="#3d6b4f" m={m} />
      <B p={[3.75, FY[1] + 1.0, BACK + 0.25]} s={[0.5, 2.0, 0.4]} m={m.toon('#5a3720')} />
      <mesh position={[3.75, FY[1] + 1.55, BACK + 0.46]}><circleGeometry args={[0.16, 20]} /><meshBasicMaterial color="#f4ecd8" /></mesh>
      {yarn ? <Ball p={[yarn.x, yarn.y, yarn.z]} r={0.09} m={m.toon('#b3294a')} /> : null}

      {/* ═════ F3 left: conservatory ═════ */}
      <Room x={XL} f={2} wall={mt.glass} floor={mt.tile} m={m} />
      <B p={[-2.0, FY[2] + 0.42, -1.95]} s={[1.6, 0.06, 0.5]} m={m.toon('#8a5a38')} />
      {[-2.7, -1.3].map((x) => <B key={x} p={[x, FY[2] + 0.2, -1.95]} s={[0.06, 0.4, 0.4]} m={m.toon('#5a3a22')} />)}
      <Plant p={[-2.5, FY[2] + 0.45, -1.95]} s={0.6} m={m} />
      <Plant p={[-1.6, FY[2] + 0.45, -1.95]} s={0.55} m={m} leaf="#6aa04a" />
      <Plant p={[-0.6, FY[2], -1.85]} s={1.2} m={m} />
      <Plant p={[-3.75, FY[2], 0.35]} s={0.7} m={m} leaf="#5f9a44" />
      {[0, 1, 2].map((i) => <mesh key={i} position={[-3.2 + i * 0.25, FY[2] + 0.5, -1.0 + i * 0.1]}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color={['#ff5fa2', '#ffd23f', '#ff8a2a'][i]} /></mesh>)}

      {/* ═════ F3 right: library ═════ */}
      <Room x={XR} f={2} wall={mt.lib} floor={mt.dark} m={m} />
      <Shelf p={[1.2, FY[2], BACK + 0.22]} w={1.9} h={2.4} m={m} />
      <Shelf p={[3.45, FY[2], BACK + 0.22]} w={1.2} h={2.4} m={m} />
      <Armchair p={[2.9, FY[2], -1.45]} c="#8a2733" m={m} />
      <group position={[3.75, FY[2], -0.8]}>
        <Cyl p={[0, 0.7, 0]} r={[0.02, 0.02]} h={1.4} m={mt.brass} />
        <mesh position={[0, 1.45, 0]}><cylinderGeometry args={[0.14, 0.22, 0.24, 16, 1, true]} /><meshBasicMaterial color="#f6d9a0" side={THREE.DoubleSide} /></mesh>
      </group>
      <mesh position={[2.5, FY[2] + 0.01, -0.6]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.4, 0.8, 1]}><circleGeometry args={[0.9, 32]} /><meshToonMaterial color="#d8ad55" /></mesh>
    </group>
  );
};

/** gradient sky dome around the diorama (layer 1 so it gets no ink) */
export const SkyDome: React.FC<{top: string; bottom: string}> = ({top, bottom}) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {top: {value: new THREE.Color(top)}, bottom: {value: new THREE.Color(bottom)}},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float k = smoothstep(-0.35, 0.6, vP.y); gl_FragColor = vec4(mix(bottom, top, k), 1.); }',
  }), [top, bottom]);
  return (
    <group>
      <mesh ref={(o: THREE.Object3D | null) => { if (o) o.layers.set(1); }} material={mat} position={[0, 3, 0]}><sphereGeometry args={[45, 32, 16]} /></mesh>
      {Array.from({length: 70}).map((_, i) => {
        const a = hash(i, 11) * Math.PI * 2;
        const e = 0.1 + hash(i, 12) * 1.2;
        const r = 40;
        return (
          <mesh key={i} ref={(o: THREE.Object3D | null) => { if (o) o.layers.set(1); }} position={[Math.cos(a) * r * Math.cos(e * 0.6), 3 + Math.sin(e * 0.6) * r, Math.sin(a) * r * Math.cos(e * 0.6) - 0]}>
            <sphereGeometry args={[0.06 + hash(i, 13) * 0.08, 6, 4]} /><meshBasicMaterial color="#fff6d8" transparent opacity={lerp(0.4, 1, hash(i, 14))} />
          </mesh>
        );
      })}
    </group>
  );
};
export const ROOM_LIGHTS: Array<[number, number, string]> = [[XL, 0, '#ffc27a'], [XR, 0, '#ffd08a'], [XL, 1, '#fff0d0'], [XR, 1, '#ffb070'], [XL, 2, '#e8fff0'], [XR, 2, '#ffd08a']];
export const roomLight = (i: number) => ROOM_LIGHTS[i];
export const clampY = (y: number) => clamp01(y);
