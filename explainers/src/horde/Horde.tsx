import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Face} from '../fight/art';
import {Band, Shock, Slam, Spark, SpeedLines} from '../fight/Fight';
import {camAt, Shot, visTime} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {Cage, Carriage, Gorilla, Man, Napoleon, Rabbit} from './art';
import {FPS, HKind, HordeEpisode, SWAT_HIT, TEvent, at, buildPlan, first, heroBar, knockPlan, remaining} from './timeline';

// 1 vs MANY. The horde charges, gets swatted flying (or bounces straight back),
// flees, flanks or invades the carriage; a counter replaces their health bar.
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;

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
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/* ───────────── stages ───────────── */
const Jungle: React.FC<{s: number}> = ({s}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#1f5a3a, #3d8a4a 55%, #6fb04f)'}} />
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      {[[-60, 0.25], [260, 0.18], [700, 0.22], [980, 0.2]].map(([x, o], i) => (
        <polygon key={i} points={`${x},0 ${x + 120},0 ${x + 420},${GROUND} ${x + 160},${GROUND}`} fill="#fff6c0" opacity={o * (0.8 + 0.2 * Math.sin(s * 1.3 + i))} />
      ))}
      {[90, 330, 820, 1010].map((x, i) => <rect key={x} x={x - 34} y={0} width={68 + i * 6} height={GROUND} fill={i % 2 ? '#2a4a2e' : '#33573a'} />)}
      {[160, 470, 640, 930].map((x, i) => (
        <path key={x} d={`M ${x} 0 Q ${x + Math.sin(s * 1.5 + i) * 20} 300, ${x - 10} ${520 + i * 60}`} fill="none" stroke="#2f7a3a" strokeWidth={10} strokeLinecap="round" />
      ))}
      {Array.from({length: 14}).map((_, i) => (
        <ellipse key={i} cx={(i * 173) % W} cy={GROUND - 40 - (i % 3) * 30} rx={120} ry={60} fill={i % 2 ? '#2f7a2c' : '#3d9a3a'} />
      ))}
    </svg>
    <div style={{position: 'absolute', left: 0, top: GROUND, width: W, height: 1920 - GROUND, background: 'linear-gradient(#6b4a2a, #3e2a18)'}} />
    <div style={{position: 'absolute', left: 0, top: GROUND - 16, width: W, height: 32, borderRadius: 16, background: '#4c9a3c'}} />
  </>
);

const Park: React.FC<{s: number}> = ({s}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#7cc8ff, #d9f0ff 70%)'}} />
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <ellipse cx={240} cy={GROUND - 120} rx={520} ry={200} fill="#8fcf7a" />
      <ellipse cx={860} cy={GROUND - 100} rx={560} ry={210} fill="#7cc06a" />
      {[60, 240, 760, 980].map((x, i) => (
        <g key={x}>
          <rect x={x - 14} y={GROUND - 420 - i * 10} width={28} height={300} fill="#6b4a2a" />
          <circle cx={x} cy={GROUND - 460 - i * 10} r={110} fill={i % 2 ? '#3d9a3a' : '#4cb043'} />
          <circle cx={x + 50} cy={GROUND - 420 - i * 10} r={70} fill="#3d9a3a" />
        </g>
      ))}
      {/* a striped hunting tent with a tricolour pennant */}
      <path d={`M 520 ${GROUND - 160} L 640 ${GROUND - 330} L 760 ${GROUND - 160} Z`} fill="#f4f1ea" />
      {[0, 1, 2].map((k) => <path key={k} d={`M ${560 + k * 40} ${GROUND - 160} L 640 ${GROUND - 330} L ${580 + k * 40} ${GROUND - 160} Z`} fill="#2457c9" opacity={0.85} />)}
      <line x1={640} y1={GROUND - 330} x2={640} y2={GROUND - 400} stroke="#6b4a2a" strokeWidth={5} />
      <path d={`M 640 ${GROUND - 400} L ${700 + Math.sin(s * 4) * 6} ${GROUND - 388} L 640 ${GROUND - 376} Z`} fill="#d0282e" />
      <path d={`M 640 ${GROUND - 400} L ${670 + Math.sin(s * 4) * 3} ${GROUND - 394} L 640 ${GROUND - 382} Z`} fill="#ffffff" />
      <path d={`M 640 ${GROUND - 400} L ${652} ${GROUND - 397} L 640 ${GROUND - 388} Z`} fill="#2457c9" />
      {Array.from({length: 12}).map((_, i) => <rect key={i} x={i * 95} y={GROUND - 90} width={14} height={80} fill="#c8a06a" />)}
      <rect x={0} y={GROUND - 74} width={W} height={10} fill="#c8a06a" />
    </svg>
    <div style={{position: 'absolute', left: 0, top: GROUND, width: W, height: 1920 - GROUND, background: 'linear-gradient(#5aa84a, #3e7a32)'}} />
    <div style={{position: 'absolute', left: 0, top: GROUND - 16, width: W, height: 32, borderRadius: 16, background: '#6fc35e'}} />
  </>
);

