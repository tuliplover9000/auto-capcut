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
