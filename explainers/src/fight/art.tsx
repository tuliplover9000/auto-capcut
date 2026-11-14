import React from 'react';

// Fight style guide (svg-craft): saturated flat, two-tone shading (darker
// same-hue shape), NO outlines — same family as the Wind Test art. Fighters
// live in a 400x700 box, ground at y=700, and have FACES (the comedy is in the
// expressions). Leaves are the arms.
export const FPAL = {
  stem: '#3f9a3a', stemDark: '#2c7a2a', leaf: '#4cb043', leafDark: '#2f8a2c',
  tulip: '#ff4f7b', tulipDark: '#d92f5e', tulipLight: '#ff86a6',
  petal: '#ffc21a', petalDark: '#f29b0c', disc: '#6b3f1f', discDark: '#4a2a12', seed: '#8a5a32',
  eye: '#ffffff', pupil: '#1b1b22', mouth: '#5a1020', blush: '#ff8fa8',
  deer: '#b9733f', deerDark: '#94582c', deerBelly: '#ecd2ac', nose: '#2a1d16', hoof: '#3a2a20',
};

export type Face = 'angry' | 'hurt' | 'smug' | 'sad' | 'shock' | 'happy';

export const FighterBox: React.FC<{children: React.ReactNode; w: number}> = ({children, w}) => (
  <svg width={w} height={w * 1.75} viewBox="0 0 400 700" style={{display: 'block', overflow: 'visible'}}>{children}</svg>
);

/* face centred at (cx, cy), sized by s; look = pupil offset toward the opponent */
export const FaceSvg: React.FC<{cx: number; cy: number; s: number; face: Face; look: number; blink?: boolean; brow?: string; browW?: number}> = ({cx, cy, s, face, look, blink, brow: browCol = FPAL.pupil, browW = 6}) => {
  const ex = 30 * s;
  const ey = cy - 6 * s;
  const er = (face === 'shock' ? 21 : 17) * s;
  const pr = (face === 'shock' ? 7 : 9.5) * s;
  const brow = face === 'angry' ? 1 : face === 'sad' || face === 'hurt' ? -1 : face === 'smug' ? 0.4 : face === 'shock' ? -0.3 : 0;
  const eyeH = blink ? 0.15 : face === 'smug' ? 0.55 : face === 'hurt' ? 0.25 : 1;
  const mouth = (() => {
    const m = cy + 26 * s;
    switch (face) {
      case 'happy': return <path d={`M${cx - 18 * s} ${m - 4 * s} Q ${cx} ${m + 18 * s}, ${cx + 18 * s} ${m - 4 * s} Z`} fill={FPAL.mouth} />;
      case 'smug': return <path d={`M${cx - 14 * s} ${m} Q ${cx + 4 * s} ${m + 8 * s}, ${cx + 18 * s} ${m - 8 * s}`} fill="none" stroke={FPAL.mouth} strokeWidth={5 * s} strokeLinecap="round" />;
      case 'shock': return <ellipse cx={cx} cy={m + 2 * s} rx={9 * s} ry={13 * s} fill={FPAL.mouth} />;
      case 'sad': case 'hurt': return <path d={`M${cx - 15 * s} ${m + 6 * s} Q ${cx} ${m - 8 * s}, ${cx + 15 * s} ${m + 6 * s}`} fill="none" stroke={FPAL.mouth} strokeWidth={5 * s} strokeLinecap="round" />;
      default: return <path d={`M${cx - 16 * s} ${m + 4 * s} L ${cx + 16 * s} ${m + 4 * s} L ${cx + 12 * s} ${m + 12 * s} L ${cx - 12 * s} ${m + 12 * s} Z`} fill={FPAL.mouth} />;
    }
  })();
  return (
    <g>
      {[-1, 1].map((side) => (
        <g key={side}>
          <ellipse cx={cx + side * ex} cy={ey} rx={er} ry={er * eyeH} fill={FPAL.eye} />
          {eyeH > 0.2 ? <circle cx={cx + side * ex + look * 4 * s} cy={ey + (face === 'sad' ? 3 * s : 0)} r={Math.min(pr, er * eyeH)} fill={FPAL.pupil} /> : null}
          <line x1={cx + side * (ex - 14 * s)} y1={ey - er - 6 * s + side * 0} x2={cx + side * (ex + 14 * s)} y2={ey - er - 6 * s}
            transform={`rotate(${side * brow * 18} ${cx + side * ex} ${ey - er - 6 * s})`} stroke={browCol} strokeWidth={browW * s} strokeLinecap="round" />
        </g>
      ))}
      {face === 'hurt' || face === 'shock' ? (
        <path d={`M${cx + ex + 22 * s} ${ey - 30 * s} Q ${cx + ex + 34 * s} ${ey - 12 * s}, ${cx + ex + 22 * s} ${ey - 6 * s} Q ${cx + ex + 10 * s} ${ey - 12 * s}, ${cx + ex + 22 * s} ${ey - 30 * s} Z`} fill="#6fd0ff" />
      ) : null}
      {mouth}
    </g>
  );
};

