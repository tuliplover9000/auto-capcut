import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Face} from '../fight/art';
import {ANCHOR, Balloon, BALLOON_COLS, Kid, LiftArt, SIZE} from './art';
import {Beat, FPS, OddsEpisode, Plan, Timing, buildPlan, captions, cueOffset, fmt, valueAt} from '../odds/timeline';

// "How many balloons to lift…" — an escalation ladder on the Odds timeline:
// the counter rolls up in log space and lands on each number as it's spoken,
// the cluster inflates with it, the object lifts off, and floats away when the
// next one arrives. The ground turns to ocean for the liner; the sting pops it all.
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;

const W = 1080;
const GROUND = 1650;
const BX0 = 150;
const BX1 = 930;
const BY = 600;
const LMIN = 2; // 100
const LMAX = 10; // 10 billion
const LIFT: Record<string, number> = {cat: 430, person: 420, car: 380, whale: 300, titanic: 110};
const ACCENT: Record<string, string> = {cat: '#ff9f1a', person: '#3fa7ff', car: '#ff4f5e', whale: '#5b8cff', titanic: '#ffd23f', helium: '#7fd8ff'};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const mixHex = (a: string, b: string, k: number) => {
  const h = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  return '#' + h(a).map((v, i) => Math.round(v + (h(b)[i] - v) * k).toString(16).padStart(2, '0')).join('');
};
const bx = (v: number) => BX0 + clamp01((Math.log10(Math.max(100, v)) - LMIN) / (LMAX - LMIN)) * (BX1 - BX0);
const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/* ───────────── the sky ───────────── */
const Sky: React.FC<{s: number; level: number; ocean: number}> = ({s, level, ocean}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${mixHex('#4fb6ff', '#1d2b6e', level)}, ${mixHex('#cdeeff', '#7d8fd8', level)} ${GROUND}px)`}} />
    <div style={{position: 'absolute', left: 860, top: 420, width: 130, height: 130, borderRadius: 65, background: '#ffe066', boxShadow: '0 0 80px 30px rgba(255,214,90,.55)'}} />
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      {[0, 1, 2, 3, 4].map((i) => {
        const x = ((i * 260 + s * (14 + i * 5)) % 1500) - 260;
        const y = 760 + i * 170;
        return (
          <g key={i} opacity={0.85}>
            <ellipse cx={x} cy={y} rx={110} ry={40} fill="#ffffff" />
            <ellipse cx={x + 60} cy={y - 26} rx={70} ry={44} fill="#ffffff" />
            <ellipse cx={x - 50} cy={y - 14} rx={56} ry={34} fill="#ffffff" />
          </g>
        );
      })}
    </svg>
    <div style={{position: 'absolute', left: 0, top: GROUND, width: W, height: 1920 - GROUND,
      background: `linear-gradient(${mixHex('#5cbf4e', '#1f78c8', ocean)}, ${mixHex('#3e9a37', '#0d4c8a', ocean)})`}} />
    <div style={{position: 'absolute', left: 0, top: GROUND - 14, width: W, height: 28, borderRadius: 14, background: mixHex('#6fd35e', '#5ab8f0', ocean)}} />
  </>
);

/* ───────────── HUD ───────────── */
const Readout: React.FC<{b: Beat; s: number; frame: number; fps: number}> = ({b, s, frame, fps}) => {
  const v = valueAt(b, s);
  const landed = s >= b.landing;
  const txt = fmt(v) + (b.item.suffix ?? '');
  const size = Math.min(170, 860 / (txt.length * 0.64));
  const pop = landed ? 1 + 0.18 * Math.exp(-(s - b.landing) * 7) : 1;
  const pill = spring({frame: frame - Math.round(b.landing * fps), fps, config: {damping: 10, stiffness: 220}});
  const acc = b.item.color ?? ACCENT[b.item.art] ?? '#ffd23f';
  return (
    <div style={{position: 'absolute', top: 252, left: 0, width: W, textAlign: 'center', fontFamily: heavy}}>
      <div style={{fontWeight: 900, fontSize: 44, letterSpacing: 6, color: '#fff', WebkitTextStroke: '8px #10142e', paintOrder: 'stroke fill'}}>
        {b.odds ? 'BALLOONS NEEDED' : b.item.prefix}
      </div>
      <div style={{fontWeight: 900, fontSize: size, lineHeight: 1.05, color: landed ? acc : '#ffffff', WebkitTextStroke: `${Math.round(size * 0.11)}px #10142e`,
        paintOrder: 'stroke fill', fontVariantNumeric: 'tabular-nums', transform: `scale(${pop})`, textShadow: '0 10px 0 rgba(0,0,0,.3)'}}>{txt}</div>
      {landed && b.item.pill ? (
        <div style={{display: 'inline-block', marginTop: 6, padding: '8px 26px', borderRadius: 40, background: acc, color: '#10142e', fontWeight: 900,
          fontSize: 34, letterSpacing: 2, transform: `scale(${pill})`, border: '5px solid #10142e'}}>{b.item.pill}</div>
      ) : null}
    </div>
  );
};

