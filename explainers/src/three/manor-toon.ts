// Manor whodunit cast (2026-11-27): one flexible front-view person drawer + the detective.
// Same sheet rules as toon.ts: 600x1000 design canvas, soles at y 975, bean heads, plum ink.
// All characters are our own designs.
import {INK, T2D} from './toon';

type C = CanvasRenderingContext2D;
const {shape, limb, dot, ell, rrect, bean, detHead} = T2D;

export type Look = {
  skin: string; hair: string; hairStyle: 'bald' | 'bun' | 'bob' | 'short' | 'pony';
  hat?: 'chef' | 'maid' | 'straw' | 'bow';
  top: string; top2: string; legs: string; skirt?: boolean; apron?: string; tie?: string; tails?: boolean;
  mustache?: string; glasses?: boolean; monocle?: boolean; pearls?: boolean; belly?: boolean; scale?: number; shoes?: string;
};
export type Arms = 'down' | 'up' | 'give' | 'pour' | 'tray' | 'drink' | 'knit' | 'shake' | 'read' | 'point' | 'hips' | 'wipe' | 'hold';
export type Prop = 'none' | 'vial' | 'book' | 'bookVial' | 'glass' | 'tray' | 'trayGlass' | 'flask' | 'shaker' | 'needles' | 'can' | 'tongs' | 'magnifier' | 'spoon';
export type Face = 'neutral' | 'smirk' | 'shock' | 'happy' | 'worried' | 'dizzy' | 'sly' | 'relief';
export type Pose = {arms?: Arms; prop?: Prop; face?: Face; walk?: number; eye?: number; dir?: -1 | 1; phase?: number; sit?: boolean; glow?: number; tint?: string};

export const POISON = '#4fe35a';

