// 2D cartoon character cards for the 3D world, drawn with Canvas2D.
// Design canvas 600x1000, soles at y=975 (standing). Bean heads, stick limbs,
// plum ink, ink-dot hands. All characters are our own designs.
export const INK = '#241726';
export const PX_M = 1.75 / 785; // metres per design pixel (785 px = a 1.75 m adult)
const LW = 9;
type C = CanvasRenderingContext2D;

const shape = (c: C, draw: () => void, fill: string, lw = LW) => {
  c.beginPath();
  draw();
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = lw;
  c.strokeStyle = INK;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.stroke();
};
/** thick limb with ink outline */
const limb = (c: C, pts: number[][], w: number, col: string) => {
  const path = () => {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
  };
  c.lineCap = 'round';
  c.lineJoin = 'round';
  path();
  c.strokeStyle = INK;
  c.lineWidth = w + LW * 2;
  c.stroke();
  path();
  c.strokeStyle = col;
  c.lineWidth = w;
  c.stroke();
};
const dot = (c: C, x: number, y: number, r: number, col = INK) => {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = col;
  c.fill();
};
const ell = (c: C, x: number, y: number, rx: number, ry: number, fill: string, lw = LW) =>
  shape(c, () => c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2), fill, lw);
const rrect = (c: C, x: number, y: number, w: number, h: number, r: number, fill: string, lw = LW) =>
  shape(c, () => c.roundRect(x, y, w, h, r), fill, lw);
/** bean head: slightly pointier crown, narrower chin */
const bean = (c: C, cx: number, cy: number, w: number, h: number, fill: string) =>
  shape(c, () => {
    c.moveTo(cx, cy - h / 2);
    c.bezierCurveTo(cx + w * 0.62, cy - h / 2, cx + w * 0.56, cy + h * 0.5, cx, cy + h / 2);
    c.bezierCurveTo(cx - w * 0.56, cy + h * 0.5, cx - w * 0.62, cy - h / 2, cx, cy - h / 2);
    c.closePath();
  }, fill);

export const SKIN_ALIVE = [242, 196, 166];
export const SKIN_COLD = [184, 204, 232];
export const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;

