// Thanksgiving street set (2026-11-26): rich houses, the boy's tiny house, lawns,
// the garden gnome, a 3D roast turkey, the street feast, and a small kitchen.
// Same look rules as kit.tsx (toon materials, painted Canvas2D textures, ink post).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Mats, V, canvasTex, clamp01, col, hash, lerp} from './kit';

export const FRONT = -6; // house front walls
export const PEM = V(0, 0, FRONT); // Mrs. Pemberton's house (centre of front wall)
export const SILL = V(-2.64, 0.97, FRONT + 0.2); // the windowsill turkey (lower-left window)
export const DOOR = V(0.7, 0, FRONT + 0.55); // where she steps out
export const TINY = V(9, 0, -6.4); // the boy's house
export const HEDGE = V(5.2, 0, -4.7);
export const GNOME = V(2.3, 0, -4.55); // on the path in front of the porch
export const KITCHEN = V(60, 0, 0);

export const useStreetTex = () => useMemo(() => ({
  grass: canvasTex(256, 256, (c) => {
    c.fillStyle = '#5f8a3a'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { c.fillStyle = hash(i, 1) > 0.5 ? '#6f9a44' : '#557d33'; c.fillRect(hash(i, 2) * 256, hash(i, 3) * 256, 2, 6); }
    for (let i = 0; i < 40; i++) { c.fillStyle = ['#d9772f', '#c9452f', '#e0a83a'][i % 3]; c.fillRect(hash(i, 4) * 256, hash(i, 5) * 256, 7, 5); } // fallen leaves
  }, [6, 6]),
  road: canvasTex(256, 256, (c) => {
    c.fillStyle = '#4a4650'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) { c.fillStyle = hash(i, 6) > 0.5 ? '#54505a' : '#423e48'; c.fillRect(hash(i, 7) * 256, hash(i, 8) * 256, 2, 2); }
  }, [16, 3]),
  walk: canvasTex(256, 64, (c) => {
    c.fillStyle = '#c8c2b6'; c.fillRect(0, 0, 256, 64);
    c.fillStyle = '#a8a296'; for (let x = 0; x < 256; x += 64) c.fillRect(x, 0, 3, 64);
  }, [30, 1]),
  siding: canvasTex(128, 128, (c) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = 'rgba(0,0,0,.13)'; for (let y = 0; y < 128; y += 16) c.fillRect(0, y, 128, 3);
  }, [3, 3]),
  shingle: canvasTex(128, 128, (c) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < 128; x += 16) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x, y + 13, 16, 3); c.fillRect(x, y, 2, 16); }
  }, [4, 4]),
  checker: canvasTex(128, 128, (c) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? '#e8e2d2' : '#9fb7a8'; c.fillRect(x * 32, y * 32, 32, 32); }
  }, [4, 4]),
}), []);

type Tex = ReturnType<typeof useStreetTex>;
const B: React.FC<{p: [number, number, number]; s: [number, number, number]; m: THREE.Material; r?: [number, number, number]; noShadow?: boolean}> = ({p, s, m, r, noShadow}) => (
  <mesh position={p} rotation={r ?? [0, 0, 0]} material={m} castShadow={!noShadow} receiveShadow>
    <boxGeometry args={s} />
  </mesh>
);

