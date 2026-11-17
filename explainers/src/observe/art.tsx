import React from 'react';

// OBSERVATION TEST art: one tiny flat person rig (readable at ~45 px in the
// wide crowd shot AND at ~250 px in the replay close-ups), plus station props.
// Local coords: feet at (0,0), head top at about y=-58, facing right for 'side'.
export const OPAL = {
  ink: '#1b1b22',
  wall: '#efe4cf',
  wallDark: '#dccbab',
  floorA: '#e9e3d6',
  floorB: '#ddd5c4',
  line: '#ffd23f',
  board: '#1e2a44',
  boardText: '#ffd23f',
  window: '#a8d8ff',
  steel: '#9aa3ae',
  red: '#d6293a',
  coffee: '#7a4a24',
  wallet: '#8a5a2a',
};
export const SHIRTS = ['#3fa7ff', '#ffd23f', '#7be07b', '#b45cff', '#ff8a3a', '#f4f1ea', '#5b8cff', '#ff6fd8', '#2fb5a4', '#e8505b', '#c9b8a0', '#556070', '#8fd0ff', '#f2a65a', '#4a7a5a', '#9a5ad0'];
export const PANTS = ['#2a3a5a', '#3a3a44', '#5a4a3a', '#1b1b22', '#6a7a8a', '#2f4a6a', '#7a6a50'];
export const SKINS = ['#f1c9a5', '#e2b48c', '#d9a47c', '#a86e45', '#7a4a2a', '#f3d6bd'];
export const HAIRS = ['#2a1d16', '#5a3a24', '#c98f3a', '#1b1b22', '#8a8f9c', '#a0522d'];

export type Facing = 'front' | 'back' | 'side';
export type Look = {
  shirt: string; pants: string; skin: string; hair: string;
  hairStyle: 0 | 1 | 2 | 3; // short, long, bald, bun
  hat?: 'cap' | 'beanie' | null; hatCol?: string;
  bag?: 'tote' | 'backpack' | 'case' | null; bagCol?: string;
  coat?: boolean; hood?: boolean; shades?: boolean;
};
export type Pose = {
  facing: Facing; flip?: boolean;
  walk?: number;      // phase (radians) — undefined = standing
  reach?: number;     // 0..1 front arm swings forward to horizontal (the dip / the handoff)
  phone?: number;     // 0..1 front arm up holding a phone
  cup?: number;       // 1 = holding a cup in the front hand; tilt via spill
  spill?: number;     // 0..1 cup tips over
  wipe?: number;      // phase: front hand rubs the chest (cleaning the coffee)
  ear?: number;       // 0..1 hand to ear (the lookout's signal)
  wallet?: boolean;   // wallet in the front hand
  stain?: number;     // 0..1 coffee stain on the shirt
  bob?: number;       // idle bob in px
  alert?: number;     // 0..1 "!" above the head
  cone?: boolean;     // ice-cream cone in the front hand (arm raised)
  paint?: number;     // 0..1 covered in blue paint from the head down
  mouthO?: boolean;   // shocked "O" mouth (front/side)
  flail?: number;     // phase: both arms waving wildly
  banana?: number;    // 1 = holding a banana peel up in the front hand; >1 = swinging up to toss (1..2)
};
export const PAINT = '#2f7bff';

const legs = (p: Pose, L: Look) => {
  const ph = p.walk;
  const side = p.facing === 'side';
  const sw = ph === undefined ? 0 : Math.sin(ph);
  if (side) {
    return [1, -1].map((d) => (
      <g key={d} transform={`rotate(${d * sw * 28} 0 -19)`}>
        <rect x={-3} y={-19} width={6.5} height={19} rx={3} fill={L.pants} />
        <rect x={-3} y={-3.5} width={9} height={4} rx={2} fill={OPAL.ink} />
      </g>
    ));
  }
  return [-1, 1].map((d) => {
    const lift = ph === undefined ? 0 : Math.max(0, d * sw) * 3.5;
    return (
      <g key={d}>
        <rect x={d < 0 ? -8 : 1.5} y={-19 - lift} width={6.5} height={19} rx={3} fill={L.pants} />
        <rect x={d < 0 ? -8.5 : 1} y={-3.5 - lift} width={7.5} height={4} rx={2} fill={OPAL.ink} />
      </g>
    );
  });
};