// ───────────────────────── the victim: retired professor ─────────────────────────
type VictimOpts = {skin: string; dead: boolean; frost: number};
const victimHead = (c: C, cx: number, cy: number, o: VictimOpts) => {
  // ears
  ell(c, cx - 112, cy + 8, 20, 30, o.skin);
  ell(c, cx + 112, cy + 8, 20, 30, o.skin);
  bean(c, cx, cy, 228, 214, o.skin);
  // grey side tufts
  shape(c, () => { c.moveTo(cx - 118, cy - 20); c.quadraticCurveTo(cx - 128, cy - 70, cx - 80, cy - 86); c.quadraticCurveTo(cx - 92, cy - 40, cx - 96, cy - 6); c.closePath(); }, '#d9d6d0');
  shape(c, () => { c.moveTo(cx + 118, cy - 20); c.quadraticCurveTo(cx + 128, cy - 70, cx + 80, cy - 86); c.quadraticCurveTo(cx + 92, cy - 40, cx + 96, cy - 6); c.closePath(); }, '#d9d6d0');
  // eyes
  if (o.dead) {
    for (const ex of [cx - 44, cx + 44]) {
      c.strokeStyle = INK; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(ex - 15, cy - 20); c.lineTo(ex + 15, cy + 10); c.moveTo(ex + 15, cy - 20); c.lineTo(ex - 15, cy + 10); c.stroke();
    }
  } else {
    dot(c, cx - 44, cy + 2, 10);
    dot(c, cx + 44, cy + 2, 10);
  }
  // round glasses
  c.strokeStyle = INK; c.lineWidth = 6;
  c.beginPath(); c.arc(cx - 44, cy - 4, 32, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(cx + 44, cy - 4, 32, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(cx - 12, cy - 6); c.lineTo(cx + 12, cy - 6); c.stroke();
  // nose + white walrus moustache
  shape(c, () => c.ellipse(cx, cy + 36, 16, 13, 0, 0, Math.PI * 2), o.skin, 7);
  shape(c, () => {
    c.moveTo(cx - 62, cy + 70);
    c.quadraticCurveTo(cx - 40, cy + 42, cx, cy + 52);
    c.quadraticCurveTo(cx + 40, cy + 42, cx + 62, cy + 70);
    c.quadraticCurveTo(cx, cy + 74, cx - 62, cy + 70);
  }, '#f1efe9', 7);
  // frost on the face
  if (o.frost > 0) {
    c.globalAlpha = o.frost;
    for (const [fx, fy, s] of [[cx - 80, cy - 60, 12], [cx + 70, cy - 70, 10], [cx + 92, cy + 30, 8], [cx - 96, cy + 40, 9]]) {
      c.strokeStyle = '#ffffff'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(fx - s, fy); c.lineTo(fx + s, fy); c.moveTo(fx, fy - s); c.lineTo(fx, fy + s); c.stroke();
    }
    c.globalAlpha = 1;
  }
};

/** sitting in the armchair, reading (front view) */
export const drawVictimSitting = (c: C, o: VictimOpts) => {
  c.clearRect(0, 0, 600, 1000);
  // shins + slippers
  limb(c, [[255, 700], [250, 935]], 40, '#6b4a33');
  limb(c, [[345, 700], [350, 935]], 40, '#6b4a33');
  ell(c, 238, 950, 44, 24, '#7a2230');
  ell(c, 362, 950, 44, 24, '#7a2230');
  // lap
  rrect(c, 205, 620, 190, 100, 34, '#6b4a33');
  // torso: maroon cardigan over a cream shirt
  shape(c, () => {
    c.moveTo(208, 430); c.quadraticCurveTo(300, 400, 392, 430);
    c.lineTo(402, 650); c.quadraticCurveTo(300, 672, 198, 650); c.closePath();
  }, '#8c2f39');
  shape(c, () => { c.moveTo(270, 418); c.lineTo(300, 520); c.lineTo(330, 418); c.closePath(); }, '#efe6d2', 7);
  for (const by of [545, 590, 632]) dot(c, 300, by, 7, '#e2c27a');
  // arms to the book
  limb(c, [[214, 450], [196, 560], [262, 610]], 34, '#8c2f39');
  limb(c, [[386, 450], [404, 560], [338, 610]], 34, '#8c2f39');
  // open book
  shape(c, () => { c.moveTo(212, 560); c.lineTo(300, 586); c.lineTo(388, 560); c.lineTo(388, 640); c.lineTo(300, 662); c.lineTo(212, 640); c.closePath(); }, '#2f5f9a');
  shape(c, () => { c.moveTo(226, 566); c.lineTo(300, 588); c.lineTo(374, 566); c.lineTo(374, 628); c.lineTo(300, 650); c.lineTo(226, 628); c.closePath(); }, '#f6f0df', 6);
  dot(c, 258, 612, 13);
  dot(c, 342, 612, 13);
  victimHead(c, 300, 300, o);
};

/** lying on his back (drawn standing, rotated onto a 1000x500 canvas: feet left, head right) */
export const drawVictimLying = (c: C, o: VictimOpts) => {
  c.clearRect(0, 0, 1000, 500);
  c.save();
  c.translate(1084, -50); // standing (x,y) -> canvas (1084 - y, x - 50): soles at x~109, head at x~890
  c.rotate(Math.PI / 2);
  // now drawing in standing coords: x -> canvas down, y -> canvas left
  limb(c, [[262, 640], [250, 930]], 40, '#6b4a33');
  limb(c, [[338, 640], [356, 930]], 40, '#6b4a33');
  ell(c, 244, 950, 26, 40, '#7a2230');
  ell(c, 362, 950, 26, 40, '#7a2230');
  shape(c, () => {
    c.moveTo(208, 430); c.quadraticCurveTo(300, 400, 392, 430);
    c.lineTo(400, 670); c.quadraticCurveTo(300, 690, 200, 670); c.closePath();
  }, '#8c2f39');
  shape(c, () => { c.moveTo(270, 418); c.lineTo(300, 520); c.lineTo(330, 418); c.closePath(); }, '#efe6d2', 7);
  for (const by of [545, 590, 632]) dot(c, 300, by, 7, '#e2c27a');
  limb(c, [[212, 450], [168, 560], [160, 650]], 32, '#8c2f39');
  limb(c, [[388, 450], [432, 560], [440, 650]], 32, '#8c2f39');
  dot(c, 160, 668, 14);
  dot(c, 440, 668, 14);
  victimHead(c, 300, 300, o);
  c.restore();
};

// ───────────────────────── the suspects ─────────────────────────
export type Suspect = {
  letter: string; badge: string; skin: string; hair: string; style: 'bun' | 'cap' | 'side';
  top: string; top2: string; legs: string; skirt?: boolean;
};
export const SUSPECTS: Suspect[] = [
  {letter: 'A', badge: '#ff9a1f', skin: '#e8b48c', hair: '#6b3e26', style: 'bun', top: '#ff9a1f', top2: '#f6e7cf', legs: '#5a4a6a', skirt: true},
  {letter: 'B', badge: '#b07cff', skin: '#b9825c', hair: '#2b2230', style: 'cap', top: '#8f5ae0', top2: '#b07cff', legs: '#3b5a8a'},
  {letter: 'C', badge: '#3fd0c9', skin: '#f0c8a8', hair: '#a9a6a2', style: 'side', top: '#2aa9a3', top2: '#ffffff', legs: '#26242e'},
];
export type Mood = 'neutral' | 'worried' | 'smirk' | 'shock' | 'happy';
/** a standing suspect, front view, with a letter badge on the chest */
export const drawSuspect = (c: C, p: Suspect, mood: Mood, glow = 0, extra: {noBadge?: boolean; dish?: Dish} = {}) => {
  c.clearRect(0, 0, 600, 1000);
  if (glow > 0) { // highlight ring behind the card (answer / trap reveals)
    c.globalAlpha = glow; c.fillStyle = p.badge;
    c.beginPath(); c.ellipse(300, 600, 270, 420, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  }
  if (p.skirt) {
    limb(c, [[262, 760], [258, 935]], 26, p.skin);
    limb(c, [[338, 760], [342, 935]], 26, p.skin);
  } else {
    limb(c, [[262, 700], [256, 935]], 36, p.legs);
    limb(c, [[338, 700], [344, 935]], 36, p.legs);
  }
  ell(c, 248, 952, 38, 19, '#201a16');
  ell(c, 352, 952, 38, 19, '#201a16');
  // body
  shape(c, () => {
    c.moveTo(212, 430); c.quadraticCurveTo(300, 404, 388, 430);
    c.lineTo(p.skirt ? 418 : 404, p.skirt ? 790 : 720); c.lineTo(p.skirt ? 182 : 196, p.skirt ? 790 : 720); c.closePath();
  }, p.skirt ? p.legs : p.top);
  if (p.skirt) shape(c, () => { c.moveTo(212, 430); c.quadraticCurveTo(300, 404, 388, 430); c.lineTo(396, 640); c.lineTo(204, 640); c.closePath(); }, p.top);
  if (p.style === 'side') { // butler: white shirt + vest + bow tie
    shape(c, () => { c.moveTo(262, 420); c.lineTo(300, 560); c.lineTo(338, 420); c.closePath(); }, p.top2, 7);
    shape(c, () => { c.moveTo(282, 440); c.lineTo(300, 452); c.lineTo(318, 440); c.lineTo(318, 466); c.lineTo(300, 454); c.lineTo(282, 466); c.closePath(); }, '#241726', 4);
  } else if (p.style === 'cap') { // hoodie pocket + strings
    rrect(c, 236, 560, 128, 70, 18, p.top2, 7);
    c.strokeStyle = '#f0ecf6'; c.lineWidth = 6; c.beginPath(); c.moveTo(284, 432); c.lineTo(280, 500); c.moveTo(316, 432); c.lineTo(320, 500); c.stroke();
  } else {
    shape(c, () => { c.moveTo(270, 420); c.lineTo(300, 500); c.lineTo(330, 420); c.closePath(); }, p.top2, 7);
  }
  // letter badge
  if (!extra.noBadge) {
    ell(c, 352, 500, 34, 34, p.badge, 7);
    c.fillStyle = INK; c.font = '900 40px Arial'; c.textAlign = 'center'; c.fillText(p.letter, 352, 514);
  }
  // arms (shock: hands up; dish: holding it out front)
  if (extra.dish) {
    limb(c, [[214, 450], [196, 540], [180, 568]], 30, p.top);
    limb(c, [[386, 450], [404, 540], [420, 568]], 30, p.top);
  } else if (mood === 'shock') {
    limb(c, [[214, 450], [160, 380], [150, 290]], 30, p.top);
    limb(c, [[386, 450], [440, 380], [450, 290]], 30, p.top);
    dot(c, 150, 272, 15); dot(c, 450, 272, 15);
  } else {
    limb(c, [[214, 450], [194, 570], [200, 680]], 30, p.top);
    limb(c, [[386, 450], [406, 570], [400, 680]], 30, p.top);
    dot(c, 200, 698, 14); dot(c, 400, 698, 14);
  }
  // head
  const cx = 300;
  const cy = 300;
  if (p.style === 'bun') ell(c, cx, cy - 118, 46, 40, p.hair);
  ell(c, cx - 110, cy + 8, 18, 28, p.skin);
  ell(c, cx + 110, cy + 8, 18, 28, p.skin);
  bean(c, cx, cy, 222, 208, p.skin);
  if (p.style === 'bun') shape(c, () => { c.moveTo(cx - 108, cy - 10); c.quadraticCurveTo(cx - 100, cy - 104, cx, cy - 104); c.quadraticCurveTo(cx + 100, cy - 104, cx + 108, cy - 10); c.quadraticCurveTo(cx + 60, cy - 70, cx, cy - 66); c.quadraticCurveTo(cx - 60, cy - 70, cx - 108, cy - 10); }, p.hair);
  if (p.style === 'cap') {
    shape(c, () => { c.moveTo(cx - 104, cy - 34); c.quadraticCurveTo(cx - 96, cy - 118, cx, cy - 116); c.quadraticCurveTo(cx + 96, cy - 118, cx + 104, cy - 34); c.closePath(); }, p.top);
    shape(c, () => { c.moveTo(cx - 20, cy - 40); c.quadraticCurveTo(cx + 120, cy - 56, cx + 150, cy - 30); c.lineTo(cx + 96, cy - 26); c.closePath(); }, p.top);
  }
  if (p.style === 'side') {
    shape(c, () => { c.moveTo(cx - 112, cy - 10); c.quadraticCurveTo(cx - 116, cy - 64, cx - 76, cy - 80); c.quadraticCurveTo(cx - 86, cy - 36, cx - 90, cy); c.closePath(); }, p.hair);
    shape(c, () => { c.moveTo(cx + 112, cy - 10); c.quadraticCurveTo(cx + 116, cy - 64, cx + 76, cy - 80); c.quadraticCurveTo(cx + 86, cy - 36, cx + 90, cy); c.closePath(); }, p.hair);
    shape(c, () => { c.moveTo(cx - 50, cy + 58); c.quadraticCurveTo(cx, cy + 40, cx + 50, cy + 58); c.quadraticCurveTo(cx, cy + 66, cx - 50, cy + 58); }, p.hair, 6);
  }
  // face by mood
  const ey = mood === 'shock' ? 10 : 6;
  if (mood === 'shock') { ell(c, cx - 40, cy, 17, 21, '#ffffff', 6); ell(c, cx + 40, cy, 17, 21, '#ffffff', 6); }
  dot(c, cx - 40, cy + (mood === 'shock' ? 2 : 4), ey);
  dot(c, cx + 40, cy + (mood === 'shock' ? 2 : 4), ey);
  c.strokeStyle = INK; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath();
  if (mood === 'worried') { c.moveTo(cx - 62, cy - 30); c.lineTo(cx - 24, cy - 40); c.moveTo(cx + 24, cy - 40); c.lineTo(cx + 62, cy - 30); }
  else if (mood === 'smirk') { c.moveTo(cx - 62, cy - 34); c.lineTo(cx - 22, cy - 26); c.moveTo(cx + 22, cy - 36); c.lineTo(cx + 62, cy - 40); }
  else { c.moveTo(cx - 60, cy - 34); c.lineTo(cx - 24, cy - 36); c.moveTo(cx + 24, cy - 36); c.lineTo(cx + 60, cy - 34); }
  c.stroke();
  c.beginPath();
  if (mood === 'shock') { c.fillStyle = '#5a1f2a'; c.ellipse(cx, cy + 62, 20, 26, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
  else if (mood === 'smirk') { c.moveTo(cx - 26, cy + 60); c.quadraticCurveTo(cx + 10, cy + 70, cx + 34, cy + 50); c.stroke(); }
  else if (mood === 'worried') { c.moveTo(cx - 24, cy + 66); c.quadraticCurveTo(cx, cy + 54, cx + 24, cy + 66); c.stroke(); }
  else if (mood === 'happy') { c.moveTo(cx - 30, cy + 54); c.quadraticCurveTo(cx, cy + 80, cx + 30, cy + 54); c.stroke(); }
  else { c.moveTo(cx - 22, cy + 62); c.lineTo(cx + 22, cy + 62); c.stroke(); }
  if (extra.dish) drawDish(c, extra.dish);
};

// ───────────────────────── Thanksgiving: the boy, Mrs. Pemberton, dishes ─────────────────────────
export type BoyPose = 'stand' | 'sniff' | 'sneak' | 'carry' | 'fall' | 'sorry' | 'happy';
const faceKid = (c: C, cx: number, cy: number, mood: 'normal' | 'sad' | 'sneaky' | 'shock' | 'sorry' | 'happy' | 'sniff') => {
  c.strokeStyle = INK; c.lineWidth = 7; c.lineCap = 'round';
  if (mood === 'sniff') {
    c.beginPath(); c.arc(cx - 34, cy + 6, 12, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    c.beginPath(); c.arc(cx + 34, cy + 6, 12, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  } else if (mood === 'shock') {
    ell(c, cx - 34, cy, 16, 20, '#fff', 6); ell(c, cx + 34, cy, 16, 20, '#fff', 6); dot(c, cx - 34, cy + 2, 8); dot(c, cx + 34, cy + 2, 8);
  } else if (mood === 'happy') {
    c.beginPath(); c.arc(cx - 34, cy + 8, 13, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    c.beginPath(); c.arc(cx + 34, cy + 8, 13, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  } else {
    const dx = mood === 'sneaky' ? 10 : 0;
    dot(c, cx - 34 + dx, cy + (mood === 'sad' || mood === 'sorry' ? 8 : 4), 9);
    dot(c, cx + 34 + dx, cy + (mood === 'sad' || mood === 'sorry' ? 8 : 4), 9);
  }
  c.beginPath();
  if (mood === 'sad' || mood === 'sorry') { c.moveTo(cx - 52, cy - 22); c.lineTo(cx - 18, cy - 32); c.moveTo(cx + 18, cy - 32); c.lineTo(cx + 52, cy - 22); }
  else if (mood === 'sneaky') { c.moveTo(cx - 50, cy - 34); c.lineTo(cx - 16, cy - 24); c.moveTo(cx + 16, cy - 24); c.lineTo(cx + 50, cy - 34); }
  else { c.moveTo(cx - 50, cy - 30); c.lineTo(cx - 18, cy - 32); c.moveTo(cx + 18, cy - 32); c.lineTo(cx + 50, cy - 30); }
  c.stroke();
  c.beginPath();
  if (mood === 'happy') { c.fillStyle = '#7a2230'; c.moveTo(cx - 34, cy + 40); c.quadraticCurveTo(cx, cy + 86, cx + 34, cy + 40); c.closePath(); c.fill(); c.stroke(); }
  else if (mood === 'shock') { c.fillStyle = '#5a1f2a'; c.ellipse(cx, cy + 56, 15, 20, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
  else if (mood === 'sneaky') { c.moveTo(cx - 24, cy + 52); c.quadraticCurveTo(cx + 8, cy + 64, cx + 30, cy + 42); c.stroke(); }
  else if (mood === 'sad' || mood === 'sorry') { c.moveTo(cx - 20, cy + 60); c.quadraticCurveTo(cx, cy + 46, cx + 20, cy + 60); c.stroke(); }
  else if (mood === 'sniff') { c.moveTo(cx - 14, cy + 52); c.quadraticCurveTo(cx, cy + 60, cx + 14, cy + 52); c.stroke(); }
  else { c.moveTo(cx - 18, cy + 54); c.lineTo(cx + 18, cy + 54); c.stroke(); }
  if (mood === 'sorry') { // a tear
    shape(c, () => { c.moveTo(cx + 36, cy + 22); c.quadraticCurveTo(cx + 48, cy + 46, cx + 36, cy + 52); c.quadraticCurveTo(cx + 24, cy + 46, cx + 36, cy + 22); }, '#8fd3ff', 4);
  }
};
/** the boy: ~1.15 m kid, mustard beanie, faded red hoodie with a blue elbow patch, patched jeans */
export const drawBoy = (c: C, pose: BoyPose, mood: Parameters<typeof faceKid>[3], walk = 0) => {
  c.clearRect(0, 0, 600, 1000);
  const SK = '#d9a27c';
  const HOOD = '#c4453f';
  const crouch = pose === 'sneak' ? 40 : 0;
  const sw = Math.sin(walk) * 26;
  // legs (jeans with a knee patch)
  limb(c, [[272, 800 + crouch], [262 - sw * 0.5 - crouch * 0.6, 880 + crouch * 0.3], [262 - sw, 950]], 30, '#4a6a9a');
  limb(c, [[328, 800 + crouch], [338 + sw * 0.5 + crouch * 0.6, 880 + crouch * 0.3], [338 + sw, 950]], 30, '#4a6a9a');
  rrect(c, 318 + sw * 0.4 + crouch * 0.4, 862 + crouch * 0.3, 26, 22, 5, '#c9a24a', 4);
  ell(c, 256 - sw, 962, 34, 16, '#f0ece2');
  ell(c, 344 + sw, 962, 34, 16, '#f0ece2');
  // hoodie
  shape(c, () => { c.moveTo(226, 660 + crouch); c.quadraticCurveTo(300, 640 + crouch, 374, 660 + crouch); c.lineTo(384, 820 + crouch); c.lineTo(216, 820 + crouch); c.closePath(); }, HOOD);
  rrect(c, 258, 750 + crouch, 84, 40, 12, '#a8382f', 5);
  // arms by pose
  const hand = (x: number, y: number) => dot(c, x, y, 13);
  if (pose === 'carry') { // hugging the (3D) turkey in front of the chest
    limb(c, [[230, 680], [200, 740], [262, 770]], 24, HOOD); limb(c, [[370, 680], [400, 740], [338, 770]], 24, HOOD); hand(266, 772); hand(334, 772);
  } else if (pose === 'fall' || pose === 'happy') {
    limb(c, [[230, 680], [170, 620], [150, 560]], 24, HOOD); limb(c, [[370, 680], [430, 620], [450, 560]], 24, HOOD); hand(150, 548); hand(450, 548);
    rrect(c, 160, 600, 26, 24, 6, '#3f6fb0', 4);
  } else if (pose === 'sneak') {
    limb(c, [[230, 700], [190, 680], [170, 640]], 24, HOOD); limb(c, [[370, 700], [410, 690], [440, 660]], 24, HOOD); hand(170, 630); hand(442, 650);
  } else if (pose === 'sorry') {
    limb(c, [[230, 680], [226, 740], [282, 790]], 24, HOOD); limb(c, [[370, 680], [374, 740], [318, 790]], 24, HOOD); hand(296, 792); hand(306, 792);
  } else {
    limb(c, [[230, 680], [216, 750], [222, 810]], 24, HOOD); limb(c, [[370, 680], [384, 750], [378, 810]], 24, HOOD); hand(222, 822); hand(378, 822);
    rrect(c, 206, 712, 24, 24, 6, '#3f6fb0', 4); // elbow patch
  }
  // head
  const cx = 300;
  const cy = 548 + crouch + (pose === 'sorry' ? 14 : 0);
  ell(c, cx - 98, cy + 10, 16, 24, SK);
  ell(c, cx + 98, cy + 10, 16, 24, SK);
  bean(c, cx, cy, 196, 184, SK);
  shape(c, () => { c.moveTo(cx - 100, cy - 18); c.quadraticCurveTo(cx - 98, cy - 112, cx, cy - 112); c.quadraticCurveTo(cx + 98, cy - 112, cx + 100, cy - 18); c.closePath(); }, '#d9a43a');
  c.fillStyle = '#b98a2c'; c.fillRect(cx - 100, cy - 34, 200, 18); c.strokeStyle = INK; c.lineWidth = 6; c.strokeRect(cx - 100, cy - 34, 200, 18);
  ell(c, cx, cy - 118, 18, 16, '#d9a43a', 6);
  shape(c, () => { c.moveTo(cx - 60, cy - 18); c.lineTo(cx - 40, cy - 2); c.lineTo(cx - 24, cy - 18); c.closePath(); }, '#5a3a22', 5);
  faceKid(c, cx, cy + 14, pose === 'sniff' ? 'sniff' : mood);
};

export type LadyPose = 'stand' | 'catch' | 'phone' | 'stern' | 'open';
/** Mrs. Pemberton: purple dress, pearls, white bun, cat-eye glasses */
export const drawLady = (c: C, pose: LadyPose, mood: 'shock' | 'stern' | 'soft' | 'happy') => {
  c.clearRect(0, 0, 600, 1000);
  const SK = '#f2cdb0';
  const DR = '#7a3f9a';
  limb(c, [[268, 840], [264, 935]], 24, SK);
  limb(c, [[332, 840], [336, 935]], 24, SK);
  ell(c, 254, 952, 36, 18, '#2a1d2e');
  ell(c, 346, 952, 36, 18, '#2a1d2e');
  shape(c, () => { c.moveTo(214, 430); c.quadraticCurveTo(300, 404, 386, 430); c.lineTo(430, 850); c.lineTo(170, 850); c.closePath(); }, DR);
  c.fillStyle = '#5f2f7a'; c.fillRect(200, 600, 200, 22);
  for (let i = 0; i < 9; i++) dot(c, 250 + i * 12.5, 446 + Math.sin((i / 8) * Math.PI) * 26, 7, '#fbf7ee');
  const hand = (x: number, y: number) => dot(c, x, y, 14);
  if (pose === 'catch') { limb(c, [[216, 450], [190, 560], [240, 640]], 28, DR); limb(c, [[384, 450], [410, 560], [360, 640]], 28, DR); hand(246, 646); hand(354, 646); }
  else if (pose === 'phone') {
    limb(c, [[216, 450], [196, 580], [206, 690]], 28, DR); limb(c, [[384, 450], [436, 380], [400, 320]], 28, DR); hand(396, 312);
    rrect(c, 380, 250, 34, 70, 8, '#2b2e35', 5);
  } else if (pose === 'stern') { limb(c, [[216, 450], [168, 560], [214, 620]], 28, DR); limb(c, [[384, 450], [432, 560], [386, 620]], 28, DR); hand(220, 622); hand(380, 622); }
  else if (pose === 'open') { limb(c, [[216, 450], [150, 470], [110, 420]], 28, DR); limb(c, [[384, 450], [450, 470], [490, 420]], 28, DR); hand(104, 410); hand(496, 410); }
  else { limb(c, [[216, 450], [198, 580], [206, 690]], 28, DR); limb(c, [[384, 450], [402, 580], [394, 690]], 28, DR); hand(206, 704); hand(394, 704); }
  const cx = 300;
  const cy = 300;
  ell(c, cx, cy - 122, 52, 44, '#f4f1ea');
  ell(c, cx - 108, cy + 8, 18, 28, SK);
  ell(c, cx + 108, cy + 8, 18, 28, SK);
  bean(c, cx, cy, 218, 206, SK);
  shape(c, () => { c.moveTo(cx - 106, cy - 4); c.quadraticCurveTo(cx - 104, cy - 104, cx, cy - 104); c.quadraticCurveTo(cx + 104, cy - 104, cx + 106, cy - 4); c.quadraticCurveTo(cx + 60, cy - 66, cx, cy - 62); c.quadraticCurveTo(cx - 60, cy - 66, cx - 106, cy - 4); }, '#f4f1ea');
  dot(c, cx - 110, cy + 40, 8, '#fbf7ee'); dot(c, cx + 110, cy + 40, 8, '#fbf7ee');
  // cat-eye glasses
  c.strokeStyle = INK; c.lineWidth = 6;
  for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(cx + sx * 14, cy - 2); c.quadraticCurveTo(cx + sx * 40, cy - 30, cx + sx * 76, cy - 18); c.quadraticCurveTo(cx + sx * 66, cy + 26, cx + sx * 36, cy + 22); c.quadraticCurveTo(cx + sx * 14, cy + 18, cx + sx * 14, cy - 2); c.stroke(); }
  if (mood === 'shock') { dot(c, cx - 42, cy + 2, 10); dot(c, cx + 42, cy + 2, 10); }
  else if (mood === 'happy' || mood === 'soft') {
    c.beginPath(); c.arc(cx - 42, cy + 8, 11, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    c.beginPath(); c.arc(cx + 42, cy + 8, 11, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  } else { dot(c, cx - 42, cy + 4, 9); dot(c, cx + 42, cy + 4, 9); }
  c.lineWidth = 7; c.lineCap = 'round'; c.beginPath();
  if (mood === 'stern') { c.moveTo(cx - 64, cy - 40); c.lineTo(cx - 22, cy - 28); c.moveTo(cx + 22, cy - 28); c.lineTo(cx + 64, cy - 40); }
  else if (mood === 'soft') { c.moveTo(cx - 64, cy - 30); c.lineTo(cx - 24, cy - 40); c.moveTo(cx + 24, cy - 40); c.lineTo(cx + 64, cy - 30); }
  c.stroke();
  c.fillStyle = '#b3294a'; c.beginPath();
  if (mood === 'shock') { c.ellipse(cx, cy + 62, 16, 22, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
  else if (mood === 'happy') { c.moveTo(cx - 34, cy + 50); c.quadraticCurveTo(cx, cy + 92, cx + 34, cy + 50); c.closePath(); c.fill(); c.stroke(); }
  else if (mood === 'soft') { c.moveTo(cx - 26, cy + 58); c.quadraticCurveTo(cx, cy + 74, cx + 26, cy + 58); c.stroke(); }
  else { c.moveTo(cx - 24, cy + 64); c.lineTo(cx + 24, cy + 62); c.stroke(); }
};

export type Dish = 'potatoes' | 'pie' | 'turkey';
/** a dish held at chest height (drawn over a neighbor card) */
export const drawDish = (c: C, dish: Dish) => {
  if (dish === 'potatoes') {
    ell(c, 300, 560, 120, 46, '#f2f0ea');
    shape(c, () => { c.moveTo(200, 548); c.quadraticCurveTo(240, 470, 300, 480); c.quadraticCurveTo(360, 470, 400, 548); c.closePath(); }, '#f6e7b8');
    rrect(c, 286, 488, 34, 22, 4, '#ffd23f', 4);
  } else if (dish === 'pie') {
    ell(c, 300, 560, 130, 40, '#c9a24a');
    ell(c, 300, 548, 116, 32, '#d9772f');
    for (let i = 0; i < 6; i++) { c.strokeStyle = '#a65a20'; c.lineWidth = 5; c.beginPath(); c.moveTo(300, 548); c.lineTo(300 + Math.cos(i) * 100, 548 + Math.sin(i) * 26); c.stroke(); }
  } else {
    ell(c, 300, 580, 140, 34, '#d8d4cc');
    ell(c, 300, 530, 104, 64, '#b8662a');
    limb(c, [[214, 520], [176, 470]], 22, '#a5561f'); ell(c, 170, 462, 18, 14, '#f4f1ea', 5);
    limb(c, [[386, 520], [424, 470]], 22, '#a5561f'); ell(c, 430, 462, 18, 14, '#f4f1ea', 5);
    shape(c, () => { c.moveTo(250, 500); c.quadraticCurveTo(300, 470, 340, 494); }, 'rgba(0,0,0,0)', 0);
  }
  dot(c, 176, 568, 14); dot(c, 424, 568, 14);
};

// ───────────────────────── the detective ─────────────────────────
const detHead = (c: C, cx: number, cy: number, look: number) => {
  bean(c, cx, cy, 216, 202, '#c98e64');
  // fedora
  shape(c, () => c.ellipse(cx, cy - 74, 150, 26, 0, 0, Math.PI * 2), '#4b3a2c');
  shape(c, () => { c.moveTo(cx - 90, cy - 78); c.quadraticCurveTo(cx - 86, cy - 168, cx, cy - 160); c.quadraticCurveTo(cx + 86, cy - 168, cx + 90, cy - 78); c.closePath(); }, '#5d4836');
  c.fillStyle = '#2c211a'; c.fillRect(cx - 88, cy - 104, 176, 22);
  // eyes (look: -1 left .. 1 right) + brows + mouth
  dot(c, cx - 38 + look * 16, cy + 4, 10);
  dot(c, cx + 38 + look * 16, cy + 4, 10);
  c.strokeStyle = INK; c.lineWidth = 8; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - 60 + look * 10, cy - 26); c.lineTo(cx - 20 + look * 10, cy - 20); c.stroke();
  c.beginPath(); c.moveTo(cx + 20 + look * 10, cy - 20); c.lineTo(cx + 60 + look * 10, cy - 26); c.stroke();
  c.beginPath(); c.moveTo(cx - 18 + look * 12, cy + 58); c.lineTo(cx + 18 + look * 12, cy + 56); c.stroke();
};
const COAT = '#c9a26a';
/** standing / walking. walk = phase in radians (0 = still) */
export const drawDetectiveStanding = (c: C, walk: number) => {
  c.clearRect(0, 0, 600, 1000);
  const sw = Math.sin(walk) * 34;
  const lift = (k: number) => Math.max(0, k) * 30;
  limb(c, [[262, 700], [262 - sw * 0.4, 820], [258 - sw, 935 - lift(Math.sin(walk))]], 34, '#3b3346');
  limb(c, [[338, 700], [338 + sw * 0.4, 820], [342 + sw, 935 - lift(-Math.sin(walk))]], 34, '#3b3346');
  ell(c, 250 - sw, 952 - lift(Math.sin(walk)), 40, 20, '#201a16');
  ell(c, 350 + sw, 952 - lift(-Math.sin(walk)), 40, 20, '#201a16');
  // trench coat
  shape(c, () => {
    c.moveTo(212, 430); c.quadraticCurveTo(300, 404, 388, 430);
    c.lineTo(412, 760); c.lineTo(188, 760); c.closePath();
  }, COAT);
  shape(c, () => { c.moveTo(262, 420); c.lineTo(300, 500); c.lineTo(338, 420); c.closePath(); }, '#e8e1d2', 7);
  c.fillStyle = '#8f6c3c'; c.fillRect(200, 590, 200, 26);
  c.strokeStyle = INK; c.lineWidth = 6; c.strokeRect(200, 590, 200, 26);
  limb(c, [[214, 450], [196 + sw * 0.3, 580], [204 + sw * 0.6, 690]], 32, COAT);
  limb(c, [[386, 450], [404 - sw * 0.3, 580], [396 - sw * 0.6, 690]], 32, COAT);
  dot(c, 204 + sw * 0.6, 708, 14);
  dot(c, 396 - sw * 0.6, 708, 14);
  detHead(c, 300, 300, -0.6);
};
/** kneeling, reaching left with a probe thermometer. reach 0..1, reading = digits shown */
export const drawDetectiveKneeling = (c: C, reach: number, reading: string) => {
  c.clearRect(0, 0, 600, 1000);
  // back leg: knee on the floor
  limb(c, [[330, 730], [380, 940], [470, 950]], 36, '#3b3346');
  ell(c, 488, 948, 34, 18, '#201a16');
  // front leg: knee up
  limb(c, [[270, 730], [190, 760], [205, 935]], 36, '#3b3346');
  ell(c, 196, 952, 40, 20, '#201a16');
  // coat, leaning left
  shape(c, () => {
    c.moveTo(196, 470); c.quadraticCurveTo(280, 440, 368, 470);
    c.lineTo(392, 790); c.lineTo(214, 790); c.closePath();
  }, COAT);
  shape(c, () => { c.moveTo(244, 462); c.lineTo(282, 540); c.lineTo(320, 462); c.closePath(); }, '#e8e1d2', 7);
  c.fillStyle = '#8f6c3c'; c.fillRect(206, 640, 186, 24);
  c.strokeStyle = INK; c.lineWidth = 6; c.strokeRect(206, 640, 186, 24);
  // reaching arm + probe
  const hx = 150 - reach * 70;
  const hy = 700 + reach * 110;
  limb(c, [[206, 490], [170, 610], [hx, hy]], 32, COAT);
  c.strokeStyle = INK; c.lineWidth = 14; c.lineCap = 'round';
  c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx - 70, hy + 90); c.stroke();
  c.strokeStyle = '#c9ced8'; c.lineWidth = 7;
  c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx - 70, hy + 90); c.stroke();
  rrect(c, hx - 30, hy - 70, 120, 64, 12, '#2b2e35', 7);
  c.fillStyle = '#a8e6a1'; c.fillRect(hx - 20, hy - 60, 100, 40);
  c.fillStyle = INK; c.font = '900 30px "Courier New", monospace'; c.textAlign = 'center';
  c.fillText(reading, hx + 30, hy - 30);
  dot(c, hx, hy, 15);
  // other arm on the knee
  limb(c, [[360, 490], [372, 600], [300, 680]], 32, COAT);
  dot(c, 290, 690, 14);
  detHead(c, 270, 340, -1);
};

/** drawing primitives for other character sheets (manor-toon.ts) */
export const T2D = {shape, limb, dot, ell, rrect, bean, detHead};