/** a big house: body, gable roof, lit windows with shutters, door + porch columns, chimney */
const House: React.FC<{x: number; w: number; h: number; d: number; body: string; roof: string; trim: string; m: Mats; tex: Tex; glow: number; sill?: boolean; doorOpen?: number}> = ({x, w, h, d, body, roof, trim, m, tex, glow, sill, doorOpen = 0}) => {
  const bodyM = m.toon(body, tex.siding);
  const roofM = m.toon(roof, tex.shingle);
  const trimM = m.toon(trim);
  const winM = useMemo(() => new THREE.MeshToonMaterial({color: '#ffd9a0', emissive: '#ffb860', emissiveIntensity: 0.35 + glow * 0.9}), [glow]);
  const z = FRONT - d / 2;
  const rows = h > 4 ? [1.6, 3.6] : [1.5];
  const cols = [-w * 0.33, w * 0.33];
  return (
    <group position={[x, 0, 0]}>
      <B p={[0, h / 2, z]} s={[w, h, d]} m={bodyM} />
      {/* gable roof: a triangular prism along x */}
      <mesh position={[0, h + 0.66, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[(d / 2 + 0.3) / 0.95, 1, 1.2]} material={roofM} castShadow>
        <cylinderGeometry args={[1.1, 1.1, w + 0.5, 3]} />
      </mesh>
      <B p={[w * 0.28, h + 1.5, z - 0.8]} s={[0.6, 1.6, 0.6]} m={m.toon('#8a4a3a')} />
      {rows.map((wy) => cols.map((wx) => (
        <group key={`${wx}${wy}`} position={[wx, wy, FRONT + 0.02]}>
          <mesh material={winM}><planeGeometry args={[1.0, 1.25]} /></mesh>
          <B p={[0, 0, 0.03]} s={[0.08, 1.25, 0.06]} m={trimM} noShadow />
          <B p={[0, 0.0, 0.03]} s={[1.0, 0.08, 0.06]} m={trimM} noShadow />
          <B p={[-0.68, 0, 0.04]} s={[0.3, 1.35, 0.06]} m={m.toon('#2f3b52')} noShadow />
          <B p={[0.68, 0, 0.04]} s={[0.3, 1.35, 0.06]} m={m.toon('#2f3b52')} noShadow />
          {sill && wx < 0 && wy < 2 ? <B p={[0, -0.7, 0.18]} s={[1.4, 0.1, 0.36]} m={trimM} /> : null}
        </group>
      )))}
      {/* door (swings open) + porch */}
      <group position={[0.7, 0, FRONT + 0.02]}>
        <group position={[-0.5, 0, 0]} rotation={[0, -doorOpen * 1.6, 0]}>
          <B p={[0.5, 1.1, 0.04]} s={[1.0, 2.2, 0.08]} m={m.toon('#6a2a2a')} />
        </group>
        <mesh position={[0, 1.1, 0.0]}><planeGeometry args={[1.0, 2.2]} /><meshBasicMaterial color={col('#2a1810', '#ffcf8a', doorOpen)} /></mesh>
        <B p={[0, 0.08, 0.55]} s={[2.4, 0.16, 1.1]} m={m.toon('#c8c2b6')} />
        {[-1.05, 1.05].map((px) => <mesh key={px} position={[px, 1.3, 0.95]} material={m.toon('#f4f1ea')} castShadow><cylinderGeometry args={[0.09, 0.11, 2.6, 12]} /></mesh>)}
        <B p={[0, 2.65, 0.6]} s={[2.6, 0.14, 1.3]} m={trimM} />
      </group>
    </group>
  );
};

const TinyHouse: React.FC<{m: Mats; tex: Tex; glow: number}> = ({m, tex, glow}) => (
  <group position={[TINY.x, 0, 0]}>
    <B p={[0, 1.3, TINY.z - 2]} s={[3.6, 2.6, 4]} m={m.toon('#8a8478', tex.siding)} />
    <group position={[0.05, 3.07, TINY.z - 2]} rotation={[0, 0, 0.06]}>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[2.3 / 0.95, 1, 0.85]} material={m.toon('#5a4e44', tex.shingle)} castShadow>
        <cylinderGeometry args={[1.1, 1.1, 4.0, 3]} />
      </mesh>
    </group>
    <mesh position={[-0.9, 1.4, TINY.z + 0.02]}><planeGeometry args={[0.9, 0.9]} /><meshToonMaterial color="#ffd9a0" emissive="#ffb860" emissiveIntensity={0.2 + glow * 0.6} /></mesh>
    <B p={[-0.9, 1.4, TINY.z + 0.06]} s={[1.1, 0.12, 0.05]} m={m.toon('#7a5a3a')} r={[0, 0, 0.5]} />
    <B p={[-0.9, 1.4, TINY.z + 0.07]} s={[1.1, 0.12, 0.05]} m={m.toon('#6a4a2e')} r={[0, 0, -0.45]} />
    <B p={[0.8, 0.95, TINY.z + 0.04]} s={[0.85, 1.9, 0.08]} m={m.toon('#5a4a3a')} />
    <B p={[0.6, 2.1, TINY.z + 0.06]} s={[0.4, 0.3, 0.04]} m={m.toon('#a8a08a')} r={[0, 0, 0.2]} />
  </group>
);

