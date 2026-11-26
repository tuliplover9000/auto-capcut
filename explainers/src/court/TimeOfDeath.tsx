import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Slam} from '../fight/Fight';
import {Bokeh, Burst, camAt, Dust, Grade, LIGHT_LAB, LIGHT_NIGHT, LiftDefs, Whip, burstsFrom, layerStyle, whipAt} from '../look/look';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {FPS, StoryEpisode, at, buildPlan, lineAt} from '../story/timeline';

// "WAKE UP DEAD MAN, BUT REAL." Teach-then-test #5. The film is the hook only
// (Benoit Blanc reads people); the lesson is real: a body cools ~1.5°F/hour
// from 98.6°F (Glaister rule of thumb), and you count back from when the
// temperature was MEASURED, not when the body was found. Test: found 10 PM,
// 92.6°F taken at 12 AM -> 4 h -> 8 PM -> B (no alibi 7:30-9). Counting from
// 10 PM gives 6 PM = A (the trap); C found the body but was at dinner at 8.
// Catch: heat/cold/clothes/size bend the rate, so real estimates are windows.
// No bodies or gore: a chalk outline only. All art original, nothing from the film.
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';
const W = 1080;
const H = 1920;
const TEST_SECS = 10;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const pop = (s: number, t0: number, d = 0.35) => (s < t0 ? 0 : 1 + 0.25 * Math.sin(clamp01((s - t0) / d) * Math.PI) * (1 - clamp01((s - t0) / d)));
const inK = (s: number, t0: number, d = 0.35) => ease(clamp01((s - t0) / d));
const GOOD = '#5fd068';
const BAD = '#ff4f5e';
const YEL = '#ffd23f';
const OL = '#1b1b22';
const PAPER = '#f4f1ea';
const CHALK = '#f2efe6';
const RUG = '#6e1c26';
const SUS: Array<{l: string; col: string}> = [{l: 'A', col: '#ff9a1f'}, {l: 'B', col: '#b07cff'}, {l: 'C', col: '#3fd0c9'}];
// no-alibi windows (24h clock), labels
const WIN: Array<[number, number, string]> = [[17, 19, 'HOME ALONE'], [19.5, 21, 'WALKING'], [21.25, 22, '']];
const TX = (h: number) => 200 + (h - 16) * 92.5;
const ROWS = [1020, 1125, 1230];
const HOURS = ['4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM', '12AM'];