const TICKS: Array<[number, string]> = [[1e2, '100'], [1e3, '1K'], [1e4, '10K'], [1e5, '100K'], [1e6, '1M'], [1e7, '10M'], [1e8, '100M'], [1e9, '1B'], [1e10, '10B']];
const Ladder: React.FC<{plan: Plan; s: number; cur: Beat | null}> = ({plan, s, cur}) => {
  const landed = plan.beats.filter((b) => b.odds && s >= b.landing);
  const live = cur && cur.odds && s >= cur.rampStart ? valueAt(cur, s) : landed.length ? landed[landed.length - 1].item.odds : 100;
  return (
    <svg width={W} height={140} style={{position: 'absolute', left: 0, top: BY - 60}}>
      <rect x={BX0 - 6} y={48} width={BX1 - BX0 + 12} height={26} rx={13} fill="#10142e" />
      <rect x={BX0} y={53} width={Math.max(0, bx(live) - BX0)} height={16} rx={8} fill="#ffd23f" />
      {TICKS.map(([v, l]) => (
        <g key={l}>
          <rect x={bx(v) - 2} y={76} width={4} height={12} fill="#10142e" />
          <text x={bx(v)} y={110} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={20} fill="#ffffff" stroke="#10142e" strokeWidth={5} paintOrder="stroke">{l}</text>
        </g>
      ))}
      {landed.map((b, i) => (
        <g key={i} transform={`translate(${bx(b.item.odds)} 26)`}>
          <circle r={25} fill="#ffffff" stroke={ACCENT[b.item.art] ?? '#ffd23f'} strokeWidth={5} />
          <svg x={-22} y={-22} width={44} height={44} viewBox="0 0 400 400"><LiftArt art={b.item.art} face="happy" t={0} /></svg>
        </g>
      ))}
      <path d={`M ${bx(live) - 12} 86 L ${bx(live) + 12} 86 L ${bx(live)} 68 Z`} fill="#ffffff" stroke="#10142e" strokeWidth={4} />
    </svg>
  );
};

const HeliumMeter: React.FC<{b: Beat; s: number}> = ({b, s}) => {
  const v = valueAt(b, s);
  return (
    <svg width={W} height={140} style={{position: 'absolute', left: 0, top: BY - 60}}>
      <rect x={BX0 - 6} y={36} width={BX1 - BX0 + 12} height={50} rx={25} fill="#10142e" />
      <rect x={BX0} y={42} width={(BX1 - BX0) * v / 100} height={38} rx={19} fill="#7fd8ff" />
      <text x={540} y={70} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={22} fill="#ffffff" stroke="#10142e" strokeWidth={6} paintOrder="stroke">
        THE WHOLE WORLD'S HELIUM · ONE YEAR
      </text>
    </svg>
  );
};