const Tree: React.FC<{p: THREE.Vector3; c: string; m: Mats; s?: number}> = ({p, c, m, s = 1}) => (
  <group position={[p.x, 0, p.z]} scale={s}>
    <mesh position={[0, 1.1, 0]} material={m.toon('#5a3a22')} castShadow><cylinderGeometry args={[0.16, 0.22, 2.2, 10]} /></mesh>
    <mesh position={[0, 2.9, 0]} material={m.toon(c)} castShadow><icosahedronGeometry args={[1.35, 0]} /></mesh>
    <mesh position={[0.6, 2.4, 0.3]} material={m.toon(c)} castShadow><icosahedronGeometry args={[0.85, 0]} /></mesh>
  </group>
);
const Fence: React.FC<{x0: number; x1: number; z: number; m: Mats; gap?: [number, number]}> = ({x0, x1, z, m, gap}) => {
  const mat = m.toon('#f4f1ea');
  const posts: number[] = [];
  for (let x = x0; x <= x1; x += 0.32) if (!gap || x < gap[0] || x > gap[1]) posts.push(x);
  return (
    <group>
      {posts.map((x) => <B key={x} p={[x, 0.45, z]} s={[0.1, 0.9, 0.05]} m={mat} />)}
      {[0.3, 0.65].map((y) => (gap ? [[x0, gap[0]], [gap[1], x1]] : [[x0, x1]]).map(([a, b]) => <B key={`${y}${a}`} p={[(a + b) / 2, y, z - 0.04]} s={[b - a, 0.07, 0.04]} m={mat} />))}
    </group>
  );
};

export const Gnome: React.FC<{m: Mats; tip: number}> = ({m, tip}) => (
  <group position={[GNOME.x, 0, GNOME.z]} rotation={[tip * 1.35, 0.4, 0]}>
    <mesh position={[0, 0.17, 0]} material={m.toon('#3f6fb0')} castShadow><cylinderGeometry args={[0.1, 0.14, 0.34, 12]} /></mesh>
    <mesh position={[0, 0.36, 0]} material={m.toon('#f2c9a8')} castShadow><sphereGeometry args={[0.09, 14, 10]} /></mesh>
    <mesh position={[0, 0.3, 0.06]} material={m.toon('#f4f1ea')} castShadow><coneGeometry args={[0.09, 0.18, 12]} /></mesh>
    <mesh position={[0, 0.53, 0]} material={m.toon('#d6293a')} castShadow><coneGeometry args={[0.11, 0.3, 12]} /></mesh>
  </group>
);

/** a roast turkey on a platter. steam is an overlay. */
export const Turkey3D: React.FC<{m: Mats; p: THREE.Vector3; rot?: [number, number, number]; s?: number; platter?: boolean}> = ({m, p, rot = [0, 0, 0], s = 1, platter = true}) => {
  const skin = m.toon('#b8662a');
  const bone = m.toon('#f4f1ea');
  return (
    <group position={p} rotation={rot} scale={s}>
      {platter ? <mesh position={[0, -0.02, 0]} material={m.toon('#e8e4dc')} castShadow receiveShadow><cylinderGeometry args={[0.36, 0.3, 0.04, 28]} /></mesh> : null}
      <mesh position={[0, 0.13, 0]} scale={[0.3, 0.17, 0.22]} material={skin} castShadow><sphereGeometry args={[1, 20, 14]} /></mesh>
      {[-1, 1].map((sd) => (
        <group key={sd} position={[0.18, 0.13, sd * 0.13]} rotation={[0, 0, -0.6]}>
          <mesh position={[0, 0.06, 0]} scale={[0.09, 0.12, 0.08]} material={skin} castShadow><sphereGeometry args={[1, 12, 10]} /></mesh>
          <mesh position={[0, 0.2, 0]} material={bone}><cylinderGeometry args={[0.022, 0.022, 0.12, 8]} /></mesh>
          <mesh position={[0, 0.27, 0]} material={bone}><sphereGeometry args={[0.035, 8, 8]} /></mesh>
        </group>
      ))}
    </group>
  );
};

