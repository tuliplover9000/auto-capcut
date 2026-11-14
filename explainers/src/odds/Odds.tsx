import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {ArtFor, Bolt, Box, Token} from './art';
import {
  Beat, FLY, FPS, OddsEpisode, Timing, TIERS, beatAt, buildPlan, captions, fmt, markerAt, tierOf, valueAt,
} from './timeline';

// "A loot-reveal vault at night: every item drops in on a beam of its rarity
//  colour, the readout rolls like a slot counter, and each one files onto a
//  log-scale rarity bar so the gaps between them are SEEN, not just said."
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;

const W = 1080;
// rarity bar (log scale, 1 in 1,000 -> 1 in 1 billion)
const BX0 = 150;
const BX1 = 930;
const BY = 600;
const bx = (odds: number) => BX0 + ((Math.log10(Math.max(1000, odds)) - 3) / 6) * (BX1 - BX0);
// item stage
const IX = 540;
const IY = 915;
const IS = 400;
const CHIP = 21;
const CAP_TOP = 1112;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

const accentOf = (b: Beat | null) => (!b ? '#5b6cff' : b.odds ? tierOf(b.item.odds).color : b.item.color ?? '#ffd23f');

/* ───────────── world ───────────── */

const Backdrop: React.FC<{s: number; color: string; burst: number; spin: number}> = ({s, color, burst, spin}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#141a46, #070917 80%)'}} />
    <div style={{position: 'absolute', inset: 0,
      background: `radial-gradient(circle at ${IX}px ${IY}px, ${color}${Math.round(110 + 90 * burst).toString(16)} 0, ${color}22 330px, transparent 620px)`}} />
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <g transform={`rotate(${s * 9 * spin} ${IX} ${IY})`} opacity={0.13 + 0.12 * burst}>
        {Array.from({length: 12}).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const b = a + 0.13;
          const R = 1500;
          return <polygon key={i} points={`${IX},${IY} ${IX + Math.cos(a) * R},${IY + Math.sin(a) * R} ${IX + Math.cos(b) * R},${IY + Math.sin(b) * R}`} fill={color} />;
        })}
      </g>
      {Array.from({length: 26}).map((_, i) => {
        const x = (i * 283) % W;
        const y = 1920 - ((s * (40 + (i % 5) * 18) + i * 211) % 2100);
        return <circle key={i} cx={x + Math.sin(s + i) * 20} cy={y} r={2 + (i % 3)} fill="#ffffff" opacity={0.25 + 0.2 * Math.sin(s * 3 + i)} />;
      })}
    </svg>
  </>
);

/* ───────────── readout (the star) ───────────── */

const Readout: React.FC<{b: Beat | null; s: number; frame: number; fps: number; pulse: number}> = ({b, s, frame, fps, pulse}) => {
  if (!b) return null;
  const v = valueAt(b, s);
  const txt = fmt(v);
  const landed = s >= b.landing;
  const size = Math.min(160, 820 / (txt.length * 0.66));
  const tier = b.odds ? tierOf(landed ? b.item.odds : v) : null;
  const pill = b.odds ? tier!.name : b.item.pill ?? '';
  const col = b.odds ? tier!.color : b.item.color ?? '#ffd23f';
  const pillPop = landed ? spring({frame: frame - Math.round(b.landing * fps), fps, config: {damping: 9, stiffness: 220}}) : 0;
  return (
    <div style={{position: 'absolute', left: 0, top: 262, width: W, textAlign: 'center', fontFamily: heavy,
      transform: `scale(${1 + 0.08 * pulse})`, transformOrigin: '540px 380px'}}>
      <div style={{fontWeight: 900, fontSize: 52, letterSpacing: 6, color: '#ffffff', opacity: 0.9}}>{b.odds ? '1 IN' : b.item.prefix}</div>
      <div style={{fontWeight: 900, fontSize: size, lineHeight: '170px', height: 170, color: landed ? col : '#ffffff', fontVariantNumeric: 'tabular-nums',
        WebkitTextStroke: '10px #0a0c1e', paintOrder: 'stroke fill', textShadow: landed ? `0 0 40px ${col}` : 'none'}}>{txt}</div>
      <div style={{display: 'inline-block', marginTop: 6, padding: '6px 26px', borderRadius: 30, background: col, color: '#0a0c1e',
        fontWeight: 900, fontSize: 34, letterSpacing: 4, transform: `scale(${pillPop})`}}>{pill}</div>
    </div>
  );
};

