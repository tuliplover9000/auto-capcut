import React from 'react';

// Road-sign / Olympic-pictogram silhouettes: one fill colour, thick round
// strokes for limbs, ellipses for masses. All face RIGHT, mid-stride, in a
// 400 x 260 box whose ground line is y = 250. `stride` (-1..1) swings the
// legs so a 2-pose cycle reads as running.

export type ArtKey = 'human' | 'bear' | 'greyhound' | 'pronghorn' | 'cheetah' | 'falcon';

type P = {color: string; stride?: number};

const limb = (pts: Array<[number, number]>, w: number, color: string, k: string) => (
  <polyline
    key={k}
    points={pts.map((p) => p.join(',')).join(' ')}
    fill="none"
    stroke={color}
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

// rotate a point around a pivot by deg — used to swing limbs with `stride`
const rot = ([x, y]: [number, number], [px, py]: [number, number], deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  const dx = x - px;
  const dy = y - py;
  return [px + dx * Math.cos(a) - dy * Math.sin(a), py + dx * Math.sin(a) + dy * Math.cos(a)];
};
const swing = (pts: Array<[number, number]>, deg: number) => pts.map((p, i) => (i === 0 ? p : rot(p, pts[0], deg)));

const Human: React.FC<P> = ({color, stride = 0}) => {
  const s = stride * 14;
  return (
    <g>
      <circle cx={262} cy={42} r={25} fill={color} />
      {limb([[248, 78], [212, 152]], 36, color, 't')}
      {limb(swing([[244, 88], [284, 118], [312, 92]], -s), 22, color, 'af')}
      {limb(swing([[240, 90], [204, 116], [176, 142]], s), 22, color, 'ab')}
      {limb(swing([[212, 152], [262, 172], [252, 236]], s), 26, color, 'lf')}
      {limb(swing([[212, 152], [182, 198], [128, 214]], -s), 26, color, 'lb')}
    </g>
  );
};

const Cheetah: React.FC<P> = ({color, stride = 0}) => {
  const s = stride * 10;
  return (
    <g>
      <ellipse cx={190} cy={124} rx={100} ry={30} fill={color} />
      <ellipse cx={262} cy={122} rx={46} ry={36} fill={color} />
      {limb([[280, 112], [322, 100]], 28, color, 'n')}
      <ellipse cx={334} cy={100} rx={25} ry={18} fill={color} />
      <ellipse cx={356} cy={106} rx={13} ry={9} fill={color} />
      <circle cx={324} cy={82} r={7} fill={color} />
      {limb(swing([[272, 140], [326, 176], [374, 194]], -s), 15, color, 'f1')}
      {limb(swing([[260, 146], [306, 192], [344, 214]], -s * 0.6), 15, color, 'f2')}
      {limb(swing([[130, 134], [76, 162], [26, 172]], s), 18, color, 'h1')}
      {limb(swing([[142, 140], [98, 182], [56, 202]], s * 0.6), 18, color, 'h2')}
      <path d="M98 114 C 60 108, 34 134, 10 122" fill="none" stroke={color} strokeWidth={13} strokeLinecap="round" />
    </g>
  );
};

const Greyhound: React.FC<P> = ({color, stride = 0}) => {
  const s = stride * 10;
  return (
    <g>
      <ellipse cx={252} cy={118} rx={46} ry={42} fill={color} />
      <ellipse cx={128} cy={114} rx={42} ry={30} fill={color} />
      {limb([[150, 106], [246, 104]], 30, color, 'w')}
      {limb([[272, 98], [312, 68]], 24, color, 'n')}
      <ellipse cx={334} cy={72} rx={40} ry={12} fill={color} transform="rotate(12 334 72)" />
      <ellipse cx={302} cy={62} rx={13} ry={6} fill={color} transform="rotate(-24 302 62)" />
      {limb(swing([[266, 148], [318, 182], [366, 190]], -s), 12, color, 'f1')}
      {limb(swing([[254, 152], [298, 194], [340, 212]], -s * 0.6), 12, color, 'f2')}
      {limb(swing([[118, 140], [70, 172], [20, 178]], s), 13, color, 'h1')}
      {limb(swing([[130, 144], [86, 188], [46, 206]], s * 0.6), 13, color, 'h2')}
      <path d="M90 108 Q 46 134, 24 172" fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
};

const Pronghorn: React.FC<P> = ({color, stride = 0}) => {
  const s = stride * 10;
  return (
    <g>
      <ellipse cx={190} cy={122} rx={96} ry={40} fill={color} />
      {limb([[262, 108], [298, 58]], 30, color, 'n')}
      <ellipse cx={318} cy={54} rx={30} ry={17} fill={color} transform="rotate(22 318 54)" />
      {limb([[300, 40], [296, 6]], 8, color, 'h')}
      {limb([[298, 22], [312, 14]], 7, color, 'hp')}
      <polygon points="292,44 276,30 284,52" fill={color} />
      {limb(swing([[256, 150], [302, 188], [338, 212]], -s), 13, color, 'f1')}
      {limb(swing([[244, 154], [278, 200], [304, 232]], -s * 0.6), 13, color, 'f2')}
      {limb(swing([[120, 148], [80, 184], [40, 198]], s), 15, color, 'h1')}
      {limb(swing([[136, 152], [100, 196], [70, 226]], s * 0.6), 15, color, 'h2')}
      <ellipse cx={96} cy={108} rx={14} ry={10} fill={color} />
    </g>
  );
};

const Bear: React.FC<P> = ({color, stride = 0}) => {
  const s = stride * 8;
  return (
    <g>
      <ellipse cx={186} cy={136} rx={118} ry={66} fill={color} />
      <ellipse cx={238} cy={96} rx={56} ry={40} fill={color} />
      <ellipse cx={322} cy={124} rx={42} ry={34} fill={color} />
      <ellipse cx={360} cy={134} rx={24} ry={17} fill={color} />
      <circle cx={306} cy={92} r={14} fill={color} />
      {limb(swing([[268, 178], [298, 222], [318, 244]], -s), 34, color, 'f1')}
      {limb(swing([[240, 184], [246, 244]], s * 0.5), 32, color, 'f2')}
      {limb(swing([[110, 172], [86, 222], [70, 244]], s), 36, color, 'h1')}
      {limb(swing([[140, 184], [136, 244]], -s * 0.5), 34, color, 'h2')}
      <circle cx={70} cy={124} r={11} fill={color} />
    </g>
  );
};

// Diving falcon ("stoop"): wings swept hard back into an arrowhead — the
// shape reads as a bird of prey at any size (a tucked teardrop read as a fish).
const Falcon: React.FC<P> = ({color}) => (
  <g>
    <ellipse cx={200} cy={130} rx={108} ry={24} fill={color} />
    <polygon points="258,116 52,34 92,96 130,120" fill={color} />
    <polygon points="258,144 52,226 92,164 130,140" fill={color} />
    <polygon points="98,120 34,100 46,130 34,160 98,140" fill={color} />
    <circle cx={306} cy={128} r={24} fill={color} />
    <path d="M326 118 Q 352 120, 356 134 Q 344 132, 326 140 Z" fill={color} />
  </g>
);

const ART: Record<ArtKey, React.FC<P>> = {
  human: Human,
  bear: Bear,
  greyhound: Greyhound,
  pronghorn: Pronghorn,
  cheetah: Cheetah,
  falcon: Falcon,
};

export const Pictogram: React.FC<{art: ArtKey; color: string; stride?: number; width: number}> = ({
  art,
  color,
  stride = 0,
  width,
}) => {
  const C = ART[art];
  return (
    <svg width={width} height={(width * 260) / 400} viewBox="0 0 400 260" style={{display: 'block', overflow: 'visible'}}>
      <C color={color} stride={stride} />
    </svg>
  );
};