/* ── TULIP ── faces RIGHT (toward the sunflower). arm 0 = rest, 1 = both leaves up ── */
export const Tulip: React.FC<{face: Face; arm: number; t: number; bite?: number; droop?: number; look?: number}> = ({face, arm, t, bite = 0, droop = 0, look = 1}) => {
  const sway = Math.sin(t * 3.1) * 3;
  const bx = 200 + sway;
  const by = 255;
  return (
    <g transform={`rotate(${droop * 38} 200 700)`}>
      <path d={`M200 700 Q 196 520, ${bx} ${by + 70}`} fill="none" stroke={FPAL.stem} strokeWidth={18} strokeLinecap="round" />
      {/* leaf arms: long blades from the base */}
      <g transform={`rotate(${arm * 22 + Math.sin(t * 14) * arm * 8} 196 640)`}>
        <path d="M196 640 Q 110 560, 108 420 Q 150 520, 204 600 Z" fill={FPAL.leafDark} />
      </g>
      <g transform={`rotate(${-arm * 22 - Math.sin(t * 14) * arm * 8} 204 640)`}>
        <path d="M204 640 Q 300 560, 300 400 Q 252 520, 196 600 Z" fill={FPAL.leaf} />
      </g>
      {/* bloom: back petal, two front petals; bitten = gone */}
      <g transform={`translate(${bx} ${by}) scale(${1 - bite}) translate(${-bx} ${-by})`} opacity={bite >= 1 ? 0 : 1}>
        <path d={`M${bx - 70} ${by + 60} Q ${bx - 96} ${by - 40}, ${bx} ${by - 120} Q ${bx + 96} ${by - 40}, ${bx + 70} ${by + 60} Q ${bx} ${by + 110}, ${bx - 70} ${by + 60} Z`} fill={FPAL.tulipDark} />
        <path d={`M${bx - 92} ${by + 10} Q ${bx - 104} ${by - 70}, ${bx - 58} ${by - 104} Q ${bx - 30} ${by - 40}, ${bx + 4} ${by - 20} L ${bx + 6} ${by + 96} Q ${bx - 70} ${by + 96}, ${bx - 92} ${by + 10} Z`} fill={FPAL.tulip} />
        <path d={`M${bx + 92} ${by + 10} Q ${bx + 104} ${by - 70}, ${bx + 58} ${by - 104} Q ${bx + 30} ${by - 40}, ${bx - 4} ${by - 20} L ${bx - 6} ${by + 96} Q ${bx + 70} ${by + 96}, ${bx + 92} ${by + 10} Z`} fill={FPAL.tulip} />
        <path d={`M${bx - 80} ${by - 10} Q ${bx - 84} ${by - 60}, ${bx - 58} ${by - 88}`} fill="none" stroke={FPAL.tulipLight} strokeWidth={9} strokeLinecap="round" />
        <FaceSvg cx={bx + 4} cy={by + 26} s={1.05} face={face} look={look} blink={Math.floor(t * 10) % 37 === 36} />
      </g>
    </g>
  );
};