const Stamp: React.FC<{x: number; y: number; text: string; col: string; k: number; rot?: number; size?: number}> = ({x, y, text, col, k, rot = -10, size = 46}) => {
  const w = text.length * size * 0.74 + 36;
  return k <= 0 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${k < 1 ? 2.2 - 1.2 * k : k})`} opacity={clamp01(k * 3)}>
      <rect x={-w / 2} y={-size * 0.85} width={w} height={size * 1.5} rx={8} fill="rgba(0,0,0,.25)" stroke={OL} strokeWidth={10} />
      <rect x={-w / 2} y={-size * 0.85} width={w} height={size * 1.5} rx={8} fill={PAPER} stroke={col} strokeWidth={6} />
      <text y={size * 0.32} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={size} fill={col} letterSpacing={3}>{text}</text>
    </g>
  );
};
const Tag: React.FC<{x: number; y: number; text: string; bg?: string; fg?: string; k?: number; size?: number}> = ({x, y, text, bg = OL, fg = YEL, k = 1, size = 34}) => {
  const w = text.length * size * 0.7 + 40;
  return k <= 0 ? null : (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <rect x={-w / 2} y={-size * 1.05} width={w} height={size * 1.7} rx={12} fill={bg} stroke={OL} strokeWidth={5} />
      <text y={size * 0.12} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={size} fill={fg}>{text}</text>
    </g>
  );
};
const Clock: React.FC<{cx: number; cy: number; r: number; hr: number; k?: number}> = ({cx, cy, r, hr, k = 1}) => {
  const ha = ((hr % 12) / 12) * Math.PI * 2;
  const ma = ((hr % 1) * Math.PI * 2);
  return k <= 0 ? null : (
    <g transform={`translate(${cx} ${cy}) scale(${k})`}>
      <circle r={r + 8} fill={OL} />
      <circle r={r} fill={PAPER} />
      {Array.from({length: 12}).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <line key={i} x1={Math.sin(a) * r * 0.82} y1={-Math.cos(a) * r * 0.82} x2={Math.sin(a) * r * 0.94} y2={-Math.cos(a) * r * 0.94} stroke={OL} strokeWidth={i % 3 ? 3 : 7} />;
      })}
      <line x1={0} y1={0} x2={Math.sin(ha) * r * 0.5} y2={-Math.cos(ha) * r * 0.5} stroke={OL} strokeWidth={Math.max(6, r * 0.09)} strokeLinecap="round" />
      <line x1={0} y1={0} x2={Math.sin(ma) * r * 0.78} y2={-Math.cos(ma) * r * 0.78} stroke={OL} strokeWidth={Math.max(4, r * 0.05)} strokeLinecap="round" />
      <circle r={Math.max(5, r * 0.07)} fill={BAD} stroke={OL} strokeWidth={3} />
    </g>
  );
};
/* chalk outline: every part stroked fat in chalk, then the same parts in rug colour on top */
const OUT_LIMBS: Array<[number[][], number]> = [
  [[[420, 1150], [620, 1150]], 92],
  [[[440, 1118], [500, 1050], [565, 1022]], 36],
  [[[450, 1185], [515, 1250], [545, 1290]], 36],
  [[[610, 1128], [730, 1090], [822, 1108]], 42],
  [[[610, 1172], [722, 1222], [810, 1262]], 42],
];
const Outline: React.FC<{k?: number}> = ({k = 1}) => (
  <g opacity={k}>
    {[[CHALK, 14], [RUG, 0]].map(([col, ex], p) => (
      <g key={p}>
        {OUT_LIMBS.map(([pts, w], i) => <polyline key={i} points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={col as string} strokeWidth={w + (ex as number)} strokeLinecap="round" strokeLinejoin="round" />)}
        <circle cx={362} cy={1150} r={46 + (ex as number) / 2} fill={col as string} />
      </g>
    ))}
  </g>
);
/* far wall: its own depth layer (parallax 0.7, soft focus); oversized so parallax never shows an edge */
const RoomWall: React.FC = () => (
  <svg width={W + 200} height={1100} viewBox={`-100 -180 ${W + 200} 1100`} style={{position: 'absolute', left: -100, top: -180, filter: 'blur(2.5px)'}}>
    <rect x={-100} y={-180} width={W + 200} height={1100} fill="#2e4f52" />
    {Array.from({length: 15}).map((_, i) => <rect key={i} x={-90 + i * 90} y={-180} width={34} height={1100} fill="#38595c" />)}
    {/* window with moon (the key light source), picture frame */}
    <rect x={850} y={640} width={170} height={210} rx={6} fill="#14283c" stroke="#5a3a22" strokeWidth={14} />
    <circle cx={960} cy={690} r={28} fill="#f3eccd" />
    <circle cx={960} cy={690} r={60} fill="#f3eccd" opacity={0.12} />
    <line x1={935} y1={640} x2={935} y2={850} stroke="#5a3a22" strokeWidth={8} />
    <rect x={60} y={650} width={150} height={180} rx={4} fill="#4a3620" stroke="#d4ae55" strokeWidth={10} />
    <rect x={84} y={674} width={102} height={132} fill="#6a7a56" />
    <rect x={-100} y={890} width={W + 200} height={30} fill="#26170d" />
  </svg>
);
/* floor + rug: the action plane (depth 1) */
const RoomFloor: React.FC = () => (
  <svg width={W + 200} height={H} viewBox={`-100 0 ${W + 200} ${H}`} style={{position: 'absolute', left: -100, top: 0, overflow: 'visible'}}>
    <rect x={-100} y={918} width={W + 200} height={H - 918 + 200} fill="#6a4429" />
    {Array.from({length: 14}).map((_, i) => {
      const y = 918 + Math.pow(i / 13, 1.4) * 1000;
      return <rect key={i} x={-100} y={y} width={W + 200} height={4} fill="#4f3220" />;
    })}
    <ellipse cx={590} cy={1172} rx={445} ry={210} fill="rgba(10,6,20,.38)" />
    <ellipse cx={570} cy={1150} rx={430} ry={200} fill={RUG} stroke="#d4ae55" strokeWidth={10} />
    <ellipse cx={570} cy={1150} rx={390} ry={168} fill="none" stroke="#d4ae55" strokeWidth={4} />
  </svg>
);
const Silhouette: React.FC<{x: number; y: number; col: string; letter: string; k: number; known?: boolean}> = ({x, y, col, letter, k, known}) => (k <= 0 ? null : (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <ellipse cx={14} cy={66} rx={104} ry={13} fill="#0a0612" opacity={0.55} />
    <path d="M -86 60 Q -86 -24 0 -24 Q 86 -24 86 60 Z" fill="#0e0e14" stroke={col} strokeWidth={5} />
    <circle cx={0} cy={-78} r={48} fill="#0e0e14" stroke={col} strokeWidth={5} />
    {/* warm rim from the key light (upper left) */}
    <path d="M -76 40 Q -76 -12 -28 -19" fill="none" stroke="#ffcf8a" strokeWidth={5} strokeLinecap="round" opacity={0.75} />
    <path d="M -30 -114 A 48 48 0 0 0 -47 -70" fill="none" stroke="#ffcf8a" strokeWidth={5} strokeLinecap="round" opacity={0.75} />
    {!known ? <text x={0} y={-58} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={58} fill={col}>?</text> : null}
    <circle cx={0} cy={26} r={26} fill={col} stroke={OL} strokeWidth={4} />
    <text x={0} y={37} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={30} fill={OL}>{letter}</text>
  </g>
));
const Tape: React.FC<{s: number}> = ({s}) => (
  <g transform="rotate(-5 540 1640)">
    <rect x={-200} y={1600} width={1500} height={78} fill={YEL} stroke={OL} strokeWidth={6} />
    <text x={-160 - ((s * 40) % 560)} y={1652} fontFamily={heavy} fontWeight={900} fontSize={36} fill={OL} letterSpacing={4}>
      {'CRIME SCENE · DO NOT CROSS · '.repeat(5)}
    </text>
  </g>
);

// camera focus per story event (world coords); burstsFrom moves ~55% of the way there
const FOCUS: Record<string, {x?: number; y?: number; z?: number; lead?: number}> = {
  blanc: {x: 540, y: 860, z: 1.06}, body: {x: 380, y: 1060, z: 1.12},
  clock: {x: 680, y: 1000, z: 1.07}, alive: {x: 420, y: 880, z: 1.05}, drop: {x: 640, y: 980, z: 1.03}, rate: {x: 715, y: 1180, z: 1.06},
  six: {x: 330, y: 1000, z: 1.08}, four: {x: 715, y: 1180, z: 1.07}, measured: {x: 840, y: 950, z: 1.07}, found: {x: 590, y: 900, z: 1.05},
  ask: {x: 540, y: 1000, z: 1.02},
  answer: {x: 540, y: 1125, z: 1.06}, asix: {x: 300, y: 780, z: 1.07}, midnight: {x: 760, y: 900, z: 1.05}, eight: {x: 640, y: 1080, z: 1.07},
  ten: {x: 750, y: 780, z: 1.06}, sixpm: {x: 420, y: 1000, z: 1.05}, trap: {x: 420, y: 1080, z: 1.09},
  c: {x: 820, y: 1230, z: 1.06}, dinner: {x: 640, y: 1250, z: 1.07},
  heat: {x: 540, y: 1180, z: 1.04}, bend: {x: 560, y: 920, z: 1.06}, exact: {x: 560, y: 860, z: 1.07}, window: {x: 540, y: 960, z: 1.03},
  confess: {x: 540, y: 760, z: 1.06}, range: {x: 540, y: 1300, z: 1.06},
};

export const TimeOfDeath: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frameNow = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sNow = frameNow / fps;
  const plan = buildPlan(ep, timing);
  const T = (k: string) => at(plan, k);
  const LS = plan.lineStarts;
  const LE = plan.lineEnds;
  // scene changes: hook->lab, lab->test, test->catch, catch->ending. Whip pans, no hard cuts.
  const BOUNDS = [LS[1], LS[6], LS[10], LS[12]];
  const bursts: Burst[] = [
    {t: 0, x: 560, y: 1060, z: 1.1, cut: true},
    {t: 0.05, x: 540, y: 1000, z: 1.0, dur: 2.2},
    ...burstsFrom(plan.events, FOCUS),
    ...BOUNDS.map((b) => ({t: b - 0.03, x: 540, y: 980, z: 1.0, cut: true})),
  ];

  const view = (s: number) => {
  const frame = Math.round(s * fps);
  const li = lineAt(plan, s);
  const tTest = LE[6] + 0.05;
  const answered = s >= T('answer');
  const hook = li === 0 || li === 12;
  const lab = li >= 1 && li <= 5;
  const test = li >= 6 && li <= 9;
  const real = li === 10 || li === 11;
  // word start (absolute) inside a line, by spoken word
  const wt = (line: number, word: string, nth = 0): number => {
    const ws = (timing.lines[line] as unknown as {words: Array<{text: string; start: number}>}).words;
    let c = 0;
    for (const w of ws) {
      if (w.text.toLowerCase().replace(/[^a-z0-9-]/g, '') === word) {
        if (c === nth) return LS[line] + w.start;
        c++;
      }
    }
    return LS[line];
  };

  // ── camera
  const cam = camAt(bursts, s, undefined, {world: 640, screen: 628});
  const kick = (t0: number, amp: number, decay: number) => (s >= t0 ? amp * Math.exp(-(s - t0) * decay) : 0);
  const shake = kick(T('body'), 12, 6) + kick(T('four'), 8, 7) + kick(T('test'), 10, 7) + kick(T('answer'), 9, 7) + kick(T('eight'), 8, 7)
    + kick(T('trap'), 10, 7) + kick(T('window'), 6, 8) + kick(T('range'), 12, 6);
  const shx = Math.sin(frame * 2.3) * shake;
  const shy = Math.cos(frame * 2.9) * shake;
  const camStyle = layerStyle(cam, 1, shx, shy);

  // ── hook + ending (room)
  const magK = li === 0 ? 1 - inK(s, T('body') + 0.2, 0.4) : 0;
  const magX = 560 + 240 * Math.sin(s * 1.5);
  const magY = 1150 + 70 * Math.cos(s * 2.1);
  const probeK = li === 0 ? inK(s, T('body') - 0.15, 0.25) : 0;
  const hookScene = hook ? (
    <g>
      <Outline />
      <g filter="url(#lift)">
      {SUS.map((u, i) => (
        <Silhouette key={u.l} x={300 + i * 240} y={830} col={u.col} letter={u.l} known={li === 12 && i === 1 && s >= T('confess')}
          k={li === 12 ? 1 : s >= T('blanc') + i * 0.18 ? pop(s, T('blanc') + i * 0.18) : 0} />
      ))}
      {probeK > 0 ? (
        <g transform={`translate(0 ${(1 - probeK) * -320})`}>
          <line x1={520} y1={1140} x2={300} y2={1020} stroke="#c9ced8" strokeWidth={9} strokeLinecap="round" />
          <line x1={520} y1={1140} x2={300} y2={1020} stroke={OL} strokeWidth={2} />
          <rect x={130} y={930} width={200} height={104} rx={16} fill="#2b2e35" stroke={OL} strokeWidth={6} />
          <rect x={144} y={944} width={172} height={62} rx={8} fill="#a8e6a1" />
          <text x={230} y={990} textAnchor="middle" fontFamily={MONO} fontWeight={900} fontSize={40} fill={OL}>{s >= T('body') + 0.5 ? '92.6°' : '--.-°'}</text>
        </g>
      ) : null}
      {magK > 0 ? (
        <g transform={`translate(${magX} ${magY})`} opacity={magK}>
          <line x1={64} y1={64} x2={160} y2={160} stroke={OL} strokeWidth={36} strokeLinecap="round" />
          <line x1={64} y1={64} x2={160} y2={160} stroke="#6a4026" strokeWidth={24} strokeLinecap="round" />
          <circle r={96} fill="rgba(200,230,255,.16)" stroke={OL} strokeWidth={24} />
          <circle r={96} fill="none" stroke="#c9ced8" strokeWidth={12} />
          <path d="M -50 -40 Q -30 -66 6 -70" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" opacity={0.6} />
        </g>
      ) : null}
      {li === 12 && s >= T('confess') ? (
        <g transform={`translate(540 640) scale(${pop(s, T('confess'))})`}>
          <rect x={-190} y={-48} width={380} height={96} rx={24} fill={PAPER} stroke={OL} strokeWidth={6} />
          <path d="M -20 46 L 0 84 L 24 46 Z" fill={PAPER} stroke={OL} strokeWidth={6} strokeLinejoin="round" />
          <rect x={-24} y={40} width={50} height={10} fill={PAPER} />
          <text y={16} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={46} fill={OL}>OKAY, I DID IT!</text>
        </g>
      ) : null}
      {li === 12 && s >= T('range') ? (
        <g transform={`translate(540 1440) scale(${pop(s, T('range'))})`}>
          <rect x={-330} y={-14} width={660} height={28} rx={14} fill={GOOD} stroke={OL} strokeWidth={5} />
          <rect x={-346} y={-46} width={20} height={92} rx={6} fill={GOOD} stroke={OL} strokeWidth={5} />
          <rect x={326} y={-46} width={20} height={92} rx={6} fill={GOOD} stroke={OL} strokeWidth={5} />
        </g>
      ) : null}
      </g>
    </g>
  ) : null;

  // ── lab lessons (li 1..5): thermometer + clock / hour table / two clocks
  const yOf = (t: number) => 1360 - ((t - 84) / 16) * 620;
  const dropEnd = LE[3] - 0.15;
  const hrs = li < 3 ? 0 : li > 3 ? 4 : (() => {
    const u = clamp01((s - T('drop')) / Math.max(0.5, dropEnd - T('drop'))) * 4;
    return Math.floor(u) + ease(clamp01((u - Math.floor(u)) / 0.35));
  })();
  const temp = 98.6 - 1.5 * Math.min(4, hrs);
  const hotTherm = li >= 2;
  const labScene = lab ? (
    <g>
      {/* thermometer */}
      <g opacity={li === 1 ? 0.45 : 1}>
        <rect x={198} y={700} width={64} height={720} rx={32} fill={PAPER} stroke={OL} strokeWidth={7} />
        <circle cx={230} cy={1460} r={70} fill={PAPER} stroke={OL} strokeWidth={7} />
        <rect x={214} y={yOf(temp)} width={32} height={1440 - yOf(temp)} rx={14} fill={hotTherm ? '#e8344a' : '#c9a0a6'} />
        <circle cx={230} cy={1460} r={54} fill={hotTherm ? '#e8344a' : '#c9a0a6'} />
        {[84, 86, 88, 90, 92, 94, 96, 98, 100].map((t) => (
          <g key={t}>
            <rect x={262} y={yOf(t) - 2} width={20} height={4} fill="#c9d3e3" />
            <text x={292} y={yOf(t) + 10} fontFamily={heavy} fontWeight={900} fontSize={26} fill="#c9d3e3">{t}</text>
          </g>
        ))}
        {li >= 2 ? (
          <g transform={`translate(0 ${yOf(temp)})`}>
            <path d="M 150 0 L 122 -18 L 122 18 Z" fill={YEL} stroke={OL} strokeWidth={4} />
          </g>
        ) : null}
        {li === 4 && s >= T('six') ? (
          <g opacity={inK(s, T('six'), 0.3)}>
            <path d={`M 350 ${yOf(98.6)} L 372 ${yOf(98.6)} L 372 ${yOf(92.6)} L 350 ${yOf(92.6)}`} fill="none" stroke={YEL} strokeWidth={7} />
            <text x={384} y={(yOf(98.6) + yOf(92.6)) / 2 + 14} fontFamily={heavy} fontWeight={900} fontSize={34} fill={YEL}>−6°F</text>
          </g>
        ) : null}
      </g>
      {/* li1: the body clock */}
      {li === 1 ? <Clock cx={680} cy={980} r={230} hr={10 + Math.max(0, s - T('clock')) * 6} k={pop(s, T('clock') - 0.1)} /> : null}
      {li === 1 && s >= T('clock') ? <Tag x={680} y={1290} text="BODY CLOCK" size={36} k={pop(s, T('clock') + 0.2)} /> : null}
      {/* li2-4: hour table */}
      {li >= 2 && li <= 4 ? (
        <g>
          {[0, 1, 2, 3, 4].map((i) => {
            const t0 = i === 0 ? T('alive') : T('drop') + ((dropEnd - T('drop')) / 4) * (i - 1) + 0.2;
            const k = i === 0 ? inK(s, t0 - 0.1, 0.3) : li > 3 ? 1 : inK(s, t0, 0.3);
            const y = 700 + i * 106;
            const hi = li === 4 && (i === 0 || i === 4) && s >= T('six');
            return k > 0 ? (
              <g key={i} opacity={k} transform={`translate(${(1 - k) * 60} 0)`}>
                <rect x={480} y={y} width={470} height={90} rx={16} fill={i === 0 ? '#1f4a33' : PAPER} stroke={hi ? YEL : OL} strokeWidth={hi ? 9 : 5} />
                <text x={506} y={y + 60} fontFamily={heavy} fontWeight={900} fontSize={38} fill={i === 0 ? GOOD : '#5a6070'}>{i === 0 ? 'ALIVE' : `${i} HR${i > 1 ? 'S' : ''}`}</text>
                <text x={924} y={y + 62} textAnchor="end" fontFamily={heavy} fontWeight={900} fontSize={50} fill={i === 0 ? '#fff' : OL}>{(98.6 - 1.5 * i).toFixed(1)}°F</text>
              </g>
            ) : null;
          })}
          {s >= T('rate') && li === 3 ? <g transform="rotate(-4 715 1270)"><Tag x={715} y={1270} text="−1.5°F EVERY HOUR" bg={YEL} fg={OL} size={34} k={li === 3 ? pop(s, T('rate')) : 1} /></g> : null}
          {li === 4 && s >= T('four') ? <Stamp x={715} y={1290} text="= 4 HOURS DEAD" col={BAD} k={clamp01((s - T('four')) / 0.18)} size={40} rot={-8} /> : null}
        </g>
      ) : null}
      {/* li5: count from the MEASUREMENT */}
      {li === 5 ? (
        <g>
          {[['BODY FOUND', 2, 'found'], ['TEMP TAKEN', 4, 'measured']].map(([lab0, hr, key], i) => {
            const x = 480 + i * 245;
            const k = inK(s, LS[5] + i * 0.15, 0.3);
            const ok = key === 'measured' && s >= T('measured');
            const no = key === 'found' && s >= T('found');
            return (
              <g key={i} opacity={k} transform={`translate(0 ${(1 - k) * 80})`}>
                <rect x={x} y={720} width={225} height={330} rx={18} fill={PAPER} stroke={ok ? GOOD : no ? BAD : OL} strokeWidth={ok || no ? 10 : 5} />
                <text x={x + 112} y={772} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={26} fill={OL}>{lab0 as string}</text>
                <Clock cx={x + 112} cy={900} r={86} hr={hr as number} />
                <text x={x + 112} y={1030} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={34} fill="#5a6070">{`${hr}:00`}</text>
                {no ? (
                  <g opacity={clamp01((s - T('found')) / 0.15)}>
                    <line x1={x + 30} y1={760} x2={x + 195} y2={1020} stroke={BAD} strokeWidth={16} strokeLinecap="round" />
                    <line x1={x + 195} y1={760} x2={x + 30} y2={1020} stroke={BAD} strokeWidth={16} strokeLinecap="round" />
                  </g>
                ) : null}
              </g>
            );
          })}
          {s >= T('measured') ? <Tag x={830} y={1130} text="COUNT FROM HERE" bg={GOOD} fg={OL} size={28} k={pop(s, T('measured'))} /> : null}
          {s >= T('measured') + 0.6 ? <Tag x={715} y={1250} text="4:00 − 4 HRS = 12:00" bg={OL} fg={YEL} size={32} k={pop(s, T('measured') + 0.6)} /> : null}
        </g>
      ) : null}
    </g>
  ) : null;

  // ── the test (li 6..9)
  const caseIn = inK(s, T('test') - 0.1, 0.35);
  const rowIn = (i: number) => inK(s, T('test') + 0.15 + i * 0.15, 0.35);
  const greenArc = answered ? clamp01((s - T('midnight')) / Math.max(0.3, T('eight') - T('midnight'))) : 0;
  const redArc = li >= 8 ? clamp01((s - T('ten')) / Math.max(0.3, T('sixpm') - T('ten'))) : 0;
  const arc = (x0: number, x1: number, u: number, col: string, dash: boolean, label: string) => {
    if (u <= 0) return null;
    const N = 24;
    const pts: string[] = [];
    for (let i = 0; i <= Math.round(N * u); i++) {
      const v = i / N;
      pts.push(`${lerp(x0, x1, v)},${952 - Math.sin(v * Math.PI) * 40}`);
    }
    const ex = lerp(x0, x1, u);
    const ey = 952 - Math.sin(u * Math.PI) * 40;
    return (
      <g>
        <polyline points={pts.join(' ')} fill="none" stroke={OL} strokeWidth={14} strokeLinecap="round" />
        <polyline points={pts.join(' ')} fill="none" stroke={col} strokeWidth={8} strokeLinecap="round" strokeDasharray={dash ? '18 14' : undefined} />
        <circle cx={ex} cy={ey} r={11} fill={col} stroke={OL} strokeWidth={4} />
        {u > 0.5 ? <Tag x={(x0 + x1) / 2} y={900} text={label} bg={col} fg={OL} size={26} k={clamp01((u - 0.5) * 4)} /> : null}
      </g>
    );
  };
  const dimRow = (i: number) => {
    if (!answered) return 1;
    if (li === 7) return i === 1 ? 1 : 0.4;
    if (li === 8) return i === 2 ? 0.4 : 1;
    return 1;
  };
  const testScene = test ? (
    <g>
      {/* case file */}
      <g opacity={caseIn} transform={`translate(0 ${(1 - caseIn) * -120})`}>
        <rect x={120} y={640} width={840} height={226} rx={18} fill={PAPER} stroke={OL} strokeWidth={6} />
        <text x={150} y={690} fontFamily={MONO} fontWeight={900} fontSize={26} fill="#5a6070">BODY TEMP</text>
        <text x={146} y={782} fontFamily={heavy} fontWeight={900} fontSize={88} fill={BAD}>92.6°F</text>
        {li === 7 && s >= T('midnight') ? <rect x={142} y={812} width={252} height={40} rx={8} fill={GOOD} opacity={clamp01((s - T('midnight')) / 0.2)} /> : null}
        <text x={152} y={842} fontFamily={MONO} fontWeight={900} fontSize={25} fill={li === 7 && s >= T('midnight') ? OL : '#5a6070'}>TAKEN 12:00 AM</text>
        <rect x={556} y={656} width={388} height={194} rx={14} fill={YEL} stroke={li >= 8 && s >= T('ten') ? BAD : OL} strokeWidth={li >= 8 && s >= T('ten') ? 10 : 5} />
        <text x={580} y={704} fontFamily={MONO} fontWeight={900} fontSize={28} fill={OL}>BODY FOUND</text>
        <text x={576} y={800} fontFamily={heavy} fontWeight={900} fontSize={72} fill={OL}>10:00 PM</text>
      </g>
      {/* timeline */}
      <g opacity={caseIn}>
        {!answered ? <text x={540} y={918} textAnchor="middle" fontFamily={MONO} fontWeight={900} fontSize={25} fill="#c9d3e3">TIMELINE · RED = NO ALIBI</text> : null}
        {HOURS.map((h, i) => (
          <g key={h}>
            <rect x={TX(16 + i) - 1.5} y={978} width={3} height={282} fill="rgba(255,255,255,.12)" />
            <text x={TX(16 + i)} y={968} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={h.length > 3 ? 20 : 22} fill="#c9d3e3">{h}</text>
          </g>
        ))}
      </g>
      {SUS.map((u, i) => {
        const k = rowIn(i);
        const y = ROWS[i];
        const [a, b, lab0] = WIN[i];
        const isB = i === 1 && answered && s >= T('answer');
        const isA = i === 0 && li >= 8 && s >= T('sixpm');
        const isC = i === 2 && li === 9;
        const ring = isB ? '#7be07b' : isA ? BAD : isC ? '#fff' : OL;
        return k > 0 ? (
          <g key={u.l} opacity={k * dimRow(i)} transform={`translate(${(1 - k) * -120} 0)`}>
            <rect x={200} y={y - 4} width={740} height={8} rx={4} fill="#4a5670" />
            <rect x={TX(a)} y={y - 25} width={TX(b) - TX(a)} height={50} rx={10} fill={BAD} stroke={ring} strokeWidth={ring === OL ? 4 : 8} />
            {lab0 ? <text x={(TX(a) + TX(b)) / 2} y={y + 8} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={21} fill="#fff">{lab0}</text> : null}
            {i === 2 ? <text x={TX(a) - 14} y={y - 14} textAnchor="end" fontFamily={MONO} fontWeight={900} fontSize={22} fill="#fff">FOUND THE BODY →</text> : null}
            <circle cx={150} cy={y} r={31} fill={u.col} stroke={ring === OL ? OL : ring} strokeWidth={ring === OL ? 5 : 8} />
            <text x={150} y={y + 12} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={34} fill={OL}>{u.l}</text>
          </g>
        ) : null;
      })}
      {/* answer: back 4 h from the READING */}
      {li === 7 || li === 8 ? <g opacity={li === 8 ? 0.35 : 1}>{arc(TX(24), TX(20), greenArc, GOOD, false, '−4 HRS')}</g> : null}
      {answered && s >= T('eight') && li <= 9 ? (
        <g opacity={li === 8 ? 0.35 : 1}>
          <rect x={TX(20) - 4} y={980} width={8} height={280 * inK(s, T('eight'), 0.3)} fill="#7be07b" />
          {li === 7 ? <Tag x={TX(20)} y={1300} text="8 PM" bg="#7be07b" fg={OL} size={30} k={pop(s, T('eight'))} /> : null}
        </g>
      ) : null}
      {/* the trap: back 4 h from FOUND */}
      {li === 8 ? arc(TX(22), TX(18), redArc, BAD, true, '−4 HRS') : null}
      {li === 8 && s >= T('sixpm') ? (
        <g>
          {Array.from({length: 7}).map((_, k) => <rect key={k} x={TX(18) - 4} y={980 + k * 40} width={8} height={24 * inK(s, T('sixpm') + k * 0.03, 0.15)} fill={BAD} />)}
        </g>
      ) : null}
      {li === 8 && s >= T('trap') ? <Stamp x={TX(18)} y={1080} text="TRAP" col={BAD} k={clamp01((s - T('trap')) / 0.18)} size={56} rot={-12} /> : null}
      {li === 9 && s >= T('dinner') ? <Tag x={TX(20)} y={ROWS[2] + 62} text="AT DINNER" bg={GOOD} fg={OL} size={26} k={pop(s, T('dinner'))} /> : null}
    </g>
  ) : null;

  // ── the catch (li 10..11): the straight line bends into a fan -> a window
  const GX0 = 230;
  const GX1 = 900;
  const GY0 = 730;
  const GY1 = 1120;
  const gx = (h: number) => GX0 + (h / 8) * (GX1 - GX0);
  const gy = (t: number) => GY0 + ((98.6 - t) / 12.6) * (GY1 - GY0);
  const RATES = [0.8, 1.1, 1.5, 2.0, 2.6];
  const RCOL = ['#ff4f5e', '#ff9a1f', OL, '#3fa0ff', '#2a5ad0'];
  const bendK = s >= T('bend') ? inK(s, T('bend'), 0.7) : 0;
  const drawK = inK(s, LS[10], 0.6);
  const line = (r: number) => {
    const hEnd = Math.min(8, 12.6 / r) * (li === 10 ? drawK : 1);
    return `M ${gx(0)} ${gy(98.6)} L ${gx(hEnd)} ${gy(98.6 - r * hEnd)}`;
  };
  const ICONS: Array<[string, string, string]> = [['HEAT', 'heat', '#ff4f5e'], ['COLD', 'cold', '#3fa0ff'], ['CLOTHES', 'clothes', '#b07cff'], ['BODY SIZE', 'size', '#ff9a1f']];
  const winK = li === 11 && s >= T('window') ? inK(s, T('window'), 0.4) : 0;
  const realScene = real ? (
    <g>
      <rect x={140} y={660} width={800} height={520} rx={18} fill={PAPER} stroke={OL} strokeWidth={6} />
      {winK > 0 ? <rect x={gx(6 / 2.6)} y={GY0 - 10} width={(gx(6 / 0.8) - gx(6 / 2.6)) * winK} height={GY1 - GY0 + 10} fill="#c8f2c0" /> : null}
      <line x1={GX0} y1={GY0 - 20} x2={GX0} y2={GY1} stroke={OL} strokeWidth={5} />
      <line x1={GX0} y1={GY1} x2={GX1 + 10} y2={GY1} stroke={OL} strokeWidth={5} />
      <text x={GX0 - 12} y={gy(98.6) + 10} textAnchor="end" fontFamily={heavy} fontWeight={900} fontSize={24} fill={OL}>98.6</text>
      <text x={GX0 - 12} y={gy(92.6) + 10} textAnchor="end" fontFamily={heavy} fontWeight={900} fontSize={24} fill={OL}>92.6</text>
      <text x={(GX0 + GX1) / 2} y={GY1 + 44} textAnchor="middle" fontFamily={MONO} fontWeight={900} fontSize={24} fill="#5a6070">HOURS AFTER DEATH →</text>
      {li === 11 ? <line x1={GX0} y1={gy(92.6)} x2={GX1} y2={gy(92.6)} stroke="#5a6070" strokeWidth={4} strokeDasharray="14 10" /> : null}
      {RATES.map((r, i) => {
        const rr = 1.5 + (r - 1.5) * (li === 11 ? 1 : bendK);
        if (i !== 2 && bendK <= 0 && li === 10) return null;
        return <path key={i} d={line(rr)} fill="none" stroke={RCOL[i]} strokeWidth={i === 2 ? 9 : 7} strokeLinecap="round" opacity={i === 2 ? 1 : Math.max(bendK, li === 11 ? 1 : 0)} />;
      })}
      {li === 10 && bendK <= 0 ? <Tag x={gx(5.4)} y={gy(98.6 - 1.5 * 5.4) - 50} text="1.5°F / HR" bg={OL} fg={YEL} size={26} /> : null}
      {li === 11 && s >= T('exact') ? (
        <g>
          <circle cx={gx(4)} cy={gy(92.6)} r={14} fill={OL} />
          <g transform={`translate(${gx(4)} ${gy(92.6) - 70}) scale(${pop(s, T('exact'))})`}>
            <rect x={-150} y={-34} width={300} height={64} rx={12} fill={PAPER} stroke={OL} strokeWidth={5} />
            <text y={12} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={30} fill={OL}>EXACTLY 4 HRS?</text>
            {s >= T('exact') + 0.5 ? <line x1={-160} y1={0} x2={160} y2={-4} stroke={BAD} strokeWidth={10} strokeLinecap="round" /> : null}
          </g>
        </g>
      ) : null}
      {winK > 0 ? <Tag x={(gx(6 / 2.6) + gx(6 / 0.8)) / 2} y={GY1 - 40} text="THE WINDOW" bg={GOOD} fg={OL} size={32} k={pop(s, T('window'))} /> : null}
      {ICONS.map(([lab0, w, col], i) => {
        const t0 = wt(10, w);
        const k = li === 11 ? 1 : s >= t0 ? pop(s, t0) : 0;
        return k > 0 ? (
          <g key={lab0} transform={`translate(${245 + i * 196} 1236) scale(${k})`}>
            <rect x={-90} y={-32} width={180} height={64} rx={14} fill={col} stroke={OL} strokeWidth={5} />
            <text y={11} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={lab0.length > 6 ? 24 : 28} fill={OL}>{lab0}</text>
          </g>
        ) : null;
      })}
    </g>
  ) : null;

  // ── UI card
  const left = Math.max(0, TEST_SECS - Math.max(0, s - tTest));
  const secs = Math.ceil(left - 1e-6);
  const counting = s >= tTest && s < tTest + TEST_SECS;
  const urgent = counting && secs <= 2;
  const ringK = s < tTest ? 1 : left / TEST_SECS;
  const header = hook ? 'WAKE UP DEAD MAN · THE FILM' : lab ? 'REAL LIFE · FORENSIC PATHOLOGY' : test ? (answered ? 'THE ANSWER' : 'YOUR TURN') : 'THE CATCH';
  const bigText = (t: string, col = OL, sz = 52) => <div style={{position: 'absolute', left: 26, top: 60, width: 790, fontFamily: heavy, fontWeight: 900, fontSize: sz, lineHeight: 1.05, color: col, whiteSpace: 'nowrap'}}>{t}</div>;
  const subText = (t: string) => <div style={{position: 'absolute', left: 28, top: 126, width: 790, fontFamily: MONO, fontWeight: 900, fontSize: 27, color: '#5a6070', whiteSpace: 'nowrap'}}>{t}</div>;
  let body: React.ReactNode = null;
  if (li === 0) body = <>{bigText(s >= T('body') ? 'THE BODY KNOWS WHEN' : 'WAKE UP DEAD MAN', s >= T('body') ? '#b3101f' : OL, 54)}{subText(s >= T('body') ? 'REAL DETECTIVES READ THE BODY' : 'BLANC READS PEOPLE')}</>;
  else if (li === 12) body = <>{bigText(s >= T('range') ? 'A RANGE, NOT A TIME' : 'BLANC GETS A CONFESSION', s >= T('range') ? '#2a8a5a' : OL, 48)}{subText('DETECTIVES GET A WINDOW')}</>;
  else if (lab) {
    const got = [s >= T('alive'), s >= T('rate'), s >= T('measured')];
    body = (
      <>
        {bigText('THE BODY CLOCK', OL, 50)}
        {['98.6°F ALIVE', '−1.5°F / HOUR', 'FROM THE READING'].map((n, k) => (
          <div key={n} style={{position: 'absolute', left: 22 + k * 270, top: 120, width: 256, height: 42, borderRadius: 8, border: '4px solid #1b1b22', boxSizing: 'border-box',
            background: got[k] ? YEL : '#e2ddd2', fontFamily: heavy, fontWeight: 900, fontSize: 21, lineHeight: '34px', textAlign: 'center', color: got[k] ? OL : '#aaa39a',
            transform: `scale(${got[k] ? pop(s, T(['alive', 'rate', 'measured'][k])) : 1})`}}>{got[k] ? n : '?'}</div>
        ))}
      </>
    );
  } else if (test) {
    body = (
      <>
        {bigText(answered ? 'B DID IT' : 'WHO DID IT?', answered ? '#2a8a5a' : OL, 52)}
        {subText(answered ? '6° DOWN = 4 HRS · 12 AM − 4 = 8 PM' : '98.6° · −1.5°/HR · FROM THE READING')}
        {!answered ? (
          <svg width={150} height={150} style={{position: 'absolute', left: 676, top: 20}}>
            <circle cx={75} cy={75} r={56} fill={urgent ? '#ffe0e0' : '#fff'} stroke="#d8d2c4" strokeWidth={12} />
            <circle cx={75} cy={75} r={56} fill="none" stroke={urgent ? BAD : '#2a8a5a'} strokeWidth={12} strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 56 * ringK} 999`} transform="rotate(-90 75 75)" />
            <text x={75} y={93} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={54} fill={urgent ? '#d6293a' : OL}>{s < tTest ? TEST_SECS : secs}</text>
          </svg>
        ) : null}
      </>
    );
  } else body = <>{bigText(s >= T('window') ? 'A WINDOW, NOT A TIME' : 'THE CATCH', s >= T('window') ? '#2a8a5a' : OL, 50)}{subText('1.5°F AN HOUR IS A RULE OF THUMB')}</>;
  const card = (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 176, background: PAPER, borderRadius: 14, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 840, height: 46, background: hook ? '#4a1420' : '#1e2a44', display: 'flex', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: hook ? '#c9a24a' : YEL}} />
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: PAPER}}>{header}</span>
      </div>
      {body}
    </div>
  );
  const note = li === 0 ? '* ORIGINAL ART · NOT FROM THE FILM' : lab ? 'GLAISTER RULE OF THUMB · ROOM TEMP, FIRST ~12 HRS'
    : real ? 'REAL ESTIMATES USE RANGES · FORENSIC PATHOLOGY' : '';

  // ── captions
  const caps = captions(ep as unknown as FightEpisode, timing, {lineStarts: plan.lineStarts, lineEnds: plan.lineEnds, events: [], hits: [], end: plan.end});
  const capIdx = caps.findIndex((c) => s >= c.start && s < c.end);
  const cap = capIdx >= 0 ? caps[capIdx] : null;
  let capSize = 0;
  let capWrap = false;
  if (cap) {
    const one = 820 / (cap.text.length * 0.78);
    const longest = Math.max(...cap.text.split(' ').map((x) => x.length));
    capWrap = one < 100 && cap.n > 1;
    capSize = Math.min(cap.hot ? 120 : 104, capWrap ? Math.min(78, 820 / (longest * 0.78)) : one);
  }
  const capPop = cap ? 0.55 + 0.45 * spring({frame: frame - Math.round(cap.start * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;

  const slam = s >= T('body') && s < T('body') + 1.1 && li === 0 ? <Slam k={(s - T('body')) / 1.1} text="READ THE BODY" color="#ff3b5c" size={104} top={1460} />
    : s >= T('answer') && s < T('answer') + 0.9 ? <Slam k={(s - T('answer')) / 0.9} text="B!" color="#b07cff" size={190} top={1480} />
      : s >= T('window') && s < T('window') + 1.1 && li === 11 ? <Slam k={(s - T('window')) / 1.1} text="A WINDOW" color="#7be07b" size={120} top={1440} />
        : s >= T('range') ? <Slam k={Math.min(0.6, (s - T('range')) / 1.2)} text="NOT A TIME." color="#ff3b5c" size={110} top={1560} /> : null;
  const late = s >= tTest + TEST_SECS && s < T('answer');
  const ticks = Array.from({length: TEST_SECS}).map((_, k) => tTest + k);

  // world = everything the camera sees, in depth layers (whip-able); ui = flat overlay
  const world = (
    <AbsoluteFill style={{background: hook ? '#2e4f52' : '#16203a', overflow: 'hidden'}}>
      {hook ? (
        <>
          <div style={layerStyle(cam, 0.7, shx, shy)}><RoomWall /></div>
          <div style={camStyle}><RoomFloor /></div>
        </>
      ) : (
        <>
          <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, #4c68a3 0%, #2d3f6a 55%, #18233f 100%)'}} />
          <div style={layerStyle(cam, 0.45, shx, shy)}><Bokeh s={s} /></div>
          <div style={layerStyle(cam, 0.8, shx, shy)}>
            <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, opacity: 0.1, overflow: 'visible'}}>
              {Array.from({length: 30}).map((_, k) => <rect key={k} x={-100} y={420 + k * 60} width={W + 200} height={3} fill="#9fb0c8" />)}
            </svg>
          </div>
        </>
      )}
      <div style={camStyle}>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <LiftDefs />
          {hookScene}
          {!hook ? <g filter="url(#lift)">{labScene}{testScene}{realScene}</g> : null}
          {!hook ? <Tape s={s} /> : null}
        </svg>
      </div>
      <div style={layerStyle(cam, 1.35, shx, shy)}><Dust s={s} col={hook ? '#ffe2b8' : '#dbe6ff'} /></div>
    </AbsoluteFill>
  );
  const ui = (
    <>
      {late ? <div style={{position: 'absolute', left: 0, top: 1450, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: 110, color: '#fff', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill', transform: `rotate(-3deg) scale(${pop(s, tTest + TEST_SECS)})`}}>TIME!</div> : null}
      {s < T('answer') && li >= 6 ? <div style={{position: 'absolute', left: 120, top: 420, width: 840 * ringK, height: 10, borderRadius: 5, background: urgent ? BAD : YEL}} /> : null}
      {card}
      {note ? <div style={{position: 'absolute', left: 100, top: 432, width: 880, textAlign: 'center', fontFamily: MONO, fontWeight: 900, fontSize: 22, color: hook ? '#e8d9b0' : '#9fb0c8'}}>{note}</div> : null}
      {cap ? (
        <div style={{position: 'absolute', top: 486, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
          fontSize: capSize, lineHeight: 1.0, color: cap.hot ? YEL : '#ffffff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`,
          paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: capWrap ? 'normal' : 'nowrap',
          transform: `scale(${capPop}) rotate(${capIdx % 2 ? 2 : -2}deg)`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}
      {slam}
    </>
  );
  const audio = (
    <>
      <Audio src={staticFile(`music/${ep.id}.wav`)} volume={0.55} />
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}><Audio src={staticFile(ln.file)} /></Sequence>
      ))}
      {ticks.map((t, k) => (
        <Sequence key={`t${k}`} from={Math.round(t * FPS)} durationInFrames={20}><Audio src={staticFile('sfx/tick.wav')} volume={k >= TEST_SECS - 2 ? 0.8 : 0.4} /></Sequence>
      ))}
      {([
        [0.0, 'sfx/thunder.wav', 0.35], [0.05, 'sfx/whoosh.wav', 0.5], ...[0, 1, 2].map((i) => [T('blanc') + i * 0.18, 'sfx/pop.wav', 0.5] as [number, string, number]),
        [T('body') - 0.15, 'sfx/whoosh.wav', 0.5], [T('body'), 'sfx/slam.wav', 0.8], [T('body') + 0.5, 'sfx/ding.wav', 0.4],
        [LS[1], 'sfx/whoosh.wav', 0.6], [T('clock'), 'sfx/tick.wav', 0.8], [T('clock') + 0.25, 'sfx/tick.wav', 0.6], [T('clock') + 0.5, 'sfx/tick.wav', 0.5],
        [T('alive'), 'sfx/ding.wav', 0.55], [T('drop'), 'sfx/powerdown.wav', 0.5],
        ...[1, 2, 3, 4].map((i) => [T('drop') + ((dropEnd - T('drop')) / 4) * (i - 1) + 0.2, 'sfx/pop.wav', 0.45] as [number, string, number]),
        [T('rate'), 'sfx/clank.wav', 0.55], [T('six'), 'sfx/pop.wav', 0.55], [T('four'), 'sfx/slam.wav', 0.75],
        [LS[5], 'sfx/whoosh.wav', 0.5], [T('measured'), 'sfx/ding.wav', 0.6], [T('found'), 'sfx/fail.wav', 0.5],
        [T('test'), 'sfx/slam.wav', 0.8], [tTest + TEST_SECS, 'sfx/fail.wav', 0.5],
        [T('answer'), 'sfx/ding.wav', 0.8], [T('answer'), 'sfx/shine.wav', 0.6], [T('asix'), 'sfx/pop.wav', 0.5], [T('midnight'), 'sfx/whoosh.wav', 0.55], [T('eight'), 'sfx/slam.wav', 0.75],
        [T('ten'), 'sfx/whoosh.wav', 0.5], [T('sixpm'), 'sfx/zap.wav', 0.45], [T('trap'), 'sfx/clank.wav', 0.6], [T('trap'), 'sfx/slam.wav', 0.7],
        [T('c'), 'sfx/pop.wav', 0.5], [T('dinner'), 'sfx/ding.wav', 0.55],
        [LS[10], 'sfx/whoosh.wav', 0.55], ...ICONS.map(([, w]) => [wt(10, w), 'sfx/pop.wav', 0.5] as [number, string, number]), [T('bend'), 'sfx/zap.wav', 0.5],
        [T('exact'), 'sfx/pop.wav', 0.55], [T('exact') + 0.5, 'sfx/fail.wav', 0.45], [T('window'), 'sfx/shine.wav', 0.6], [T('window'), 'sfx/ding.wav', 0.5],
        [LS[12], 'sfx/whoosh.wav', 0.6], [T('confess'), 'sfx/pop.wav', 0.6], [T('range'), 'sfx/slam.wav', 0.85], [T('range') + 0.05, 'sfx/boom.wav', 0.45],
      ] as Array<[number, string, number]>).map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round(t * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </>
  );
  return {world, ui, audio, hook};
  };

  const now = view(sNow);
  const wh = whipAt(BOUNDS, sNow);
  return (
    <AbsoluteFill style={{background: '#0d1424', overflow: 'hidden'}}>
      {wh ? <Whip state={wh} fps={fps} render={(t) => view(t).world} /> : now.world}
      <Grade light={now.hook ? LIGHT_NIGHT : LIGHT_LAB} frame={frameNow} />
      {now.ui}
      {now.audio}
    </AbsoluteFill>
  );
};