/* ───────────── the rarity bar ───────────── */

const TICKS: Array<[number, string]> = [[1e3, '1K'], [1e4, '10K'], [1e5, '100K'], [1e6, '1M'], [1e7, '10M'], [1e8, '100M'], [1e9, '1B']];

const RarityBar: React.FC<{beats: Beat[]; s: number; marker: number; show: number}> = ({beats, s, marker, show}) => (
  <svg width={W} height={760} style={{position: 'absolute', left: 0, top: 0, opacity: show, overflow: 'visible'}}>
    {TIERS.slice(1).map((t, i) => {
      const next = TIERS[i + 2]?.min ?? 1e9;
      return <rect key={t.name} x={bx(t.min)} y={BY - 9} width={bx(next) - bx(t.min)} height={18} fill={t.color} opacity={0.85} />;
    })}
    <rect x={BX0 - 4} y={BY - 13} width={BX1 - BX0 + 8} height={26} rx={13} fill="none" stroke="#0a0c1e" strokeWidth={6} />
    {TICKS.map(([v, l]) => (
      <text key={l} x={bx(v)} y={BY + 50} textAnchor="middle" fontFamily={heavy} fontWeight={800} fontSize={24} fill="#c3c9e6">{l}</text>
    ))}
    {beats.filter((b) => b.odds && s >= b.leave + FLY).map((b) => (
      <g key={b.line}>
        <circle cx={bx(b.item.odds)} cy={BY} r={CHIP + 4} fill="#0a0c1e" stroke={tierOf(b.item.odds).color} strokeWidth={5} />
        <svg x={bx(b.item.odds) - CHIP} y={BY - CHIP} width={CHIP * 2} height={CHIP * 2} viewBox="0 0 400 400" overflow="visible">
          <ArtFor art={b.item.art} t={0} k={1} />
        </svg>
      </g>
    ))}
    <g transform={`translate(${bx(marker)} ${BY - 34})`}>
      <polygon points="-18,-22 18,-22 0,4" fill="#ffffff" stroke="#0a0c1e" strokeWidth={5} strokeLinejoin="round" />
    </g>
  </svg>
);

/* ───────────── the item on stage ───────────── */

const Item: React.FC<{b: Beat; s: number; frame: number; fps: number}> = ({b, s, frame, fps}) => {
  const out = clamp01((s - b.leave) / FLY);
  if (out >= 1) return null;
  const pop = spring({frame: frame - Math.round(b.enter * fps), fps, config: {damping: 10, stiffness: 170}});
  const k = b.item.art === 'golf' || b.item.art === 'chest'
    ? ease(clamp01((s - b.rampStart) / Math.max(0.01, b.landing - b.rampStart)))
    : b.item.art === 'flush' ? clamp01((s - b.enter) / 0.5) : 1;
  const hit = s >= b.landing ? Math.exp(-(s - b.landing) * 6) : 0;
  const bob = Math.sin(s * 3) * 10;
  // odds items fly DOWN onto their chip on the rarity bar; counters just shrink away
  const e = ease(out);
  const tx = b.odds ? (bx(b.item.odds) - IX) * e : 0;
  const ty = b.odds ? (BY - IY) * e : 0;
  const sc = pop * (1 + 0.12 * hit) * (b.odds ? 1 - e * (1 - (CHIP * 2) / IS) : 1 - e);
  const chestOpen = b.item.art === 'chest' ? Math.max(k, Math.abs(Math.sin((s - b.enter) * 7)) * 0.5) : k;
  return (
    <div style={{position: 'absolute', left: IX - IS / 2, top: IY - IS / 2, width: IS, height: IS,
      transform: `translate(${tx}px, ${ty + bob * (1 - e)}px) scale(${sc})`, transformOrigin: '50% 50%'}}>
      <Box size={IS}><ArtFor art={b.item.art} t={s} k={chestOpen} /></Box>
    </div>
  );
};

