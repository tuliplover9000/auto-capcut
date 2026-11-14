import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Deer, Edison, Face, FighterBox, Jensen, Sunflower, Tulip} from './art';
import {
  ATTACK, EventKind, FPS, FightEpisode, Plan, Side, Timing, TimedEvent, buildPlan, captions, eventOf, ghostAt, hpAt, lineAt, other, recoilAt,
} from './timeline';

// "A backyard garden bed lit like a fighting-game stage — saturated daylight
//  that drops into a cricket-quiet night for the twist."
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;

const W = 1080;
const GROUND = 1490;
const FW = 440; // fighter box width (400x700 viewBox -> 380x665)
const K = FW / 400;
const TX = 290; // tulip x
const SX = 790; // sunflower x
const TULIP_HEAD_Y = GROUND - (700 - 255) * K;
const SUN_HEAD_Y = GROUND - (700 - 215) * K;
const DS = 1.5; // deer scale (500x400 box)
const DEER_TOP = GROUND - 400 * DS;
const DEER_HEAD_X = 470 * DS;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const win = (s: number, t0: number, dur: number) => s >= t0 && s < t0 + dur;
const mixHex = (a: string, b: string, k: number) => {
  const h = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  return '#' + h(a).map((v, i) => Math.round(v + (h(b)[i] - v) * k).toString(16).padStart(2, '0')).join('');
};

/* ───────────── stage ───────────── */