/* ── SUNFLOWER ── faces LEFT. tilt rotates the head (positive = up-right, toward the sun) ── */
export const Sunflower: React.FC<{face: Face; arm: number; t: number; tilt?: number; glow?: number; bite?: number; droop?: number; look?: number}> =
  ({face, arm, t, tilt = 0, glow = 0, bite = 0, droop = 0, look = -1}) => {
  const sway = Math.sin(t * 2.7 + 1) * 3;
  const hx = 200 + sway;
  const hy = 215;
  return (
    <g transform={`rotate(${-droop * 30} 200 700)`}>
      <path d={`M200 700 Q 210 480, ${hx} ${hy + 60}`} fill="none" stroke={FPAL.stem} strokeWidth={26} strokeLinecap="round" />
      <g transform={`rotate(${-arm * 50} 204 520)`}>
        <path d="M204 520 Q 300 470, 340 520 Q 300 580, 204 540 Z" fill={FPAL.leaf} />
      </g>
      <g transform={`rotate(${arm * 50} 198 560)`}>
        <path d="M198 560 Q 100 510, 58 562 Q 100 622, 198 580 Z" fill={FPAL.leafDark} />
      </g>
      <g transform={`rotate(${tilt * 28 + droop * 30} ${hx} ${hy + 60}) translate(${hx} ${hy}) scale(${1 - bite}) translate(${-hx} ${-hy})`} opacity={bite >= 1 ? 0 : 1}>
        {glow > 0.01 ? <circle cx={hx} cy={hy} r={170 + glow * 40} fill="#fff3a0" opacity={glow * 0.55} style={{filter: 'blur(18px)'}} /> : null}
        {Array.from({length: 22}).map((_, i) => {
          const a = (i / 22) * 360 + t * 6;
          return (
            <g key={i} transform={`rotate(${a} ${hx} ${hy})`}>
              <ellipse cx={hx} cy={hy - 118} rx={26} ry={50} fill={i % 2 ? FPAL.petalDark : FPAL.petal} />
            </g>
          );
        })}
        <circle cx={hx} cy={hy} r={92} fill={FPAL.disc} />
        <circle cx={hx + 14} cy={hy + 12} r={78} fill={FPAL.discDark} opacity={0.35} />
        {Array.from({length: 26}).map((_, i) => {
          const a = i * 2.39996;
          const r = 9 * Math.sqrt(i + 1) * 1.55;
          return <circle key={i} cx={hx + Math.cos(a) * r} cy={hy + Math.sin(a) * r} r={3.2} fill={FPAL.seed} opacity={0.75} />;
        })}
        <FaceSvg cx={hx - 4} cy={hy} s={1.25} face={face} look={look} blink={Math.floor(t * 10) % 41 === 40} />
      </g>
    </g>
  );
};

/* ── DEER ── side view facing RIGHT in a 500x400 box, ground y=400.
   walk 0..1 cycles the legs; reach lifts the head (eating); crown on the winner ── */
export const Deer: React.FC<{walk: number; reach: number; chew: number; crown?: number}> = ({walk, reach, chew, crown = 0}) => {
  const leg = (ph: number) => Math.sin(walk * Math.PI * 2 + ph) * 16;
  return (
    <g>
      {[[150, 0], [185, Math.PI], [330, Math.PI], [365, 0]].map(([x, ph], i) => (
        <g key={i} transform={`rotate(${leg(ph)} ${x} 290)`}>
          <rect x={x - 11} y={282} width={22} height={112} rx={10} fill={i % 2 ? FPAL.deerDark : FPAL.deer} />
          <rect x={x - 12} y={384} width={24} height={14} rx={4} fill={FPAL.hoof} />
        </g>
      ))}
      <ellipse cx={258} cy={260} rx={150} ry={70} fill={FPAL.deer} />
      <ellipse cx={258} cy={292} rx={110} ry={34} fill={FPAL.deerBelly} />
      <ellipse cx={112} cy={222} rx={18} ry={26} fill="#ffffff" transform="rotate(-30 112 222)" />
      {[[210, 236], [262, 222], [300, 248], [236, 270]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={8} fill="#f3e2c4" opacity={0.85} />)}
      <g transform={`rotate(${-reach * 26} 360 236)`}>
        <path d="M340 250 Q 360 160, 392 130 L 430 150 Q 400 190, 392 262 Z" fill={FPAL.deer} />
        <g transform={`translate(0 ${chew * 4})`}>
          <ellipse cx={428} cy={126} rx={48} ry={36} fill={FPAL.deer} />
          <ellipse cx={470} cy={140} rx={24} ry={18} fill={FPAL.deerBelly} />
          <ellipse cx={488} cy={134} rx={9} ry={7} fill={FPAL.nose} />
          <path d={`M462 ${152 + chew * 6} Q 476 ${160 + chew * 6}, 488 ${150 + chew * 4}`} fill="none" stroke={FPAL.nose} strokeWidth={4} strokeLinecap="round" />
        </g>
        <ellipse cx={392} cy={86} rx={14} ry={34} fill={FPAL.deerDark} transform="rotate(-28 392 86)" />
        <ellipse cx={414} cy={80} rx={12} ry={30} fill={FPAL.deer} transform="rotate(-10 414 80)" />
        <ellipse cx={414} cy={84} rx={6} ry={18} fill="#f2b8a0" transform="rotate(-10 414 84)" />
        <circle cx={440} cy={116} r={9} fill={FPAL.pupil} />
        <circle cx={443} cy={112} r={3} fill="#ffffff" />
        {crown > 0 ? (
          <g transform={`translate(0 ${-(1 - crown) * 260})`} opacity={Math.min(1, crown * 3)}>
            <path d="M392 60 L 400 20 L 420 44 L 434 10 L 448 44 L 468 20 L 470 60 Z" fill="#ffd23f" />
            <rect x={392} y={56} width={78} height={12} rx={3} fill="#f29b0c" />
            <circle cx={434} cy={40} r={6} fill="#ff4f7b" />
          </g>
        ) : null}
      </g>
    </g>
  );
};