/* ───────────── composition ───────────── */
export const Lift: React.FC<{episode: OddsEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const hookEnd = plan.hookEnd;
  const objs = plan.beats.filter((b) => b.odds);
  const cur = [...plan.beats].reverse().find((b) => s >= b.enter) ?? null;
  const titanic = objs.find((b) => b.item.art === 'titanic');
  const helium = plan.beats.find((b) => b.item.art === 'helium');
  const tPop = ep.sting ? plan.lineStarts[ep.sting.line] + cueOffset(timing.lines[ep.sting.line], ep.sting.cue) : Infinity;
  const ocean = titanic ? ease(clamp01((s - titanic.enter) / 0.6)) : 0;
  const level = objs.filter((b) => s >= b.landing).length / objs.length;

  // object geometry for a beat at time s
  const geom = (b: Beat) => {
    const art = b.item.art;
    const size = SIZE[art];
    const i = objs.indexOf(b);
    const next = objs[i + 1];
    const enterK = spring({frame: Math.round((s - b.enter) * fps), fps, config: {damping: 12, stiffness: 150}});
    let dy = -(1 - enterK) * 520;
    if (s >= b.landing) dy -= ease(clamp01((s - b.landing) / 1.3)) * LIFT[art] + Math.sin((s - b.landing) * 2.2) * 10 * clamp01((s - b.landing) / 1.3);
    if (next && s >= next.enter) dy -= Math.pow((s - next.enter) / 0.9, 2) * 2400;
    if (art === 'titanic' && s >= tPop + 0.45) dy += Math.pow((s - tPop - 0.45) / 0.75, 2) * 1500;
    const ground = art === 'titanic' ? GROUND + 80 : GROUND;
    const top = ground - size * 0.95 + dy;
    const left = 540 - size / 2;
    const [ax, ay] = ANCHOR[art];
    return {size, top, left, ax: left + (ax / 400) * size, ay: top + (ay / 400) * size};
  };

  // the balloon cluster for a beat
  const cluster = (b: Beat, key: string) => {
    const g = geom(b);
    const odds = b.item.odds;
    const lg = Math.log10(odds);
    const nT = Math.min(64, Math.round(4 + 7 * lg));
    const grow = ease(clamp01((s - b.rampStart) / Math.max(0.05, b.landing - b.rampStart)));
    const nF = nT * grow;
    const R = Math.min(230, 40 + 30 * lg);
    const br = 30 + 3 * lg;
    const str = b.item.art === 'titanic' ? 110 : 130;
    const cx = g.ax;
    const cy = g.ay - str - R;
    const items = [] as React.ReactNode[];
    const strings = [] as React.ReactNode[];
    for (let i = 0; i < Math.ceil(nF); i++) {
      const k = clamp01(nF - i);
      const rr = R * Math.sqrt((i + 0.5) / nT);
      const a = i * 2.39996;
      const x = cx + Math.cos(a) * rr + Math.sin(s * 2 + i) * 4;
      const y = cy + Math.sin(a) * rr * 0.8 + Math.cos(s * 1.7 + i) * 4;
      const popT = tPop + (i / nT) * 0.5;
      if (s >= popT + 0.12) continue;
      const pk = s >= popT ? 1 + (s - popT) / 0.12 * 0.5 : 1;
      items.push(<Balloon key={`b${i}`} x={x} y={y} r={br} color={BALLOON_COLS[i % BALLOON_COLS.length]} k={k * pk} />);
      if (i % 3 === 0) strings.push(<line key={`s${i}`} x1={x} y1={y + br * 1.15} x2={cx} y2={g.ay} stroke="#ffffff" strokeWidth={2.5} opacity={0.8 * k} />);
    }
    return {items, strings, cx, cy, key};
  };

  const onStage = objs.filter((b) => s >= b.enter && s < (objs[objs.indexOf(b) + 1]?.enter ?? Infinity) + 1.2);
  const faceOf = (b: Beat): Face => (s < b.landing - 0.3 ? 'shock' : s < b.landing + 1.2 ? 'shock' : 'happy');
  const big = titanic && s >= titanic.landing ? Math.max(0, 1 - (s - titanic.landing) / 0.8) : 0;
  const popShake = s >= tPop + 0.45 ? Math.max(0, 1 - (s - tPop - 0.45) / 1.2) : 0;
  const landPunch = Math.max(0, ...objs.map((b) => (s >= b.landing ? Math.exp(-(s - b.landing) * 6) : 0)));
  const shake = 26 * big + 16 * popShake + 5 * landPunch;
  const hookPerson = s < (objs[0]?.enter ?? 0) + 0.5;

  // the kid on the left with one red balloon (yanked into the Titanic's cluster)
  const kidX = 70;
  const kidTop = GROUND - 220;
  const yank = titanic ? ease(clamp01((s - titanic.landing - 0.25) / 0.9)) : 0;
  const tCluster = titanic && s >= titanic.enter ? cluster(titanic, 'k') : null;
  const kbx = 140 + ((tCluster?.cx ?? 140) - 140) * yank;
  const kby = kidTop - 90 + ((tCluster?.cy ?? kidTop - 90) - (kidTop - 90)) * yank - Math.sin(yank * Math.PI) * 200;

  const caps = captions(ep, timing, plan);
  const capIdx = caps.findIndex((c) => s >= c.start && s < c.end);
  const cap = capIdx >= 0 ? caps[capIdx] : null;
  const capSize = cap ? Math.min(cap.hot ? 132 : 112, 860 / (cap.text.length * 0.72)) : 0;
  const capPop = cap ? 0.55 + 0.45 * spring({frame: frame - Math.round(cap.start * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;
  const note = ep.lines[plan.lineStarts.reduce((a, st, i) => (s >= st - 0.05 ? i : a), 0)].note;

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${Math.sin(frame * 2.3) * shake}px, ${Math.cos(frame * 2.9) * shake}px) scale(${1 + 0.03 * landPunch})`}}>
        <Sky s={s} level={level} ocean={ocean} />
        {/* the finale: the sky fills with balloons */}
        {titanic && s >= titanic.landing - 0.3 && s < tPop + 0.6 ? (
          <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0, WebkitMaskImage: 'linear-gradient(transparent 640px, #000 860px)', maskImage: 'linear-gradient(transparent 640px, #000 860px)'}}>
            {Array.from({length: 90}).map((_, i) => {
              const t0 = titanic.landing - 0.3 + rnd(i) * 1.2;
              const k = (s - t0) / 2.2;
              if (k < 0) return null;
              const y = 2000 - ((k * 2300 + rnd(i + 5) * 300) % 2300);
              const popped = s >= tPop + rnd(i + 9) * 0.5;
              return popped ? null : <Balloon key={i} x={rnd(i + 3) * W} y={y} r={26 + rnd(i + 1) * 14} color={BALLOON_COLS[i % 8]} />;
            })}
          </svg>
        ) : null}
        {/* objects, strings, clusters */}
        {onStage.map((b) => {
          const g = geom(b);
          const c = cluster(b, b.item.art);
          return (
            <React.Fragment key={b.item.art}>
              <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>{c.strings}</svg>
              <svg width={g.size} height={g.size} viewBox="0 0 400 400" style={{position: 'absolute', left: g.left, top: g.top, overflow: 'visible'}}>
                <LiftArt art={b.item.art} face={faceOf(b)} t={s} spin={b.item.art === 'car' ? clamp01((s - b.enter) / 0.6) * 2 : 0} />
              </svg>
              <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>{c.items}</svg>
            </React.Fragment>
          );
        })}
        {/* the hook: one person, one balloon, not going anywhere */}
        {hookPerson ? (() => {
          const out = objs[0] ? ease(clamp01((s - objs[0].enter) / 0.45)) : 0;
          const left = 540 - 170 - out * 900;
          const top = GROUND - 340 * 0.95 - Math.abs(Math.sin(s * 7)) * 18;
          return (
            <>
              <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
                <line x1={left + 170} y1={top + 48} x2={left + 170} y2={top - 120} stroke="#fff" strokeWidth={3} />
                <Balloon x={left + 170} y={top - 170} r={48} color="#ff4f7b" />
              </svg>
              <svg width={340} height={340} viewBox="0 0 400 400" style={{position: 'absolute', left, top, overflow: 'visible'}}>
                <LiftArt art="person" face="angry" t={s} />
              </svg>
            </>
          );
        })() : null}
        {/* the water in front of the liner (it sinks behind this) */}
        {ocean > 0 ? (
          <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
            <path d={`M 0 ${GROUND + 40} ${Array.from({length: 13}).map((_, i) => `Q ${i * 90 + 45} ${GROUND + 40 + Math.sin(s * 3 + i) * 12 - 14}, ${(i + 1) * 90} ${GROUND + 40}`).join(' ')} L ${W} 1920 L 0 1920 Z`}
              fill="#1a6fbf" opacity={0.92 * ocean} />
            {s >= tPop + 0.7 ? Array.from({length: 16}).map((_, i) => {
              const k = (s - tPop - 0.7 - rnd(i) * 0.6) / 1.2;
              if (k < 0 || k > 1) return null;
              return <circle key={i} cx={360 + rnd(i + 2) * 360} cy={GROUND + 60 - k * 140} r={6 + rnd(i) * 10} fill="none" stroke="#bfe9ff" strokeWidth={4} opacity={1 - k} />;
            }) : null}
            {/* the pier the kid stands on */}
            <rect x={0} y={GROUND - 8} width={250} height={26} fill="#8a5a32" opacity={ocean} />
            {[30, 120, 210].map((x) => <rect key={x} x={x} y={GROUND + 10} width={18} height={140} fill="#6b4224" opacity={ocean} />)}
          </svg>
        ) : null}
        {/* the gag */}
        <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
          {yank < 1 ? <line x1={kidX + 140} y1={kidTop + 60} x2={kbx} y2={kby + 50} stroke="#fff" strokeWidth={2.5} /> : null}
          <Balloon x={kbx} y={kby} r={30} color="#ff3b3b" k={s >= tPop + 0.25 ? 0 : 1} />
        </svg>
        <svg width={200} height={200} viewBox="0 0 400 400" style={{position: 'absolute', left: kidX, top: kidTop + 20}}>
          <Kid face={yank > 0.05 ? (yank < 1 ? 'shock' : 'sad') : 'happy'} t={s} />
        </svg>
      </div>

      {/* HUD */}
      {cur && s >= hookEnd - 0.2 ? <Readout b={cur} s={s} frame={frame} fps={fps} /> : null}
      {s >= hookEnd - 0.2 ? (helium && s >= helium.enter ? <HeliumMeter b={helium} s={s} /> : <Ladder plan={plan} s={s} cur={cur} />) : null}
      {note && s >= hookEnd ? (
        <div style={{position: 'absolute', top: 672, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 800, fontSize: 25, letterSpacing: 1.2,
          color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.85)', textTransform: 'uppercase'}}>{note}</div>
      ) : null}
      {s < hookEnd ? (
        <div style={{position: 'absolute', top: 300, left: 100, width: 880, textAlign: 'center', fontFamily: heavy, fontWeight: 900, lineHeight: 0.98, fontStyle: 'italic',
          WebkitTextStroke: '14px #10142e', paintOrder: 'stroke fill', textShadow: '0 10px 0 rgba(0,0,0,.3)',
          transform: `scale(${0.9 + 0.1 * spring({frame: frame + 5, fps, config: {damping: 8, stiffness: 200}})}) rotate(-3deg)`}}>
          <div style={{color: '#ffffff', fontSize: 104}}>{ep.headline[0]}</div>
          <div style={{color: '#ffd23f', fontSize: 104}}>{ep.headline[1]}</div>
        </div>
      ) : null}
      {cap && s >= hookEnd ? (
        <div style={{position: 'absolute', top: 750, left: 100, width: 880, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: capSize, lineHeight: 1,
          color: cap.hot ? '#ffd23f' : '#ffffff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #10142e`, paintOrder: 'stroke fill', whiteSpace: 'nowrap',
          textShadow: '0 8px 0 rgba(0,0,0,.3)', transform: `scale(${capPop}) rotate(${capIdx % 2 ? 2.5 : -2.5}deg)`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}

      {/* audio */}
      <Audio src={staticFile(`music/${ep.id}.wav`)} volume={0.55} />
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}><Audio src={staticFile(ln.file)} /></Sequence>
      ))}
      {plan.beats.map((b, i) => {
        const land: Record<string, [string, number]> = {cat: ['ding', 0.7], person: ['ding', 0.7], car: ['ding', 0.75], whale: ['shine', 0.8], titanic: ['boom', 0.95], helium: ['shine', 0.7]};
        const [f, v] = land[b.item.art] ?? ['ding', 0.7];
        return (
          <React.Fragment key={i}>
            <Sequence from={Math.round(b.enter * FPS)} durationInFrames={20}><Audio src={staticFile('sfx/pop.wav')} volume={0.4} /></Sequence>
            <Sequence from={Math.round(b.landing * FPS)} durationInFrames={110}><Audio src={staticFile(`sfx/${f}.wav`)} volume={v} /></Sequence>
            {b.odds && objs[objs.indexOf(b) + 1] ? (
              <Sequence from={Math.round(objs[objs.indexOf(b) + 1].enter * FPS)} durationInFrames={30}><Audio src={staticFile('sfx/whoosh.wav')} volume={0.35} /></Sequence>
            ) : null}
          </React.Fragment>
        );
      })}
      {Number.isFinite(tPop) ? (
        <>
          {[0, 0.07, 0.15, 0.24, 0.33, 0.44].map((d, i) => (
            <Sequence key={i} from={Math.round((tPop + d) * FPS)} durationInFrames={15}><Audio src={staticFile('sfx/pop.wav')} volume={0.75} /></Sequence>
          ))}
          <Sequence from={Math.round((tPop + 0.7) * FPS)} durationInFrames={60}><Audio src={staticFile('sfx/boom.wav')} volume={0.7} /></Sequence>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
