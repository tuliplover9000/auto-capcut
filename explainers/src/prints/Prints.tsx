import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Slam} from '../fight/Fight';
import {camAt, Shot} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {FPS, StoryEpisode, at, buildPlan, lineAt} from '../story/timeline';
import {CREAM, Mugshot, Print} from './PrintArt';
import {printData} from './specs';

// FINGERPRINTS 101. Teach-then-test, sequel to Blood Spatter: the 3 pattern
// types (loop / whorl / arch), then 3 minutiae (ending / split / dot) under a
// lens, then the viewer gets 6 s to match the crime-scene print to suspect
// A, B or C. Proof: A is the wrong TYPE; B is the right type but its details
// are off; C lines up point for point. Twist: B and C are identical twins —
// same DNA profile, different fingerprints.
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';
const W = 1080;
const H = 1920;
const TEST_SECS = 6;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const pop = (s: number, t0: number, d = 0.35) => (s < t0 ? 0 : 1 + 0.25 * Math.sin(clamp01((s - t0) / d) * Math.PI) * (1 - clamp01((s - t0) / d)));
const inK = (s: number, t0: number, d = 0.35) => ease(clamp01((s - t0) / d));

// layout
const CR: [number, number] = [540, 840]; // crime card centre
const CR_S = 1.0;
const SUS_X = [260, 540, 820];
const SUS_Y = 1240;
const SUS_S = 0.8;
const SLOT_Y = 1000;
const LENS: [number, number] = [540, 1030];
const LENS_R = 330;
const LENS_Z = 3.6;
const GOOD = '#5fd068';
const BAD = '#ff4f5e';
const YEL = '#ffd23f';

const Chip: React.FC<{x: number; y: number; text: string; bg?: string; fg?: string; k?: number; size?: number}> = ({x, y, text, bg = '#1b1b22', fg = YEL, k = 1, size = 34}) => {
  const w = text.length * size * 0.72 + 40;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <rect x={-w / 2} y={-size * 1.05} width={w} height={size * 1.7} rx={12} fill={bg} stroke="#1b1b22" strokeWidth={5} />
      <text y={size * 0.12} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={size} fill={fg}>{text}</text>
    </g>
  );
};

/** a print card: cream card + print + letter tag */
const Card: React.FC<{x: number; y: number; w: number; h: number; id?: string; s: number; tag?: string; uid: string; border?: string; dim?: number; down?: boolean; hl?: number; head?: string; k?: number}> = ({x, y, w, h, id, s, tag, uid, border = '#1b1b22', dim = 0, down = false, hl = 0, head, k = 1}) => (
  <g transform={`translate(${x} ${y})`} opacity={1 - dim * 0.55}>
    <rect x={-w / 2 + 8} y={-h / 2 + 12} width={w} height={h} rx={16} fill="rgba(0,0,0,.35)" />
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={16} fill={down ? '#22324a' : CREAM} stroke={border} strokeWidth={border === '#1b1b22' ? 6 : 12} />
    {down ? (
      <text y={40} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={140} fill="#41587a">?</text>
    ) : id ? (
      <Print id={id} x={0} y={tag ? -18 : head ? 18 : 0} s={s} uid={uid} hl={hl} k={k} />
    ) : null}
    {head ? (
      <g>
        <rect x={-w / 2} y={-h / 2} width={w} height={46} rx={16} fill="#1b1b22" />
        <rect x={-w / 2} y={-h / 2 + 24} width={w} height={22} fill="#1b1b22" />
        <text y={-h / 2 + 34} textAnchor="middle" fontFamily={MONO} fontWeight={900} fontSize={26} fill={YEL}>{head}</text>
      </g>
    ) : null}
    {tag ? (
      <g transform={`translate(0 ${h / 2 - 34})`}>
        <circle r={30} fill={down ? '#41587a' : '#1b1b22'} />
        <text y={13} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={38} fill="#fff">{tag}</text>
      </g>
    ) : null}
  </g>
);

const Ring: React.FC<{x: number; y: number; col: string; k: number; r?: number; n?: string; mark?: string}> = ({x, y, col, k, r = 24, n, mark}) => (k <= 0 ? null : (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <circle r={r} fill="none" stroke="#1b1b22" strokeWidth={11} />
    <circle r={r} fill="none" stroke={col} strokeWidth={6} />
    {n ? (
      <g transform={`translate(${r * 0.95} ${-r * 0.95})`}>
        <circle r={17} fill={col} stroke="#1b1b22" strokeWidth={4} />
        <text y={9} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={24} fill="#1b1b22">{n}</text>
      </g>
    ) : null}
    {mark ? (
      <g transform={`translate(${r * 0.95} ${-r * 0.95})`}>
        <circle r={18} fill={col} stroke="#1b1b22" strokeWidth={4} />
        <text y={9} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={24} fill="#1b1b22">{mark}</text>
      </g>
    ) : null}
  </g>
));