const Backdrop: React.FC<{night: number; sunY: number; s: number}> = ({night, sunY, s}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${mixHex('#5ec8ff', '#0e1233', night)}, ${mixHex('#d6f3ff', '#2d2a5e', night)} ${GROUND}px)`}} />
    {night > 0.05 ? Array.from({length: 40}).map((_, i) => (
      <div key={i} style={{position: 'absolute', left: (i * 263) % W, top: 420 + ((i * 151) % 800), width: 5, height: 5, borderRadius: 3,
        background: '#fff', opacity: night * (0.5 + 0.5 * Math.sin(s * 3 + i))}} />
    )) : null}
    {night > 0.3 ? <div style={{position: 'absolute', left: 130, top: 760, width: 110, height: 110, borderRadius: 55,
      boxShadow: '26px -10px 0 0 #f4f1d0', opacity: clamp01((night - 0.3) * 2)}} /> : null}
    <div style={{position: 'absolute', left: 860, top: sunY, width: 140, height: 140, borderRadius: 70, background: '#ffe066',
      boxShadow: '0 0 90px 36px rgba(255,214,90,.65)'}} />
    <svg width={W} height={260} style={{position: 'absolute', left: 0, top: GROUND - 200}}>
      <ellipse cx={220} cy={250} rx={420} ry={150} fill={mixHex('#58b84a', '#1f3a2a', night)} />
      <ellipse cx={900} cy={260} rx={460} ry={160} fill={mixHex('#4aa83f', '#1a3324', night)} />
      {Array.from({length: 13}).map((_, i) => (
        <g key={i}>
          <rect x={i * 90 + 8} y={96} width={26} height={110} fill={mixHex('#f5ead2', '#5a5670', night)} />
          <polygon points={`${i * 90 + 8},96 ${i * 90 + 21},78 ${i * 90 + 34},96`} fill={mixHex('#f5ead2', '#5a5670', night)} />
        </g>
      ))}
      <rect x={0} y={120} width={W} height={14} fill={mixHex('#e8dcc0', '#4d4a62', night)} />
      <rect x={0} y={170} width={W} height={14} fill={mixHex('#e8dcc0', '#4d4a62', night)} />
    </svg>
    <div style={{position: 'absolute', left: 0, top: GROUND, width: W, height: 1920 - GROUND,
      background: `linear-gradient(${mixHex('#7a4a2a', '#2e1d14', night)}, ${mixHex('#5a3520', '#1e130d', night)})`}} />
    <div style={{position: 'absolute', left: 0, top: GROUND - 14, width: W, height: 28, background: mixHex('#4fae44', '#1f3a22', night), borderRadius: 14}} />
  </>
);

/* ───────────── HUD ───────────── */

const Bar: React.FC<{side: Side; hp: number; ghost: number; color: string; s: number}> = ({side, hp, ghost, color, s}) => {
  const w = 420;
  const x = side === 'L' ? 60 : W - 60 - w;
  const low = hp > 0 && hp < 25 && Math.floor(s * 6) % 2 === 0;
  // anchored at the OUTER edge: damage eats the bar toward the screen edge
  const fill = (v: number) => (w - 12) * (v / 100);
  const fx = (v: number) => (side === 'L' ? x + 6 + (w - 12) - fill(v) : x + 6);
  return (
    <svg width={W} height={120} style={{position: 'absolute', left: 0, top: 236}}>
      <rect x={x} y={0} width={w} height={60} rx={10} fill="#1b1b22" />
      <rect x={fx(ghost)} y={6} width={fill(ghost)} height={48} rx={6} fill="#fff1c4" />
      <rect x={fx(hp)} y={6} width={fill(hp)} height={48} rx={6} fill={low ? '#ff2a2a' : color} />
      <rect x={fx(hp)} y={8} width={fill(hp)} height={14} rx={6} fill="#ffffff" opacity={0.35} />
    </svg>
  );
};

const Hud: React.FC<{ep: FightEpisode; plan: Plan; s: number}> = ({ep, plan, s}) => {
  const note = ep.lines[lineAt(plan, s)].note;
  const timer = Math.max(0, 99 - Math.floor(s * 1.5));
  const nameStyle: React.CSSProperties = {position: 'absolute', top: 302, fontFamily: heavy, fontWeight: 900, fontSize: 40, color: '#fff',
    WebkitTextStroke: '8px #111', paintOrder: 'stroke fill', letterSpacing: 2};
  return (
    <>
      <Bar side="L" hp={hpAt(plan, 'L', s)} ghost={ghostAt(plan, 'L', s)} color={ep.fighters.L.color} s={s} />
      <Bar side="R" hp={hpAt(plan, 'R', s)} ghost={ghostAt(plan, 'R', s)} color={ep.fighters.R.color} s={s} />
      <div style={{position: 'absolute', left: 540 - 56, top: 210, width: 112, height: 112, borderRadius: 56, background: '#1b1b22',
        border: '6px solid #ffd23f', boxSizing: 'border-box', fontFamily: heavy, fontWeight: 900, fontSize: 52, color: '#fff',
        textAlign: 'center', lineHeight: '100px', fontVariantNumeric: 'tabular-nums'}}>{timer}</div>
      <div style={{...nameStyle, left: 122}}>{ep.fighters.L.name}</div>
      <div style={{...nameStyle, right: 140}}>{ep.fighters.R.name}</div>
      {note ? (
        <div style={{position: 'absolute', top: 372, left: 130, width: 820, textAlign: 'center', fontFamily: heavy, fontWeight: 800, fontSize: 25,
          letterSpacing: 1.5, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.8)', textTransform: 'uppercase'}}>{note}</div>
      ) : null}
    </>
  );
};

/* ───────────── effects ───────────── */

const ART_HEAD: Record<string, number> = {tulip: 255, sunflower: 215, jensen: 200, edison: 200};
const artOf = (ep: FightEpisode, side: Side) => ep.fighters[side].art ?? (side === 'L' ? 'tulip' : 'sunflower');
/** world position of a fighter's head (L can be scaled by the grow move) */
const headAt = (ep: FightEpisode, side: Side, grow = 1): [number, number] =>
  [side === 'L' ? TX : SX, GROUND - (700 - (ART_HEAD[artOf(ep, side)] ?? 220)) * K * (side === 'L' ? grow : 1)];

const Beam: React.FC<{e: TimedEvent; s: number; ep: FightEpisode}> = ({e, s, ep}) => {
  const k = (s - e.t) / ATTACK.beam!.dur;
  if (k < 0 || k > 1) return null;
  const grow = clamp01(k / 0.2);
  const w = (60 + 20 * Math.sin(s * 60)) * (k > 0.8 ? (1 - k) / 0.2 : 1);
  const from = e.who ?? 'R';
  const dir = from === 'R' ? -1 : 1;
  const [ax, ay] = headAt(ep, from);
  const [bx, by] = headAt(ep, other(from));
  const [x1, y1] = [ax + dir * 70, ay];
  const [x2, y2] = [x1 + (bx - dir * 30 - x1) * grow, y1 + (by - y1) * grow];
  const col = e.color ?? '#ffe24a';
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={w * 1.7} strokeLinecap="round" opacity={0.55} style={{filter: 'blur(10px)'}} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={e.color ? col : '#fff58a'} strokeWidth={w} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={w * 0.4} strokeLinecap="round" />
      {grow >= 1 ? <circle cx={x2} cy={y2} r={70 + 20 * Math.sin(s * 50)} fill="#fff7b0" opacity={0.85} style={{filter: 'blur(6px)'}} /> : null}
    </svg>
  );
};

const Coins: React.FC<{e: TimedEvent; s: number}> = ({e, s}) => {
  if (!win(s, e.t, ATTACK.coins!.dur + 0.4)) return null;
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      {Array.from({length: 18}).map((_, i) => {
        const t0 = e.t + i * 0.06;
        const k = (s - t0) / 0.5;
        if (k < 0) return null;
        const x = SX + (((i * 73) % 260) - 130) + (k > 1 ? (k - 1) * (i % 2 ? 300 : -300) : 0);
        const y = k <= 1 ? 470 + k * k * (SUN_HEAD_Y - 470 + ((i * 37) % 120) - 40) : SUN_HEAD_Y + 40 - Math.sin((k - 1) * Math.PI) * 120 + (k - 1) * 400;
        const spin = Math.abs(Math.cos(s * 14 + i));
        return (
          <g key={i} opacity={k > 1.8 ? 0 : 1}>
            <ellipse cx={x} cy={y} rx={30 * spin + 4} ry={30} fill="#f2b81a" />
            <ellipse cx={x} cy={y} rx={22 * spin + 2} ry={22} fill="#ffd84a" />
            {spin > 0.5 ? <text x={x} y={y + 13} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={34} fill="#b27a00">ƒ</text> : null}
          </g>
        );
      })}
    </svg>
  );
};

const Seeds: React.FC<{e: TimedEvent; s: number}> = ({e, s}) => {
  if (!win(s, e.t, ATTACK.seeds!.dur + 0.4)) return null;
  const [mx, my] = [SX - 85, SUN_HEAD_Y + 10];
  const flashOn = s < e.t + ATTACK.seeds!.dur && Math.floor(s * 22) % 2 === 0;
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      {flashOn ? <polygon points={`${mx},${my - 40} ${mx - 70},${my} ${mx},${my + 40} ${mx - 20},${my}`} fill="#fff27a" /> : null}
      {Array.from({length: 30}).map((_, i) => {
        const t0 = e.t + i * 0.042;
        const k = (s - t0) / 0.26;
        if (k < 0 || k > 1) return null;
        const tx = TX + 40 + ((i * 29) % 60) - 30;
        const ty = TULIP_HEAD_Y + ((i * 41) % 90) - 45;
        const x = mx + (tx - mx) * k;
        const y = my + (ty - my) * k;
        const a = (Math.atan2(ty - my, tx - mx) * 180) / Math.PI;
        return (
          <g key={i} transform={`rotate(${a} ${x} ${y})`}>
            <ellipse cx={x} cy={y} rx={20} ry={9} fill="#1f1a17" />
            <line x1={x - 14} y1={y} x2={x + 14} y2={y} stroke="#e9e2d0" strokeWidth={2.5} />
            <line x1={x - 10} y1={y - 5} x2={x + 10} y2={y - 5} stroke="#e9e2d0" strokeWidth={2} />
          </g>
        );
      })}
    </svg>
  );
};

const Spark: React.FC<{x: number; y: number; k: number; color: string}> = ({x, y, k, color}) => (
  <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
    <g transform={`translate(${x} ${y}) scale(${0.6 + k * 1.1})`} opacity={1 - k}>
      <polygon points="0,-90 22,-26 88,-30 34,10 56,74 0,34 -56,74 -34,10 -88,-30 -22,-26" fill={color} />
      <polygon points="0,-48 12,-14 46,-16 18,6 30,40 0,18 -30,40 -18,6 -46,-16 -12,-14" fill="#ffffff" />
    </g>
  </svg>
);

/* banners: slanted band that slams in from the attacker's side */
const Band: React.FC<{k: number; from: Side; color: string; label?: string; text: string; size?: number; top?: number}> =
  ({k, from, color, label, text, size = 104, top = 446}) => {
  const inK = clamp01(k / 0.12);
  const outK = clamp01((k - 0.86) / 0.14);
  const dx = (from === 'L' ? -1 : 1) * W * ((1 - ease(inK)) + ease(outK));
  return (
    <div style={{position: 'absolute', left: -40, top, width: W + 80, height: 150, background: color, transform: `translateX(${dx}px) skewY(-5deg)`,
      boxShadow: '0 10px 0 rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      {label ? <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 30, letterSpacing: 6, color: '#111', marginBottom: -6}}>{label}</div> : null}
      <div style={{fontFamily: heavy, fontWeight: 900, fontSize: Math.min(size, 960 / (text.length * 0.7)), color: '#fff', WebkitTextStroke: `${Math.round(Math.min(size, 960 / (text.length * 0.7)) * 0.12)}px #111`,
        paintOrder: 'stroke fill', lineHeight: 1, fontStyle: 'italic', whiteSpace: 'nowrap'}}>{text}</div>
    </div>
  );
};