// ───────────────────────── props (drawn at a hand) ─────────────────────────
const vial = (c: C, x: number, y: number, rot = 0, glow = 0.55) => {
  c.save(); c.translate(x, y); c.rotate(rot);
  if (glow > 0) { c.globalAlpha = glow * 0.5; dot(c, 0, -30, 34, POISON); c.globalAlpha = 1; }
  rrect(c, -13, -52, 26, 42, 8, POISON, 6);
  rrect(c, -6, -66, 12, 16, 3, '#d8f8d0', 5);
  rrect(c, -8, -76, 16, 10, 3, '#8a5a3a', 4);
  c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-7, -46, 5, 24);
  c.restore();
};
const glass = (c: C, x: number, y: number, ice = true) => {
  shape(c, () => { c.moveTo(x - 26, y - 70); c.lineTo(x + 26, y - 70); c.lineTo(x + 21, y); c.lineTo(x - 21, y); c.closePath(); }, '#e9f6ff', 6);
  c.fillStyle = '#d9902f'; c.fillRect(x - 21, y - 44, 42, 40);
  if (ice) { c.fillStyle = '#ffffff'; c.fillRect(x - 13, y - 52, 16, 14); c.fillRect(x + 2, y - 40, 14, 12); }
};
const drawProp = (c: C, prop: Prop, hx: number, hy: number, o: Pose) => {
  const ph = o.phase ?? 0;
  switch (prop) {
    case 'vial': vial(c, hx, hy + 18, o.arms === 'pour' ? -2.4 : 0); break;
    case 'book': case 'bookVial':
      rrect(c, hx - 70, hy - 50, 140, 96, 6, '#7a2a33', 6);
      rrect(c, hx - 60, hy - 42, 120, 80, 4, '#f4ecd8', 5);
      c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(hx, hy - 42); c.lineTo(hx, hy + 38); c.stroke();
      if (prop === 'bookVial') { rrect(c, hx + 8, hy - 30, 46, 58, 6, '#5a3a22', 4); vial(c, hx + 31, hy + 22, 0, 0.6); }
      break;
    case 'glass': glass(c, hx, hy + 20); break;
    case 'tray': case 'trayGlass':
      ell(c, hx, hy - 6, 86, 18, '#d8dce4', 6);
      if (prop === 'trayGlass') glass(c, hx, hy - 12);
      break;
    case 'flask':
      c.save(); c.translate(hx, hy); c.rotate(o.arms === 'pour' ? -2.1 : 0);
      rrect(c, -30, -70, 60, 72, 14, '#c9ced8', 6); c.fillStyle = POISON; c.fillRect(-22, -40, 44, 34);
      rrect(c, -9, -86, 18, 18, 4, '#8a8f99', 4);
      c.restore(); break;
    case 'shaker':
      c.save(); c.translate(hx, hy); c.rotate(Math.sin(ph * 14) * 0.5 + 2.6);
      rrect(c, -18, -58, 36, 56, 10, '#f4f1ea', 6); ell(c, 0, -60, 18, 8, '#c9ced8', 5);
      c.restore(); break;
    case 'needles': {
      const k = Math.sin(ph * 10) * 10;
      c.strokeStyle = INK; c.lineWidth = 12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(250 + k, 560); c.lineTo(350 - k, 660); c.moveTo(350 + k, 560); c.lineTo(250 - k, 660); c.stroke();
      c.strokeStyle = '#d8ad55'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(250 + k, 560); c.lineTo(350 - k, 660); c.moveTo(350 + k, 560); c.lineTo(250 - k, 660); c.stroke();
      rrect(c, 252, 640, 96, 60, 20, '#b3294a', 6);
      ell(c, 300, 760, 40, 36, '#b3294a', 6);
      break;
    }
    case 'can':
      shape(c, () => { c.moveTo(hx - 50, hy + 10); c.lineTo(hx + 30, hy + 10); c.lineTo(hx + 24, hy + 90); c.lineTo(hx - 44, hy + 90); c.closePath(); }, '#3d8a7a', 6);
      limb(c, [[hx + 28, hy + 40], [hx + 90, hy + 4]], 10, '#3d8a7a');
      break;
    case 'tongs':
      c.strokeStyle = INK; c.lineWidth = 12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 40, hy + 70); c.moveTo(hx, hy); c.lineTo(hx + 56, hy + 60); c.stroke();
      c.strokeStyle = '#c9ced8'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 40, hy + 70); c.moveTo(hx, hy); c.lineTo(hx + 56, hy + 60); c.stroke();
      break;
    case 'magnifier':
      limb(c, [[hx, hy], [hx + 30, hy - 50]], 12, '#5a3a22');
      c.globalAlpha = 0.35; dot(c, hx + 56, hy - 96, 50, '#cfe9ff'); c.globalAlpha = 1;
      c.strokeStyle = INK; c.lineWidth = 20; c.beginPath(); c.arc(hx + 56, hy - 96, 50, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#c9a24a'; c.lineWidth = 10; c.beginPath(); c.arc(hx + 56, hy - 96, 50, 0, Math.PI * 2); c.stroke();
      break;
    case 'spoon':
      limb(c, [[hx, hy], [hx - 10, hy + 90]], 8, '#c9ced8');
      break;
    default: break;
  }
};

// ───────────────────────── arms ─────────────────────────
type Arm = {pts: number[][]; hand: [number, number]};
const armsFor = (o: Pose, sw: number, belly: boolean): {L: Arm; R: Arm} => {
  const d = o.dir ?? 1;
  const ph = o.phase ?? 0;
  const bx = belly ? 14 : 0;
  const down = (side: -1 | 1): Arm => {
    const x0 = 300 + side * 86;
    const e: [number, number] = [300 + side * (106 + bx) + sw * 0.3 * -side, 570];
    const h: [number, number] = [300 + side * (100 + bx) + sw * 0.6 * -side, 690];
    return {pts: [[x0, 450], e, h], hand: h};
  };
  const mk = (side: -1 | 1, e: [number, number], h: [number, number]): Arm => ({pts: [[300 + side * 86, 450], e, h], hand: h});
  switch (o.arms ?? 'down') {
    case 'up': return {L: mk(-1, [160, 380], [150, 290]), R: mk(1, [440, 380], [450, 290])};
    case 'give': {
      const reach = mk(d, [300 + d * 170, 500], [300 + d * 262, 512]);
      return d > 0 ? {L: down(-1), R: reach} : {L: reach, R: down(1)};
    }
    case 'point': {
      const reach = mk(d, [300 + d * 180, 440], [300 + d * 270, 420]);
      return d > 0 ? {L: down(-1), R: reach} : {L: reach, R: down(1)};
    }
    case 'pour': return {L: down(-1), R: mk(1, [450, 430], [470, 370])};
    case 'tray': return {L: down(-1), R: mk(1, [430, 590], [452, 540])};
    case 'hold': return {L: down(-1), R: mk(1, [420, 560], [430, 540])};
    case 'drink': return {L: down(-1), R: mk(1, [436, 470], [344, 400])};
    case 'knit': return {L: mk(-1, [196, 560], [262, 610]), R: mk(1, [404, 560], [338, 610])};
    case 'read': return {L: mk(-1, [200, 560], [244, 600]), R: mk(1, [400, 560], [356, 600])};
    case 'shake': return {L: down(-1), R: mk(1, [452, 400], [460, 330 + Math.sin(ph * 14) * 22])};
    case 'hips': return {L: mk(-1, [150, 560], [212, 640]), R: mk(1, [450, 560], [388, 640])};
    case 'wipe': return {L: down(-1), R: mk(1, [440, 380], [370, 214])};
    default: return {L: down(-1), R: down(1)};
  }
};