// an arm hanging from a shoulder, rotated `deg` (0 = straight down, +90 = pointing forward/right)
const Arm: React.FC<{x: number; y: number; deg: number; col: string; skin: string; len?: number; children?: React.ReactNode}> = ({x, y, deg, col, skin, len = 17, children}) => (
  <g transform={`translate(${x} ${y}) rotate(${-deg})`}>
    <rect x={-2.8} y={-1} width={5.6} height={len} rx={2.8} fill={col} />
    <circle cx={0} cy={len} r={3} fill={skin} />
    {children ? <g transform={`translate(0 ${len})`}>{children}</g> : null}
  </g>
);

const Wallet = () => <g transform="rotate(90)"><rect x={-4.5} y={-3} width={9} height={6.5} rx={1.2} fill={OPAL.wallet} stroke="#5a3a18" strokeWidth={0.8} /></g>;
const Cup: React.FC<{tilt: number}> = ({tilt}) => (
  <g transform={`rotate(${70 + tilt * 110})`}>
    <path d="M -3.5 -9 L 3.5 -9 L 2.6 0 L -2.6 0 Z" fill="#f4f1ea" stroke="#c9c2b4" strokeWidth={0.6} />
    <rect x={-4} y={-10.5} width={8} height={2.2} rx={1} fill="#5a3a24" />
    <rect x={-3.2} y={-6} width={6.4} height={2.6} fill="#c8504a" />
  </g>
);

