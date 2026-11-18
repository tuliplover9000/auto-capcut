// Procedural fingerprints. A print is the level set of a scalar "ridge field":
//   loop  = distance to a ray from the core  -> hairpins opening one way
//   whorl = distance to a short segment      -> concentric rings
//   arch  = y + a bump that fades with depth -> ridges that rise in the middle
// sampled with marching squares (one stroked path per print), then minutiae are
// cut in: an ENDING erases a ridge onward from a point, a DOT erases both sides
// leaving a short island, a FORK grows a new ridge into the valley.
// Everything is deterministic (no Math.random) so frames never flicker.

export const P = 12; // ridge period (local units)
export const RX = 118;
export const RY = 150;
export const INK_W = 5.4;

type V2 = [number, number];
export type MinKind = 'end' | 'fork' | 'dot';
export type Spec = {
  kind: 'loop' | 'whorl' | 'arch';
  core: V2;
  ang: number; // loop: ray direction, whorl: segment direction (deg)
  seed: number;
  warp?: number;
  len?: number; // whorl segment half-length
  mins?: Array<{k: MinKind; p: V2; dir?: 1 | -1; len?: number}>;
  hl?: number; // ridge index to also return as a highlight path
  amp?: number; // arch bump height
};
export type PrintData = {d: string; extra: string; hl: string; mins: Array<{k: MinKind; x: number; y: number}>};

const warpOf = (s: Spec) => {
  const a = s.warp ?? 6;
  const s1 = s.seed * 1.7;
  const s2 = s.seed * 2.3 + 1;
  const s3 = s.seed * 0.9 + 2;
  return (x: number, y: number): V2 => [x + a * Math.sin(y / 47 + s1) + a * 0.6 * Math.sin((x + y) / 31 + s2), y + a * Math.sin(x / 53 + s3)];
};

export const fieldOf = (s: Spec) => {
  const w = warpOf(s);
  const ux = Math.cos((s.ang * Math.PI) / 180);
  const uy = Math.sin((s.ang * Math.PI) / 180);
  const [cx, cy] = s.core;
  if (s.kind === 'loop') {
    return (x0: number, y0: number) => {
      const [x, y] = w(x0, y0);
      const vx = x - cx;
      const vy = y - cy;
      const t = vx * ux + vy * uy;
      if (t < 0) return Math.hypot(vx, vy);
      return Math.hypot(vx - t * ux, vy - t * uy);
    };
  }
  if (s.kind === 'whorl') {
    const L = s.len ?? 12;
    return (x0: number, y0: number) => {
      const [x, y] = w(x0, y0);
      const vx = x - cx;
      const vy = y - cy;
      const t = Math.max(-L, Math.min(L, vx * ux + vy * uy));
      return Math.hypot(vx - t * ux, vy - t * uy) * 1.0;
    };
  }
  return (x0: number, y0: number) => {
    const [x, y] = w(x0, y0);
    const A = (s.amp ?? 58) * Math.exp(-(((y - cy) / 115) ** 2));
    return y + A * Math.exp(-((x - cx) ** 2) / (2 * 72 * 72));
  };
};

const inMask = (x: number, y: number) => (x / RX) ** 2 + (y / RY) ** 2 < 1;