const Slam: React.FC<{k: number; text: string; color: string; size: number; top: number}> = ({k, text, color, size, top}) => {
  const sc = k < 0.15 ? 2.4 - 1.4 * (k / 0.15) : 1 + 0.03 * Math.sin(k * 30);
  return (
    <div style={{position: 'absolute', left: 0, top, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: size,
      color, WebkitTextStroke: `${Math.round(size * 0.1)}px #111`, paintOrder: 'stroke fill', fontStyle: 'italic', lineHeight: 1,
      textShadow: '0 12px 0 rgba(0,0,0,.4)', transform: `scale(${sc}) rotate(-4deg)`, opacity: k > 0.88 ? (1 - k) / 0.12 : clamp01(k / 0.05)}}>{text}</div>
  );
};

/* ───────────── the ring (human fighters) + generic attacks ───────────── */

const RingBackdrop: React.FC<{s: number}> = ({s}) => {
  const crowd = ['#24143f', '#1c1034', '#150b29'];
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#3a1d6b, #160b2c 75%)'}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {[[170, -0.35], [540, 0], [910, 0.35]].map(([x, sk], i) => (
          <polygon key={i} points={`${x - 40},380 ${x + 40},380 ${x + 280 + sk * 260},${GROUND} ${x - 280 + sk * 260},${GROUND}`}
            fill="#fff4c8" opacity={0.08 + 0.03 * Math.sin(s * 2 + i)} />
        ))}
        {[0, 1, 2].map((row) => Array.from({length: 15}).map((_, i) => {
          const x = i * 78 + (row % 2) * 39 - 20;
          const y = 1010 + row * 68 + Math.abs(Math.sin(s * 6 + i * 1.7 + row)) * 9;
          return (
            <g key={`${row}-${i}`}>
              <circle cx={x} cy={y} r={28} fill={crowd[row]} />
              <rect x={x - 34} y={y + 20} width={68} height={70} rx={20} fill={crowd[row]} />
            </g>
          );
        }))}
        {Array.from({length: 7}).map((_, i) => (Math.floor(s * 6 + i * 3.7) % 11 === 0 ? (
          <circle key={i} cx={(i * 331 + 60) % W} cy={1000 + ((i * 53) % 150)} r={15} fill="#fff" opacity={0.95} style={{filter: 'blur(3px)'}} />
        ) : null))}
        {([[GROUND - 330, '#e8392f'], [GROUND - 240, '#f4f1ea'], [GROUND - 150, '#2f6fd8']] as Array<[number, string]>).map(([y, c], i) => (
          <rect key={i} x={0} y={y} width={W} height={12} rx={6} fill={c} />
        ))}
        <rect x={10} y={GROUND - 360} width={40} height={360} rx={8} fill="#c8c8d0" />
        <rect x={W - 50} y={GROUND - 360} width={40} height={360} rx={8} fill="#c8c8d0" />
      </svg>
      <div style={{position: 'absolute', left: 0, top: GROUND - 8, width: W, height: 64, background: '#ebe6da'}} />
      <div style={{position: 'absolute', left: 0, top: GROUND + 56, width: W, height: 1920 - GROUND - 56, background: 'linear-gradient(#2453c9, #15348f)'}} />
    </>
  );
};

const Sprite: React.FC<{kind?: string; x: number; y: number; rot: number; t: number}> = ({kind, x, y, rot, t}) => {
  if (kind === 'paper') {
    return (
      <g transform={`translate(${x} ${y}) rotate(${rot})`}>
        <rect x={-32} y={-40} width={64} height={80} rx={4} fill="#fbfaf2" />
        <rect x={-24} y={-32} width={34} height={9} fill="#c0392b" />
        {[-14, -2, 10, 22].map((yy) => <rect key={yy} x={-24} y={yy} width={48} height={4} fill="#b9b6aa" />)}
      </g>
    );
  }
  if (kind === 'pancake') {
    return (
      <g transform={`translate(${x} ${y}) rotate(${rot * 0.3})`}>
        {[18, 4, -10].map((yy, i) => <ellipse key={i} cx={0} cy={yy} rx={48} ry={15} fill={i % 2 ? '#c27f33' : '#d9984a'} />)}
        <rect x={-12} y={-30} width={24} height={14} rx={3} fill="#ffe27a" />
        <path d="M -40 -8 Q -46 14, -38 22" fill="none" stroke="#8a4b12" strokeWidth={6} strokeLinecap="round" />
      </g>
    );
  }
  if (kind === 'gpu') {
    return (
      <g transform={`translate(${x} ${y}) rotate(${rot * 0.25})`}>
        <rect x={-78} y={-34} width={156} height={68} rx={8} fill="#24262c" />
        <rect x={-78} y={-34} width={156} height={10} rx={4} fill="#76b900" />
        {[-36, 36].map((fx) => (
          <g key={fx}>
            <circle cx={fx} cy={6} r={24} fill="#3a3d46" />
            {[0, 1, 2].map((b) => <line key={b} x1={fx} y1={6} x2={fx + Math.cos(t * 30 + b * 2.1) * 20} y2={6 + Math.sin(t * 30 + b * 2.1) * 20} stroke="#8a8f9c" strokeWidth={5} />)}
          </g>
        ))}
        <rect x={-60} y={34} width={120} height={8} fill="#c9a640" />
      </g>
    );
  }
  return <ellipse cx={x} cy={y} rx={28} ry={28} fill="#f2b81a" />;
};

