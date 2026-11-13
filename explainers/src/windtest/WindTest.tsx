import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {ArtBox, Dandelion, Person, Tree, Car, House, Tornado} from './art';
import {
  BANDS, EXIT, FPS, Timing, WindEpisode, bandAt, buildPlan, captions, contenderAt, readoutAt, skyAt, windAt,
} from './timeline';

// "A storm gauge on an open prairie, made of grass, sky and painted metal, lit
//  by daylight that drains into storm-green and violet as the wind climbs —
//  one lightning strike is the only white-hot light."
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;

const W = 1080;
const GROUND = 1330; // world y of the ground line
const PAN = 920; // how far the camera drops underground for the sting
const GX = 540;
const GY = 470;
const GR = 255;
const STAGE = 430;
const SOIL = 1935; // soil starts just below the frame bottom: nothing underground shows before the pan

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const ang = (mph: number) => ((225 - (Math.min(mph, 320) / 320) * 270) * Math.PI) / 180;
const pt = (mph: number, r: number): [number, number] => [GX + r * Math.cos(ang(mph)), GY - r * Math.sin(ang(mph))];

/* ───────────── world ───────────── */

const Sky: React.FC<{mph: number; s: number}> = ({mph, s}) => {
  const c = skyAt(mph);
  const storm = clamp01(mph / 302);
  const cloud = `rgba(${Math.round(255 - storm * 150)},${Math.round(255 - storm * 155)},${Math.round(255 - storm * 130)},${0.9})`;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, height: GROUND, background: `linear-gradient(${c.top}, ${c.bottom})`}} />
      <div style={{position: 'absolute', left: 820, top: 900, width: 150, height: 150, borderRadius: 75, background: '#ffe066',
        boxShadow: '0 0 80px 30px rgba(255,224,102,.6)', opacity: 1 - clamp01(mph / 60)}} />
      {[0, 1, 2, 3, 4].map((i) => {
        const x = ((i * 420 + s * (14 + mph * 1.7)) % 1700) - 320;
        const y = 760 + ((i * 173) % 380);
        const k = 0.8 + (i % 3) * 0.25;
        return (
          <svg key={i} width={320 * k} height={140 * k} viewBox="0 0 320 140" style={{position: 'absolute', left: x, top: y}}>
            <circle cx={90} cy={90} r={50} fill={cloud} /><circle cx={160} cy={70} r={66} fill={cloud} />
            <circle cx={230} cy={92} r={46} fill={cloud} /><rect x={90} y={90} width={140} height={46} fill={cloud} />
          </svg>
        );
      })}
    </>
  );
};

const Ground: React.FC<{mph: number; s: number}> = ({mph, s}) => {
  const c = skyAt(mph);
  const bend = (mph / 302) * 38;
  return (
    <>
      <svg width={W} height={140} style={{position: 'absolute', left: 0, top: GROUND - 120}}>
        <ellipse cx={180} cy={150} rx={360} ry={110} fill={c.grass} style={{filter: 'brightness(0.82)'}} />
        <ellipse cx={860} cy={160} rx={420} ry={120} fill={c.grass} style={{filter: 'brightness(0.9)'}} />
      </svg>
      <div style={{position: 'absolute', left: 0, top: GROUND, width: W, height: 1920 + PAN - GROUND,
        background: `linear-gradient(${c.grass} 0, ${c.grass} ${SOIL - GROUND}px, #6b4a2e ${SOIL - GROUND}px, #4a321e 100%)`}} />
      <svg width={W} height={60} style={{position: 'absolute', left: 0, top: GROUND - 34, overflow: 'visible'}}>
        {Array.from({length: 28}).map((_, i) => {
          const x = i * 40 + 6;
          const sway = bend + Math.sin(s * (3 + mph / 40) + i) * (3 + mph / 25);
          return <polygon key={i} points={`${x},40 ${x + 14},40 ${x + 7},6`} fill={c.grass}
            transform={`rotate(${sway} ${x + 7} 40)`} style={{filter: 'brightness(1.12)'}} />;
        })}
      </svg>
    </>
  );
};