/** the street feast: long table, cloth, 12 turkeys, pies, bowls, string lights. k 0..1 builds it */
export const Feast: React.FC<{m: Mats; k: number; lights: number}> = ({m, k, lights}) => {
  if (k <= 0) return null;
  const cloth = m.toon('#f4f1ea');
  const turkeys = Array.from({length: 12}).map((_, i) => V(-5.5 + i * 1.0, 0.84, 0.25 + (i % 2 ? 0.18 : -0.18)));
  const bulbs: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40; bulbs.push(V(lerp(-7, 7, u), 3.4 - Math.sin(u * Math.PI * 3) ** 2 * 0.5, -2.2)); bulbs.push(V(lerp(-7, 7, u), 3.4 - Math.sin(u * Math.PI * 3) ** 2 * 0.5, 2.6)); }
  return (
    <group scale={[1, Math.min(1, k * 1.4), 1]}>
      <B p={[0, 0.74, 0.25]} s={[13, 0.08, 1.4]} m={cloth} />
      <B p={[0, 0.6, 0.98]} s={[13, 0.3, 0.02]} m={cloth} noShadow />
      {[-6, -2, 2, 6].map((x) => [-0.3, 0.8].map((zz) => <B key={`${x}${zz}`} p={[x, 0.37, zz]} s={[0.08, 0.74, 0.08]} m={m.toon('#5a3a22')} />))}
      {turkeys.map((p, i) => (clamp01(k * 14 - i) > 0 ? <Turkey3D key={i} m={m} p={p} s={clamp01(k * 14 - i) * 0.9} /> : null))}
      {Array.from({length: 11}).map((_, i) => (
        <group key={`d${i}`} position={[-5 + i * 1.0, 0.8, 0.25 + (i % 2 ? -0.32 : 0.32)]}>
          {i % 3 === 0 ? <mesh material={m.toon('#d9772f')} castShadow><cylinderGeometry args={[0.16, 0.14, 0.05, 20]} /></mesh>
            : i % 3 === 1 ? <mesh position={[0, 0.05, 0]} material={m.toon('#f6e7b8')} castShadow><sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
              : <mesh position={[0, 0.06, 0]} material={m.toon('#7a2a33')} castShadow><cylinderGeometry args={[0.07, 0.06, 0.12, 12]} /></mesh>}
        </group>
      ))}
      {[-7, 7].map((x) => [-2.2, 2.6].map((zz) => <mesh key={`${x}${zz}`} position={[x, 1.75, zz]} material={m.toon('#3a2a22')} castShadow><cylinderGeometry args={[0.05, 0.06, 3.5, 8]} /></mesh>))}
      {bulbs.map((b, i) => (
        <mesh key={`b${i}`} position={b} ref={(o: THREE.Object3D | null) => { if (o) o.layers.set(1); }}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshBasicMaterial color={col('#6a5a3a', ['#ffd27a', '#ffb06a', '#fff0b0'][i % 3], lights)} />
        </mesh>
      ))}
    </group>
  );
};