const Volley: React.FC<{e: TimedEvent; s: number; ep: FightEpisode}> = ({e, s, ep}) => {
  if (!win(s, e.t, ATTACK.volley!.dur + 0.5)) return null;
  const from = e.who ?? 'L';
  const to = other(from);
  const dir = to === 'R' ? 1 : -1;
  const [ax, ay] = headAt(ep, from);
  const [bx, by] = headAt(ep, to);
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      {Array.from({length: 11}).map((_, i) => {
        const k = (s - e.t - i * 0.07) / 0.4;
        if (k < 0 || k > 1) return null;
        const sx = ax + dir * 80;
        const sy = ay + 60;
        const tx = bx - dir * 20 + (((i * 37) % 80) - 40);
        const ty = by + (((i * 53) % 140) - 50);
        return <Sprite key={i} kind={e.sprite} x={sx + (tx - sx) * k} y={sy + (ty - sy) * k - Math.sin(k * Math.PI) * 150}
          rot={k * 540 * dir + i * 30} t={s} />;
      })}
    </svg>
  );
};

const Rain: React.FC<{e: TimedEvent; s: number; ep: FightEpisode}> = ({e, s, ep}) => {
  if (!win(s, e.t, ATTACK.rain!.dur + 0.6)) return null;
  const to = other(e.who ?? 'L');
  const [bx, by] = headAt(ep, to);
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      {Array.from({length: 14}).map((_, i) => {
        const k = (s - e.t - i * 0.07) / 0.5;
        if (k < 0 || k > 2) return null;
        const side = i % 2 ? 1 : -1;
        const x = bx + (((i * 73) % 240) - 120) + (k > 1 ? (k - 1) * side * 320 : 0);
        const y = k <= 1 ? 420 + k * k * (by - 420 + ((i * 37) % 160) - 40) : by + 60 - Math.sin(Math.min(1, k - 1) * Math.PI) * 140 + (k - 1) * 420;
        return <Sprite key={i} kind={e.sprite} x={x} y={y} rot={k * 200 * side + i * 25} t={s} />;
      })}
    </svg>
  );
};

const Bulb: React.FC<{e: TimedEvent; s: number; ep: FightEpisode}> = ({e, s, ep}) => {
  if (!win(s, e.t, 1.3)) return null;
  const [hx, hy] = headAt(ep, e.who ?? 'R');
  const pop = spring({frame: Math.round((s - e.t) * 30), fps: 30, config: {damping: 9, stiffness: 200}});
  const on = clamp01((s - e.t - 0.25) / 0.12);
  const fade = s > e.t + 1.0 ? 1 - (s - e.t - 1.0) / 0.3 : 1;
  const glass = on > 0 ? '#fff7c4' : '#e6f2f7';
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <g transform={`translate(${hx} ${hy - 300}) scale(${pop * 1.3})`} opacity={fade}>
        {on > 0 ? <circle cx={0} cy={0} r={150 + 30 * Math.sin(s * 40)} fill="#fff6b0" opacity={0.7 * on} style={{filter: 'blur(20px)'}} /> : null}
        <circle cx={0} cy={0} r={74} fill={glass} opacity={0.95} />
        <path d="M -28 54 L 28 54 L 22 88 L -22 88 Z" fill={glass} />
        <path d="M -20 20 Q -10 -14, 0 18 Q 10 -14, 20 20" fill="none" stroke={on > 0 ? '#ff9a1a' : '#8a8f9c'} strokeWidth={6} />
        {[96, 112, 128].map((y) => <rect key={y} x={-26} y={y - 8} width={52} height={12} rx={5} fill="#9aa0a8" />)}
      </g>
    </svg>
  );
};

/* ───────────── composition ───────────── */