export const makePrint = (s: Spec): PrintData => {
  const f = fieldOf(s);
  const g = (x: number, y: number): V2 => [(f(x + 0.5, y) - f(x - 0.5, y)), (f(x, y + 0.5) - f(x, y - 0.5))];
  const levelOf = (v: number) => (Math.round(v / P - 0.5) + 0.5) * P;
  const snap = (p: V2, L: number): V2 => {
    let [x, y] = p;
    for (let i = 0; i < 8; i++) {
      const v = f(x, y) - L;
      const [gx, gy] = g(x, y);
      const gg = gx * gx + gy * gy || 1;
      x -= (v * gx) / gg;
      y -= (v * gy) / gg;
    }
    return [x, y];
  };
  const tan = (p: V2): V2 => {
    const [gx, gy] = g(p[0], p[1]);
    const m = Math.hypot(gx, gy) || 1;
    return [-gy / m, gx / m];
  };
  const trace = (p0: V2, L: number, dir: 1 | -1, len: number): V2[] => {
    const pts: V2[] = [p0];
    let p = p0;
    let [tx, ty] = tan(p0);
    tx *= dir;
    ty *= dir;
    for (let d = 0; d < len; d += 2) {
      const q = snap([p[0] + tx * 2, p[1] + ty * 2], L);
      let [nx, ny] = tan(q);
      if (nx * tx + ny * ty < 0) {
        nx = -nx;
        ny = -ny;
      }
      tx = nx;
      ty = ny;
      p = q;
      pts.push(p);
    }
    return pts;
  };

  // ── minutiae
  const erase: V2[] = [];
  let extra = '';
  const mins: PrintData['mins'] = [];
  for (const m of s.mins ?? []) {
    const L = levelOf(f(m.p[0], m.p[1]));
    const p = snap(m.p, L);
    const dir = m.dir ?? 1;
    if (m.k === 'end') {
      erase.push(...trace(p, L, dir, m.len ?? 64).slice(1));
    } else if (m.k === 'dot') {
      erase.push(...trace(p, L, 1, 46).slice(3));
      erase.push(...trace(p, L, -1, 46).slice(3));
    } else {
      const [tx, ty] = tan(p);
      const [gx, gy] = g(p[0], p[1]);
      const gm = Math.hypot(gx, gy) || 1;
      const q0 = snap([p[0] + tx * dir * 13 + (gx / gm) * P * 0.5, p[1] + ty * dir * 13 + (gy / gm) * P * 0.5], L + P / 2);
      const br = trace(q0, L + P / 2, dir, 52);
      extra += `M ${p[0].toFixed(1)} ${p[1].toFixed(1)} Q ${(p[0] + tx * dir * 7).toFixed(1)} ${(p[1] + ty * dir * 7).toFixed(1)} ${q0[0].toFixed(1)} ${q0[1].toFixed(1)}`;
      for (const q of br.slice(1)) extra += ` L ${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
      extra += ' ';
    }
    mins.push({k: m.k, x: p[0], y: p[1]});
  }
  const erased = (x: number, y: number) => {
    for (const q of erase) if ((q[0] - x) ** 2 + (q[1] - y) ** 2 < 5.2 * 5.2) return true;
    return false;
  };

  // ── marching squares
  const h = 2.5;
  const nx = Math.ceil((2 * RX) / h) + 1;
  const ny = Math.ceil((2 * RY) / h) + 1;
  const V = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[j * nx + i] = f(-RX + i * h, -RY + j * h);
  let d = '';
  let hl = '';
  const seg = (k: number, x1: number, y1: number, x2: number, y2: number) => {
    if (erased((x1 + x2) / 2, (y1 + y2) / 2)) return;
    const str = `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    d += str;
    if (s.hl !== undefined && k === s.hl) hl += str;
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const x = -RX + i * h;
      const y = -RY + j * h;
      if (!inMask(x + h / 2, y + h / 2)) continue;
      const a = V[j * nx + i];
      const b = V[j * nx + i + 1];
      const c = V[(j + 1) * nx + i + 1];
      const dd = V[(j + 1) * nx + i];
      const mn = Math.min(a, b, c, dd);
      const mx = Math.max(a, b, c, dd);
      const k0 = Math.ceil(mn / P - 0.5);
      const k1 = Math.floor(mx / P - 0.5);
      for (let k = k0; k <= k1; k++) {
        const L = (k + 0.5) * P;
        const pts: V2[] = [];
        const ed = (va: number, vb: number, ax: number, ay: number, bx: number, by: number) => {
          if ((va - L) * (vb - L) < 0) {
            const u = (L - va) / (vb - va);
            pts.push([ax + (bx - ax) * u, ay + (by - ay) * u]);
          } else pts.push([NaN, NaN]);
        };
        ed(a, b, x, y, x + h, y); // top
        ed(b, c, x + h, y, x + h, y + h); // right
        ed(dd, c, x, y + h, x + h, y + h); // bottom
        ed(a, dd, x, y, x, y + h); // left
        const ok = pts.map((p) => !Number.isNaN(p[0]));
        const n = ok.filter(Boolean).length;
        if (n === 2) {
          const [p, q] = pts.filter((_, z) => ok[z]);
          seg(k, p[0], p[1], q[0], q[1]);
        } else if (n === 4) {
          const ctr = (a + b + c + dd) / 4;
          if ((ctr - L) * (a - L) > 0) {
            seg(k, pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
            seg(k, pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
          } else {
            seg(k, pts[0][0], pts[0][1], pts[3][0], pts[3][1]);
            seg(k, pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
          }
        }
      }
    }
  }
  return {d, extra, hl, mins};
};