// ───────────────────────── faces + hair ─────────────────────────
const face = (c: C, cx: number, cy: number, f: Face, eye: number, lk: Look) => {
  const ex = eye * 12;
  c.strokeStyle = INK; c.lineCap = 'round';
  if (f === 'dizzy') {
    c.lineWidth = 8;
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(cx + sx * 40 - 13, cy - 11); c.lineTo(cx + sx * 40 + 13, cy + 15); c.moveTo(cx + sx * 40 + 13, cy - 11); c.lineTo(cx + sx * 40 - 13, cy + 15); c.stroke(); }
  } else if (f === 'shock') {
    ell(c, cx - 40, cy, 17, 21, '#fff', 6); ell(c, cx + 40, cy, 17, 21, '#fff', 6); dot(c, cx - 40 + ex * 0.5, cy + 2, 9); dot(c, cx + 40 + ex * 0.5, cy + 2, 9);
  } else if (f === 'happy' || f === 'relief') {
    c.lineWidth = 7;
    c.beginPath(); c.arc(cx - 40, cy + 8, 12, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    c.beginPath(); c.arc(cx + 40, cy + 8, 12, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  } else {
    const half = f === 'sly' || f === 'smirk';
    dot(c, cx - 40 + ex, cy + 4, 9); dot(c, cx + 40 + ex, cy + 4, 9);
    if (half) { c.fillStyle = lk.skin; c.fillRect(cx - 58 + ex, cy - 12, 36, 12); c.fillRect(cx + 22 + ex, cy - 12, 36, 12); }
  }
  if (lk.glasses) { c.lineWidth = 6; c.strokeStyle = INK; for (const sx of [-1, 1]) { c.beginPath(); c.arc(cx + sx * 40, cy + 2, 26, 0, Math.PI * 2); c.stroke(); } c.beginPath(); c.moveTo(cx - 14, cy); c.lineTo(cx + 14, cy); c.stroke(); }
  if (lk.monocle) { c.lineWidth = 6; c.strokeStyle = '#c9a24a'; c.beginPath(); c.arc(cx + 40, cy + 2, 26, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(cx + 60, cy + 20); c.quadraticCurveTo(cx + 80, cy + 90, cx + 60, cy + 150); c.stroke(); }
  // brows
  c.lineWidth = 7; c.strokeStyle = INK; c.beginPath();
  if (f === 'worried') { c.moveTo(cx - 62, cy - 30); c.lineTo(cx - 24, cy - 40); c.moveTo(cx + 24, cy - 40); c.lineTo(cx + 62, cy - 30); }
  else if (f === 'sly' || f === 'smirk') { c.moveTo(cx - 62, cy - 36); c.lineTo(cx - 22, cy - 24); c.moveTo(cx + 22, cy - 24); c.lineTo(cx + 62, cy - 36); }
  else if (f !== 'dizzy') { c.moveTo(cx - 60, cy - 34); c.lineTo(cx - 24, cy - 36); c.moveTo(cx + 24, cy - 36); c.lineTo(cx + 60, cy - 34); }
  c.stroke();
  // mustache sits over the mouth
  c.beginPath();
  if (f === 'shock') { c.fillStyle = '#5a1f2a'; c.ellipse(cx, cy + 62, 18, 24, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
  else if (f === 'dizzy') { c.moveTo(cx - 30, cy + 62); c.quadraticCurveTo(cx - 15, cy + 50, cx, cy + 62); c.quadraticCurveTo(cx + 15, cy + 74, cx + 30, cy + 62); c.stroke(); }
  else if (f === 'smirk' || f === 'sly') { c.moveTo(cx - 26, cy + 60); c.quadraticCurveTo(cx + 10, cy + 70, cx + 34, cy + 48); c.stroke(); }
  else if (f === 'worried') { c.moveTo(cx - 24, cy + 66); c.quadraticCurveTo(cx, cy + 54, cx + 24, cy + 66); c.stroke(); }
  else if (f === 'happy' || f === 'relief') { c.fillStyle = '#7a2230'; c.moveTo(cx - 32, cy + 50); c.quadraticCurveTo(cx, cy + 90, cx + 32, cy + 50); c.closePath(); c.fill(); c.stroke(); }
  else { c.moveTo(cx - 22, cy + 62); c.lineTo(cx + 22, cy + 62); c.stroke(); }
  if (lk.mustache) {
    shape(c, () => {
      c.moveTo(cx, cy + 36);
      c.bezierCurveTo(cx + 40, cy + 22, cx + 92, cy + 30, cx + 100, cy + 10);
      c.bezierCurveTo(cx + 96, cy + 56, cx + 40, cy + 62, cx, cy + 48);
      c.bezierCurveTo(cx - 40, cy + 62, cx - 96, cy + 56, cx - 100, cy + 10);
      c.bezierCurveTo(cx - 92, cy + 30, cx - 40, cy + 22, cx, cy + 36);
    }, lk.mustache, 6);
  }
  if (f === 'relief') shape(c, () => { c.moveTo(cx - 80, cy - 70); c.quadraticCurveTo(cx - 66, cy - 40, cx - 80, cy - 34); c.quadraticCurveTo(cx - 94, cy - 40, cx - 80, cy - 70); }, '#8fd3ff', 4);
};
const hairBack = (c: C, cx: number, cy: number, lk: Look) => {
  if (lk.hairStyle === 'bun') ell(c, cx, cy - 118, 50, 42, lk.hair);
  if (lk.hairStyle === 'pony') shape(c, () => { c.moveTo(cx + 70, cy - 70); c.quadraticCurveTo(cx + 190, cy - 40, cx + 150, cy + 110); c.quadraticCurveTo(cx + 120, cy + 20, cx + 60, cy - 30); c.closePath(); }, lk.hair);
  if (lk.hairStyle === 'bob') shape(c, () => { c.moveTo(cx - 122, cy + 70); c.quadraticCurveTo(cx - 140, cy - 120, cx, cy - 118); c.quadraticCurveTo(cx + 140, cy - 120, cx + 122, cy + 70); c.closePath(); }, lk.hair);
};
const hairFront = (c: C, cx: number, cy: number, lk: Look) => {
  const H = lk.hair;
  if (lk.hairStyle === 'bald') {
    for (const sx of [-1, 1]) shape(c, () => { c.moveTo(cx + sx * 112, cy + 10); c.quadraticCurveTo(cx + sx * 128, cy - 40, cx + sx * 92, cy - 64); c.quadraticCurveTo(cx + sx * 96, cy - 20, cx + sx * 86, cy + 14); c.closePath(); }, H);
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(cx - 30, cy - 80, 26, 10, -0.3, 0, Math.PI * 2); c.fill();
  } else if (lk.hairStyle === 'short') {
    shape(c, () => { c.moveTo(cx - 108, cy - 6); c.quadraticCurveTo(cx - 106, cy - 110, cx, cy - 108); c.quadraticCurveTo(cx + 106, cy - 110, cx + 108, cy - 6); c.quadraticCurveTo(cx + 84, cy - 60, cx + 20, cy - 62); c.lineTo(cx - 10, cy - 40); c.quadraticCurveTo(cx - 70, cy - 64, cx - 108, cy - 6); }, H);
  } else {
    shape(c, () => { c.moveTo(cx - 108, cy - 6); c.quadraticCurveTo(cx - 104, cy - 106, cx, cy - 106); c.quadraticCurveTo(cx + 104, cy - 106, cx + 108, cy - 6); c.quadraticCurveTo(cx + 60, cy - 68, cx, cy - 64); c.quadraticCurveTo(cx - 60, cy - 68, cx - 108, cy - 6); }, H);
  }
  // hats
  if (lk.hat === 'chef') {
    rrect(c, cx - 80, cy - 140, 160, 44, 6, '#ffffff', 7);
    shape(c, () => { c.moveTo(cx - 80, cy - 136); c.bezierCurveTo(cx - 150, cy - 170, cx - 110, cy - 270, cx - 40, cy - 240); c.bezierCurveTo(cx - 20, cy - 300, cx + 60, cy - 290, cx + 60, cy - 240); c.bezierCurveTo(cx + 140, cy - 260, cx + 150, cy - 160, cx + 80, cy - 136); c.closePath(); }, '#ffffff', 7);
  } else if (lk.hat === 'maid') {
    shape(c, () => { c.moveTo(cx - 80, cy - 96); c.quadraticCurveTo(cx, cy - 150, cx + 80, cy - 96); c.lineTo(cx + 70, cy - 80); c.quadraticCurveTo(cx, cy - 118, cx - 70, cy - 80); c.closePath(); }, '#ffffff', 6);
  } else if (lk.hat === 'straw') {
    shape(c, () => c.ellipse(cx, cy - 76, 170, 34, 0, 0, Math.PI * 2), '#e6c25a', 7);
    shape(c, () => { c.moveTo(cx - 88, cy - 80); c.quadraticCurveTo(cx - 84, cy - 166, cx, cy - 160); c.quadraticCurveTo(cx + 84, cy - 166, cx + 88, cy - 80); c.closePath(); }, '#f0d070', 7);
    c.fillStyle = '#c4453f'; c.fillRect(cx - 86, cy - 104, 172, 18);
  } else if (lk.hat === 'bow') {
    for (const sx of [-1, 1]) shape(c, () => { c.moveTo(cx + 40, cy - 110); c.quadraticCurveTo(cx + 40 + sx * 70, cy - 180, cx + 40 + sx * 74, cy - 110); c.quadraticCurveTo(cx + 40 + sx * 70, cy - 60, cx + 40, cy - 110); }, '#ff5fa2', 6);
    dot(c, cx + 40, cy - 110, 16, '#d63d80');
  }
};

/** a standing (or seated) guest/staff member, front view */
export const drawPerson = (c: C, lk: Look, o: Pose = {}) => {
  c.clearRect(0, 0, 600, 1000);
  const k = lk.scale ?? 1;
  c.save();
  c.translate(300, 975); c.scale(k, k); c.translate(-300, -975);
  if (o.glow && o.glow > 0) { c.globalAlpha = Math.min(1, o.glow); c.fillStyle = o.tint ?? POISON; c.beginPath(); c.ellipse(300, 560, 280, 440, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
  const sit = !!o.sit;
  const dy = sit ? 150 : 0; // seated: body sinks, thighs foreshorten toward us
  c.translate(0, dy);
  const walk = o.walk ?? 0;
  const sw = Math.sin(walk) * 30;
  const lift = (v: number) => Math.max(0, v) * 26;
  const shoe = lk.shoes ?? '#201a16';
  const belly = !!lk.belly;
  // legs
  if (sit) {
    rrect(c, 222, 690, 156, 70, 30, lk.skirt ? lk.legs : lk.legs);
    limb(c, [[262, 740], [258, 935 - dy]], lk.skirt ? 24 : 34, lk.skirt ? lk.skin : lk.legs);
    limb(c, [[338, 740], [342, 935 - dy]], lk.skirt ? 24 : 34, lk.skirt ? lk.skin : lk.legs);
    ell(c, 250, 950 - dy, 38, 18, shoe); ell(c, 350, 950 - dy, 38, 18, shoe);
  } else {
    const legW = lk.skirt ? 24 : 36;
    const legC = lk.skirt ? lk.skin : lk.legs;
    limb(c, [[262, lk.skirt ? 780 : 700], [262 - sw * 0.4, 840], [258 - sw, 935 - lift(Math.sin(walk))]], legW, legC);
    limb(c, [[338, lk.skirt ? 780 : 700], [338 + sw * 0.4, 840], [342 + sw, 935 - lift(-Math.sin(walk))]], legW, legC);
    ell(c, 250 - sw, 952 - lift(Math.sin(walk)), 38, 19, shoe);
    ell(c, 350 + sw, 952 - lift(-Math.sin(walk)), 38, 19, shoe);
  }
  // coat tails (butler)
  if (lk.tails && !sit) {
    shape(c, () => { c.moveTo(214, 700); c.lineTo(190, 830); c.lineTo(250, 790); c.closePath(); }, lk.top, 7);
    shape(c, () => { c.moveTo(386, 700); c.lineTo(410, 830); c.lineTo(350, 790); c.closePath(); }, lk.top, 7);
  }
  // body
  const bw = belly ? 40 : 0;
  const hem = lk.skirt ? 800 : 720;
  shape(c, () => {
    c.moveTo(212, 430); c.quadraticCurveTo(300, 404, 388, 430);
    if (belly) c.quadraticCurveTo(470, 600, 404 + bw * 0.3, hem); else c.lineTo(lk.skirt ? 420 : 404, hem);
    c.lineTo(lk.skirt ? 180 : 196 - bw * 0.3, hem);
    if (belly) c.quadraticCurveTo(130, 600, 212, 430); else c.closePath();
  }, lk.skirt ? lk.legs : lk.top);
  if (lk.skirt) shape(c, () => { c.moveTo(212, 430); c.quadraticCurveTo(300, 404, 388, 430); c.lineTo(396, 620); c.lineTo(204, 620); c.closePath(); }, lk.top);
  if (lk.apron) {
    rrect(c, 236, 560, 128, lk.skirt ? 220 : 160, 18, lk.apron, 6);
    if (lk.skirt) rrect(c, 254, 470, 92, 90, 10, lk.apron, 5);
  }
  // collar / shirt V / tie
  shape(c, () => { c.moveTo(262, 420); c.lineTo(300, lk.tie ? 540 : 500); c.lineTo(338, 420); c.closePath(); }, lk.top2, 7);
  if (lk.tie === 'bow') shape(c, () => { c.moveTo(278, 440); c.lineTo(300, 454); c.lineTo(322, 440); c.lineTo(322, 470); c.lineTo(300, 456); c.lineTo(278, 470); c.closePath(); }, INK, 4);
  else if (lk.tie) shape(c, () => { c.moveTo(292, 440); c.lineTo(308, 440); c.lineTo(314, 520); c.lineTo(300, 540); c.lineTo(286, 520); c.closePath(); }, lk.tie, 4);
  if (belly) { c.strokeStyle = '#d8ad55'; c.lineWidth = 10; c.beginPath(); c.moveTo(250, 430); c.lineTo(230, 700); c.moveTo(350, 430); c.lineTo(370, 700); c.stroke(); }
  if (lk.pearls) for (let i = 0; i < 9; i++) dot(c, 250 + i * 12.5, 446 + Math.sin((i / 8) * Math.PI) * 26, 7, '#fbf7ee');
  // arms + hands + prop
  const A = armsFor(o, sw, belly);
  const sleeve = lk.top;
  limb(c, A.L.pts, 30, sleeve);
  limb(c, A.R.pts, 30, sleeve);
  const prop = o.prop ?? 'none';
  const behindHand = prop === 'book' || prop === 'bookVial' || prop === 'needles';
  if (behindHand) drawProp(c, prop, (A.L.hand[0] + A.R.hand[0]) / 2, (A.L.hand[1] + A.R.hand[1]) / 2, o);
  dot(c, A.L.hand[0], A.L.hand[1], 15, lk.skin === '#000' ? INK : INK);
  dot(c, A.R.hand[0], A.R.hand[1], 15);
  if (!behindHand) {
    const g = (o.arms === 'give' || o.arms === 'point') && (o.dir ?? 1) < 0 ? A.L.hand : A.R.hand;
    drawProp(c, prop, g[0], g[1], o);
  }
  // head
  const cx = 300;
  const cy = 300;
  hairBack(c, cx, cy, lk);
  ell(c, cx - 110, cy + 8, 18, 28, lk.skin);
  ell(c, cx + 110, cy + 8, 18, 28, lk.skin);
  bean(c, cx, cy, 222, 208, lk.skin);
  hairFront(c, cx, cy, lk);
  face(c, cx, cy, o.face ?? 'neutral', o.eye ?? 0, lk);
  c.restore();
};

// ───────────────────────── the cast ─────────────────────────
export const CAST = {
  host: {skin: '#f2c8a8', hair: '#f4f1ea', hairStyle: 'bald', top: '#8a2733', top2: '#f4f1ea', legs: '#26242e', mustache: '#f4f1ea', monocle: true, belly: true, tie: 'bow'} as Look,
  butler: {skin: '#e8b48c', hair: '#3a3036', hairStyle: 'short', top: '#2a2630', top2: '#ffffff', legs: '#2a2630', tie: 'bow', tails: true} as Look,
  maid: {skin: '#c98e64', hair: '#241726', hairStyle: 'bob', hat: 'maid', top: '#2a2630', top2: '#ffffff', legs: '#2a2630', skirt: true, apron: '#ffffff'} as Look,
  chef: {skin: '#f0c8a8', hair: '#8a5a3a', hairStyle: 'short', hat: 'chef', top: '#f4f1ea', top2: '#d6293a', legs: '#4a4650', mustache: '#8a5a3a', belly: false} as Look,
  gardener: {skin: '#b9825c', hair: '#3a2a22', hairStyle: 'short', hat: 'straw', top: '#4f7a3a', top2: '#e0a040', legs: '#4f7a3a', shoes: '#5a3a22'} as Look,
  niece: {skin: '#f2d0b4', hair: '#e0a040', hairStyle: 'pony', hat: 'bow', top: '#ff8fbf', top2: '#ffffff', legs: '#ff8fbf', skirt: true, scale: 0.9} as Look,
  doctor: {skin: '#e8b48c', hair: '#a9a6a2', hairStyle: 'short', top: '#7a5a3a', top2: '#ffffff', legs: '#4a3a2c', tie: '#2f5f9a', glasses: true} as Look,
  aunt: {skin: '#f2cdb0', hair: '#f4f1ea', hairStyle: 'bun', top: '#8f7ad0', top2: '#e6e0f8', legs: '#8f7ad0', skirt: true, pearls: true, glasses: true} as Look,
};
export type Who = keyof typeof CAST;

// ───────────────────────── the detective (same as #21b, now with a magnifying glass) ─────────────────────────
const COAT = '#c9a26a';
export const drawDetective = (c: C, o: {arms?: 'down' | 'magnifier' | 'point' | 'tip'; dir?: -1 | 1; walk?: number; look?: number} = {}) => {
  c.clearRect(0, 0, 600, 1000);
  const walk = o.walk ?? 0;
  const sw = Math.sin(walk) * 34;
  const lift = (k: number) => Math.max(0, k) * 30;
  limb(c, [[262, 700], [262 - sw * 0.4, 820], [258 - sw, 935 - lift(Math.sin(walk))]], 34, '#3b3346');
  limb(c, [[338, 700], [338 + sw * 0.4, 820], [342 + sw, 935 - lift(-Math.sin(walk))]], 34, '#3b3346');
  ell(c, 250 - sw, 952 - lift(Math.sin(walk)), 40, 20, '#201a16');
  ell(c, 350 + sw, 952 - lift(-Math.sin(walk)), 40, 20, '#201a16');
  shape(c, () => { c.moveTo(212, 430); c.quadraticCurveTo(300, 404, 388, 430); c.lineTo(412, 760); c.lineTo(188, 760); c.closePath(); }, COAT);
  shape(c, () => { c.moveTo(262, 420); c.lineTo(300, 500); c.lineTo(338, 420); c.closePath(); }, '#e8e1d2', 7);
  c.fillStyle = '#8f6c3c'; c.fillRect(200, 590, 200, 26);
  c.strokeStyle = INK; c.lineWidth = 6; c.strokeRect(200, 590, 200, 26);
  const d = o.dir ?? 1;
  limb(c, [[214, 450], [196 + sw * 0.3, 580], [204 + sw * 0.6, 690]], 32, COAT);
  dot(c, 204 + sw * 0.6, 708, 14);
  if (o.arms === 'magnifier') {
    limb(c, [[386, 450], [446, 470], [430, 400]], 32, COAT);
    drawProp(c, 'magnifier', 430, 400, {});
    dot(c, 430, 400, 15);
  } else if (o.arms === 'point') {
    const hx = 300 + d * 270;
    limb(c, [[300 + d * 86, 450], [300 + d * 180, 440], [hx, 420]], 32, COAT);
    dot(c, hx, 420, 15);
  } else if (o.arms === 'tip') {
    limb(c, [[386, 450], [450, 330], [380, 196]], 32, COAT);
  } else {
    limb(c, [[386, 450], [404 - sw * 0.3, 580], [396 - sw * 0.6, 690]], 32, COAT);
    dot(c, 396 - sw * 0.6, 708, 14);
  }
  detHead(c, 300, 300, o.look ?? -0.4);
  if (o.arms === 'tip') dot(c, 380, 190, 15);
};