export const Fight: React.FC<{episode: FightEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const ev = (kind: Parameters<typeof eventOf>[1], side?: Side) => eventOf(plan, kind, side);
  const hookEnd = plan.lineEnds[0];
  const ring = ep.stage === 'ring';
  const blackoutE = ev('blackout');
  const powerE = ev('power');
  const koOf = (side: Side) => plan.events.find((e) => (e.kind === 'ko' || e.kind === 'chomp') && e.target === side);
  const reviveOf = (side: Side) => plan.events.find((e) => e.kind === 'revive' && e.target === side);
  const fallOf = (side: Side) => {
    const ko = koOf(side);
    if (!ko || ko.kind === 'chomp') return 0;
    const rv = reviveOf(side);
    return ease(clamp01((s - ko.t - 0.45) / 0.45)) * (rv ? 1 - ease(clamp01((s - rv.t - 0.3) / 0.4)) : 1);
  };
  const ownWin = (side: Side, kinds: EventKind[], pre: number, dur: number) =>
    plan.events.some((e) => kinds.includes(e.kind) && (e.who ?? e.target) === side && win(s, e.t - pre, dur));

  // ── world state from the events
  const sunset = ev('sunset');
  const night = sunset ? ease(clamp01((s - sunset.t) / 1.2)) : 0;
  const sunY = 560 + night * 1100;
  const growE = ev('grow');
  const shrinkE = ev('shrink');
  const grow = 1 + 0.7 * (growE ? ease(clamp01((s - growE.t) / 0.5)) : 0) * (shrinkE ? 1 - ease(clamp01((s - shrinkE.t) / 0.5)) : 1);
  const stompE = ev('stomp');
  const stomp = stompE ? Math.max(0, Math.sin(Math.PI * clamp01((s - stompE.t) / 0.55))) : 0;
  const chompL = plan.events.find((e) => e.kind === 'chomp' && e.target === 'L');
  const chompR = plan.events.find((e) => e.kind === 'chomp' && e.target === 'R');
  const biteL = chompL ? clamp01((s - chompL.t - 0.18) / 0.2) : 0;
  const biteR = chompR ? clamp01((s - chompR.t - 0.18) / 0.2) : 0;
  const chargeE = ev('charge');
  const charge = chargeE && s >= chargeE.t ? clamp01((s - chargeE.t) / 1.6) * (sunset ? 1 - clamp01((s - sunset.t - 0.3) / 0.4) : 1) : 0;
  const winsE = ev('banner');
  const deerE = ev('deer');
  const turnE = ev('deerTurn');
  const winnerE = ev('winner');

  // ── deer: walks in to the tulip, then over to the sunflower
  const dx1 = TX - DEER_HEAD_X + 30;
  const dx2 = SX - DEER_HEAD_X + 10;
  let deerX = -900;
  let walking = false;
  if (deerE && s >= deerE.t - 0.1) {
    const a = clamp01((s - deerE.t + 0.1) / 1.3);
    deerX = -900 + (dx1 + 900) * ease(a);
    walking = a < 1;
    if (turnE && s >= turnE.t + 0.15) {
      const b = clamp01((s - turnE.t - 0.15) / 0.9);
      deerX = dx1 + (dx2 - dx1) * ease(b);
      walking = b < 1;
    }
  }
  const reachFor = (c?: TimedEvent) => (c ? clamp01((s - c.t + 0.25) / 0.3) * (1 - clamp01((s - c.t - 0.7) / 0.3)) : 0);
  const reach = Math.max(reachFor(chompL), reachFor(chompR), winnerE ? clamp01((s - winnerE.t) / 0.3) * 0.4 : 0);
  const chewing = [chompL, chompR].some((c) => c && s > c.t + 0.2 && s < c.t + 1.4);
  const chew = chewing ? Math.abs(Math.sin(s * 18)) : 0;
  const crown = winnerE ? ease(clamp01((s - winnerE.t - 0.2) / 0.5)) : 0;

  // ── faces
  const recL = recoilAt(plan, 'L', s);
  const recR = recoilAt(plan, 'R', s);
  const hpL = hpAt(plan, 'L', s);
  const coinsE = ev('coins');
  const faceL: Face = recL > 0.25 ? 'hurt' : coinsE && win(s, coinsE.t - 1.2, 2.8) ? 'smug'
    : deerE && s > deerE.t ? 'shock' : hpL < 25 && grow < 1.05 ? 'sad' : 'angry';
  const faceR: Face = turnE && s > turnE.t - 0.1 ? 'shock' : winsE && s > winsE.t - 0.1 ? 'happy' : recR > 0.25 ? 'hurt'
    : sunset && s > sunset.t + 0.2 ? 'sad' : deerE && s > deerE.t ? 'smug' : 'angry';
  const armL = coinsE && win(s, coinsE.t - 0.3, ATTACK.coins!.dur + 0.5) ? 1 : growE && win(s, growE.t, 0.9) ? 1 : 0;
  const armR = winsE && turnE && win(s, winsE.t, turnE.t - winsE.t) ? 1 : chargeE && charge > 0 ? 0.6 : 0;
  // ring (humans): faces + arms derived from the generic events
  const winnerSide: Side | null = winnerE ? (ep.fighters.L.name === winnerE.text ? 'L' : 'R') : null;
  const bannerOn = (side: Side) => !!winsE && winsE.who === side && s >= winsE.t && !(powerE && s >= powerE.t);
  const ringFace = (side: Side): Face => {
    if (fallOf(side) > 0.3) return 'hurt';
    if (winnerSide === side && winnerE && s >= winnerE.t) return 'happy';
    if (bannerOn(side)) return 'happy';
    if (recoilAt(plan, side, s) > 0.25) return 'hurt';
    if (blackoutE && s > blackoutE.t && !(powerE && s >= powerE.t)) return 'shock';
    if (plan.events.some((e) => e.kind === 'move' && e.who === other(side) && win(s, e.t, 1.0))) return 'shock';
    if (ownWin(side, ['volley', 'rain', 'flash', 'armor'], 0, 2.4)) return 'smug';
    return 'angry';
  };
  const ringArm = (side: Side) => (ownWin(side, ['volley', 'rain', 'flash'], 0.15, 1.3) || bannerOn(side) ||
    (winnerSide === side && !!winnerE && s >= winnerE.t) ? 1 : ownWin(side, ['armor'], 0, 1.4) ? 0.35 : 0);
  const armorE = ev('armor');
  const shine = armorE ? clamp01((s - armorE.t) / 0.2) * (1 - clamp01((s - armorE.t - 1.6) / 0.5)) : 0;

  // ── intro: fighters slide in from the sides (mid-flight at frame 0)
  const introL = spring({frame: frame + 9, fps, config: {damping: 12, stiffness: 140}});
  const introR = spring({frame: frame + 7, fps, config: {damping: 12, stiffness: 140}});
  const idle = (ph: number) => (s < hookEnd ? Math.abs(Math.sin(s * 5 + ph)) * 14 : Math.abs(Math.sin(s * 3.2 + ph)) * 5);
  const wobble = hpL > 0 && hpL < 25 ? Math.sin(s * 9) * 4 : 0;

  // ── camera: punch toward every hit, shake on the big ones
  const punch = Math.max(0, ...plan.hits.map((h) => (s >= h.t ? Math.exp(-(s - h.t) * 6) : 0)));
  const bigShake = Math.max(0, ...plan.events.filter((e) => e.kind === 'stomp' || e.kind === 'chomp' || e.kind === 'fight')
    .map((e) => { const d = s - e.t - (e.kind === 'fight' ? 0 : 0.3); return d >= 0 && d < 0.6 ? 1 - d / 0.6 : 0; }));
  const lastHit = [...plan.hits].reverse().find((h) => h.t <= s);
  const focusX = lastHit ? (lastHit.target === 'L' ? TX : SX) : 540;
  const shakeX = Math.sin(frame * 2.3) * (18 * bigShake + 6 * punch);
  const shakeY = Math.cos(frame * 2.9) * (14 * bigShake + 4 * punch);
  const flash = Math.max(0, ...plan.hits.map((h) => (s >= h.t && s < h.t + 0.1 ? 0.35 * (1 - (s - h.t) / 0.1) : 0)));

  // ── captions (big, <=2 words) — the hook gets a fixed headline instead
  const caps = captions(ep, timing, plan);
  const capIdx = caps.findIndex((c) => s >= c.start && s < c.end);
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
  const firstKo = koOf('L') ?? koOf('R');
  const koOn = !!firstKo && win(s, firstKo.t + 0.45, 1.2);
  // a banner IS the caption while it's up (no doubled text)
  const bannerUp = plan.events.some((e) => (e.kind === 'move' && win(s, e.t, 1.6)) || (e.kind === 'stat' && win(s, e.t, 1.7)) || (e.kind === 'fight' && win(s, e.t, 1.0)) || (e.kind === 'banner' && s >= e.t && s < e.t + 2.5));
  const showCap = cap && s >= hookEnd && !(winnerE && s >= winnerE.t) && !koOn && !bannerUp;

  // damage numbers: one per attack, at the first hit
  const dmgPops = plan.events.filter((e) => ATTACK[e.kind] && e.kind !== 'chomp' && e.kind !== 'ko' && (e.dmg ?? 0) > 0).map((e) => {
    const t0 = e.t + ATTACK[e.kind]!.hits[0];
    return {t0, side: (e.target ?? (e.who === 'L' ? 'R' : 'L')) as Side, dmg: e.dmg ?? 0};
  });

  const tulipX = TX - FW / 2 - recL * 40 + (1 - introL) * -700;
  const sunX = SX - FW / 2 + recR * 40 + (1 - introR) * 700;

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: `${focusX}px 1050px`,
        transform: `translate(${shakeX}px, ${shakeY}px) scale(${1 + 0.06 * punch})`}}>
        {ring ? <RingBackdrop s={s} /> : <Backdrop night={night} sunY={sunY} s={s} />}
        {ring ? (
          <>
            <div style={{position: 'absolute', left: tulipX, top: GROUND - FW * 1.75 - idle(0) * (1 - fallOf('L')), width: FW, height: FW * 1.75,
              transformOrigin: '50% 100%', transform: `rotate(${-recL * 8}deg)`}}>
              <FighterBox w={FW}><Jensen face={ringFace('L')} arm={ringArm('L')} t={s} fall={fallOf('L')} dir={-1} shine={shine} /></FighterBox>
            </div>
            <div style={{position: 'absolute', left: sunX, top: GROUND - FW * 1.75 - idle(1.3) * (1 - fallOf('R')), width: FW, height: FW * 1.75,
              transformOrigin: '50% 100%', transform: `rotate(${recR * 8}deg)`}}>
              <FighterBox w={FW}><Edison face={ringFace('R')} arm={ringArm('R')} t={s} fall={fallOf('R')} dir={1} /></FighterBox>
            </div>
          </>
        ) : null}
        {ring ? null : <>
        {/* tulip */}
        <div style={{position: 'absolute', left: tulipX, top: GROUND - FW * 1.75 - idle(0), width: FW, height: FW * 1.75,
          transformOrigin: '50% 100%', transform: `scale(${grow}) rotate(${stomp * 24 - recL * 8 + wobble}deg)`}}>
          <FighterBox w={FW}><Tulip face={faceL} arm={armL} t={s} bite={biteL} droop={biteL > 0 ? ease(clamp01((s - chompL!.t - 0.3) / 0.6)) : 0} /></FighterBox>
        </div>
        {/* sunflower */}
        <div style={{position: 'absolute', left: sunX, top: GROUND - FW * 1.75 - idle(1.3), width: FW, height: FW * 1.75,
          transformOrigin: '50% 100%', transform: `rotate(${recR * 8}deg)`}}>
          <FighterBox w={FW}>
            <Sunflower face={faceR} arm={armR} t={s} glow={Math.max(charge, ev('beam') && win(s, ev('beam')!.t - 0.4, 1.3) ? 1 : 0)}
              tilt={charge > 0 ? Math.min(1, charge * 2) : 0} bite={biteR}
              droop={sunset && s > sunset.t + 0.3 && !(winsE && s > winsE.t) ? 0.35 : 0} />
          </FighterBox>
        </div>
        {/* deer */}
        {deerX > -899 ? (
          <svg width={500 * DS} height={400 * DS} viewBox="0 0 500 400" style={{position: 'absolute', left: deerX, top: DEER_TOP, overflow: 'visible'}}>
            <Deer walk={walking ? s * 2.2 : 0} reach={reach} chew={chew} crown={crown} />
          </svg>
        ) : null}
        </>}
        {/* attacks */}
        {plan.events.map((e, i) => e.kind === 'beam' ? <Beam key={i} e={e} s={s} ep={ep} /> : e.kind === 'coins' ? <Coins key={i} e={e} s={s} />
          : e.kind === 'seeds' ? <Seeds key={i} e={e} s={s} /> : e.kind === 'volley' ? <Volley key={i} e={e} s={s} ep={ep} />
          : e.kind === 'rain' ? <Rain key={i} e={e} s={s} ep={ep} /> : e.kind === 'flash' ? <Bulb key={i} e={e} s={s} ep={ep} /> : null)}
        {armorE && win(s, armorE.t, 1.6) ? (
          <div style={{position: 'absolute', left: TX - 260, top: headAt(ep, armorE.who ?? 'L')[1] + 120 - (s - armorE.t) * 40, width: 520, textAlign: 'center',
            fontFamily: heavy, fontWeight: 900, fontSize: 74, color: '#a8ff3a', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill',
            opacity: s > armorE.t + 1.3 ? (armorE.t + 1.6 - s) / 0.3 : 1, transform: `scale(${0.7 + 0.3 * clamp01((s - armorE.t) / 0.12)})`}}>{armorE.text}</div>
        ) : null}
        {plan.hits.filter((h) => h.dmg > 0 && s >= h.t && s < h.t + 0.3).map((h, i) => {
          const [x, y] = headAt(ep, h.target, grow);
          return <Spark key={i} x={x + (h.target === 'L' ? 30 : -30)} y={y} k={(s - h.t) / 0.3} color={h.dmg > 100 ? '#ff4f7b' : '#ffd23f'} />;
        })}
        {[chompL, chompR].map((c, i) => c && win(s, c.t + 0.2, 0.9) ? (
          <div key={i} style={{position: 'absolute', left: (c.target === 'L' ? TX : SX) - 200, top: (c.target === 'L' ? TULIP_HEAD_Y : SUN_HEAD_Y) - 190,
            width: 400, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: 92, color: '#ff4f4f', fontStyle: 'italic',
            WebkitTextStroke: '11px #111', paintOrder: 'stroke fill', transform: `scale(${0.6 + 0.4 * clamp01((s - c.t - 0.2) / 0.1)}) rotate(-8deg)`}}>CHOMP!</div>
        ) : null)}
        {dmgPops.filter((d) => win(s, d.t0, 1.0)).map((d, i) => {
          const k = (s - d.t0) / 1.0;
          const [x, y] = headAt(ep, d.side, grow);
          return (
            <div key={i} style={{position: 'absolute', left: x - 120 + (d.side === 'L' ? -150 : 150), top: y - 130 - k * 90, width: 240, textAlign: 'center', fontFamily: heavy,
              fontWeight: 900, fontSize: 84, color: '#ff3b3b', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill',
              opacity: k > 0.75 ? (1 - k) / 0.25 : 1}}>{`-${Math.round(d.dmg)}`}</div>
          );
        })}
        {sunset && win(s, sunset.t + 0.6, 1.8) ? (
          <div style={{position: 'absolute', left: SX - 230, top: SUN_HEAD_Y - 60, width: 460, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
            fontSize: 70, color: '#ff3b3b', border: '10px solid #ff3b3b', borderRadius: 18, background: 'rgba(255,255,255,.85)',
            transform: `rotate(-12deg) scale(${1 + 0.6 * (1 - clamp01((s - sunset.t - 0.6) / 0.12))})`, padding: '6px 0'}}>MOVE FAILED</div>
        ) : null}
      </div>

      {/* vignette (deeper at night) */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 55%, transparent 55%, rgba(0,0,0,${(0.25 + 0.3 * night).toFixed(2)}) 100%)`}} />
      <AbsoluteFill style={{background: '#fff', opacity: Math.max(flash, ...plan.events.filter((e) => e.kind === 'flash').map((e) => {
        const d = s - e.t - ATTACK.flash!.hits[0]; return d >= 0 && d < 0.6 ? 0.9 * (1 - d / 0.6) : 0; }))}} />
      {blackoutE && s >= blackoutE.t + 0.08 ? (() => {
        const d = powerE ? s - powerE.t : -1;
        const dark = d < 0 ? 0.9 : d < 0.5 ? (Math.floor(d * 14) % 2 ? 0.9 : 0.15) : 0;
        if (dark <= 0) return null;
        const spotSide = winsE && winsE.who && bannerOn(winsE.who) ? winsE.who : null;
        const cx = spotSide === 'L' ? TX : SX;
        return <AbsoluteFill style={{background: spotSide ? `radial-gradient(circle at ${cx}px 1150px, rgba(0,0,0,0) 0, rgba(0,0,0,0) 190px, rgba(0,0,0,${dark}) 330px)` : `rgba(0,0,0,${dark})`}} />;
      })() : null}
      {powerE && win(s, powerE.t + 0.5, 1.6) ? (
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 100%, rgba(118,185,0,${(0.55 * (1 - (s - powerE.t - 0.5) / 1.6)).toFixed(2)}) 0, transparent 70%)`}} />
      ) : null}

      <Hud ep={ep} plan={plan} s={s} />

      {/* banners */}
      {plan.events.map((e, i) => {
        const fc = e.who ? ep.fighters[e.who].color : '#ffd23f';
        if (e.kind === 'move' && win(s, e.t, 1.6)) return <Band key={i} k={(s - e.t) / 1.6} from={e.who!} color={fc} label="SPECIAL MOVE" text={e.name!} />;
        if (e.kind === 'stat' && win(s, e.t, 1.7)) return <Band key={i} k={(s - e.t) / 1.7} from="L" color="#ffffff" text={e.text!} size={92} />;
        const cutE = turnE ?? powerE;
        if (e.kind === 'banner' && cutE && win(s, e.t, cutE.t - e.t + 0.25)) {
          const cut = clamp01((s - cutE.t) / 0.25);
          return <div key={i} style={{transform: `translateY(${cut * 900}px) rotate(${cut * 25}deg)`}}>
            <Band k={Math.min(0.5, (s - e.t) / 1.6)} from={e.who ?? 'R'} color={fc} text={e.text!} size={96} /></div>;
        }
        if (e.kind === 'fight' && win(s, e.t, 1.0)) return <Slam key={i} k={(s - e.t) / 1.0} text="FIGHT!" color="#ffd23f" size={230} top={560} />;
        return null;
      })}
      {koOn ? <Slam k={(s - firstKo!.t - 0.45) / 1.2} text="K.O." color="#ff3b3b" size={260} top={560} /> : null}

      {/* hook headline */}
      {s < hookEnd ? (
        <div style={{position: 'absolute', top: 440, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 900, lineHeight: 0.95,
          WebkitTextStroke: '14px #111', paintOrder: 'stroke fill', textShadow: '0 10px 0 rgba(0,0,0,.35)', fontStyle: 'italic',
          transform: `scale(${0.9 + 0.1 * spring({frame: frame + 5, fps, config: {damping: 8, stiffness: 200}})}) rotate(-3deg)`}}>
          {(['L', 'R'] as Side[]).map((sd, i) => {
            const nm = ep.fighters[sd].name;
            return (
              <React.Fragment key={sd}>
                {i === 1 ? <div style={{fontSize: 96, color: '#ffffff'}}>VS</div> : null}
                <div style={{fontSize: Math.min(i ? 128 : 150, 840 / (nm.length * 0.8)), color: ep.fighters[sd].color, whiteSpace: 'nowrap'}}>{nm}</div>
              </React.Fragment>
            );
          })}
        </div>
      ) : null}

      {showCap && cap ? (
        <div style={{position: 'absolute', top: 612, left: 120, width: 820, textAlign: 'center', fontFamily: heavy, fontWeight: 900,
          fontSize: capSize, lineHeight: 1.0, color: cap.hot ? '#ffd23f' : '#ffffff', WebkitTextStroke: `${Math.round(capSize * 0.11)}px #111`,
          paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.35)', whiteSpace: capWrap ? 'normal' : 'nowrap',
          transform: `scale(${capPop}) rotate(${capIdx % 2 ? 2.5 : -2.5}deg)`, textTransform: 'uppercase'}}>{cap.text}</div>
      ) : null}

      {/* the winner card */}
      {winnerE && s >= winnerE.t ? (
        <>
          <AbsoluteFill style={{background: `rgba(10,8,30,${(0.45 * clamp01((s - winnerE.t) / 0.3)).toFixed(2)})`}} />
          <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
            {Array.from({length: 46}).map((_, i) => {
              const k = s - winnerE.t;
              const x = (i * 197) % W + Math.sin(k * 3 + i) * 30;
              const y = -40 + ((k * (260 + (i % 5) * 60) + i * 53) % 1600);
              return <rect key={i} x={x} y={y} width={18} height={30} fill={['#ffd23f', '#ff4f7b', '#5ec8ff', '#7be07b'][i % 4]}
                transform={`rotate(${k * 300 + i * 40} ${x + 9} ${y + 15})`} />;
            })}
          </svg>
          <div style={{position: 'absolute', top: 470, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontStyle: 'italic',
            transform: `scale(${0.6 + 0.4 * spring({frame: frame - Math.round(winnerE.t * fps), fps, config: {damping: 8, stiffness: 180}})}) rotate(-4deg)`}}>
            <div style={{fontSize: 96, color: '#fff', WebkitTextStroke: '11px #111', paintOrder: 'stroke fill', letterSpacing: 6}}>WINNER</div>
            <div style={{fontSize: 250, color: '#ffd23f', WebkitTextStroke: '20px #111', paintOrder: 'stroke fill', lineHeight: 0.95,
              textShadow: '0 14px 0 rgba(0,0,0,.4)'}}>{winnerE.text}</div>
          </div>
        </>
      ) : null}

      {/* ── audio ── */}
      <Audio src={staticFile(`music/${ep.id}.wav`)} volume={0.5} />
      {timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round(plan.lineStarts[i] * FPS)}><Audio src={staticFile(ln.file)} /></Sequence>
      ))}
      {plan.events.map((e, i) => {
        const fx: Array<[string, number, number]> = []; // [file, offset s, volume]
        if (e.kind === 'fight') fx.push(['sfx/bell.wav', 0, 0.8]);
        if (e.kind === 'move' || e.kind === 'stat') fx.push(['sfx/slam.wav', 0, 0.7]);
        if (e.kind === 'beam') fx.push(['sfx/zap.wav', 0, 0.75]);
        if (e.kind === 'coins') fx.push(['sfx/coins.wav', 0, 0.8]);
        if (e.kind === 'seeds') fx.push(['sfx/seeds.wav', 0, 0.75]);
        if (e.kind === 'grow') fx.push(['sfx/grow.wav', 0, 0.8]);
        if (e.kind === 'stomp') fx.push(['sfx/boom.wav', 0.3, 0.9]);
        if (e.kind === 'sunset') fx.push(['sfx/fail.wav', 0.55, 0.8]);
        if (e.kind === 'deer' || e.kind === 'deerTurn') fx.push(['sfx/scratch.wav', 0, 0.7]);
        if (e.kind === 'chomp') fx.push(['sfx/chomp.wav', 0.18, 0.95]);
        if (e.kind === 'chomp' && e.target === 'L') fx.push(['sfx/boom.wav', 0.45, 0.8]);
        if (e.kind === 'beam' || e.kind === 'coins' || e.kind === 'stomp') fx.push(['sfx/punch.wav', ATTACK[e.kind]!.hits[0], 0.8]);
        if (e.kind === 'volley') fx.push(['sfx/whoosh.wav', 0, 0.7], ['sfx/punch.wav', 0.4, 0.8], ['sfx/punch.wav', 0.7, 0.6]);
        if (e.kind === 'rain') fx.push(['sfx/clank.wav', 0.5, 0.8], ['sfx/punch.wav', 0.6, 0.7]);
        if (e.kind === 'flash') fx.push(['sfx/ding.wav', 0.25, 0.8], ['sfx/punch.wav', 0.4, 0.7]);
        if (e.kind === 'armor') fx.push(['sfx/shine.wav', 0, 0.75]);
        if (e.kind === 'blackout') fx.push(['sfx/powerdown.wav', 0, 0.9]);
        if (e.kind === 'power') fx.push(['sfx/powerup.wav', 0, 0.9]);
        if (e.kind === 'ko') fx.push(['sfx/boom.wav', 0.45, 0.8]);
        return fx.map(([f, off, v], j) => (
          <Sequence key={`${i}-${j}`} from={Math.max(0, Math.round((e.t + off) * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
        ));
      })}
    </AbsoluteFill>
  );
};