/* a 12-locus DNA profile, the same for both twins */
const DnaStrip: React.FC<{x: number; y: number; k: number; glow: number}> = ({x, y, k, glow}) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <rect x={-140} y={-56} width={280} height={112} rx={12} fill="#10141c" stroke={glow > 0 ? GOOD : '#3a4558'} strokeWidth={6} />
    <text x={-124} y={-26} fontFamily={MONO} fontWeight={900} fontSize={22} fill="#8fa0b8">DNA</text>
    {Array.from({length: 12}).map((_, i) => {
      const hgt = 18 + rnd(i * 3.7 + 1) * 46;
      return <rect key={i} x={-122 + i * 21} y={44 - hgt} width={12} height={hgt} rx={3} fill={glow > 0 ? GOOD : '#57c7ff'} />;
    })}
  </g>
);

/* ── the crime-scene print is a PARTIAL fragment of C: zoomed, rotated, smudged ── */
const FR = 84; // fragment radius (print-local units)
const FZ = 1.55; // zoom on the crime card
const FROT = 38; // rotation on the crime card (deg)
const cMins = () => printData('C').mins;
const FC = (() => {
  const m = cMins();
  return [m.reduce((a, q) => a + q.x, 0) / m.length, m.reduce((a, q) => a + q.y, 0) / m.length] as [number, number];
})();
const BLOB = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = FR * (1 + 0.1 * Math.sin(3 * a + 1) + 0.07 * Math.sin(5 * a + 2.3));
    pts.push(`${(FC[0] + Math.cos(a) * r).toFixed(1)} ${(FC[1] + Math.sin(a) * r).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')} Z`;
})();
const SMUDGES = ([[-34, -52, 24, 11, 30], [58, 18, 20, 10, -20], [-6, 72, 26, 9, 10], [-74, -4, 16, 9, 60], [30, -30, 12, 7, -50]] as const)
  .filter(([dx, dy]) => cMins().every((m) => Math.hypot(FC[0] + dx - m.x, FC[1] + dy - m.y) > 30));
type FPose = {x: number; y: number; z: number; rot: number};
const CRIME_POSE: FPose = {x: CR[0], y: CR[1] + 4, z: FZ, rot: FROT};
const fragAt = (p: {x: number; y: number}, f: FPose): [number, number] => {
  const a = (f.rot * Math.PI) / 180;
  const dx = p.x - FC[0];
  const dy = p.y - FC[1];
  return [f.x + f.z * (dx * Math.cos(a) - dy * Math.sin(a)), f.y + f.z * (dx * Math.sin(a) + dy * Math.cos(a))];
};
const Fragment: React.FC<{f: FPose; uid: string; k?: number; ghost?: number; outline?: string}> = ({f, uid, k = 1, ghost = 0, outline}) => (
  <g transform={`translate(${f.x} ${f.y}) rotate(${f.rot}) scale(${f.z}) translate(${-FC[0]} ${-FC[1]})`}>
    <defs><clipPath id={`fr-${uid}`}><path d={BLOB} /></clipPath></defs>
    {ghost > 0 ? <path d={BLOB} fill={CREAM} opacity={0.9 * ghost} /> : null}
    <g clipPath={`url(#fr-${uid})`}>
      <Print id="C" x={0} y={0} s={1} uid={`fp-${uid}`} ink="#3a3d48" k={k} />
      {SMUDGES.map(([dx, dy, rx, ry, r], i) => (
        <ellipse key={i} cx={FC[0] + dx} cy={FC[1] + dy} rx={rx} ry={ry} transform={`rotate(${r} ${FC[0] + dx} ${FC[1] + dy})`} fill={CREAM} opacity={0.88} />
      ))}
    </g>
    {outline ? <path d={BLOB} fill="none" stroke={outline} strokeWidth={4 / f.z} strokeDasharray={`${12 / f.z} ${8 / f.z}`} /> : null}
  </g>
);