export const Person: React.FC<{L: Look; p: Pose}> = ({L, p}) => {
  const side = p.facing === 'side';
  const back = p.facing === 'back';
  const sw = p.walk === undefined ? 0 : Math.sin(p.walk);
  const bob = (p.bob ?? 0) + (p.walk === undefined ? 0 : -Math.abs(Math.cos(p.walk)) * 1.6);
  const bw = side ? 8 : 11; // half body width
  const coatLen = L.coat ? 9 : 0;
  const body = L.shirt;
  // front arm (screen-right in side view): the one that does things
  let frontDeg = side ? sw * 30 : 0;
  if (p.reach) frontDeg = frontDeg * (1 - p.reach) + 82 * p.reach;
  if (p.cup) frontDeg = 70;
  if (p.phone) frontDeg = frontDeg * (1 - p.phone) + 150 * p.phone;
  if (p.wipe !== undefined) frontDeg = 42 + Math.sin(p.wipe) * 14; // hand rubbing the stain on the chest
  if (p.ear) frontDeg = frontDeg * (1 - p.ear) + 165 * p.ear;
  if (p.cone) frontDeg = 55;
  if (p.banana) frontDeg = 55 + Math.max(0, p.banana - 1) * 95;
  if (p.flail !== undefined) frontDeg = 140 + Math.sin(p.flail) * 35;
  let backDeg = side ? -sw * 30 : 0;
  if (p.flail !== undefined) backDeg = side ? 150 + Math.cos(p.flail * 1.3) * 35 : -(140 + Math.cos(p.flail * 1.3) * 35);
  const head = (
    <g>
      <circle cx={0} cy={-49} r={9.5} fill={L.skin} />
      {/* hair */}
      {L.hairStyle !== 2 && !L.hood ? (
        back ? (
          <>
            <circle cx={0} cy={-50} r={9.9} fill={L.hair} />
            {L.hairStyle === 1 ? <rect x={-9.9} y={-50} width={19.8} height={13} rx={4} fill={L.hair} /> : null}
            {L.hairStyle === 3 ? <circle cx={0} cy={-60} r={4.5} fill={L.hair} /> : null}
          </>
        ) : side ? (
          <>
            <path d="M -9.8 -48 A 9.9 9.9 0 0 1 9 -53 Q 2 -56 -2 -51 Q -6 -49 -9.8 -44 Z" fill={L.hair} />
            {L.hairStyle === 1 ? <rect x={-10} y={-50} width={9} height={14} rx={4} fill={L.hair} /> : null}
            {L.hairStyle === 3 ? <circle cx={-7} cy={-58} r={4.5} fill={L.hair} /> : null}
          </>
        ) : (
          <>
            <path d="M -9.9 -48 A 9.9 9.9 0 0 1 9.9 -48 Q 4 -54 -2 -52 Q -7 -51 -9.9 -46 Z" fill={L.hair} />
            {L.hairStyle === 1 ? <><rect x={-11} y={-50} width={5} height={15} rx={2.5} fill={L.hair} /><rect x={6} y={-50} width={5} height={15} rx={2.5} fill={L.hair} /></> : null}
            {L.hairStyle === 3 ? <circle cx={0} cy={-60.5} r={4.5} fill={L.hair} /> : null}
          </>
        )
      ) : null}
      {L.hood ? <path d="M -11 -44 Q -12 -61 0 -61 Q 12 -61 11 -44 Q 8 -54 0 -55 Q -8 -54 -11 -44 Z" fill={L.shirt} /> : null}
      {L.hood && back ? <circle cx={0} cy={-50} r={10.5} fill={L.shirt} /> : null}
      {/* hats */}
      {L.hat === 'cap' ? (
        <>
          <path d="M -9.6 -52 A 9.8 9.8 0 0 1 9.6 -52 Z" fill={L.hatCol ?? OPAL.ink} />
          {!back ? <rect x={side ? 2 : -8} y={-53.5} width={side ? 11 : 16} height={3} rx={1.5} fill={L.hatCol ?? OPAL.ink} /> : null}
        </>
      ) : null}
      {L.hat === 'beanie' ? <path d="M -10 -50 A 10 10.5 0 0 1 10 -50 L 10 -48 L -10 -48 Z" fill={L.hatCol ?? '#c8504a'} /> : null}
      {/* face */}
      {!back ? (
        side ? (
          <>
            <circle cx={5} cy={-48.5} r={1.5} fill={OPAL.ink} />
            {L.shades ? <rect x={1.5} y={-50.5} width={8} height={4} rx={1.5} fill={OPAL.ink} /> : null}
            {p.mouthO ? <ellipse cx={6.5} cy={-43.2} rx={1.6} ry={2.2} fill={OPAL.ink} /> : null}
          </>
        ) : (
          <>
            <circle cx={-3.4} cy={-48} r={1.5} fill={OPAL.ink} />
            <circle cx={3.4} cy={-48} r={1.5} fill={OPAL.ink} />
            {L.shades ? <><rect x={-7.5} y={-50.5} width={6.4} height={4.2} rx={1.5} fill={OPAL.ink} /><rect x={1.1} y={-50.5} width={6.4} height={4.2} rx={1.5} fill={OPAL.ink} /><rect x={-1.5} y={-49.5} width={3} height={1.2} fill={OPAL.ink} /></> : null}
            {p.mouthO ? <ellipse cx={0} cy={-43} rx={2} ry={2.6} fill={OPAL.ink} /> : null}
          </>
        )
      ) : null}
    </g>
  );
  const torso = (
    <>
      <rect x={-bw} y={-39} width={bw * 2} height={23 + coatLen} rx={6} fill={body} />
      {p.stain ? <ellipse cx={side ? -1 : 2} cy={-30} rx={5 * p.stain} ry={6 * p.stain} fill={OPAL.coffee} opacity={0.85} /> : null}
    </>
  );
  // bags
  const bagCol = L.bagCol ?? '#5a3a24';
  const tote = L.bag === 'tote' ? (
    <g>
      <path d={side ? 'M -4 -38 Q -9 -28 -10 -24' : 'M 8 -38 Q 13 -30 14 -25'} fill="none" stroke={bagCol} strokeWidth={1.6} />
      <rect x={side ? -15 : 10} y={-27} width={10} height={12} rx={2} fill={bagCol} />
    </g>
  ) : null;
  const backpack = L.bag === 'backpack' ? (
    back ? <rect x={-8.5} y={-37} width={17} height={18} rx={4} fill={bagCol} />
      : side ? <rect x={-bw - 7} y={-37} width={8} height={17} rx={3} fill={bagCol} />
        : <><rect x={-8} y={-38} width={2.4} height={14} fill={bagCol} /><rect x={5.6} y={-38} width={2.4} height={14} fill={bagCol} /></>
  ) : null;
  const suitcase = L.bag === 'case' ? (
    <g transform={side ? 'translate(-24 0)' : 'translate(13 0)'}>
      <line x1={side ? 10 : 2} y1={-30} x2={side ? 6 : 4} y2={-16} stroke={OPAL.steel} strokeWidth={1.6} />
      <rect x={0} y={-18} width={11} height={16} rx={2.5} fill={bagCol} />
      <circle cx={2.5} cy={-1} r={1.5} fill={OPAL.ink} /><circle cx={8.5} cy={-1} r={1.5} fill={OPAL.ink} />
    </g>
  ) : null;
  const sleeve = L.coat || L.hood ? body : body;
  const frontArm = (
    <Arm x={side ? 1 : bw - 1} y={-36} deg={side ? frontDeg : Math.min(frontDeg, 175)} col={sleeve} skin={L.skin} len={L.coat ? 18 : 16}>
      {p.wallet ? <Wallet /> : null}
      {p.cone ? (
        <g transform="rotate(55)">
          <path d="M -3.4 -1 L 3.4 -1 L 0 9 Z" fill="#e0a860" stroke="#b07830" strokeWidth={0.6} />
          <circle cx={0} cy={-4} r={4.4} fill="#ff8fc0" />
        </g>
      ) : null}
      {p.cup ? <Cup tilt={p.spill ?? 0} /> : null}
      {p.banana && p.banana < 2 ? (
        <g transform="rotate(55)">
          <path d="M -1.5 -2 Q -6 -9 -5 -13 Q -2 -8 0 -6 Q 1 -11 4 -14 Q 4 -8 1.6 -2 Z" fill="#ffd84a" stroke="#b8902a" strokeWidth={0.6} />
          <rect x={-2} y={-2} width={4} height={6} rx={1.5} fill="#ffd84a" stroke="#b8902a" strokeWidth={0.6} />
        </g>
      ) : null}
      {p.phone && p.phone > 0.5 ? <g transform="rotate(90)"><rect x={-3} y={-5} width={6} height={10} rx={1.2} fill={OPAL.ink} /></g> : null}
    </Arm>
  );
  const backArm = <Arm x={side ? -1 : -bw + 1} y={-36} deg={side ? backDeg : 0} col={sleeve} skin={L.skin} len={L.coat ? 18 : 16} />;
  return (
    <g transform={`translate(0 ${bob}) scale(${p.flip ? -1 : 1} 1)`}>
      <ellipse cx={0} cy={-bob} rx={13} ry={3.6} fill="rgba(0,0,0,.18)" />
      {back ? suitcase : null}
      {side ? backArm : null}
      {side && L.bag === 'case' ? suitcase : null}
      {legs(p, L)}
      {!back ? backpack : null}
      {torso}
      {back ? backpack : null}
      {!side ? backArm : null}
      {head}
      {p.paint ? (
        <g opacity={Math.min(1, p.paint * 2)}>
          <path d="M -10.6 -48 A 10.6 10.6 0 0 1 10.6 -48 Z" fill={PAINT} />
          {[-10, -5, 6, 10].map((x, k) => <rect key={x} x={x - 1.8} y={-49} width={3.6} height={(4 + (k % 2) * 4) * (p.paint ?? 0) + 2} rx={1.8} fill={PAINT} />)}
          <ellipse cx={-bw + 2} cy={-38} rx={5} ry={3.2 * p.paint} fill={PAINT} />
          <ellipse cx={bw - 2} cy={-38} rx={5} ry={3.2 * p.paint} fill={PAINT} />
          {[-6, 1, 7].map((x, k) => <rect key={x} x={x - 1.6} y={-39} width={3.2} height={(5 + k * 3) * (p.paint ?? 0)} rx={1.6} fill={PAINT} />)}
        </g>
      ) : null}
      {tote}
      {!back && !side ? suitcase : null}
      {back ? null : null}
      {frontArm}
      {p.alert ? <text x={0} y={-66} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={16 * p.alert} fill={OPAL.red} stroke="#fff" strokeWidth={3} paintOrder="stroke" transform={p.flip ? 'scale(-1 1)' : undefined}>!</text> : null}
    </g>
  );
};

