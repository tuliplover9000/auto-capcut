import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Shock, Slam, Spark} from '../fight/Fight';
import {camAt, Shot} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {FPS, STEvent, StoryEpisode, at, buildPlan, lineAt} from '../story/timeline';
import {Asteroid, Chicken, Dinosauroid, Earth, Human, Mammoth, Shrew, TRex, Troodon, WPAL} from './art';

// WHAT IF. Same audio-first story engine (every gag pinned to a spoken word,
// whip pans between scenes), with a WHAT-IF LOG card at the top that fills in
// as the alternate timeline unfolds (asteroid -> humans -> who's in charge).
// Ends by zooming into the dinosauroid's phone, which is showing frame 0: a loop.
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const TYPE = '"Courier New", Courier, monospace';

const W = 1080;
const GROUND = 1490;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const win = (s: number, t0: number, dur: number) => s >= t0 && s < t0 + dur;
const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const pop = (s: number, t0: number, d = 0.35) => (s < t0 ? 0 : 1 + 0.25 * Math.sin(clamp01((s - t0) / d) * Math.PI) * (1 - clamp01((s - t0) / d)));
const sp = (s: number, t0: number, damping = 10, stiffness = 140) => (s < t0 ? 0 : spring({frame: Math.round((s - t0) * FPS), fps: FPS, config: {damping, stiffness}}));