export const Prints: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const T = (k: string) => at(plan, k);
  const LS = plan.lineStarts;
  const LE = plan.lineEnds;
  const li = lineAt(plan, s);
  const tTest = LE[6] + 0.05;

  // ── camera
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 960, z: 1, r: 0, ...c});
  shot(0, 0.01, {x: 540, y: 900, z: 1.1});
  shot(0.05, 3.0, {x: 540, y: 960, z: 1.0});
  shot(T('kicker') - 0.05, 0.25, {x: 540, y: 1060, z: 1.06});
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const kick = (t0: number, amp: number, decay: number) => (s >= t0 ? amp * Math.exp(-(s - t0) * decay) : 0);
  const shake = kick(T('test'), 10, 7) + kick(T('answer'), 8, 7) + kick(T('outA'), 6, 8) + kick(T('twins'), 8, 7) + kick(T('kicker'), 12, 6);
  const shx = Math.sin(frame * 2.3) * shake;
  const shy = Math.cos(frame * 2.9) * shake;
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + shx}px, ${960 - cam.y + shy}px) scale(${cam.z})`};

  // ── phases
  const hookOut = LS[1] - 0.35;
  const hookK = s < hookOut ? 1 : 1 - inK(s, hookOut, 0.35);
  const lessonOn = s >= LS[1] - 0.05 && s < LS[4] + 0.35;
  const lessonK = s < LS[4] ? inK(s, LS[1] - 0.05, 0.4) : 1 - inK(s, LS[4], 0.35);
  const detailOn = s >= LS[4] && s < LS[6] + 0.3;
  const detailK = s < LS[6] ? inK(s, LS[4], 0.35) : 1 - inK(s, LS[6], 0.3);
  const testOn = s >= T('test') - 0.15;
  const twistT = T('twist');
  const twistU = clamp01((s - (twistT + 0.15)) / 0.7);
  const answered = s >= T('answer');

  // ── hook: the crime card + three face-down suspects
  const dustK = 0.3 + 0.7 * ease(clamp01(s / 1.6));
  const brushLx = -118 * 0.6 + 118 * 1.2 * dustK;
  const brushLy = -150 * 0.3 + 150 * 0.6 * dustK;
  const scanY = s >= T('wipe') ? lerp(CR[1] - 210, CR[1] + 210, clamp01((s - T('wipe')) / 0.9)) : -1;
  const hook = hookK > 0 ? (
    <g opacity={hookK} transform={`translate(0 ${(1 - hookK) * 260})`}>
      <Card x={CR[0]} y={CR[1]} w={330} h={410} s={CR_S} uid="hk" head="CRIME SCENE" />
      <Fragment f={CRIME_POSE} uid="hk" k={dustK} />
      <Chip x={CR[0]} y={CR[1] + 180} text="PARTIAL · ZOOMED IN" size={20} />
      {dustK < 1 ? (
        <g transform={`translate(${CR[0] + brushLx * CR_S + 40} ${CR[1] + 18 + brushLy * CR_S - 40}) rotate(-35)`}>
          {Array.from({length: 14}).map((_, j) => (
            <circle key={j} cx={-30 + rnd(j + frame * 0.7) * 60} cy={30 + rnd(j * 2.1 + frame) * 70} r={2 + rnd(j * 5.3) * 3} fill="#6b6f7a" opacity={0.7} />
          ))}
          <ellipse cx={0} cy={6} rx={30} ry={22} fill="#2a2a32" />
          <rect x={-9} y={-150} width={18} height={140} rx={8} fill="#c48a3a" stroke="#1b1b22" strokeWidth={4} />
          <rect x={-16} y={-20} width={32} height={22} rx={4} fill="#9aa3ae" stroke="#1b1b22" strokeWidth={4} />
        </g>
      ) : null}
      {scanY > 0 && s < T('wipe') + 0.95 ? (
        <g>
          <rect x={CR[0] - 175} y={scanY - 5} width={350} height={10} rx={5} fill={YEL} />
          <rect x={CR[0] - 165} y={scanY - 60} width={330} height={55} fill={YEL} opacity={0.18} />
        </g>
      ) : null}
      {SUS_X.map((x, i) => (
        <g key={i} transform={`translate(0 ${(1 - inK(s, 0.25 + i * 0.12, 0.35)) * 500})`}>
          <Card x={x} y={SUS_Y} w={250} h={330} down tag={'ABC'[i]} s={SUS_S} uid={`hd${i}`} />
        </g>
      ))}
    </g>
  ) : null;

  // ── lessons: three slots fill with LOOP / WHORL / ARCH
  const TYPES: Array<[string, string, string, string]> = [['loop', 'LOOP', '~60%', 'loop'], ['whorl', 'WHORL', '~35%', 'whorl'], ['arch', 'ARCH', '~5%', 'arch']];
  const lessons = lessonOn ? (
    <g opacity={lessonK}>
      {TYPES.map(([id, name, pct, cue], i) => {
        const x = SUS_X[i];
        const inS = inK(s, LS[1] + i * 0.1, 0.35);
        const filled = s >= T(cue);
        const active = li === i + 1;
        const hl = filled ? clamp01((s - T(cue) - 0.35) / 0.3) * (active ? 0.9 : 0) : 0;
        const sc = filled ? pop(s, T(cue)) * (active ? 1.04 : 1) : s >= T('three') ? pop(s, T('three') + i * 0.08) : 1;
        return (
          <g key={id} transform={`translate(${x} ${SLOT_Y + (1 - inS) * 400}) scale(${sc}) translate(${-x} ${-SLOT_Y})`}>
            {filled ? (
              <Card x={x} y={SLOT_Y} w={250} h={360} id={id} s={0.86} uid={`ls${i}`} hl={hl} border={active ? YEL : '#1b1b22'} />
            ) : (
              <g>
                <rect x={x - 125} y={SLOT_Y - 180} width={250} height={360} rx={16} fill="rgba(255,255,255,.06)" stroke="#5a6478" strokeWidth={5} strokeDasharray="18 12" />
                <text x={x} y={SLOT_Y + 40} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={120} fill="#5a6478">{s >= T('three') ? i + 1 : '?'}</text>
              </g>
            )}
            {filled ? (
              <g transform={`translate(${x} ${SLOT_Y + 250}) scale(${pop(s, T(cue) + 0.1)})`}>
                <text y={0} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={44} fill="#fff" stroke="#111" strokeWidth={8} paintOrder="stroke">{name}</text>
                <text y={64} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={54} fill={YEL} stroke="#111" strokeWidth={9} paintOrder="stroke">{pct}</text>
              </g>
            ) : null}
          </g>
        );
      })}
      {/* whorl: a spinning arrow around the core */}
      {s >= T('spin') && li === 2 ? (
        <g transform={`translate(${SUS_X[1]} ${SLOT_Y - 10}) rotate(${(s - T('spin')) * 260}) scale(${pop(s, T('spin'))})`}>
          <path d="M 0 -78 A 78 78 0 1 1 -74 24" fill="none" stroke="#1b1b22" strokeWidth={16} strokeLinecap="round" />
          <path d="M 0 -78 A 78 78 0 1 1 -74 24" fill="none" stroke={YEL} strokeWidth={9} strokeLinecap="round" />
          <path d="M -96 4 L -74 46 L -50 6 Z" fill={YEL} stroke="#1b1b22" strokeWidth={4} />
        </g>
      ) : null}
      {/* arch: a wave arrow riding over the top */}
      {s >= T('wave') && li === 3 ? (
        <g transform={`translate(${SUS_X[2]} ${SLOT_Y - 80})`} opacity={clamp01((s - T('wave')) / 0.2)}>
          {(() => {
            const u = clamp01((s - T('wave')) / 0.7);
            const xx = lerp(-110, 110, u);
            const yy = -46 * Math.exp(-((xx / 70) ** 2));
            return (
              <g>
                <path d={`M -110 0 Q 0 -92 ${xx} ${yy}`} fill="none" stroke="#1b1b22" strokeWidth={14} strokeLinecap="round" />
                <path d={`M -110 0 Q 0 -92 ${xx} ${yy}`} fill="none" stroke={YEL} strokeWidth={7} strokeLinecap="round" />
                <circle cx={xx} cy={yy} r={13} fill={YEL} stroke="#1b1b22" strokeWidth={4} />
              </g>
            );
          })()}
        </g>
      ) : null}
    </g>
  ) : null;

  // ── details: the lens
  const zK = inK(s, T('zoom'), 0.8);
  const dz = lerp(1.55, LENS_Z, zK);
  const dmins = printData('detail').mins;
  const MIN_CUE = ['end', 'fork', 'dot'];
  const MIN_NAME = ['ENDING', 'SPLIT', 'DOT'];
  const details = detailOn ? (
    <g opacity={detailK}>
      <defs><clipPath id="lensclip"><circle cx={LENS[0]} cy={LENS[1]} r={LENS_R} /></clipPath></defs>
      <line x1={LENS[0] + LENS_R * 0.72} y1={LENS[1] + LENS_R * 0.72} x2={LENS[0] + LENS_R * 1.05} y2={LENS[1] + LENS_R * 1.05} stroke="#1b1b22" strokeWidth={56} strokeLinecap="round" opacity={zK} />
      <line x1={LENS[0] + LENS_R * 0.72} y1={LENS[1] + LENS_R * 0.72} x2={LENS[0] + LENS_R * 1.05} y2={LENS[1] + LENS_R * 1.05} stroke="#c48a3a" strokeWidth={36} strokeLinecap="round" opacity={zK} />
      <g clipPath="url(#lensclip)">
        <circle cx={LENS[0]} cy={LENS[1]} r={LENS_R} fill={CREAM} />
        <Print id="detail" x={LENS[0]} y={LENS[1]} s={dz} uid="dl" />
      </g>
      <circle cx={LENS[0]} cy={LENS[1]} r={LENS_R} fill="none" stroke="#1b1b22" strokeWidth={22} opacity={0.4 + 0.6 * zK} />
      <circle cx={LENS[0]} cy={LENS[1]} r={LENS_R - 14} fill="none" stroke="#fff" strokeWidth={4} opacity={0.5 * zK} />
      {dmins.map((m, i) => {
        const t0 = T(MIN_CUE[i]);
        if (s < t0) return null;
        const x = LENS[0] + m.x * dz;
        const y = LENS[1] + m.y * dz;
        const up = i !== 1;
        return (
          <g key={i}>
            <Ring x={x} y={y} col={YEL} k={pop(s, t0)} r={56} />
            <Chip x={x} y={y + (up ? -100 : 118)} text={MIN_NAME[i]} k={pop(s, t0 + 0.05)} />
          </g>
        );
      })}
    </g>
  ) : null;

  // ── the test + proof
  const crimeMins = printData('C').mins;
  const susPt = (i: number, m: {x: number; y: number}): [number, number] => [SUS_X[i] + m.x * SUS_S, SUS_Y - 18 + m.y * SUS_S];
  const C_POSE: FPose = {x: SUS_X[2] + FC[0] * SUS_S, y: SUS_Y - 18 + FC[1] * SUS_S, z: SUS_S, rot: 0};
  const flyK = ease(clamp01((s - T('lineup')) / 0.75));
  const flyPose: FPose = {x: lerp(CRIME_POSE.x, C_POSE.x, flyK), y: lerp(CRIME_POSE.y, C_POSE.y, flyK), z: lerp(CRIME_POSE.z, C_POSE.z, flyK), rot: lerp(CRIME_POSE.rot, 0, flyK)};
  const landed = s >= T('lineup') + 0.78;
  const testIn = (i: number) => inK(s, T('test') - 0.12 + i * 0.1, 0.3);
  const outA = s >= T('outA');
  const offB = s >= T('off');
  const crimeOut = inK(s, twistT, 0.5);
  const test = testOn ? (
    <g>
      {/* crime card */}
      <g opacity={1 - crimeOut} transform={`translate(0 ${(1 - testIn(0)) * -500 - crimeOut * 200})`}>
        <Card x={CR[0]} y={CR[1]} w={330} h={410} s={CR_S} uid="tc" head="CRIME SCENE" />
        <Fragment f={CRIME_POSE} uid="tc" />
        <Chip x={CR[0]} y={CR[1] + 180} text="PARTIAL · ZOOMED IN" size={20} />
        {s >= T('b') && li <= 8 ? crimeMins.map((m, j) => {
          const [x, y] = fragAt(m, CRIME_POSE);
          return <Ring key={j} x={x} y={y} col={YEL} k={pop(s, T('b') + 0.15 + j * 0.12)} r={22} n={`${j + 1}`} />;
        }) : null}
      </g>
      {/* suspects */}
      {SUS_X.map((x0, i) => {
        if (i === 0) {
          const gone = inK(s, twistT, 0.45);
          return (
            <g key={i} opacity={1 - gone} transform={`translate(${-gone * 400} ${(1 - testIn(1)) * 600})`}>
              <Card x={x0} y={SUS_Y} w={250} h={330} id="A" tag="A" s={SUS_S} uid="tA" dim={outA ? 1 : 0} />
              {outA ? (
                <g transform={`translate(${x0} ${SUS_Y - 20}) scale(${pop(s, T('outA'))}) rotate(-8)`}>
                  <path d="M -90 -90 L 90 90 M 90 -90 L -90 90" stroke="#1b1b22" strokeWidth={34} strokeLinecap="round" />
                  <path d="M -90 -90 L 90 90 M 90 -90 L -90 90" stroke={BAD} strokeWidth={20} strokeLinecap="round" />
                  <g transform="translate(0 118)"><Chip x={0} y={0} text="WHORL" bg={BAD} fg="#1b1b22" size={30} /></g>
                </g>
              ) : null}
            </g>
          );
        }
        // B and C: move to the twins layout and flip to mugshots
        const tx = i === 1 ? 330 : 750;
        const ty = 900;
        const cx = lerp(x0, tx, ease(twistU));
        const cy = lerp(SUS_Y, ty, ease(twistU));
        const flip = Math.abs(Math.cos(Math.PI * twistU));
        const face = twistU >= 0.5;
        const isC = i === 2;
        const border = !face && isC && answered ? GOOD : !face && i === 1 && s >= T('b') && li === 8 ? (offB ? BAD : YEL) : '#1b1b22';
        return (
          <g key={i} transform={`translate(0 ${(1 - testIn(i + 1)) * 600})`}>
            <g transform={`translate(${cx} ${cy}) scale(${flip} 1) translate(${-cx} ${-cy})`}>
              {face ? <Mugshot x={cx} y={cy} tag={'ABC'[i]} /> : (
                <g transform={`translate(${cx - x0} ${cy - SUS_Y})`}>
                  <Card x={x0} y={SUS_Y} w={250} h={330} id={'ABC'[i]} tag={'ABC'[i]} s={SUS_S} uid={`t${i}`} border={border} dim={i === 1 && offB && li <= 8 ? 0.6 : 0} />
                </g>
              )}
            </g>
            {!face && isC && answered ? (
              <g transform={`translate(${x0 + 100} ${SUS_Y - 150}) scale(${pop(s, T('answer'))})`}>
                <circle r={36} fill={GOOD} stroke="#1b1b22" strokeWidth={6} />
                <path d="M -16 2 L -4 15 L 18 -12" fill="none" stroke="#1b1b22" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ) : null}
            {/* B: the crime print's details aren't there */}
            {i === 1 && offB && li === 8 ? crimeMins.map((m, j) => {
              const [x, y] = susPt(1, m);
              return <Ring key={j} x={x} y={y} col={BAD} k={pop(s, T('off') + j * 0.1)} r={18} mark="✗" />;
            }) : null}
            {/* C: they line up */}
            {isC && s >= T('lineup') && li === 8 ? crimeMins.map((m, j) => {
              const [x, y] = susPt(2, m);
              return landed ? <Ring key={j} x={x} y={y} col={GOOD} k={pop(s, T('lineup') + 0.8 + j * 0.08)} r={18} mark="✓" /> : null;
            }) : null}
          </g>
        );
      })}
      {/* the fragment flies back into its spot on C */}
      {s >= T('lineup') && li === 8 ? <Fragment f={flyPose} uid="fly" ghost={landed ? 0.35 : 1} outline={GOOD} /> : null}
      {landed && li === 8 ? <Chip x={SUS_X[2]} y={SUS_Y + 222} text="MATCH" bg={GOOD} fg="#1b1b22" k={pop(s, T('lineup') + 0.85)} /> : null}
      {offB && li === 8 ? <Chip x={SUS_X[1]} y={SUS_Y + 222} text="NO MATCH" bg={BAD} fg="#1b1b22" k={pop(s, T('off') + 0.3)} size={30} /> : null}
    </g>
  ) : null;

  // ── twist: twins, DNA, fingerprints
  const twins = s >= T('twins') ? (
    <g>
      {li === 9 ? (
        <g>
          <g transform={`translate(540 900) scale(${pop(s, T('twins'))})`}>
            <circle r={52} fill={YEL} stroke="#1b1b22" strokeWidth={6} />
            <text y={26} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={84} fill="#1b1b22">=</text>
          </g>
          <Chip x={540} y={1150} text="IDENTICAL TWINS" k={pop(s, T('twins') + 0.1)} size={44} />
        </g>
      ) : null}
      {li >= 10 ? (
        <g>
          {[330, 750].map((x, j) => (
            <DnaStrip key={j} x={x} y={1150} k={li === 10 ? pop(s, T('dna') + j * 0.1) : 1 - inK(s, T('kicker'), 0.2)} glow={s >= T('same') ? 1 : 0} />
          ))}
          {s >= T('same') && s < T('kicker') ? (
            <g>
              <g transform={`translate(540 1150) scale(${pop(s, T('same'))})`}>
                <circle r={46} fill={GOOD} stroke="#1b1b22" strokeWidth={6} />
                <text y={24} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={76} fill="#1b1b22">=</text>
              </g>
              <Chip x={540} y={1290} text="SAME DNA" bg={GOOD} fg="#1b1b22" k={pop(s, T('same') + 0.1)} size={44} />
            </g>
          ) : null}
        </g>
      ) : null}
      {s >= T('kicker') ? (
        <g>
          {(['B', 'C'] as const).map((id, j) => {
            const x = j ? 750 : 330;
            const k = pop(s, T('kicker') + j * 0.08);
            return (
              <g key={id} transform={`translate(${x} 1230) scale(${k}) translate(${-x} -1230)`}>
                <Card x={x} y={1230} w={230} h={290} id={id} s={0.78} uid={`k${id}`} />
              </g>
            );
          })}
          <g transform={`translate(540 1230) scale(${pop(s, T('kicker') + 0.15)})`}>
            <circle r={60} fill={BAD} stroke="#1b1b22" strokeWidth={7} />
            <text y={30} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={100} fill="#1b1b22">≠</text>
          </g>
        </g>
      ) : null}
    </g>
  ) : null;

  // ── UI card
  const left = Math.max(0, TEST_SECS - Math.max(0, s - tTest));
  const secs = Math.ceil(left - 1e-6);
  const counting = s >= tTest && s < tTest + TEST_SECS;
  const urgent = counting && secs <= 2;
  const ringK = s < tTest ? 1 : left / TEST_SECS;
  const header = li === 0 ? 'FINGERPRINTS 101' : li <= 3 ? `THE 3 TYPES · ${li}/3` : li <= 5 ? 'THE DETAILS' : li <= 8 ? (answered ? 'THE ANSWER' : 'YOUR TURN') : 'THE TWIST';
  const bigText = (t: string, col = '#1b1b22', sz = 52) => <div style={{position: 'absolute', left: 26, top: 60, width: 790, fontFamily: heavy, fontWeight: 900, fontSize: sz, lineHeight: 1.05, color: col, whiteSpace: 'nowrap'}}>{t}</div>;
  const subText = (t: string) => <div style={{position: 'absolute', left: 28, top: 126, width: 790, fontFamily: MONO, fontWeight: 900, fontSize: 27, color: '#5a6070', whiteSpace: 'nowrap'}}>{t}</div>;
  let body: React.ReactNode = null;
  if (li === 0) body = <>{bigText('WHO LEFT THIS PRINT?', '#2f6fd6', 56)}{subText('LEARN TO READ IT, THEN YOU TRY')}</>;
  else if (li <= 3) {
    const [, name, pct, cue] = TYPES[li - 1];
    const done = s >= T(cue);
    body = (
      <>
        {bigText(done ? name : '...')}
        {subText(done ? `${pct} OF ALL PRINTS` : 'EVERY PRINT IS ONE OF 3 TYPES')}
        {Array.from({length: 3}).map((_, k) => (
          <div key={k} style={{position: 'absolute', left: 640 + k * 56, top: 70, width: 42, height: 42, borderRadius: 21, border: '5px solid #1b1b22', boxSizing: 'border-box',
            background: k < li && (k < li - 1 || done) ? '#2f6fd6' : '#e2ddd2', transform: `scale(${k === li - 1 && done ? pop(s, T(cue)) : 1})`}} />
        ))}
      </>
    );
  } else if (li <= 5) {
    const got = MIN_CUE.filter((c) => s >= T(c)).length;
    body = (
      <>
        {bigText('TINY DETAILS')}
        {MIN_NAME.map((n, k) => (
          <div key={n} style={{position: 'absolute', left: 26 + k * 200, top: 122, width: 186, height: 40, borderRadius: 8, border: '4px solid #1b1b22', boxSizing: 'border-box',
            background: k < got ? YEL : '#e2ddd2', fontFamily: heavy, fontWeight: 900, fontSize: 24, lineHeight: '32px', textAlign: 'center', color: k < got ? '#1b1b22' : '#aaa39a',
            transform: `scale(${k < got ? pop(s, T(MIN_CUE[k])) : 1})`}}>{k < got ? n : '?'}</div>
        ))}
      </>
    );
  } else if (li <= 8) {
    const struck = [outA, offB, false];
    body = (
      <>
        {['A', 'B', 'C'].map((L, k) => {
          const right = k === 2;
          const col = right && answered ? '#7be07b' : struck[k] ? '#e2ddd2' : '#fff';
          return (
            <div key={L} style={{position: 'absolute', left: 20 + k * 214, top: 62, width: 200, height: 98, borderRadius: 12, background: col, border: '5px solid #1b1b22', boxSizing: 'border-box',
              transform: `scale(${right && answered ? pop(s, T('answer')) : s >= T('ask') ? pop(s, T('ask') + k * 0.08) : 0.0001})`, opacity: struck[k] ? 0.5 : 1}}>
              <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 40, textAlign: 'center', lineHeight: '46px', color: '#1b1b22'}}>{right && answered ? '✓ ' : ''}{L}</div>
              <div style={{fontFamily: MONO, fontWeight: 900, fontSize: 22, textAlign: 'center', color: '#1b1b22', textDecoration: struck[k] ? 'line-through' : 'none'}}>
                {k === 0 && outA ? 'WRONG TYPE' : k === 1 && offB ? 'WRONG DETAILS' : right && s >= T('exact') ? 'MATCH' : 'SUSPECT'}
              </div>
            </div>
          );
        })}
        <svg width={150} height={150} style={{position: 'absolute', left: 676, top: 36}}>
          <circle cx={75} cy={75} r={56} fill={urgent ? '#ffe0e0' : '#fff'} stroke="#d8d2c4" strokeWidth={12} />
          <circle cx={75} cy={75} r={56} fill="none" stroke={urgent ? BAD : '#2a8a5a'} strokeWidth={12} strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 56 * ringK} 999`} transform="rotate(-90 75 75)" />
          <text x={75} y={93} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={54} fill={urgent ? '#d6293a' : '#1b1b22'}>{answered ? '✓' : s < tTest ? TEST_SECS : secs}</text>
        </svg>
      </>
    );
  } else if (li === 9) body = <>{bigText(s >= T('twins') ? 'B & C ARE TWINS' : 'THE TWIST...', '#1b1b22')}{subText(s >= T('twins') ? 'IDENTICAL TWINS' : 'B WAS CLOSE. WHY?')}</>;
  else if (li === 10) body = <>{bigText(s >= T('same') ? 'SAME DNA' : 'DNA TEST...', s >= T('same') ? '#2a8a5a' : '#1b1b22')}{subText(s >= T('same') ? "CAN'T TELL THEM APART" : 'STANDARD DNA PROFILE')}</>;
  else body = <>{bigText('DIFFERENT PRINTS', '#d6293a')}{subText('RIDGES FORM BY CHANCE IN THE WOMB')}</>;
  const card = (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 176, background: '#f4f1ea', borderRadius: 14, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 840, height: 46, background: '#0d1b33', display: 'flex', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: '#57c7ff'}} />
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: '#f4f1ea'}}>{header}</span>
      </div>
      {body}
    </div>
  );
  const note = li >= 1 && li <= 3 ? '* SHARES VARY BY STUDY & POPULATION' : li === 10 && s >= T('dna') ? '* STANDARD STR PROFILE' : '';

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
    capSize = Math.min(cap.hot ? 120 : 104, capWrap ? 820 / (longest * 0.78) : one);
  }
  const capPop = cap ? 0.55 + 0.45 * spring({frame: frame - Math.round(cap.start * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;

  const slam = s >= T('answer') && s < T('answer') + 0.9 ? <Slam k={(s - T('answer')) / 0.9} text="C!" color="#7be07b" size={190} top={1450} />
    : s >= T('twins') && s < T('twins') + 1.0 && li === 9 ? <Slam k={(s - T('twins')) / 1.0} text="TWINS?!" color={YEL} size={150} top={1300} />
    : s >= T('kicker') ? <Slam k={Math.min(0.5, (s - T('kicker')) / 1.2)} text="DIFFERENT" color={BAD} size={130} top={1440} /> : null;
  const late = s >= tTest + TEST_SECS && s < T('answer');
  const ticks = Array.from({length: TEST_SECS}).map((_, k) => tTest + k);

  return (
    <AbsoluteFill style={{background: '#0c1220', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 58%, #1c2c48 0%, #0c1220 72%)'}} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, opacity: 0.12}}>
        {Array.from({length: 28}).map((_, k) => <rect key={`g${k}`} x={0} y={k * 72} width={W} height={2} fill="#57c7ff" />)}
        {Array.from({length: 16}).map((_, k) => <rect key={`v${k}`} x={k * 72} y={0} width={2} height={H} fill="#57c7ff" />)}
      </svg>
      <div style={camStyle}>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {hook}
          {lessons}
          {details}
          {test}
          {twins}
        </svg>
      </div>
      {late ? <div style={{position: 'absolute', left: 0, top: 1450, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: 110, color: '#fff', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill', transform: `rotate(-3deg) scale(${pop(s, tTest + TEST_SECS)})`}}>TIME!</div> : null}
      {s < T('answer') && li >= 6 ? <div style={{position: 'absolute', left: 120, top: 420, width: 840 * ringK, height: 10, borderRadius: 5, background: urgent ? BAD : YEL}} /> : null}
      {card}
      {note ? <div style={{position: 'absolute', left: 120, top: 432, width: 840, textAlign: 'center', fontFamily: MONO, fontWeight: 900, fontSize: 24, color: '#9fb0c8'}}>{note}</div> : null}
      {cap ? (
        <div style={{position: 'absolute', top: 486, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
          fontSize: capSize, lineHeight: 1.0, color: cap.hot ? YEL : '#ffffff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`,
          paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: capWrap ? 'normal' : 'nowrap',
          transform: `scale(${capPop}) rotate(${capIdx % 2 ? 2 : -2}deg)`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}
      {slam}

      {/* audio */}
      <Audio src={staticFile(`music/${ep.id}.wav`)} volume={0.55} />
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}><Audio src={staticFile(ln.file)} /></Sequence>
      ))}
      {ticks.map((t, k) => (
        <Sequence key={`t${k}`} from={Math.round(t * FPS)} durationInFrames={20}><Audio src={staticFile('sfx/tick.wav')} volume={k >= TEST_SECS - 2 ? 0.8 : 0.4} /></Sequence>
      ))}
      {([
        [0.05, 'sfx/whoosh.wav', 0.5], [T('dust'), 'sfx/shine.wav', 0.5], [T('wipe'), 'sfx/zap.wav', 0.35], [hookOut, 'sfx/whoosh.wav', 0.6],
        [T('three'), 'sfx/pop.wav', 0.6], [T('loop'), 'sfx/pop.wav', 0.75], [T('loop') + 0.35, 'sfx/ding.wav', 0.45],
        [T('whorl'), 'sfx/pop.wav', 0.75], [T('spin'), 'sfx/whoosh.wav', 0.5], [T('arch'), 'sfx/pop.wav', 0.75], [T('wave'), 'sfx/whoosh.wav', 0.45],
        [LS[4], 'sfx/whoosh.wav', 0.5], [T('zoom'), 'sfx/shine.wav', 0.55], [T('end'), 'sfx/ding.wav', 0.55], [T('fork'), 'sfx/ding.wav', 0.6], [T('dot'), 'sfx/ding.wav', 0.65],
        [T('test'), 'sfx/slam.wav', 0.8], [tTest + TEST_SECS, 'sfx/fail.wav', 0.5], [T('answer'), 'sfx/ding.wav', 0.8], [T('answer'), 'sfx/shine.wav', 0.6],
        [T('outA'), 'sfx/punch.wav', 0.7], [T('b'), 'sfx/pop.wav', 0.5], [T('off'), 'sfx/fail.wav', 0.4], [T('lineup'), 'sfx/whoosh.wav', 0.5], [T('exact'), 'sfx/ding.wav', 0.7],
        [twistT, 'sfx/boom.wav', 0.5], [twistT + 0.5, 'sfx/whoosh.wav', 0.6], [T('twins'), 'sfx/slam.wav', 0.8],
        [T('dna'), 'sfx/printer.wav', 0.35], [T('same'), 'sfx/ding.wav', 0.6], [T('kicker'), 'sfx/slam.wav', 0.9], [T('kicker') + 0.05, 'sfx/boom.wav', 0.5],
      ] as Array<[number, string, number]>).map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round(t * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