const Wind: React.FC<{mph: number; s: number}> = ({mph, s}) => {
  const n = Math.min(40, 5 + Math.floor(mph / 8));
  const op = 0.14 + Math.min(0.42, mph / 520);
  return (
    <svg width={W} height={GROUND} style={{position: 'absolute', left: 0, top: 0}}>
      {Array.from({length: n}).map((_, i) => {
        const y = 90 + ((i * 137) % (GROUND - 160));
        const len = 70 + mph * 1.3;
        const x = ((s * (240 + mph * 9) + i * 331) % (W + len + 300)) - len - 150;
        return <line key={i} x1={x} y1={y} x2={x + len} y2={y + Math.sin(i) * 6} stroke="#ffffff" strokeWidth={3 + (i % 3)}
          strokeLinecap="round" opacity={op} />;
      })}
      {mph > 70 ? Array.from({length: Math.floor((mph - 70) / 9)}).map((_, i) => {
        const x = ((s * (300 + mph * 7) + i * 211) % 1500) - 200;
        const y = 820 + ((i * 97) % 480) + Math.sin(s * 9 + i) * 30;
        return <ellipse key={`d${i}`} cx={x} cy={y} rx={11} ry={5} fill={i % 2 ? '#4f8a35' : '#7a5530'}
          transform={`rotate(${s * 500 + i * 40} ${x} ${y})`} />;
      }) : null}
    </svg>
  );
};

/* ───────────── the gauge (the star) ───────────── */

const arcPath = (a: number, b: number, r: number) => {
  const [x1, y1] = pt(a, r);
  const [x2, y2] = pt(b, r);
  const large = ((b - a) / 320) * 270 > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
};

const Gauge: React.FC<{mph: number; readout: number; crack: number}> = ({mph, readout, crack}) => {
  const [, label, color] = bandAt(mph);
  const [nx, ny] = pt(mph, GR - 48);
  return (
    <svg width={W} height={760} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <circle cx={GX} cy={GY} r={GR + 14} fill="#1e2430" />
      <circle cx={GX} cy={GY} r={GR} fill="#fbfbf6" />
      {BANDS.map(([from, , col], i) => {
        const to = i + 1 < BANDS.length ? BANDS[i + 1][0] : 320;
        return <path key={i} d={arcPath(from, to, GR - 24)} stroke={col} strokeWidth={30} fill="none" />;
      })}
      {Array.from({length: 17}).map((_, i) => {
        const v = i * 20;
        const [x1, y1] = pt(v, GR - 44);
        const [x2, y2] = pt(v, GR - (i % 2 ? 58 : 70));
        const [lx, ly] = pt(v, GR - 96);
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e2430" strokeWidth={i % 2 ? 3 : 5} />
            {i % 2 === 0 ? <text x={lx} y={ly + 11} textAnchor="middle" fontFamily={heavy} fontWeight={800} fontSize={30}
              fill="#1e2430">{v}</text> : null}
          </g>
        );
      })}
      <line x1={GX} y1={GY} x2={nx} y2={ny} stroke="#e5262b" strokeWidth={12} strokeLinecap="round" />
      <circle cx={GX} cy={GY} r={24} fill="#1e2430" />
      <rect x={GX - 170} y={GY + 62} width={340} height={150} rx={22} fill="#1b2230" />
      <text x={GX} y={GY + 160} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={104} fill="#ffffff"
        style={{fontVariantNumeric: 'tabular-nums'}}>{readout}</text>
      <text x={GX} y={GY + 198} textAnchor="middle" fontFamily={heavy} fontWeight={800} fontSize={26} fill={color}
        letterSpacing={3}>{`MPH · ${label}`}</text>
      {crack > 0 ? (
        <g stroke="#ffffff" strokeWidth={4} fill="none" opacity={crack} strokeLinecap="round">
          <polyline points={`${GX + 120},${GY - 150} ${GX + 70},${GY - 90} ${GX + 96},${GY - 40} ${GX + 30},${GY + 20}`} />
          <polyline points={`${GX + 70},${GY - 90} ${GX + 10},${GY - 120} ${GX - 60},${GY - 100}`} />
          <polyline points={`${GX + 96},${GY - 40} ${GX + 180},${GY - 10} ${GX + 220},${GY + 40}`} />
          <polyline points={`${GX + 120},${GY - 150} ${GX + 160},${GY - 210}`} />
        </g>
      ) : null}
    </svg>
  );
};