const Burst: React.FC<{b: Beat; s: number; color: string}> = ({b, s, color}) => {
  const d = s - b.landing;
  if (d < 0 || d > 0.7) return null;
  const k = d / 0.7;
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <circle cx={IX} cy={IY} r={180 + 260 * ease(k)} fill="none" stroke={color} strokeWidth={22 * (1 - k)} opacity={1 - k} />
      {Array.from({length: 14}).map((_, i) => {
        const a = (i / 14) * Math.PI * 2 + 0.2;
        const r = 200 + 330 * ease(k);
        return <circle key={i} cx={IX + Math.cos(a) * r} cy={IY + Math.sin(a) * r * 0.9} r={12 * (1 - k) + 2} fill={i % 2 ? '#ffffff' : color} />;
      })}
    </svg>
  );
};

/* ───────────── the sting: a pile of tokens ───────────── */

const Pile: React.FC<{b: Beat; s: number}> = ({b, s}) => {
  const d = s - b.enter;
  if (d < 0) return null;
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      {Array.from({length: 70}).map((_, i) => {
        const t0 = (i % 35) * 0.06 + Math.floor(i / 35) * 0.9;
        const k = d - t0;
        if (k < 0) return null;
        const x = 90 + ((i * 167) % 900);
        // the pile builds BELOW the caption band (y > 1290), coins spawn under the note
        const land = 1660 - Math.floor(i / 10) * 52 - ((i * 37) % 30);
        const y = Math.min(land, 760 + k * k * 2600);
        const size = 92;
        return (
          <svg key={i} x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox="0 0 400 400" overflow="visible">
            <g transform={`rotate(${(i * 47) % 360} 200 200)`}><Token t={s + i} spin={y < land ? 1 : 0} /></g>
          </svg>
        );
      })}
    </svg>
  );
};

/* ───────────── the hook: token vs lightning ───────────── */

const Hook: React.FC<{s: number; frame: number; fps: number; hookEnd: number; headline: string[]}> = ({s, frame, fps, hookEnd, headline}) => {
  const out = ease(clamp01((s - hookEnd) / 0.3));
  if (out >= 1) return null;
  const pop = spring({frame: frame + 10, fps, config: {damping: 9, stiffness: 190}});
  const vs = spring({frame: frame + 4, fps, config: {damping: 8, stiffness: 220}});
  return (
    <>
      {[['token', 310, -6], ['bolt', 770, 6]].map(([art, x, rot], i) => (
        <div key={art as string} style={{position: 'absolute', left: (x as number) - 175, top: IY - 175 + Math.sin(s * 4 + i * 2) * 12,
          width: 350, height: 350, transform: `scale(${pop * (1 - out)}) rotate(${rot}deg)`}}>
          <Box size={350}>{art === 'token' ? <Token t={s} /> : <Bolt t={s} />}</Box>
        </div>
      ))}
      <div style={{position: 'absolute', left: IX - 80, top: IY - 70, width: 160, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
        fontSize: 110, color: '#ffffff', WebkitTextStroke: '12px #0a0c1e', paintOrder: 'stroke fill', transform: `scale(${vs * (1 - out)}) rotate(-6deg)`}}>VS</div>
      <div style={{position: 'absolute', top: 280, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900, lineHeight: 1.0,
        WebkitTextStroke: '13px #0a0c1e', paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', opacity: 1 - out,
        transform: `scale(${0.92 + 0.08 * spring({frame: frame + 6, fps, config: {damping: 8, stiffness: 200}})}) rotate(-2deg)`}}>
        <div style={{color: '#ffffff', fontSize: 118}}>{headline[0]}</div>
        <div style={{color: '#ffd23f', fontSize: 132}}>{headline[1]}</div>
      </div>
    </>
  );
};

/* ───────────── composition ───────────── */

const SFX_LAND: Record<string, [string, number]> = {
  shiny: ['shine', 0.7], golf: ['ding', 0.6], token: ['coins', 0.8], flush: ['shutter', 0.6],
  bolt: ['thunder', 0.75], chest: ['clank', 0.6], powerball: ['boom', 0.9], pile: ['coins', 0.9],
};