/* ── props (each drawn with its base at (0,0) so they depth-sort with people) ── */
export const Pillar: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={30} ry={8} fill="rgba(0,0,0,.15)" />
    <rect x={-22} y={-330} width={44} height={330} fill="#d8cdb8" />
    <rect x={-22} y={-330} width={12} height={330} fill="#e8dfcc" />
    <rect x={-27} y={-14} width={54} height={14} rx={3} fill="#c4b79e" />
    <rect x={-18} y={-150} width={36} height={40} rx={4} fill="#1e2a44" />
    <text x={0} y={-124} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={18} fill="#ffd23f">⇧ 4</text>
  </g>
);
export const Bench: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={52} ry={7} fill="rgba(0,0,0,.14)" />
    <rect x={-48} y={-28} width={96} height={9} rx={3} fill="#4a6a8a" />
    <rect x={-48} y={-17} width={96} height={6} rx={3} fill="#3a5a7a" />
    <rect x={-42} y={-12} width={5} height={12} fill={OPAL.steel} />
    <rect x={37} y={-12} width={5} height={12} fill={OPAL.steel} />
  </g>
);
export const Kiosk: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={95} ry={12} fill="rgba(0,0,0,.15)" />
    <rect x={-88} y={-70} width={176} height={70} rx={6} fill="#8a5a3a" />
    <rect x={-88} y={-78} width={176} height={12} rx={4} fill="#f4f1ea" />
    <rect x={-80} y={-150} width={8} height={75} fill="#6a4a2a" />
    <rect x={72} y={-150} width={8} height={75} fill="#6a4a2a" />
    {Array.from({length: 6}).map((_, k) => <rect key={k} x={-96 + k * 32} y={-176} width={32} height={30} fill={k % 2 ? '#f4f1ea' : '#c8504a'} />)}
    <rect x={-60} y={-60} width={120} height={30} rx={5} fill="#f4f1ea" />
    <text x={0} y={-38} textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight={900} fontSize={21} fill="#5a3a24">COFFEE</text>
  </g>
);
export const Bin: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={14} ry={4} fill="rgba(0,0,0,.15)" />
    <rect x={-11} y={-30} width={22} height={30} rx={3} fill="#3a5a4a" />
    <rect x={-13} y={-33} width={26} height={6} rx={2} fill="#2a4a3a" />
  </g>
);
export const Planter: React.FC = () => (
  <g>
    <ellipse cx={0} cy={0} rx={40} ry={8} fill="rgba(0,0,0,.15)" />
    <rect x={-36} y={-26} width={72} height={26} rx={4} fill="#9a8a70" />
    {[-24, -8, 8, 24].map((x, k) => <circle key={x} cx={x} cy={-34 - (k % 2) * 8} r={16} fill={k % 2 ? '#4f9a4a' : '#3f8a40'} />)}
  </g>
);