/* ── HUMANS (chibi: big head, short body) ── 400x700 box, ground y=700, head centre (200,200).
   arm 0 = down, 1 = both up; fall 0..1 tips the whole body over at the feet (dir -1 left, +1 right);
   shine 0..1 = the leather jacket's armour gleam. Caricatures for parody: wardrobe + hair, no likeness tracing. */
const Body: React.FC<{coat: string; coatDark: string; pants: string; shoe: string; arm: number; t: number; skin: string;
  children?: React.ReactNode}> = ({coat, coatDark, pants, shoe, arm, t, skin, children}) => {
  const wig = Math.sin(t * 16) * arm * 10;
  return (
    <g>
      <rect x={150} y={505} width={44} height={180} rx={18} fill={pants} />
      <rect x={206} y={505} width={44} height={180} rx={18} fill={pants} />
      <ellipse cx={168} cy={690} rx={36} ry={14} fill={shoe} />
      <ellipse cx={232} cy={690} rx={36} ry={14} fill={shoe} />
      <g transform={`rotate(${arm * 140 + wig} 128 318)`}>
        <rect x={104} y={308} width={48} height={170} rx={22} fill={coatDark} />
        <circle cx={128} cy={486} r={24} fill={skin} />
      </g>
      <g transform={`rotate(${-arm * 140 - wig} 272 318)`}>
        <rect x={248} y={308} width={48} height={170} rx={22} fill={coat} />
        <circle cx={272} cy={486} r={24} fill={skin} />
      </g>
      <path d="M118 318 Q 200 286, 282 318 L 292 520 Q 200 534, 108 520 Z" fill={coat} />
      {children}
    </g>
  );
};