export const Odds: React.FC<{episode: OddsEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const b = beatAt(plan, s);
  const color = accentOf(b && s >= b.landing ? b : plan.beats.filter((x) => s >= x.landing).pop() ?? null);
  const pulse = Math.max(0, ...plan.beats.map((x) => (s >= x.landing ? Math.exp(-(s - x.landing) * 7) : 0)));
  const big = plan.beats.find((x) => x.item.art === 'powerball');
  const bolt = plan.beats.find((x) => x.item.art === 'bolt');
  const shakeOf = (x: Beat | undefined, amp: number) => {
    if (!x) return 0;
    const d = s - x.landing;
    return d > 0 && d < 0.8 ? amp * (1 - d / 0.8) : 0;
  };
  const shake = shakeOf(big, 26) + shakeOf(bolt, 18) + 7 * pulse;
  const flashD = bolt ? s - bolt.landing : -1;
  const flash = flashD < 0 ? 0 : flashD < 0.05 ? (flashD / 0.05) * 0.85 : Math.max(0, 0.85 * (1 - (flashD - 0.05) / 0.35));
  const caps = captions(ep, timing, plan);
  const ci = caps.findIndex((c) => s >= c.start && s < c.end);
  const cap = ci >= 0 ? caps[ci] : null;
  const capSize = cap ? Math.min(cap.hot ? 150 : 128, 820 / (cap.text.length * 0.78)) : 0;
  const capPop = cap ? 0.55 + 0.45 * spring({frame: frame - Math.round(cap.start * fps), fps, config: {damping: 9, stiffness: 240}}) : 1;
  const lineNow = [...plan.lineStarts].reverse().findIndex((t0) => s >= t0);
  const li = lineNow < 0 ? 0 : plan.lineStarts.length - 1 - lineNow;
  const note = s < plan.hookEnd ? '' : ep.lines[b ? b.line : li]?.note ?? '';
  const barShow = clamp01((s - plan.hookEnd) / 0.4);
  const onStage = plan.beats.filter((x) => s >= x.enter && s < x.leave + FLY && x.item.art !== 'pile');
  const pile = plan.beats.find((x) => x.item.art === 'pile');

  return (
    <AbsoluteFill style={{background: '#070917', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${Math.sin(frame * 2.1) * shake}px, ${Math.cos(frame * 2.7) * shake * 0.7}px)`}}>
        <Backdrop s={s} color={color} burst={pulse} spin={big && s >= big.landing ? 4 : 1} />
        <RarityBar beats={plan.beats} s={s} marker={markerAt(plan, s)} show={barShow} />
        {onStage.map((x) => <Item key={x.line} b={x} s={s} frame={frame} fps={fps} />)}
        {plan.beats.map((x) => <Burst key={x.line} b={x} s={s} color={accentOf(x)} />)}
        {pile ? <Pile b={pile} s={s} /> : null}
        {s >= plan.hookEnd ? <Readout b={b} s={s} frame={frame} fps={fps} pulse={pulse} /> : null}
        <div style={{position: 'absolute', top: 672, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 800, fontSize: 24,
          letterSpacing: 1.5, color: '#e6e9ff', textShadow: '0 2px 6px rgba(0,0,0,.8)', textTransform: 'uppercase', opacity: barShow}}>{note}</div>
        <Hook s={s} frame={frame} fps={fps} hookEnd={plan.hookEnd} headline={ep.headline} />
      </div>
      {cap ? (
        <div style={{position: 'absolute', top: CAP_TOP, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
          fontSize: capSize, lineHeight: 1.0, color: cap.hot ? '#ffd23f' : '#ffffff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #0a0c1e`,
          paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: 'nowrap',
          transform: `scale(${capPop}) rotate(${ci % 2 ? 2.5 : -2.5}deg)`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}
      <AbsoluteFill style={{pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 48%, transparent 58%, rgba(0,0,0,.45) 100%)'}} />
      <AbsoluteFill style={{background: '#ffffff', opacity: flash, pointerEvents: 'none'}} />
      <Audio src={staticFile(`music/${ep.id}.wav`)} volume={0.55} />
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}>
          <Audio src={staticFile(ln.file)} />
        </Sequence>
      ))}
      {plan.beats.map((x) => {
        const [snd, vol] = SFX_LAND[x.item.art] ?? ['shine', 0.6];
        return (
          <React.Fragment key={x.line}>
            <Sequence from={Math.round(x.enter * FPS)} durationInFrames={20}><Audio src={staticFile('sfx/pop.wav')} volume={0.45} /></Sequence>
            <Sequence from={Math.round(x.landing * FPS)} durationInFrames={110}><Audio src={staticFile(`sfx/${snd}.wav`)} volume={vol} /></Sequence>
            {x.odds && Number.isFinite(x.leave) ? (
              <Sequence from={Math.round(x.leave * FPS)} durationInFrames={25}><Audio src={staticFile('sfx/whoosh.wav')} volume={0.25} /></Sequence>
            ) : null}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