/* ───────────── HUD ───────────── */
const Hud: React.FC<{ep: HordeEpisode; s: number; bar: number; left: number; note: string}> = ({ep, s, bar, left, note}) => {
  const low = bar > 0 && bar < 30 && Math.floor(s * 6) % 2 === 0;
  return (
    <>
      <svg width={W} height={130} style={{position: 'absolute', left: 0, top: 236}}>
        <rect x={60} y={0} width={400} height={60} rx={10} fill="#1b1b22" />
        <rect x={66} y={6} width={388 * bar / 100} height={48} rx={6} fill={low ? '#ff2a2a' : ep.hero.color} />
        <rect x={66} y={8} width={388 * bar / 100} height={14} rx={6} fill="#ffffff" opacity={0.35} />
        <text x={70} y={92} fontFamily={heavy} fontWeight={900} fontSize={30} fill="#fff" stroke="#111" strokeWidth={7} paintOrder="stroke">{ep.hero.name} · {ep.hero.bar}</text>
        <rect x={600} y={-10} width={420} height={80} rx={14} fill="#1b1b22" stroke={ep.horde.color} strokeWidth={6} />
        <text x={620} y={44} fontFamily={heavy} fontWeight={900} fontSize={28} fill="#fff">{ep.horde.label}</text>
        <text x={1000} y={52} textAnchor="end" fontFamily={heavy} fontWeight={900} fontSize={56} fill="#ffd23f" style={{fontVariantNumeric: 'tabular-nums'}}>{fmt(left)}</text>
      </svg>
      <div style={{position: 'absolute', left: 540 - 46, top: 222, width: 92, height: 92, borderRadius: 46, background: '#1b1b22', border: '6px solid #ffd23f',
        boxSizing: 'border-box', fontFamily: heavy, fontWeight: 900, fontSize: 36, color: '#fff', textAlign: 'center', lineHeight: '80px'}}>VS</div>
      {note ? (
        <div style={{position: 'absolute', top: 372, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 800, fontSize: 25, letterSpacing: 1.2,
          color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.85)', textTransform: 'uppercase'}}>{note}</div>
      ) : null}
    </>
  );
};

/* ───────────── composition ───────────── */
export const Horde: React.FC<{episode: HordeEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sr = frame / fps;
  const plan = buildPlan(ep, timing);
  const swats = plan.events.filter((e) => e.kind === 'swat');
  const s = visTime(swats.filter((e) => !e.back).map((e) => e.t + SWAT_HIT), sr);
  const hookEnd = plan.lineEnds[0];
  const gorilla = ep.hero.art === 'gorilla';
  const T = (k: HKind) => at(plan, k);
  const [tCharge, tRelease, tFlee, tRetreat, tFlank, tSwarm, tBeat, tEat, tHurt, tWinner] =
    (['charge', 'release', 'flee', 'retreat', 'flank', 'swarm', 'beat', 'eat', 'hurt', 'winner'] as HKind[]).map(T);
  const winnerE = first(plan, 'winner');

  // ── hero
  const HX0 = gorilla ? 300 : 430;
  const retreatK = ease(clamp01((s - tRetreat) / 1.0));
  const HX = lerp(HX0, 250, retreatK);
  const heroSize = gorilla ? 620 : 380;
  const heroTop = gorilla ? GROUND - heroSize * 0.95 : GROUND - heroSize * 1.75;
  const head: [number, number] = gorilla ? [HX - 310 + 272 * 1.55, heroTop + 142 * 1.55] : [HX, heroTop + 200 * (380 / 400)];
  const front = HX + (gorilla ? 200 : 130);
  const swing = Math.max(0, ...swats.map((e) => {
    const d = s - (e.t + SWAT_HIT);
    return d < -0.18 || d > 0.3 ? 0 : d < 0 ? ease((d + 0.18) / 0.18) : 1 - ease(d / 0.3);
  }));
  const beating = win(s, tBeat, 1.9);
  const eat = s >= tEat ? ease(clamp01((s - tEat) / 0.4)) : 0;
  const bar = heroBar(plan, s);
  const heroFace: Face = gorilla
    ? (s >= tWinner || eat > 0 ? 'happy' : s >= tFlee ? 'smug' : beating ? 'angry' : s >= tHurt ? 'hurt' : 'angry')
    : (s >= tWinner ? 'sad' : s >= tSwarm ? 'shock' : s >= tHurt ? 'hurt' : swing > 0.1 ? 'angry' : s >= tCharge ? 'shock' : 'smug');
  const walkPh = s >= tRetreat && s < tRetreat + 1.0 ? s * 3 : 0;
  const recoil = Math.max(0, ...plan.events.filter((e) => e.kind === 'hurt').map((e) => (s >= e.t ? Math.exp(-(s - e.t) * 6) : 0)));

  // ── the horde
  const N = ep.horde.sprites;
  const knocks = knockPlan(ep, plan);
  const rabbits = ep.horde.art === 'rabbit';
  const baseSize = rabbits ? 150 : 200;
  const CAGES = [620, 840];
  type SP = {i: number; x: number; y: number; sc: number; rot: number; flip: boolean; run: number; face: Face; vis: boolean; r: number};
  const sprite = (i: number): SP => {
    const r = i % 4;
    const c = Math.floor(i / 4);
    const sc = 0.8 + r * 0.06;
    const feet = GROUND - 26 + r * 34;
    const home = rabbits ? 590 + c * 46 + (r % 2) * 20 : 620 + c * 52 + (r % 2) * 24;
    const target = front + 30 + c * 30 + (r % 2) * 14;
    let x = home;
    let y = feet;
    let rot = 0;
    let flip = false;
    let run = 0;
    let face: Face = rabbits ? 'happy' : 'angry';
    let vis = true;
    if (rabbits) {
      if (s < tRelease) vis = false;
      const k = ease(clamp01((s - tRelease - c * 0.04 - r * 0.02) / 0.5));
      x = lerp(CAGES[i % 2] + 115, home, k);
      y -= Math.sin(k * Math.PI) * 120;
      if (k > 0 && k < 1) run = s * 3;
    }
    const kc = ease(clamp01((s - tCharge - c * 0.05 - r * 0.02) / 0.9));
    if (kc > 0) {
      x = lerp(x, target, kc);
      run = kc < 1 ? s * 3 + i * 0.3 : s * 1.2 + i * 0.3;
      if (rabbits) y = feet - Math.abs(Math.sin(s * 9 + i)) * 26;
    }
    // flank (two groups round the carriage) and swarm (some climb in)
    if (s >= tFlank) {
      const kf = ease(clamp01((s - tFlank - c * 0.03) / 1.0));
      const tx = i % 2 === 0 ? 40 + (c % 5) * 24 : 470 + c * 22;
      x = lerp(x, tx, kf);
      run = s * 3 + i;
      y = feet - Math.abs(Math.sin(s * 9 + i)) * 24;
    }
    if (s >= tSwarm && i % 3 === 0) {
      const ks = clamp01((s - tSwarm - (i % 9) * 0.06) / 0.5);
      x = lerp(x, 230, ks);
      y = lerp(y, GROUND - 330, ks) - Math.sin(ks * Math.PI) * 120;
      if (ks >= 1) vis = false;
    }
    if (s >= tFlee) {
      const d = Math.max(0, s - tFlee - c * 0.03 - r * 0.02);
      x += d * d * 900 + d * 300;
      flip = true;
      face = 'shock';
      run = s * 4 + i;
    }
    for (const kn of knocks[i]) {
      if (s < kn.t) continue;
      const d = s - kn.t;
      if (kn.back) {
        if (d < 0.75) {
          x += d * 380;
          y -= d * 1100 - d * d * 1460;
          rot = d * 480;
          face = 'shock';
        }
      } else {
        x += d * (520 + rnd(i) * 600);
        y -= d * (1500 + rnd(i + 3) * 500) - d * d * 2600;
        rot = d * (600 + rnd(i) * 500);
        face = 'hurt';
        if (y > 2300 || x > 1500) vis = false;
      }
    }
    return {i, x, y, sc, rot, flip, run, face, vis, r};
  };
  const sprites = Array.from({length: N}, (_, i) => sprite(i)).filter((p) => p.vis);
  const drawSprite = (p: SP) => {
    const size = baseSize * p.sc;
    return (
      <svg key={`sp${p.i}`} width={size} height={size} viewBox="0 0 400 400" style={{position: 'absolute', left: p.x - size / 2, top: p.y - size * 0.95,
        overflow: 'visible', transform: `rotate(${p.rot}deg)`, transformOrigin: '50% 60%'}}>
        {rabbits ? <g transform={p.flip ? 'translate(400 0) scale(-1 1)' : undefined}><Rabbit i={p.i} hop={(p.run % 1 + 1) % 1} face={p.face} /></g>
          : <Man i={p.i} face={p.face} run={p.run} flip={p.flip} />}
      </svg>
    );
  };

  // ── director
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 1060, z: 1, r: 0, ...c});
  shot(0, 0.01, {z: 1.0, y: 1080});
  shot(0.05, Math.max(0.5, hookEnd - 0.1), {z: 1.1});
  for (const e of plan.events) {
    switch (e.kind) {
      case 'fight': shot(e.t, 0.08, {z: 1.3}); shot(e.t + 0.3, 0.5, {z: 1.0}); break;
      case 'charge': shot(e.t, 0.4, {x: 680, y: 1150, z: 1.1}); break;
      case 'release': shot(e.t - 0.2, 0.35, {x: 760, y: 1250, z: 1.35}); break;
      case 'swat': shot(e.t, 0.15, {x: front + 60, y: head[1] + 120, z: e.back ? 1.45 : 1.5, r: e.back ? 3 : -3}); shot(e.t + 0.9, 0.5, {z: 1.05}); break;
      case 'stat': shot(e.t, 0.35, {z: 1.0}); break;
      case 'move': shot(e.t, 0.22, {x: head[0], y: head[1] + 150, z: 1.7, r: -4}); break;
      case 'beat': shot(e.t, 0.2, {x: HX0 + 60, y: head[1] + 180, z: 1.4}); shot(e.t + 1.9, 0.6, {z: 1.0, x: 640}); break;
      case 'flee': shot(e.t, 0.5, {x: 760, z: 1.05}); break;
      case 'eat': shot(e.t, 0.5, {x: head[0], y: head[1] + 140, z: 1.6}); break;
      case 'retreat': shot(e.t, 0.6, {x: 320, y: 1200, z: 1.2}); break;
      case 'flank': shot(e.t, 0.5, {x: 400, z: 1.05}); break;
      case 'swarm': shot(e.t, 0.2, {x: 240, y: 1240, z: 1.55, r: -5}); break;
      case 'hurt': if (!gorilla) shot(e.t, 0.15, {x: head[0], y: head[1] + 160, z: 1.5, r: 4}); break;
      case 'winner': shot(e.t, 0.4, {z: 1.0}); break;
      default: break;
    }
  }
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const hitPunch = Math.max(0, ...swats.map((e) => (s >= e.t + SWAT_HIT ? Math.exp(-(s - e.t - SWAT_HIT) * 6) : 0)));
  const beatShake = beating ? 1 : 0;
  const fightE = first(plan, 'fight');
  const bell = fightE && win(s, fightE.t, 0.6) ? 1 - (s - fightE.t) / 0.6 : 0;
  const shake = 16 * hitPunch + 12 * beatShake * Math.abs(Math.sin(s * 26)) + 18 * bell;
  const impacts = [...swats.filter((e) => !e.back).slice(0, 1).map((e) => e.t + SWAT_HIT), ...(Number.isFinite(tBeat) ? [tBeat] : [])];
  const impD = Math.min(9, ...impacts.map((t) => (sr >= t ? sr - t : 9)));
  const sceneFilter = impD < 1 / 30 ? 'invert(1) saturate(0) contrast(2.4)' : impD < 2 / 30 ? 'saturate(0) contrast(3) brightness(1.25)' : 'none';

  // ── captions (real time), banners
  const caps = captions(ep as unknown as FightEpisode, timing, {lineStarts: plan.lineStarts, lineEnds: plan.lineEnds, events: [], hits: [], end: plan.end});
  const capIdx = caps.findIndex((c) => sr >= c.start && sr < c.end);
  const cap = capIdx >= 0 ? caps[capIdx] : null;
  let capSize = 0;
  let capWrap = false;
  if (cap) {
    const one = 820 / (cap.text.length * 0.78);
    const longest = Math.max(...cap.text.split(' ').map((w) => w.length));
    capWrap = one < 100 && cap.n > 1;
    capSize = Math.min(cap.hot ? 150 : 128, capWrap ? 820 / (longest * 0.78) : one);
  }
  const capPop = cap ? 0.55 + 0.45 * spring({frame: frame - Math.round(cap.start * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;
  const bannerUp = plan.events.some((e) => (e.kind === 'move' && win(s, e.t, 1.6)) || (e.kind === 'stat' && win(s, e.t, 1.7)) || (e.kind === 'fight' && win(s, e.t, 1.0)));
  const showCap = cap && sr >= hookEnd && !(winnerE && s >= winnerE.t) && !bannerUp;
  const note = ep.lines[plan.lineStarts.reduce((a, st, i) => (s >= st - 0.05 ? i : a), 0)].note;
  const moveE = plan.events.find((e) => e.kind === 'move' && win(s, e.t, 1.3));

  const heroEl = (
    <div key="hero" style={{position: 'absolute', left: HX - (gorilla ? 310 : 190) - recoil * 30, top: heroTop - (gorilla ? 0 : Math.abs(Math.sin(walkPh * Math.PI)) * 12),
      width: heroSize, height: gorilla ? heroSize : heroSize * 1.75}}>
      <svg width={heroSize} height={gorilla ? heroSize : heroSize * 1.75} viewBox={gorilla ? '0 0 400 400' : '0 0 400 700'} style={{overflow: 'visible'}}>
        {gorilla ? <Gorilla face={heroFace} t={s} swing={swing} beat={beating ? 1 : 0} eat={eat} pant={s >= tHurt && s < tBeat ? 1 : 0} />
          : <Napoleon face={heroFace} t={s} crop={swing} walk={walkPh} />}
      </svg>
    </div>
  );
  const behind = sprites.filter((p) => p.r <= 1);
  const inFront = sprites.filter((p) => p.r >= 2);

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`, filter: sceneFilter,
        transform: `translate(${540 - cam.x + Math.sin(frame * 2.3) * shake}px, ${960 - cam.y + Math.cos(frame * 2.9) * shake}px) rotate(${cam.r}deg) scale(${cam.z * (1 + 0.04 * hitPunch)})`}}>
        {gorilla ? <Jungle s={s} /> : <Park s={s} />}
        {moveE ? <SpeedLines x={head[0]} y={head[1]} color={ep.hero.color} k={(s - moveE.t) / 1.3} frame={frame} /> : null}
        {!gorilla ? CAGES.map((x, k) => (
          <svg key={`cage${k}`} width={230} height={230} viewBox="0 0 400 400" style={{position: 'absolute', left: x, top: GROUND - 220,
            opacity: 1 - clamp01((s - tCharge) / 0.6)}}><Cage open={ease(clamp01((s - tRelease) / 0.35))} /></svg>
        )) : null}
        {/* Napoleon hides BEHIND the carriage once he's retreated */}
        {!gorilla && s >= tRetreat + 0.7 ? heroEl : null}
        {!gorilla ? (
          <svg width={420} height={420} viewBox="0 0 400 400" style={{position: 'absolute', left: 20, top: GROUND - 400, overflow: 'visible'}}>
            <Carriage t={s} shake={s >= tSwarm ? 1 : 0} bunnies={s >= tSwarm ? clamp01((s - tSwarm) / 1.0) : 0} />
          </svg>
        ) : null}
        {behind.map(drawSprite)}
        {gorilla || s < tRetreat + 0.7 ? heroEl : null}
        {inFront.map(drawSprite)}
        {/* chest-beat shockwaves */}
        {beating ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((k) => {
          const t0 = tBeat + k * 0.13;
          const d = (s - t0) / 0.45;
          return d >= 0 && d <= 1 ? <Shock key={`cb${k}`} x={HX0 + 50} y={head[1] + 130} k={d} color="#9a9ca6" /> : null;
        }) : null}
        {/* swat impacts */}
        {swats.map((e, k) => {
          const d = s - e.t - SWAT_HIT;
          if (d < 0 || d > 0.45) return null;
          return (
            <React.Fragment key={`sw${k}`}>
              <Shock x={front + 70} y={GROUND - 170} k={d / 0.45} color={e.back ? '#ffffff' : '#ffd23f'} />
              {d < 0.3 ? <Spark x={front + 70} y={GROUND - 170} k={d / 0.3} color="#ffd23f" /> : null}
            </React.Fragment>
          );
        })}
        {swats.map((e, k) => {
          const d = s - e.t - SWAT_HIT;
          if (d < 0 || d > 1.0) return null;
          const txt = e.back ? 'BOING!' : `-${e.n} MEN`;
          return (
            <div key={`dm${k}`} style={{position: 'absolute', left: front - 80, top: GROUND - 520 - d * 90, width: 440, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
              fontSize: e.back ? 90 : 76, color: e.back ? '#ffffff' : '#ff3b3b', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill',
              opacity: d > 0.75 ? (1 - d) / 0.25 : 1, transform: `rotate(-6deg) scale(${0.7 + 0.3 * clamp01(d / 0.1)})`}}>{txt}</div>
          );
        })}
        {/* dust as the men run */}
        {Number.isFinite(tFlee) && s >= tFlee ? Array.from({length: 18}).map((_, k) => {
          const d = (s - tFlee - k * 0.06) / 1.2;
          if (d < 0 || d > 1) return null;
          return <div key={`du${k}`} style={{position: 'absolute', left: 620 + rnd(k) * 380 + d * 200, top: GROUND - 60 - d * 60, width: 90 + d * 80, height: 60 + d * 50,
            borderRadius: '50%', background: '#c9b48a', opacity: 0.7 * (1 - d)}} />;
        }) : null}
      </div>

      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 55%, transparent 55%, rgba(0,0,0,.3) 100%)'}} />
      <Hud ep={ep} s={s} bar={bar} left={remaining(ep, plan, s)} note={sr >= hookEnd ? note : ''} />

      {plan.events.map((e, i) => {
        if (e.kind === 'move' && win(s, e.t, 1.6)) return <Band key={i} k={(s - e.t) / 1.6} from="L" color={ep.hero.color} label="SPECIAL MOVE" text={e.name!} />;
        if (e.kind === 'stat' && win(s, e.t, 1.7)) return <Band key={i} k={(s - e.t) / 1.7} from="R" color="#ffffff" text={e.text!} size={92} />;
        if (e.kind === 'fight' && win(s, e.t, 1.0)) return <Slam key={i} k={(s - e.t) / 1.0} text="FIGHT!" color="#ffd23f" size={230} top={560} />;
        return null;
      })}

      {sr < hookEnd ? (
        <div style={{position: 'absolute', top: 440, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900, lineHeight: 0.95,
          WebkitTextStroke: '14px #111', paintOrder: 'stroke fill', textShadow: '0 10px 0 rgba(0,0,0,.35)', fontStyle: 'italic',
          transform: `scale(${0.9 + 0.1 * spring({frame: frame + 5, fps, config: {damping: 8, stiffness: 200}})}) rotate(-3deg)`}}>
          <div style={{fontSize: Math.min(150, 840 / (ep.headline[0].length * 0.75)), color: '#ffffff', whiteSpace: 'nowrap'}}>{ep.headline[0]}</div>
          <div style={{fontSize: Math.min(130, 840 / (ep.headline[1].length * 0.72)), color: '#ffd23f', whiteSpace: 'nowrap'}}>{ep.headline[1]}</div>
        </div>
      ) : null}

      {showCap && cap ? (
        <div style={{position: 'absolute', top: 612, left: 120, width: 820, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
          fontSize: capSize, lineHeight: 1.0, color: cap.hot ? '#ffd23f' : '#ffffff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`,
          paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: capWrap ? 'normal' : 'nowrap',
          transform: `scale(${capPop}) rotate(${capIdx % 2 ? 2.5 : -2.5}deg)`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}

      {winnerE && s >= winnerE.t ? (
        <>
          <AbsoluteFill style={{background: `rgba(10,8,30,${(0.45 * clamp01((s - winnerE.t) / 0.3)).toFixed(2)})`}} />
          <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
            {Array.from({length: 46}).map((_, i) => {
              const k = s - winnerE.t;
              const x = (i * 197) % W + Math.sin(k * 3 + i) * 30;
              const y = -40 + ((k * (260 + (i % 5) * 60) + i * 53) % 1600);
              return <rect key={i} x={x} y={y} width={18} height={30} fill={['#ffd23f', '#ff4f7b', '#5ec8ff', '#7be07b'][i % 4]} transform={`rotate(${k * 300 + i * 40} ${x + 9} ${y + 15})`} />;
            })}
          </svg>
          <div style={{position: 'absolute', top: 470, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontStyle: 'italic',
            transform: `scale(${0.6 + 0.4 * spring({frame: frame - Math.round(winnerE.t * fps), fps, config: {damping: 8, stiffness: 180}})}) rotate(-4deg)`}}>
            <div style={{fontSize: 96, color: '#fff', WebkitTextStroke: '11px #111', paintOrder: 'stroke fill', letterSpacing: 6}}>WINNER</div>
            <div style={{fontSize: Math.min(230, 980 / ((winnerE.text ?? '').length * 0.72)), color: '#ffd23f', WebkitTextStroke: '20px #111', paintOrder: 'stroke fill', lineHeight: 0.95,
              textShadow: '0 14px 0 rgba(0,0,0,.4)'}}>{winnerE.text}</div>
          </div>
        </>
      ) : null}

      {/* audio */}
      <Audio src={staticFile(`music/${ep.id}.wav`)} volume={0.55} />
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}><Audio src={staticFile(ln.file)} /></Sequence>
      ))}
      {plan.events.map((e: TEvent, i) => {
        const fx: Array<[string, number, number]> = [];
        if (e.kind === 'fight') fx.push(['sfx/bell.wav', 0, 0.8]);
        if (e.kind === 'move' || e.kind === 'stat') fx.push(['sfx/slam.wav', 0, 0.7]);
        if (e.kind === 'charge') fx.push(['sfx/whoosh.wav', 0, 0.8], ['sfx/whoosh.wav', 0.25, 0.6]);
        if (e.kind === 'swat') fx.push(e.back ? ['sfx/pop.wav', SWAT_HIT, 0.8] : ['sfx/punch.wav', SWAT_HIT, 0.9], ...(e.back ? [] : [['sfx/boom.wav', SWAT_HIT, 0.6] as [string, number, number]]));
        if (e.kind === 'beat') for (let k = 0; k < 14; k += 1) fx.push(['sfx/punch.wav', k * 0.13, k % 2 ? 0.55 : 0.8]);
        if (e.kind === 'flee' || e.kind === 'retreat' || e.kind === 'flank') fx.push(['sfx/whoosh.wav', 0, 0.7]);
        if (e.kind === 'eat') fx.push(['sfx/chomp.wav', 0.3, 0.8], ['sfx/chomp.wav', 0.9, 0.6]);
        if (e.kind === 'release') fx.push(['sfx/clank.wav', 0, 0.8]);
        if (e.kind === 'swarm') fx.push(['sfx/scratch.wav', 0, 0.6]);
        if (e.kind === 'hurt' && !gorilla) fx.push(['sfx/fail.wav', 0, 0.7]);
        if (e.kind === 'winner') fx.push(['sfx/shine.wav', 0, 0.8]);
        return fx.map(([f, off, v], j) => (
          <Sequence key={`${i}-${j}`} from={Math.max(0, Math.round((e.t + off) * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
        ));
      })}
    </AbsoluteFill>
  );
};