/* ───────────── the contender on stage ───────────── */

const Stage: React.FC<{ep: WindEpisode; plan: ReturnType<typeof buildPlan>; s: number; frame: number; fps: number}> = ({ep, plan, s, frame, fps}) => {
  const b = contenderAt(plan, s);
  if (!b || b.index < 0) return null;
  const c = ep.contenders[b.index];
  const strain = clamp01((s - b.rampStart) / Math.max(0.01, b.landing - b.rampStart));
  const f = clamp01((s - b.fail) / EXIT);
  if (f >= 1) return null;
  const pop = spring({frame: frame - Math.round(b.enter * fps), fps, config: {damping: 11, stiffness: 160}});
  let tf = '';
  let art: React.ReactNode = null;
  if (c.fail === 'seeds') {
    art = <Dandelion sway={0.15 + strain * 0.7} seedsGone={f} t={s} />;
  } else if (c.fail === 'tumble') {
    const lean = -4 - strain * 12 + Math.sin(s * 18) * strain * 2;
    tf = f > 0 ? `translate(${f * 760}px, ${-Math.sin(f * Math.PI) * 160}px) rotate(${f * 220}deg)` : `rotate(${lean}deg)`;
    art = <Person strain={strain} t={s} />;
  } else if (c.fail === 'snap') {
    art = <Tree sway={0.2 + strain * 0.8} snap={f} t={s} />;
  } else if (c.fail === 'throw') {
    const rock = Math.sin(s * 34) * strain * 2.5;
    tf = f > 0 ? `translate(${f * 820}px, ${-f * 560 + f * f * 160}px) rotate(${f * 170}deg)` : `rotate(${rock}deg)`;
    art = <Car t={f > 0 ? s * 3 : 0} />;
  } else if (c.fail === 'sweep') {
    art = <House roofLift={clamp01(f * 1.7)} tear={clamp01((f - 0.35) / 0.65)} />;
  }
  return (
    <div style={{position: 'absolute', left: GX - STAGE / 2, top: GROUND - STAGE * 0.95, width: STAGE, height: STAGE,
      transform: `scale(${pop}) ${tf}`, transformOrigin: '50% 95%'}}>
      <ArtBox size={STAGE}>{art}</ArtBox>
    </div>
  );
};

/* ───────────── underground (the sting) ───────────── */

// Everything here sits at y >= 0 of an svg anchored at SOIL (just below the
// frame bottom), so the shelter is invisible until the camera drops.
const Shelter: React.FC<{s: number}> = ({s}) => (
  <svg width={W} height={820} style={{position: 'absolute', left: 0, top: SOIL}}>
    {[[120, 80], [880, 260], [420, 700], [960, 640], [190, 470], [700, 760]].map(([x, y], i) => (
      <ellipse key={i} cx={x} cy={y} rx={34} ry={20} fill="#3b2817" opacity={0.7} />
    ))}
    <rect x={505} y={0} width={70} height={90} fill="#6d6d74" />
    <rect x={220} y={90} width={640} height={470} rx={24} fill="#8e8e94" />
    <rect x={246} y={116} width={588} height={418} rx={12} fill="#ffe2a8" />
    <line x1={540} y1={116} x2={540} y2={150} stroke="#555" strokeWidth={4} />
    <circle cx={540} cy={160} r={22} fill="#fff4c9" style={{filter: 'drop-shadow(0 0 34px #ffe59a)'}} />
    <rect x={280} y={470} width={520} height={34} rx={8} fill="#c29a6b" />
    <g transform={`translate(330 170) scale(0.85) rotate(${Math.sin(s * 2) * 1.5} 200 380)`}>
      <Person strain={0} t={0} />
    </g>
  </svg>
);

/* ───────────── composition ───────────── */