/** small kitchen: an open, EMPTY fridge with its light on */
export const Kitchen: React.FC<{m: Mats; tex: Tex; open: number}> = ({m, tex, open}) => {
  const k = KITCHEN;
  return (
    <group position={[k.x, 0, k.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m.toon('#ffffff', tex.checker)} receiveShadow><planeGeometry args={[6, 6]} /></mesh>
      <mesh position={[0, 1.5, -2]} material={m.toon('#b9c9b0')} receiveShadow><planeGeometry args={[6, 3]} /></mesh>
      <mesh position={[-2.4, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} material={m.toon('#a9b9a0')} receiveShadow><planeGeometry args={[6, 3]} /></mesh>
      <B p={[-1.3, 0.45, -1.6]} s={[1.6, 0.9, 0.7]} m={m.toon('#c9b48a')} />
      <B p={[-1.3, 0.92, -1.6]} s={[1.7, 0.06, 0.76]} m={m.toon('#e8e4dc')} />
      {/* the fridge */}
      <group position={[0.6, 0, -1.55]}>
        <B p={[0, 0.95, 0]} s={[0.9, 1.9, 0.8]} m={m.toon('#e8e6e0')} />
        <mesh position={[0, 0.95, 0.405]}><planeGeometry args={[0.8, 1.8]} /><meshBasicMaterial color={col('#cfd6dc', '#f4fbff', open)} /></mesh>
        {[0.55, 1.0, 1.45].map((y) => <B key={y} p={[0, y, 0.25]} s={[0.78, 0.03, 0.5]} m={m.toon('#d9e4ea')} noShadow />)}
        <group position={[0.45, 0, 0.4]} rotation={[0, open * 1.9, 0]}>
          <B p={[-0.45, 0.95, 0.04]} s={[0.9, 1.9, 0.08]} m={m.toon('#efeeea')} />
          <B p={[-0.82, 1.1, 0.12]} s={[0.05, 0.4, 0.05]} m={m.toon('#8a8a8a')} />
        </group>
      </group>
      <pointLight position={[0.6, 1.2, -0.9]} color="#e8f4ff" intensity={3 * open} distance={3} decay={1.5} />
    </group>
  );
};

export const Street: React.FC<{m: Mats; tex: Tex; glow: number; tip: number; doorOpen: number; doorsN: number}> = ({m, tex, glow, tip, doorOpen, doorsN}) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={m.toon('#ffffff', tex.road)} receiveShadow><planeGeometry args={[90, 6.4]} /></mesh>
    {Array.from({length: 24}).map((_, i) => <B key={i} p={[-44 + i * 4, 0.01, 0]} s={[1.6, 0.01, 0.12]} m={m.toon('#f2d24a')} noShadow />)}
    {[-3.6, 3.6].map((z) => <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]} material={m.toon('#ffffff', tex.walk)} receiveShadow><planeGeometry args={[90, 0.8]} /></mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -14]} material={m.toon('#ffffff', tex.grass)} receiveShadow><planeGeometry args={[90, 20]} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 14]} material={m.toon('#ffffff', tex.grass)} receiveShadow><planeGeometry args={[90, 20]} /></mesh>
    <House x={-11} w={8} h={5.4} d={6} body="#f3f1ea" roof="#3f4654" trim="#ffffff" m={m} tex={tex} glow={glow} doorOpen={doorsN} />
    <House x={-22} w={8.5} h={5.8} d={6} body="#a9b89a" roof="#4a3b3b" trim="#f4f1ea" m={m} tex={tex} glow={glow} doorOpen={doorsN} />
    <House x={0} w={8} h={5.6} d={6} body="#efe2c4" roof="#6a3b3b" trim="#ffffff" m={m} tex={tex} glow={glow} sill doorOpen={doorOpen} />
    <TinyHouse m={m} tex={tex} glow={glow} />
    <House x={18} w={8.5} h={5.8} d={6} body="#9fb2c4" roof="#3a3f4a" trim="#ffffff" m={m} tex={tex} glow={glow} doorOpen={doorsN} />
    <House x={29} w={8} h={5.4} d={6} body="#d9b48a" roof="#4a3b3b" trim="#ffffff" m={m} tex={tex} glow={glow} doorOpen={doorsN} />
    <Fence x0={-15} x1={-7} z={-4.15} m={m} gap={[-11.0, -9.6]} />
    <Fence x0={14} x1={22} z={-4.15} m={m} gap={[18.0, 19.4]} />
    <mesh position={[HEDGE.x, 0.4, HEDGE.z]} scale={[1.0, 0.44, 0.55]} material={m.toon('#3f6a3a')} castShadow><sphereGeometry args={[1, 14, 10]} /></mesh>
    <mesh position={[HEDGE.x + 0.9, 0.34, HEDGE.z + 0.1]} scale={[0.7, 0.36, 0.5]} material={m.toon('#46743f')} castShadow><sphereGeometry args={[1, 14, 10]} /></mesh>
    <Gnome m={m} tip={tip} />
    <Tree p={V(-5.6, 0, -4.8)} c="#d9772f" m={m} />
    <Tree p={V(13.6, 0, -4.9)} c="#c9452f" m={m} s={1.1} />
    <Tree p={V(-16.5, 0, -4.9)} c="#e0a83a" m={m} />
    <Tree p={V(24, 0, -4.9)} c="#d9772f" m={m} />
  </group>
);

/** gradient sky dome (on layer 1 so the ink pass ignores it) */
export const Sky: React.FC<{top: string; horizon: string}> = ({top, horizon}) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {top: {value: new THREE.Color()}, hor: {value: new THREE.Color()}},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ float k = smoothstep(-0.05, 0.6, vP.y); gl_FragColor = vec4(mix(hor, top, k), 1.); }',
  }), []);
  mat.uniforms.top.value.set(top);
  mat.uniforms.hor.value.set(horizon);
  return <mesh material={mat} ref={(o: THREE.Object3D | null) => { if (o) o.layers.set(1); }}><sphereGeometry args={[50, 32, 16]} /></mesh>;
};