export const Jensen: React.FC<{face: Face; arm: number; t: number; fall?: number; dir?: number; shine?: number; look?: number}> =
  ({face, arm, t, fall = 0, dir = -1, shine = 0, look = 1}) => {
  const skin = '#f1c9a5';
  return (
    <g transform={`rotate(${dir * fall * 84} 200 700)`}>
      <Body coat="#1c1c22" coatDark="#121216" pants="#18181c" shoe="#0d0d10" arm={arm} t={t} skin={skin}>
        <path d="M168 300 L 200 380 L 232 300 Z" fill="#2c2c33" />
        <path d="M150 304 L 200 410 L 178 520 L 128 516 Z" fill="#2a2a32" />
        <path d="M250 304 L 200 410 L 222 520 L 272 516 Z" fill="#26262d" />
        <rect x={196} y={392} width={8} height={126} fill="#55555f" />
        <path d="M140 330 Q 150 420, 138 500" fill="none" stroke="#6a6a78" strokeWidth={7} strokeLinecap="round" opacity={0.6} />
        {shine > 0 ? (
          <g opacity={shine}>
            <path d="M118 318 Q 200 286, 282 318 L 292 520 Q 200 534, 108 520 Z" fill="none" stroke="#c8ff6a" strokeWidth={10} style={{filter: 'drop-shadow(0 0 18px #9dff3a)'}} />
            <rect x={110 + ((t * 600) % 260)} y={300} width={26} height={230} fill="#ffffff" opacity={0.35} transform="skewX(-18)" />
          </g>
        ) : null}
      </Body>
      <rect x={180} y={262} width={40} height={40} fill="#e3b892" />
      <circle cx={200} cy={200} r={92} fill={skin} />
      <ellipse cx={112} cy={210} rx={14} ry={22} fill="#e3b892" />
      <ellipse cx={288} cy={210} rx={14} ry={22} fill="#e3b892" />
      {/* swept-back salt-and-pepper hair */}
      <path d="M106 196 Q 98 108, 180 96 Q 262 86, 296 150 Q 300 178, 292 200 Q 276 150, 236 140 Q 186 130, 136 156 Q 116 172, 110 204 Z" fill="#33333a" />
      <path d="M110 200 Q 112 160, 132 146 L 128 206 Z" fill="#8a8a94" />
      <path d="M290 198 Q 290 160, 272 146 L 276 206 Z" fill="#8a8a94" />
      <path d="M150 118 Q 200 98, 262 120" fill="none" stroke="#5a5a64" strokeWidth={6} strokeLinecap="round" />
      <FaceSvg cx={200} cy={214} s={1.45} face={face} look={look} blink={Math.floor(t * 10) % 43 === 42} />
    </g>
  );
};

export const Edison: React.FC<{face: Face; arm: number; t: number; fall?: number; dir?: number; look?: number}> =
  ({face, arm, t, fall = 0, dir = 1, look = -1}) => {
  const skin = '#f3cfb1';
  return (
    <g transform={`rotate(${dir * fall * 84} 200 700)`}>
      <Body coat="#3a3d4c" coatDark="#2c2e3a" pants="#2f3240" shoe="#1a1a1f" arm={arm} t={t} skin={skin}>
        <path d="M160 300 L 200 400 L 240 300 Z" fill="#f4f1ea" />
        <path d="M150 304 L 200 420 L 176 520 L 126 516 Z" fill="#454959" />
        <path d="M250 304 L 200 420 L 224 520 L 274 516 Z" fill="#404454" />
        <path d="M176 300 L 200 316 L 224 300 L 224 330 L 200 316 L 176 330 Z" fill="#1d1d24" />
        <path d="M184 404 L 216 404 L 214 520 L 186 520 Z" fill="#5a4a3a" />
        <circle cx={200} cy={440} r={5} fill="#c9b07a" /><circle cx={200} cy={470} r={5} fill="#c9b07a" />
        <path d="M200 455 Q 230 470, 236 448" fill="none" stroke="#d8c07a" strokeWidth={3} />
      </Body>
      <rect x={180} y={262} width={40} height={40} fill="#e4b896" />
      <circle cx={200} cy={200} r={92} fill={skin} />
      <ellipse cx={112} cy={212} rx={14} ry={22} fill="#e4b896" />
      <ellipse cx={288} cy={212} rx={14} ry={22} fill="#e4b896" />
      <path d="M156 268 Q 200 290, 244 268" fill="none" stroke="#d9a888" strokeWidth={5} strokeLinecap="round" />
      {/* tall white hair, side-parted and a bit wild */}
      <path d="M104 206 Q 92 116, 160 90 Q 210 70, 262 90 Q 314 120, 298 206 Q 292 168, 270 150 Q 236 128, 200 138 L 186 112 Q 170 140, 128 150 Q 112 170, 104 206 Z" fill="#eeebe4" />
      <path d="M186 112 Q 230 96, 270 118" fill="none" stroke="#cfcac0" strokeWidth={6} strokeLinecap="round" />
      <path d="M100 196 Q 88 186, 96 168 M300 196 Q 312 186, 304 168" fill="none" stroke="#eeebe4" strokeWidth={10} strokeLinecap="round" />
      <path d="M168 150 Q 200 142, 232 150" fill="none" stroke="#e2c4ab" strokeWidth={4} strokeLinecap="round" />
      <FaceSvg cx={200} cy={216} s={1.45} face={face} look={look} brow="#d9d4ca" browW={10} blink={Math.floor(t * 10) % 47 === 46} />
    </g>
  );
};