export const WindTest: React.FC<{episode: WindEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const mph = windAt(plan, s);
  const finale = plan.beats[plan.beats.length - 1];
  const grow = clamp01((s - finale.rampStart) / Math.max(0.01, finale.landing - finale.rampStart));
  const sinceStrike = s - finale.landing;
  const flash = sinceStrike < 0 ? 0 : sinceStrike < 0.05 ? sinceStrike / 0.05 * 0.9 : Math.max(0, 0.9 * (1 - (sinceStrike - 0.05) / 0.35));
  const shake = sinceStrike > 0 && sinceStrike < 0.7 ? (1 - sinceStrike / 0.7) : 0;
  const pan = ease(clamp01((s - plan.panStart) / 0.8));
  const cap = captions(ep, timing, plan).find((c) => s >= c.start && s < c.end);
  const capPop = cap ? Math.min(1, 0.86 + (s - cap.start) * 1.4) : 1;
  const cb = contenderAt(plan, s);
  const note = s >= plan.panStart ? ep.sting.note : s >= finale.rampStart ? ep.finale.note
    : cb && cb.index >= 0 ? ep.contenders[cb.index].note : ep.title;

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: 1920 + PAN,
        transform: `translate(${Math.sin(frame * 2.1) * 16 * shake}px, ${-pan * PAN + Math.cos(frame * 2.7) * 10 * shake}px)`}}>
        <Sky mph={mph} s={s} />
        {grow > 0 ? (
          <div style={{position: 'absolute', left: 300, top: 560}}>
            <ArtBox size={700}><Tornado grow={grow} t={s} /></ArtBox>
          </div>
        ) : null}
        <Wind mph={mph} s={s} />
        <Ground mph={mph} s={s} />
        {sinceStrike > -0.01 && sinceStrike < 0.3 ? (
          <svg width={W} height={GROUND} style={{position: 'absolute', left: 0, top: 0}}>
            <polyline points="770,560 720,760 790,800 700,1040 760,1060 690,1330" fill="none" stroke="#ffffff" strokeWidth={14}
              strokeLinejoin="round" style={{filter: 'drop-shadow(0 0 24px #cfe3ff)'}} />
          </svg>
        ) : null}
        <Stage ep={ep} plan={plan} s={s} frame={frame} fps={fps} />
        <Gauge mph={mph} readout={readoutAt(plan, s)} crack={clamp01(sinceStrike * 6)} />
        <div style={{position: 'absolute', top: 748, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 800,
          fontSize: 25, letterSpacing: 2, color: '#ffffff', textShadow: '0 2px 6px rgba(0,0,0,.7)', textTransform: 'uppercase'}}>{note}</div>
        <Shelter s={s} />
      </div>
      {cap ? (
        <div style={{position: 'absolute', top: 800, left: 120, width: 820, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
          fontSize: 88, lineHeight: 1.05, color: cap.hot ? '#ffd23f' : '#ffffff', WebkitTextStroke: '11px #111',
          paintOrder: 'stroke fill', textShadow: '0 6px 0 rgba(0,0,0,.35)', transform: `scale(${capPop})`,
          textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}
      <AbsoluteFill style={{background: '#ffffff', opacity: flash, pointerEvents: 'none'}} />
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}>
          <Audio src={staticFile(ln.file)} />
        </Sequence>
      ))}
      <Audio src={staticFile('sfx/wind.wav')} volume={(f) => {
        const ss = f / FPS;
        return (0.06 + 0.5 * clamp01(windAt(plan, ss) / 302)) * (1 - 0.8 * ease(clamp01((ss - plan.panStart) / 0.8)));
      }} />
      {plan.beats.filter((b) => b.index >= 0).map((b) => {
        const kind = ep.contenders[b.index].fail;
        return (
          <React.Fragment key={b.index}>
            {b.index > 0 ? <Sequence from={Math.round(b.enter * FPS)} durationInFrames={20}><Audio src={staticFile('sfx/pop.wav')} volume={0.5} /></Sequence> : null}
            <Sequence from={Math.round(b.fail * FPS)} durationInFrames={40}>
              <Audio src={staticFile(kind === 'snap' || kind === 'sweep' ? 'sfx/crack.wav' : 'sfx/whoosh.wav')} volume={0.75} />
            </Sequence>
          </React.Fragment>
        );
      })}
      <Sequence from={Math.round(finale.landing * FPS)} durationInFrames={110}>
        <Audio src={staticFile('sfx/thunder.wav')} volume={0.9} />
      </Sequence>
    </AbsoluteFill>
  );
};