/* an art box positioned by its feet: x = centre, y = ground line; vw x vh = the art's viewBox */
const Box: React.FC<{x: number; y: number; w: number; vw: number; vh: number; flip?: boolean; rot?: number; op?: number; filter?: string; children: React.ReactNode}> =
  ({x, y, w, vw, vh, flip, rot = 0, op = 1, filter, children}) => {
  const h = (w * vh) / vw;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${vw} ${vh}`} style={{position: 'absolute', left: x - w / 2, top: y - h, overflow: 'visible', opacity: op, filter,
      transform: `rotate(${rot}deg) scaleX(${flip ? -1 : 1})`, transformOrigin: '50% 100%'}}>{children}</svg>
  );
};

const Ground: React.FC<{top: string; bot: string; lip: string}> = ({top, bot, lip}) => (
  <>
    <div style={{position: 'absolute', left: 0, top: GROUND, width: W, height: 1920 - GROUND, background: `linear-gradient(${top}, ${bot})`}} />
    <div style={{position: 'absolute', left: 0, top: GROUND - 14, width: W, height: 28, borderRadius: 14, background: lip}} />
  </>
);

type Ctx = {s: number; frame: number; T: (k: string) => number; ev: STEvent[]};

/* ───────────── shared sets ───────────── */
const Stars: React.FC<{s: number}> = ({s}) => (
  <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
    {Array.from({length: 90}).map((_, i) => (
      <circle key={i} cx={rnd(i) * W} cy={rnd(i + 99) * 1920} r={1.5 + rnd(i + 7) * 3} fill="#fff" opacity={0.35 + 0.65 * Math.abs(Math.sin(s * 1.5 + i))} />
    ))}
  </svg>
);

// the asteroid's straight run at the Earth (frame 0 starts a quarter of the way in)
const ROCK0: [number, number] = [1150, -150];
const EARTH_C: [number, number] = [540, 1150];
const rockAt = (s: number, tHit: number): [number, number] => {
  const u = 0.35 + 0.65 * (s / tHit);
  return [lerp(ROCK0[0], EARTH_C[0], u), lerp(ROCK0[1], EARTH_C[1], u)];
};
const ROCK_ROT = -17; // trail art points up-right at -48deg; the run comes from -65deg

/* SPACE (also drawn, frozen at s=0, inside the phone at the end -> the loop) */
const SpaceSet: React.FC<{s: number; tM: number}> = ({s, tM}) => {
  const tHit = tM + 0.15;
  const dodge = s < tM - 0.1 ? 0 : ease(clamp01((s - tM + 0.1) / 0.35));
  const squash = s >= tM - 0.1 && s < tM + 0.4 ? Math.sin(clamp01((s - tM + 0.1) / 0.5) * Math.PI) * 0.12 : 0;
  const [rx, ry] = rockAt(s, tHit);
  const scale = lerp(0.8, 1.5, clamp01(s / tHit));
  const face = s < tM - 0.1 ? 'shock' : s < tM + 0.5 ? 'hurt' : 'smug';
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, #1d2a5a, #070a1c 70%)'}} />
      <Stars s={s} />
      <svg width={640} height={640} viewBox="0 0 400 400" style={{position: 'absolute', left: EARTH_C[0] - 320 + dodge * 210, top: EARTH_C[1] - 320, overflow: 'visible',
        transform: `scale(${1 + squash}, ${1 - squash}) rotate(${dodge * 14}deg)`}}>
        <Earth face={face} t={s} />
      </svg>
      <svg width={10} height={10} style={{position: 'absolute', left: rx, top: ry, overflow: 'visible'}}>
        <g transform={`scale(${scale}) rotate(${ROCK_ROT})`}><Asteroid t={s} /></g>
      </svg>
    </>
  );
};
const Space: React.FC<Ctx> = ({s, T}) => <SpaceSet s={s} tM={T('miss')} />;

/* the living room: the human's in YOU, the dinosauroid's in TODAY */
const Room: React.FC<{s: number; alt: boolean; children: React.ReactNode}> = ({s, alt, children}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: alt ? 'linear-gradient(#d8ecc4, #c2dca8)' : 'linear-gradient(#f3e2c4, #e8d2ac)'}} />
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      {/* window */}
      <rect x={690} y={640} width={300} height={290} rx={10} fill={alt ? '#ffcf8a' : '#9fd8ff'} />
      {alt ? <path d="M 690 880 L 760 800 L 820 850 L 900 760 L 990 860 L 990 930 L 690 930 Z" fill="#7aa86a" /> : <circle cx={920} cy={720} r={36} fill="#fff1c9" />}
      <rect x={690} y={640} width={300} height={290} rx={10} fill="none" stroke="#fff" strokeWidth={18} />
      <line x1={840} y1={640} x2={840} y2={930} stroke="#fff" strokeWidth={12} />
      <rect x={670} y={926} width={340} height={22} rx={6} fill="#fff" />
      {/* picture frame */}
      <rect x={120} y={660} width={250} height={210} rx={8} fill={alt ? '#8a5a2a' : '#5a3a24'} />
      <rect x={140} y={680} width={210} height={170} fill={alt ? '#ffe7bd' : '#bfe0f0'} />
    </svg>
    {alt ? (
      <>
        {/* GRANDPA: a T. rex portrait on the dinosauroids' wall */}
        <svg width={210} height={170} viewBox="470 70 330 270" style={{position: 'absolute', left: 140, top: 680}}><TRex face="smug" t={0} /></svg>
        <div style={{position: 'absolute', left: 150, top: 880, width: 190, textAlign: 'center', fontFamily: TYPE, fontWeight: 900, fontSize: 26, color: '#5a3a24'}}>GRANDPA</div>
        {/* hidden gag: a chicken on the sill. birds ARE dinosaurs. */}
        <Box x={940} y={932} w={120} vw={400} vh={400}><Chicken t={s} /></Box>
      </>
    ) : (
      <svg width={210} height={170} style={{position: 'absolute', left: 140, top: 680}}>
        <circle cx={80} cy={84} r={30} fill={WPAL.skin} /><rect x={50} y={116} width={60} height={60} rx={20} fill="#ff4f7b" />
        <circle cx={140} cy={92} r={26} fill="#e2b48c" /><rect x={114} y={120} width={52} height={56} rx={18} fill="#7be07b" />
      </svg>
    )}
    <Ground top={alt ? '#9a7a50' : '#b08a5c'} bot={alt ? '#7a5a34' : '#8a6a42'} lip={alt ? '#ac8c5e' : '#c49c6a'} />
    {/* couch (behind the sitter) */}
    <div style={{position: 'absolute', left: 190, top: GROUND - 440, width: 700, height: 300, borderRadius: 60, background: alt ? '#7a4ab0' : '#c8504a'}} />
    <div style={{position: 'absolute', left: 230, top: GROUND - 196, width: 620, height: 110, borderRadius: 30, background: alt ? '#8e5cc6' : '#dc6a62'}} />
    <div style={{position: 'absolute', left: 150, top: GROUND - 300, width: 110, height: 260, borderRadius: 50, background: alt ? '#6a3a9a' : '#b04440'}} />
    <div style={{position: 'absolute', left: 820, top: GROUND - 300, width: 110, height: 260, borderRadius: 50, background: alt ? '#6a3a9a' : '#b04440'}} />
    <div style={{position: 'absolute', left: 240, top: GROUND - 90, width: 600, height: 90, background: '#3a2a1a', borderRadius: 10}} />
    {children}
  </>
);

const You: React.FC<Ctx> = ({s, T}) => {
  const tP = T('poof');
  const gone = s >= tP;
  return (
    <Room s={s} alt={false}>
      {!gone ? <Box x={520} y={GROUND + 10} w={380} vw={400} vh={700}><Human face={s >= tP - 0.4 ? 'shock' : 'happy'} t={s} rig={{phone: 1, sit: 1}} /></Box> : null}
      {gone && s < tP + 0.7 ? Array.from({length: 9}).map((_, k) => {
        const d = (s - tP) / 0.7;
        const a = (k / 9) * Math.PI * 2;
        return <div key={k} style={{position: 'absolute', left: 500 + Math.cos(a) * d * 230 - 80, top: GROUND - 380 + Math.sin(a) * d * 200 - 80, width: 160, height: 160,
          borderRadius: '50%', background: '#f4f1ea', opacity: 0.9 * (1 - d), transform: `scale(${0.5 + d})`}} />;
      }) : null}
      {gone ? (
        <svg width={120} height={60} style={{position: 'absolute', left: 520, top: GROUND - 228, overflow: 'visible', transform: `rotate(${-80 + 70 * clamp01((s - tP) / 0.3)}deg)`}}>
          <rect x={0} y={0} width={92} height={50} rx={10} fill={WPAL.ink} /><rect x={8} y={7} width={76} height={36} rx={5} fill="#7fd0ff" opacity={0.7} />
        </svg>
      ) : null}
    </Room>
  );
};

/* the Cretaceous jungle (tint = the alternate timeline) */
const JungleSet: React.FC<{s: number; tint?: boolean}> = ({s, tint}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: tint ? 'linear-gradient(#b48aff, #ffd9b8 62%)' : 'linear-gradient(#ffb36b, #ffeccc 62%)'}} />
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <path d={`M 620 ${GROUND - 200} L 820 760 L 880 760 L 1080 ${GROUND - 260} L 1080 ${GROUND} L 620 ${GROUND} Z`} fill={tint ? '#8a6aa0' : '#a0705a'} />
      <path d="M 820 760 L 850 800 L 880 760 Z" fill="#ff6a2a" />
      {[0, 1, 2, 3].map((j) => <circle key={j} cx={850 + Math.sin(s + j) * 24} cy={720 - j * 70 - ((s * 40) % 70)} r={36 + j * 14} fill="#8a7a84" opacity={0.5} />)}
      <ellipse cx={300} cy={GROUND - 40} rx={700} ry={260} fill={tint ? '#6aa06a' : '#7ab86a'} />
      {[90, 470, 980].map((x, i) => (
        <g key={x}>
          <rect x={x - 16} y={GROUND - 520 + i * 40} width={32} height={520 - i * 40} rx={12} fill="#6a4a2a" />
          {[0, 1, 2, 3, 4, 5].map((k) => {
            const a = -150 + k * 24 + Math.sin(s * 1.5 + k + i) * 3;
            return <ellipse key={k} cx={x + Math.cos((a * Math.PI) / 180) * 110} cy={GROUND - 520 + i * 40 + Math.sin((a * Math.PI) / 180) * 110} rx={120} ry={26}
              transform={`rotate(${a} ${x + Math.cos((a * Math.PI) / 180) * 110} ${GROUND - 520 + i * 40 + Math.sin((a * Math.PI) / 180) * 110})`} fill={k % 2 ? '#3f9a40' : '#4fb04a'} />;
          })}
        </g>
      ))}
    </svg>
  </>
);
const Fern: React.FC<{x: number; s: number; flip?: boolean}> = ({x, s, flip}) => (
  <svg width={300} height={260} style={{position: 'absolute', left: x - 150, top: GROUND - 240, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined}}>
    {[0, 1, 2, 3, 4].map((k) => <path key={k} d={`M 150 250 Q ${60 + k * 45} ${60 + Math.abs(k - 2) * 40 + Math.sin(s * 2 + k) * 6} ${20 + k * 65} ${90 + Math.abs(k - 2) * 50}`}
      fill="none" stroke={k % 2 ? '#2f8a3a' : '#3fa04a'} strokeWidth={26} strokeLinecap="round" />)}
  </svg>
);
// a burrow: everything inside is clipped at the ground, so the shrew can pop up
const Burrow: React.FC<{x: number; up: number; children: React.ReactNode}> = ({x, up, children}) => (
  <>
    <div style={{position: 'absolute', left: x - 120, top: GROUND - 36, width: 240, height: 60, borderRadius: '50%', background: '#5a3a24'}} />
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: GROUND + 4, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: (1 - up) * 230, width: W, height: 1920}}>{children}</div>
    </div>
    <div style={{position: 'absolute', left: x - 140, top: GROUND - 6, width: 280, height: 40, borderRadius: '50%', background: '#8a6a42'}} />
  </>
);

const Jungle: React.FC<Ctx> = ({s, T}) => {
  const tS = T('shrew');
  const tK = T('stomp');
  const enter = ease(clamp01((s - (tK - 1.3)) / 1.2));
  const rexX = lerp(1500, 820, enter);
  const stompK = s < tK - 0.25 ? 0 : s < tK ? (s - tK + 0.25) / 0.25 : 0;
  const stomp = s < tK - 0.25 ? 0 : s < tK ? Math.sin(stompK * Math.PI * 0.5) * (1 - stompK) * 2 : 0;
  const up = s < tS ? clamp01((s - tS + 0.6) / 0.6) * 0.35 : s < tK + 0.05 ? sp(s, tS, 8, 160) : 1 - clamp01((s - tK - 0.05) / 0.12);
  return (
    <>
      <JungleSet s={s} />
      <Ground top="#8a6a42" bot="#6a4a2a" lip="#9c7c50" />
      <Burrow x={280} up={up}><Box x={290} y={GROUND + 10} w={240} vw={400} vh={400}><Shrew face={s >= tK - 0.1 ? 'shock' : s >= tS ? 'happy' : 'smug'} t={s} /></Box></Burrow>
      {enter > 0 ? <Box x={rexX} y={GROUND + 20} w={900} vw={800} vh={600} flip><TRex face="angry" t={s} walk={enter < 1 ? s * 1.4 : 0} stomp={stomp} /></Box> : null}
      {s >= tK && s < tK + 0.5 ? <Shock x={700} y={GROUND - 20} k={(s - tK) / 0.5} color="#ffd23f" /> : null}
      <Fern x={60} s={s} />
      <Fern x={1040} s={s} flip />
    </>
  );
};

const Real: React.FC<Ctx> = ({s, T, ev}) => {
  const tC = T('clear');
  const tG = T('grow');
  const t0 = ev.find((e) => e.kind === 'clear')!.t - 1.6;
  const fall = clamp01((s - t0) / (tC - t0));
  const flash = s >= tC ? Math.max(0, 1 - (s - tC) / 0.7) : 0;
  const after = clamp01((s - tC - 0.3) / 0.8);
  const shrewUp = sp(s, tC + 0.9, 9, 140);
  const lineup = [
    {x: 150, d: 0},
    {x: 360, d: 0.1},
    {x: 650, d: 0.2},
    {x: 940, d: 0.3},
  ];
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#ffb36b, #ffeccc 62%)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#6fb8ff, #e2f4ff 62%)', opacity: after}} />
      {s < tC + 1.2 ? (
        <div style={{position: 'absolute', left: 540 - 600 * clamp01((s - tC) / 1.2), top: GROUND - 300 - 600 * clamp01((s - tC) / 1.2), width: 1200 * clamp01((s - tC) / 1.2) + 0.1,
          height: 1200 * clamp01((s - tC) / 1.2) + 0.1, borderRadius: '50%', background: 'radial-gradient(#ffd23f, #ff6a2a 60%, transparent 70%)', opacity: s >= tC ? 1 - clamp01((s - tC - 0.4) / 0.8) : 0}} />
      ) : null}
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <ellipse cx={540} cy={GROUND - 40} rx={900} ry={260} fill={after > 0.5 ? '#7cc46a' : '#a0705a'} />
      </svg>
      {s < tC ? (
        <svg width={10} height={10} style={{position: 'absolute', left: lerp(1100, 560, fall), top: lerp(300, GROUND - 260, fall), overflow: 'visible'}}>
          <g transform={`scale(${lerp(0.5, 0.9, fall)}) rotate(${ROCK_ROT})`}><Asteroid t={s} /></g>
        </svg>
      ) : null}
      {s < tC ? <Box x={300} y={GROUND + 20} w={700} vw={800} vh={600} flip filter="brightness(0.25)"><TRex face="shock" t={s} jaw={0.6} look={-1} /></Box> : null}
      <Ground top={after > 0.5 ? '#6aa85a' : '#6a4a3a'} bot={after > 0.5 ? '#4f8a44' : '#4a3428'} lip={after > 0.5 ? '#86c070' : '#7a5a46'} />
      {s >= tC + 0.9 && s < tG ? (
        <Burrow x={540} up={shrewUp}><Box x={550} y={GROUND + 10} w={240} vw={400} vh={400}><Shrew face="happy" t={s} /></Box></Burrow>
      ) : null}
      {s >= tG ? lineup.map((m, i) => {
        const k = sp(s, tG + m.d, 9, 150);
        const sc = 0.3 + 0.7 * k;
        return (
          <div key={i} style={{position: 'absolute', left: 0, top: 0, width: W, height: 1920, transform: `scale(${sc})`, transformOrigin: `${m.x}px ${GROUND}px`, opacity: clamp01(k * 3)}}>
            {i === 0 ? <Box x={m.x} y={GROUND + 10} w={170} vw={400} vh={400}><Shrew face="happy" t={s} /></Box> : null}
            {i === 1 ? <Box x={m.x} y={GROUND + 10} w={320} vw={400} vh={400}><Shrew face="happy" t={s} fur="#b08a5a" furDark="#8a6a3e" belly="#e8d0a8" snout={0.4} /></Box> : null}
            {i === 2 ? <Box x={m.x} y={GROUND + 14} w={420} vw={600} vh={500}><Mammoth face="happy" t={s} /></Box> : null}
            {i === 3 ? <Box x={m.x} y={GROUND + 10} w={300} vw={400} vh={700}><Human face="happy" t={s} rig={{wave: 1}} /></Box> : null}
          </div>
        );
      }) : null}
      {s >= tG && s < tG + 0.6 ? <Spark x={660} y={GROUND - 520} k={(s - tG) / 0.6} color="#ffd23f" /> : null}
      <AbsoluteFill style={{background: '#fff8e0', opacity: flash}} />
    </>
  );
};

const Alt: React.FC<Ctx> = ({s, T}) => {
  const tA = T('alt');
  const tS = T('stay');
  const zip = clamp01((s - tA + 0.3) / 0.9);
  const roar = win(s, tA + 0.9, 1.1) ? Math.sin(clamp01((s - tA - 0.9) / 1.1) * Math.PI) : 0;
  return (
    <>
      <JungleSet s={s} tint />
      {zip > 0 && zip < 1 ? (
        <svg width={10} height={10} style={{position: 'absolute', left: lerp(-200, 1300, zip), top: lerp(380, 300, zip), overflow: 'visible'}}>
          <g transform="scale(0.45) rotate(-130)"><Asteroid t={s} /></g>
        </svg>
      ) : null}
      <Ground top="#8a6a42" bot="#6a4a2a" lip="#9c7c50" />
      <Box x={700} y={GROUND + 20} w={980} vw={800} vh={600} flip><TRex face={roar > 0.2 ? 'angry' : 'smug'} t={s} jaw={roar} /></Box>
      <Box x={230} y={GROUND + 10} w={130} vw={400} vh={400}><Shrew face={s >= tS ? 'sad' : 'shock'} t={s} /></Box>
      {s >= tS ? (
        <div style={{position: 'absolute', left: 160, top: GROUND - 210, padding: '6px 14px', background: WPAL.white, borderRadius: 10, fontFamily: heavy, fontWeight: 900, fontSize: 30,
          color: '#d6293a', whiteSpace: 'nowrap', transform: `rotate(-6deg) scale(${pop(s, tS)})`, boxShadow: '0 6px 0 rgba(0,0,0,.25)'}}>STILL TINY</div>
      ) : null}
      <Fern x={60} s={s} />
    </>
  );
};

const TroodonScene: React.FC<Ctx> = ({s, T}) => {
  const tW = T('twist');
  const tS = T('smart');
  const glow = s >= tS ? clamp01((s - tS) / 0.25) : 0;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#2f4a6a, #7ab89a 70%)'}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {[120, 330, 800, 990].map((x, i) => <rect key={x} x={x - 30} y={500} width={60} height={GROUND - 500} fill={i % 2 ? '#2a4a3a' : '#355a44'} />)}
        <ellipse cx={540} cy={GROUND - 30} rx={800} ry={200} fill="#4a7a5a" />
      </svg>
      <Ground top="#4a6a3a" bot="#33502a" lip="#5a7a46" />
      <Box x={520} y={GROUND + 20} w={760} vw={600} vh={500}><Troodon face={s >= tS ? 'smug' : s >= tW ? 'shock' : 'happy'} t={s} /></Box>
      {glow > 0 ? (
        <svg width={300} height={300} style={{position: 'absolute', left: 563, top: 740, overflow: 'visible', transform: `scale(${pop(s, tS) * glow})`}}>
          {Array.from({length: 10}).map((_, k) => {
            const a = (k / 10) * Math.PI * 2 + s;
            return <line key={k} x1={150 + Math.cos(a) * 90} y1={130 + Math.sin(a) * 90} x2={150 + Math.cos(a) * 130} y2={130 + Math.sin(a) * 130} stroke="#ffd23f" strokeWidth={10} strokeLinecap="round" />;
          })}
          <circle cx={150} cy={120} r={66} fill="#ffe680" />
          <rect x={120} y={176} width={60} height={46} rx={8} fill="#9aa0aa" />
          <path d="M 126 120 Q 150 80 174 120" fill="none" stroke="#e0a020" strokeWidth={8} />
        </svg>
      ) : null}
      {s >= tS && s < tS + 0.6 ? <Spark x={720} y={860} k={(s - tS) / 0.6} color="#ffd23f" /> : null}
    </>
  );
};

const Lab: React.FC<Ctx> = ({s, T}) => {
  const tI = T('imagine');
  const tU = T('unveil');
  const tN = T('name');
  const fly = clamp01((s - tU) / 0.6);
  const alive = s >= tN;
  const bubble = s >= tI && s < tU ? pop(s, tI) : 0;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#8a6440, #6e4e30)'}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {Array.from({length: 9}).map((_, k) => <rect key={k} x={k * 124} y={0} width={6} height={1920} fill="#5e4228" />)}
        <rect x={520} y={620} width={500} height={330} rx={10} fill="#2f4a3a" stroke="#a8743f" strokeWidth={14} />
        <text x={560} y={700} fontFamily={TYPE} fontWeight={900} fontSize={44} fill="#e8f0e0" opacity={0.85}>BRAIN / BODY</text>
        <path d="M 570 900 L 650 860 L 730 830 L 810 760 L 900 690" fill="none" stroke="#e8f0e0" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
        <path d="M 880 680 l 26 6 l -14 22" fill="none" stroke="#e8f0e0" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
        <rect x={110} y={640} width={190} height={150} rx={6} fill="#f4f1ea" />
        <rect x={110} y={640} width={190} height={40} fill="#d6293a" />
        <text x={205} y={762} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={64} fill="#1b1b22">1982</text>
      </svg>
      <Ground top="#5a4a3a" bot="#3e3228" lip="#6e5a46" />
      {/* plinth + statue */}
      <div style={{position: 'absolute', left: 620, top: GROUND - 150, width: 260, height: 150, background: '#d8d2c4', borderRadius: 8}} />
      <div style={{position: 'absolute', left: 600, top: GROUND - 170, width: 300, height: 34, background: '#e8e2d4', borderRadius: 8}} />
      {s >= tU ? (
        <Box x={750} y={GROUND - 160} w={380} vw={400} vh={700}>
          <Dinosauroid face={alive ? 'happy' : 'smug'} t={s} statue={!alive} rig={{wave: alive ? clamp01((s - tN) / 0.3) : 0}} look={-1} />
        </Box>
      ) : null}
      {fly < 1 ? (
        <svg width={420} height={700} style={{position: 'absolute', left: 540 + fly * 500, top: GROUND - 840 - fly * 700, overflow: 'visible', transform: `rotate(${fly * 50}deg)`, opacity: 1 - fly * 0.6}}>
          <path d="M 60 680 Q 30 300 140 120 Q 210 20 290 120 Q 400 300 370 680 Q 300 650 215 680 Q 130 650 60 680 Z" fill="#f4f1ea" />
          <path d="M 140 300 Q 160 500 130 660 M 290 300 Q 270 500 300 660" fill="none" stroke="#d4cfc2" strokeWidth={10} />
        </svg>
      ) : null}
      <Box x={260} y={GROUND + 10} w={360} vw={400} vh={700}><Human face={alive ? 'shock' : 'happy'} t={s} coat glasses rig={{wave: s >= tU - 0.2 && s < tN ? 1 : 0}} /></Box>
      {bubble > 0 ? (
        <>
          {[0, 1].map((k) => <div key={k} style={{position: 'absolute', left: 330 + k * 40, top: 1080 - k * 40, width: 30 + k * 16, height: 30 + k * 16, borderRadius: '50%', background: '#fff'}} />)}
          <div style={{position: 'absolute', left: 360, top: 790, width: 380, height: 240, borderRadius: 130, background: '#fff', transform: `scale(${bubble})`, transformOrigin: '20% 100%', boxShadow: '0 8px 0 rgba(0,0,0,.2)'}}>
            <svg width={240} height={200} viewBox="0 0 600 500" style={{position: 'absolute', left: 20, top: 40}}><Troodon face="smug" t={s} /></svg>
            <div style={{position: 'absolute', left: 250, top: 50, fontFamily: heavy, fontWeight: 900, fontSize: 130, color: '#d6293a'}}>?</div>
          </div>
        </>
      ) : null}
      {alive && s < tN + 0.6 ? <Spark x={760} y={GROUND - 560} k={(s - tN) / 0.6} color="#ffd23f" /> : null}
    </>
  );
};

/* where the dinosauroid's phone sits in world coords (Box w 380 at x 520): used for the loop zoom */
const ROID = {x: 520, w: 380};
const PHONE_W = {x: ROID.x - ROID.w / 2 + 290 * (ROID.w / 400), y: GROUND + 10 - ROID.w * 1.75 + 318 * (ROID.w / 400)};

const Today: React.FC<Ctx> = ({s, T}) => {
  const tSt = T('sting');
  return (
    <Room s={s} alt>
      <Box x={ROID.x} y={GROUND + 10} w={ROID.w} vw={400} vh={700}>
        <Dinosauroid face={s >= tSt ? 'smug' : 'happy'} t={s} rig={{phone: 1, sit: 1}} look={s >= tSt ? 0 : 1} />
      </Box>
      {s >= T('scroll') && s < tSt ? Array.from({length: 3}).map((_, k) => (
        <div key={k} style={{position: 'absolute', left: PHONE_W.x - 70, top: PHONE_W.y - 90 - (((s * 2 + k / 3) % 1) * 60), width: 20, height: 6, borderRadius: 3, background: '#fff', opacity: 0.8}} />
      )) : null}
    </Room>
  );
};

const SCENES: Record<string, React.FC<Ctx>> = {space: Space, you: You, jungle: Jungle, real: Real, alt: Alt, troodon: TroodonScene, lab: Lab, today: Today};

/* ───────────── the WHAT-IF LOG card (progress bar) ───────────── */
const Card: React.FC<{s: number; T: (k: string) => number; chapter: string}> = ({s, T, chapter}) => {
  const typed = (txt: string, t0: number) => (s < t0 ? '' : txt.slice(0, Math.ceil(clamp01((s - t0) / 0.45) * txt.length)));
  const tM = T('miss');
  const tP = T('poof');
  const tA = T('alt');
  const tN = T('name');
  const field = (label: string, val: React.ReactNode, top: number) => (
    <div style={{position: 'absolute', left: 170, top, fontFamily: TYPE, fontWeight: 900, fontSize: 33, color: '#1e2a44', whiteSpace: 'nowrap'}}>
      <span style={{opacity: 0.6}}>{label}</span> {val}
    </div>
  );
  return (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 196, background: '#e6eefc', borderRadius: 12, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 840, height: 46, background: '#2a2f6a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box'}}>
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: '#e6eefc'}}>WHAT-IF LOG</span>
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 2, color: '#ffd23f'}}>{chapter}</span>
      </div>
      <div style={{position: 'absolute', left: 18, top: 58, width: 130, height: 126, background: '#0e1430', borderRadius: 6, overflow: 'hidden'}}>
        <svg width={130} height={126} viewBox="-10 -10 420 420"><Earth face={s >= tP ? 'smug' : 'shock'} t={s} /></svg>
      </div>
      {field('ASTEROID:', <span style={{color: s >= tM ? '#1e8a3a' : undefined}}>{s < tM ? '???' : typed('MISSED', tM)}</span>, 62)}
      {field('HUMANS:', <span style={{color: s >= tP ? '#d6293a' : undefined}}>{s < tP ? '???' : typed('NEVER BORN', tP)}</span>, 102)}
      {field('IN CHARGE:', s < tA ? <span>???</span> : (
        <>
          <span style={{textDecoration: s >= tN ? 'line-through' : 'none', opacity: s >= tN ? 0.45 : 1}}>{typed(s >= tN ? 'DINOS' : 'DINOSAURS', tA)}</span>
          {s >= tN ? <span style={{color: '#7a3ac0', marginLeft: 14, display: 'inline-block', transform: `scale(${pop(s, tN)})`}}>DINOSAUROIDS?</span> : null}
        </>
      ), 142)}
    </div>
  );
};

/* ───────────── composition ───────────── */
export const WhatIf: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const T = (k: string) => at(plan, k);
  const li = lineAt(plan, s);
  const ctx: Ctx = {s, frame, T, ev: plan.events};
  const tSting = T('sting');
  const zoomT0 = tSting + 1.05;

  // ── director
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 1100, z: 1, r: 0, ...c});
  shot(0, 0.01, {z: 1.0, y: 1150});
  shot(0.05, 1.9, {z: 1.12, y: 1150, x: 600});
  plan.cuts.forEach((c) => {
    const base: Record<string, Partial<Shot>> = {
      you: {z: 1.12, y: 1180, x: 530}, jungle: {z: 1.0, y: 1100}, real: {z: 1.0, y: 1100}, alt: {z: 1.0, y: 1100},
      troodon: {z: 1.05, y: 1150}, lab: {z: 1.0, y: 1120}, today: {z: 1.08, y: 1170, x: 540},
    };
    shot(c.t, 0.01, base[c.to] ?? {});
  });
  for (const e of plan.events) {
    switch (e.kind) {
      case 'miss': shot(e.t - 0.15, 0.25, {x: 700, y: 1150, z: 1.0, r: 4}); break;
      case 'poof': shot(e.t, 0.2, {x: 520, y: 1220, z: 1.3}); break;
      case 'shrew': shot(e.t - 0.1, 0.3, {x: 300, y: GROUND - 150, z: 2.0, r: -3}); break;
      case 'stomp': shot(e.t - 1.0, 0.6, {x: 560, y: 1150, z: 1.0}); shot(e.t, 0.1, {x: 520, y: 1180, z: 1.1, r: 3}); break;
      case 'clear': shot(e.t - 1.6, 1.4, {x: 500, y: 1150, z: 1.1}); shot(e.t, 0.1, {x: 540, y: 1100, z: 1.0}); break;
      case 'grow': shot(e.t, 0.35, {x: 560, y: 1230, z: 0.98}); break;
      case 'alt': shot(e.t - 0.2, 0.3, {x: 560, y: 1000, z: 1.1, r: -2}); shot(e.t + 0.9, 0.5, {x: 640, y: 1120, z: 1.05}); break;
      case 'stay': shot(e.t, 0.3, {x: 240, y: GROUND - 110, z: 2.3, r: 3}); break;
      case 'twist': shot(e.t, 0.12, {x: 620, y: 1050, z: 1.3, r: 6}); break;
      case 'smart': shot(e.t, 0.3, {x: 660, y: 960, z: 1.25, r: 0}); break;
      case 'imagine': shot(e.t, 0.4, {x: 480, y: 1020, z: 1.05}); break;
      case 'unveil': shot(e.t, 0.3, {x: 720, y: 1120, z: 1.2}); break;
      case 'name': shot(e.t, 0.2, {x: 740, y: 1080, z: 1.45, r: -3}); break;
      case 'scroll': shot(e.t, 0.5, {x: 580, y: 1090, z: 1.55, r: 2}); break;
      case 'sting': shot(e.t, 0.25, {x: 540, y: 1040, z: 1.6, r: 0}); shot(zoomT0 - 0.2, 0.6, {x: PHONE_W.x, y: PHONE_W.y, z: 2.2, r: 0}); break;
      default: break;
    }
  }
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const kick = (k: string, amp: number, decay: number) => (s >= T(k) ? amp * Math.exp(-(s - T(k)) * decay) : 0);
  const shake = kick('stomp', 20, 6) + kick('clear', 22, 4) + kick('miss', 8, 6) + kick('twist', 9, 8) + kick('name', 8, 8) + kick('poof', 6, 8);
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + Math.sin(frame * 2.3) * shake}px, ${960 - cam.y + Math.cos(frame * 2.9) * shake}px) rotate(${cam.r}deg) scale(${cam.z})`};

  // ── whip pans between scenes
  const cut = plan.cuts.find((c) => s >= c.t - 0.14 && s < c.t + 0.14);
  const scene = (name: string, dx: number, blur: number) => {
    const Sc = SCENES[name];
    return (
      <div key={name + dx} style={{position: 'absolute', inset: 0, transform: `translateX(${dx}px)`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined}}>
        <div style={camStyle}><Sc {...ctx} /></div>
      </div>
    );
  };
  let world: React.ReactNode;
  if (cut) {
    const k = ease((s - (cut.t - 0.14)) / 0.28);
    world = [scene(cut.from, -W * k, 14 * Math.sin(k * Math.PI)), scene(cut.to, W * (1 - k), 14 * Math.sin(k * Math.PI))];
  } else {
    world = scene(ep.lines[li].scene, 0, 0);
  }

  // ── the loop: the phone screen (showing frame 0) grows to fill the frame
  const zk = ease(clamp01((s - zoomT0) / 0.5));
  let loop: React.ReactNode = null;
  if (s >= zoomT0) {
    const px = 540 + (PHONE_W.x - cam.x) * cam.z;
    const py = 960 + (PHONE_W.y - cam.y) * cam.z;
    const pw = 38 * cam.z;
    const ph = 72 * cam.z;
    const w = lerp(pw, W, zk);
    const h = lerp(ph, 1920, zk);
    loop = (
      <div style={{position: 'absolute', left: lerp(px - pw / 2, 0, zk), top: lerp(py - ph / 2, 0, zk), width: w, height: h, overflow: 'hidden', borderRadius: lerp(8, 0, zk),
        transform: `rotate(${lerp(-12, 0, zk)}deg)`}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: W, height: 1920, transform: `scale(${w / W}, ${h / 1920})`, transformOrigin: '0 0'}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: W, height: 2110, background: '#070a1c', transform: 'translate(0px, -190px)'}}><SpaceSet s={s - plan.end} tM={T('miss')} /></div>
        </div>
      </div>
    );
  }

  // ── captions (2-word chunks), notes, slams
  const caps = captions(ep as unknown as FightEpisode, timing, {lineStarts: plan.lineStarts, lineEnds: plan.lineEnds, events: [], hits: [], end: plan.end});
  const capIdx = caps.findIndex((c) => s >= c.start && s < c.end);
  const cap = capIdx >= 0 ? caps[capIdx] : null;
  let capSize = 0;
  let capWrap = false;
  if (cap) {
    const one = 820 / (cap.text.length * 0.78);
    const longest = Math.max(...cap.text.split(' ').map((w) => w.length));
    capWrap = one < 100 && cap.n > 1;
    capSize = Math.min(cap.hot ? 140 : 120, capWrap ? 820 / (longest * 0.78) : one);
  }
  const capPop = cap ? 0.55 + 0.45 * spring({frame: frame - Math.round(cap.start * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;
  const line = ep.lines[li];
  const slam = (() => {
    const e = plan.events.find((x) => x.kind === 'name' && win(s, x.t, 1.3));
    if (!e) return null;
    return <Slam k={(s - e.t) / 1.3} text={e.text ?? ''} color="#7be07b" size={128} top={880} />;
  })();
  const hideUi = zk > 0.3;

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      {world}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 55%, transparent 58%, rgba(0,0,0,.28) 100%)'}} />
      {loop}
      {slam}
      {!hideUi ? <Card s={s} T={T} chapter={line.chapter} /> : null}
      {line.note && !hideUi ? (
        <div style={{position: 'absolute', top: 446, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 800, fontSize: 25, letterSpacing: 1.2,
          color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.9)', textTransform: 'uppercase'}}>{line.note}</div>
      ) : null}
      {cap && !hideUi ? (
        <div style={{position: 'absolute', top: 520, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
          fontSize: capSize, lineHeight: 1.0, color: cap.hot ? '#ffd23f' : '#ffffff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`,
          paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: capWrap ? 'normal' : 'nowrap',
          transform: `scale(${capPop}) rotate(${capIdx % 2 ? 2 : -2}deg)`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}

      {/* audio */}
      <Audio src={staticFile(`music/${ep.id}.wav`)} volume={0.55} />
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}><Audio src={staticFile(ln.file)} /></Sequence>
      ))}
      {plan.cuts.map((c, i) => (
        <Sequence key={`c${i}`} from={Math.max(0, Math.round((c.t - 0.14) * FPS))} durationInFrames={30}><Audio src={staticFile('sfx/whoosh.wav')} volume={0.5} /></Sequence>
      ))}
      <Sequence from={Math.round(zoomT0 * FPS)} durationInFrames={30}><Audio src={staticFile('sfx/whoosh.wav')} volume={0.7} /></Sequence>
      {plan.events.map((e, i) => {
        const fx: Array<[string, number, number]> = [];
        switch (e.kind) {
          case 'miss': fx.push(['sfx/whoosh.wav', -0.1, 0.9], ['sfx/thunder.wav', 0, 0.35]); break;
          case 'poof': fx.push(['sfx/pop.wav', 0, 0.9], ['sfx/powerdown.wav', 0.05, 0.4]); break;
          case 'shrew': fx.push(['sfx/pop.wav', 0, 0.7], ['sfx/ding.wav', 0.1, 0.3]); break;
          case 'stomp': fx.push(['sfx/boom.wav', 0, 0.9], ['sfx/slam.wav', 0, 0.5]); break;
          case 'clear': fx.push(['sfx/boom.wav', 0, 1.0], ['sfx/thunder.wav', 0.2, 0.6]); break;
          case 'grow': fx.push(['sfx/grow.wav', 0, 0.7], ['sfx/powerup.wav', 0.1, 0.5]); break;
          case 'alt': fx.push(['sfx/whoosh.wav', -0.2, 0.7]); break;
          case 'stay': fx.push(['sfx/fail.wav', 0, 0.6]); break;
          case 'twist': fx.push(['sfx/scratch.wav', 0, 0.8]); break;
          case 'smart': fx.push(['sfx/ding.wav', 0, 0.7], ['sfx/shine.wav', 0.05, 0.5]); break;
          case 'imagine': fx.push(['sfx/bell.wav', 0, 0.5]); break;
          case 'unveil': fx.push(['sfx/whoosh.wav', 0, 0.7]); break;
          case 'name': fx.push(['sfx/slam.wav', 0, 0.9], ['sfx/shine.wav', 0.1, 0.6]); break;
          case 'scroll': fx.push(['sfx/tick.wav', 0, 0.5], ['sfx/tick.wav', 0.35, 0.5]); break;
          case 'sting': fx.push(['sfx/bell.wav', 0.05, 0.6]); break;
          default: break;
        }
        return fx.map(([f, off, v], j) => (
          <Sequence key={`${i}-${j}`} from={Math.max(0, Math.round((e.t + off) * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
        ));
      })}
    </AbsoluteFill>
  );
};
