import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Shock, Slam, Spark} from '../fight/Fight';
import {camAt, Shot} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {Kid} from '../lift/art';
import {Bear, BearPose, Crate, Emblem, Penguin, Ship, Sign, Soldier, SPAL} from './art';
import {FPS, STEvent, StoryEpisode, at, buildPlan, lineAt} from './timeline';

// NARRATED TRUE STORY. One scene per beat, whip pans between scenes, every
// gag pinned to a spoken word, and a SERVICE RECORD card at the top that fills
// in as the story goes (the visible progress bar: name -> enlisted -> rank).
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

/* a character box positioned by its feet: x = centre, y = ground line */
const Fig: React.FC<{x: number; y: number; w: number; sq?: boolean; rot?: number; op?: number; children: React.ReactNode}> = ({x, y, w, sq, rot = 0, op = 1, children}) => {
  const h = sq ? w : w * 1.75;
  return (
    <svg width={w} height={h} viewBox={sq ? '0 0 400 400' : '0 0 400 700'} style={{position: 'absolute', left: x - w / 2, top: y - h, overflow: 'visible',
      transform: `rotate(${rot}deg)`, transformOrigin: '50% 100%', opacity: op}}>{children}</svg>
  );
};

const Ground: React.FC<{top: string; bot: string; lip: string}> = ({top, bot, lip}) => (
  <>
    <div style={{position: 'absolute', left: 0, top: GROUND, width: W, height: 1920 - GROUND, background: `linear-gradient(${top}, ${bot})`}} />
    <div style={{position: 'absolute', left: 0, top: GROUND - 14, width: W, height: 28, borderRadius: 14, background: lip}} />
  </>
);

type Ctx = {s: number; frame: number; T: (k: string) => number; ev: STEvent[]};

/* ───────────── scenes ───────────── */
const Parade: React.FC<Ctx> = ({s, T}) => {
  const tR = T('reveal');
  const hop = s >= tR ? Math.abs(Math.sin(clamp01((s - tR) / 0.45) * Math.PI)) * 40 : 0;
  const flag = (k: number) => Math.sin(s * 5 + k) * 8;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#7cc4ff, #dff1ff 62%)'}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <ellipse cx={200} cy={GROUND - 60} rx={520} ry={220} fill="#cfe3c0" />
        <ellipse cx={900} cy={GROUND - 40} rx={560} ry={230} fill="#bcd8ab" />
        {[120, 300, 760, 950].map((x, i) => <path key={x} d={`M ${x - 90} ${GROUND - 120} L ${x} ${GROUND - 260 - (i % 2) * 20} L ${x + 90} ${GROUND - 120} Z`} fill={i % 2 ? SPAL.khaki : SPAL.khakiLight} />)}
        <rect x={536} y={GROUND - 700} width={10} height={580} fill="#8a8f9c" />
        <path d={`M 546 ${GROUND - 690} Q ${640} ${GROUND - 690 + flag(0)}, 760 ${GROUND - 684 + flag(1)} L 760 ${GROUND - 614 + flag(1)} Q 640 ${GROUND - 620 + flag(0)}, 546 ${GROUND - 620} Z`} fill={SPAL.white} />
        <path d={`M 546 ${GROUND - 620} Q ${640} ${GROUND - 620 + flag(0)}, 760 ${GROUND - 614 + flag(1)} L 760 ${GROUND - 544 + flag(1)} Q 640 ${GROUND - 550 + flag(0)}, 546 ${GROUND - 550} Z`} fill={SPAL.red} />
      </svg>
      <Ground top="#d8c08a" bot="#b89a62" lip="#e6d29c" />
      {[[150, 0], [320, 1], [760, 2], [930, 3]].map(([x, i]) => (
        <Fig key={x} x={x} y={GROUND + 10} w={250}><Soldier i={i} face={i % 2 ? 'smug' : 'happy'} t={s} salute={1} flip={x > 540} /></Fig>
      ))}
      <Fig x={540} y={GROUND + 30 - hop} w={380}><Bear face={s >= tR ? 'happy' : 'smug'} t={s} cap pose={{salute: 1}} /></Fig>
      {s >= tR && s < tR + 0.5 ? <Spark x={640} y={GROUND - 560} k={(s - tR) / 0.5} color="#ffd23f" /> : null}
    </>
  );
};

const Desert: React.FC<Ctx> = ({s, T}) => {
  const tH = T('handover');
  const k = ease(clamp01((s - tH - 0.25) / 0.7));
  const cx = lerp(400, 690, k);
  const cy = lerp(GROUND - 70, GROUND - 150, k) - Math.sin(k * Math.PI) * 90;
  const bar = clamp01((s - tH + 0.05) / 0.45);
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#ffb36b, #ffe7bd 60%)'}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={800} cy={700} r={130} fill="#fff1c9" opacity={0.9} />
        <path d={`M 0 ${GROUND - 300} L 180 ${GROUND - 560} L 330 ${GROUND - 380} L 520 ${GROUND - 640} L 760 ${GROUND - 360} L 930 ${GROUND - 520} L 1080 ${GROUND - 340} L 1080 ${GROUND} L 0 ${GROUND} Z`} fill="#c98a5a" />
        <path d={`M 0 ${GROUND - 160} Q 260 ${GROUND - 300}, 540 ${GROUND - 170} Q 800 ${GROUND - 60}, 1080 ${GROUND - 220} L 1080 ${GROUND} L 0 ${GROUND} Z`} fill="#e3b574" />
      </svg>
      <Ground top="#e0b46c" bot="#c4924c" lip="#ecc888" />
      <Fig x={330} y={GROUND + 6} w={330} sq><Kid face={s >= tH + 0.6 ? 'happy' : 'smug'} t={s} /></Fig>
      <Fig x={800} y={GROUND + 10} w={300}><Soldier i={2} face="happy" t={s} flip hold={0} /></Fig>
      {bar > 0 && bar < 1 ? (
        <div style={{position: 'absolute', left: lerp(720, 380, ease(bar)) - 40, top: GROUND - 330 - Math.sin(bar * Math.PI) * 120, width: 80, height: 40, borderRadius: 6,
          background: '#5a2e16', border: '6px solid #c98f3a', boxSizing: 'border-box', transform: `rotate(${bar * 360}deg)`}} />
      ) : null}
      <Fig x={cx} y={cy} w={150}><Bear face={s >= T('zoom') ? 'sad' : 'shock'} t={s} /></Fig>
    </>
  );
};

const Tent: React.FC<Ctx> = ({s, T}) => {
  const tV = T('vodka');
  const tN = T('name');
  const hop = s >= tN ? Math.abs(Math.sin(clamp01((s - tN) / 0.5) * Math.PI * 2)) * 26 : 0;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#b98d55, #e7cf9c 40%, #dcc08a)'}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={`M 0 300 L 540 80 L 1080 300 L 1080 ${GROUND} L 0 ${GROUND} Z`} fill="#ead6a6" />
        {[180, 360, 540, 720, 900].map((x) => <line key={x} x1={540 + (x - 540) * 0.2} y1={140} x2={x} y2={GROUND} stroke="#cdb27a" strokeWidth={8} />)}
        <defs><radialGradient id="lamp" cx={220} cy={720} r={520} gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#fff2b0" stopOpacity={0.75} /><stop offset="1" stopColor="#fff2b0" stopOpacity={0} /></radialGradient></defs>
        <rect x={0} y={0} width={W} height={1920} fill="url(#lamp)" />
        <line x1={220} y1={500} x2={220} y2={640} stroke="#3a2a1a" strokeWidth={5} />
        <rect x={190} y={640} width={60} height={90} rx={12} fill="#c98f3a" />
        <rect x={200} y={652} width={40} height={60} rx={8} fill="#fff2b0" opacity={0.8 + 0.2 * Math.sin(s * 9)} />
        <rect x={620} y={GROUND - 170} width={420} height={60} rx={10} fill="#6b5a3a" />
        <rect x={640} y={GROUND - 110} width={16} height={110} fill="#4a3f24" /><rect x={1000} y={GROUND - 110} width={16} height={110} fill="#4a3f24" />
      </svg>
      <Ground top="#a88a58" bot="#8a6e42" lip="#bfa06a" />
      <Fig x={830} y={GROUND + 10} w={310}><Soldier i={1} face="happy" t={s} flip /></Fig>
      <Fig x={470} y={GROUND + 20 - hop} w={240}><Bear face="happy" t={s} pose={{bottle: s < tN ? 1 : 0, wave: s >= tN ? clamp01((s - tN) / 0.3) : 0}} label="VODKA" /></Fig>
      {s >= tV + 0.15 && s < tN ? (
        <div style={{position: 'absolute', left: 570, top: GROUND - 370, padding: '10px 22px', background: SPAL.white, borderRadius: 14, fontFamily: heavy, fontWeight: 900,
          fontSize: 44, color: SPAL.red, transform: `rotate(8deg) scale(${pop(s, tV + 0.15)})`, boxShadow: '0 8px 0 rgba(0,0,0,.25)'}}>(IT'S MILK)</div>
      ) : null}
    </>
  );
};

const Camp: React.FC<Ctx> = ({s, T}) => {
  const tG = T('grow');
  const tW = T('wrestle');
  const tB = T('beer');
  const grow = s < tG ? 0.5 : 0.5 + 0.5 * spring({frame: Math.round((s - tG) * FPS), fps: FPS, config: {damping: 9, stiffness: 120}});
  const wrestling = win(s, tW, 1.25);
  const wk = wrestling ? (s - tW) / 1.25 : 0;
  const tumble = wrestling ? Math.sin(wk * Math.PI * 3) * 14 : 0;
  const sx = wrestling ? lerp(780, 660, clamp01(wk * 4)) : s >= tW + 1.25 ? 720 : 800;
  const beer = s >= tB;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#86c9ff, #e2f2ff 60%)'}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <ellipse cx={540} cy={GROUND - 30} rx={900} ry={200} fill="#c7dba0" />
        {[60, 260, 470, 690, 900].map((x, i) => (
          <g key={x}>
            <path d={`M ${x - 110} ${GROUND - 60} L ${x} ${GROUND - 270 - (i % 2) * 30} L ${x + 110} ${GROUND - 60} Z`} fill={i % 2 ? SPAL.khakiDark : SPAL.khaki} />
            <path d={`M ${x - 20} ${GROUND - 60} L ${x} ${GROUND - 140} L ${x + 20} ${GROUND - 60} Z`} fill="#3a3324" />
          </g>
        ))}
      </svg>
      <Ground top="#c2ad72" bot="#a08a52" lip="#d4c08a" />
      {beer ? [[150, 0], [960, 3]].map(([x, i]) => <Fig key={x} x={x} y={GROUND + 10} w={240}><Soldier i={i} face="happy" t={s} cheer={1} flip={x > 540} /></Fig>) : null}
      <Fig x={sx} y={GROUND + 10} w={300} rot={-tumble * 1.5}><Soldier i={0} face={wrestling ? 'shock' : 'happy'} t={s} flip cheer={wrestling ? 1 : 0} /></Fig>
      <Fig x={430} y={GROUND + 24} w={400 * grow} rot={tumble}>
        <Bear face={wrestling ? 'smug' : 'happy'} t={s} pose={{hug: wrestling ? 1 : 0, bottle: beer ? 1 : 0}} label="BEER" />
      </Fig>
      {wrestling ? Array.from({length: 8}).map((_, k) => {
        const d = (wk * 1.25 - k * 0.12) / 0.5;
        if (d < 0 || d > 1) return null;
        return <div key={k} style={{position: 'absolute', left: 420 + rnd(k) * 300, top: GROUND - 80 - d * 50, width: 90 + d * 70, height: 60 + d * 40, borderRadius: '50%', background: '#e3d3a6', opacity: 0.8 * (1 - d)}} />;
      }) : null}
      {beer && s < tB + 0.5 ? <Spark x={560} y={GROUND - 560} k={(s - tB) / 0.5} color="#ffd23f" /> : null}
    </>
  );
};

const Port: React.FC<Ctx> = ({s, T}) => {
  const tP = T('problem');
  const tN = T('nopets');
  const walkK = clamp01(s / 1.0);
  const bx = s < tP ? 240 : lerp(240, 330, clamp01((s - tP) / 0.3));
  const signK = s < tN ? 0 : clamp01((s - tN) / 0.18);
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#9fd8ff, #f1f7ff 52%)'}} />
      <div style={{position: 'absolute', left: 0, top: 960, width: W, height: GROUND - 960, background: 'linear-gradient(#3f8fd0, #2c6fb0)'}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <g transform={`translate(400 ${GROUND - 90}) scale(0.95)`}><Ship t={s} /></g>
        {Array.from({length: 7}).map((_, k) => <path key={k} d={`M ${k * 170 - 40 + Math.sin(s * 2 + k) * 10} ${1020 + k * 40} q 30 -14 60 0 q 30 14 60 0`} fill="none" stroke="#bfe3ff" strokeWidth={5} opacity={0.6} />)}
        <path d={`M 620 ${GROUND - 40} L 820 ${GROUND - 250} L 860 ${GROUND - 240} L 680 ${GROUND - 30} Z`} fill="#8a6a44" />
      </svg>
      <Ground top="#9a7a50" bot="#6e5434" lip="#b08c5c" />
      {signK > 0 ? (
        <svg width={340} height={400} style={{position: 'absolute', left: 560, top: GROUND - 520, overflow: 'visible', transform: `scale(${2.2 - 1.2 * signK})`, opacity: signK, transformOrigin: '50% 100%'}}>
          <Sign lines={['NO PETS', 'ON BOARD']} />
        </svg>
      ) : null}
      <Fig x={870} y={GROUND + 10} w={280}><Soldier i={3} face={s >= tN ? 'smug' : 'happy'} t={s} flip /></Fig>
      <Fig x={bx} y={GROUND + 24} w={380}><Bear face={s >= tN ? 'sad' : s >= tP ? 'shock' : 'happy'} t={s} walk={s < tP ? walkK * 2 + s * 1.2 : 0} /></Fig>
    </>
  );
};

const Office: React.FC<Ctx> = ({s, T}) => {
  const tE = T('stamp');
  const tR = T('rank');
  const tP = T('paybook');
  const salute = s >= tR ? clamp01((s - tR) / 0.25) : 0;
  const stampDown = Math.max(0, 1 - Math.abs(s - tE) / 0.18);
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#cdb98c, #e5d6ae)'}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <rect x={0} y={1180} width={W} height={20} fill="#a8916a" />
        <rect x={640} y={640} width={300} height={200} fill={SPAL.white} /><rect x={640} y={740} width={300} height={100} fill={SPAL.red} />
        <rect x={120} y={600} width={340} height={260} rx={8} fill="#e9dfc4" stroke="#8a7a54" strokeWidth={8} />
        <path d="M 150 760 Q 230 640, 300 720 T 430 680" fill="none" stroke="#7aa2c8" strokeWidth={10} />
        <circle cx={300} cy={720} r={12} fill={SPAL.red} />
      </svg>
      <Ground top="#8a6e48" bot="#6a5232" lip="#9c7e54" />
      <Fig x={740} y={GROUND - 120} w={300}><Soldier i={1} face="smug" t={s} flip hold={s >= tP ? 1 : 0} /></Fig>
      {/* desk */}
      <div style={{position: 'absolute', left: 520, top: GROUND - 300, width: 560, height: 300, background: SPAL.woodDark, borderRadius: 10}} />
      <div style={{position: 'absolute', left: 500, top: GROUND - 320, width: 600, height: 40, background: SPAL.wood, borderRadius: 10}} />
      <div style={{position: 'absolute', left: 700, top: GROUND - 360 + stampDown * 30, width: 70, height: 50, background: '#5a3a24', borderRadius: 8}} />
      <Fig x={330} y={GROUND + 24} w={400}><Bear face={s >= tE ? 'happy' : 'smug'} t={s} cap={s >= tE} pose={{salute}} /></Fig>
      {s >= tP ? (
        <div style={{position: 'absolute', left: 300, top: 900, width: 480, height: 300, borderRadius: 16, background: '#7a2a2a', border: `8px solid ${SPAL.brass}`, boxSizing: 'border-box',
          color: SPAL.brass, fontFamily: TYPE, fontWeight: 900, textAlign: 'center', transform: `rotate(-5deg) scale(${pop(s, tP) * clamp01((s - tP) / 0.12)})`, boxShadow: '0 14px 0 rgba(0,0,0,.3)'}}>
          <div style={{fontSize: 40, marginTop: 34, letterSpacing: 4}}>SOLDIER'S</div>
          <div style={{fontSize: 64, letterSpacing: 6}}>PAYBOOK</div>
          <div style={{fontSize: 34, marginTop: 24, color: '#f4e3b0'}}>PTE. WOJTEK</div>
        </div>
      ) : null}
    </>
  );
};

const Cassino: React.FC<Ctx> = ({s, T}) => {
  const tB = T('boom');
  const tC = T('carry');
  const tN = T('never');
  const walk = s >= tC ? s - tC : 0;
  const bx = s < tC ? 860 : Math.max(330, 860 - walk * 120);
  const flashes = [0.6, 2.1, 3.4, 5.2, 7.0].map((o) => tB + o);
  const flash = Math.max(0, ...flashes.map((t) => (s >= t && s < t + 0.25 ? 1 - (s - t) / 0.25 : 0)));
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(#5a3a6a, #f08a4a 55%, #ffc27a)`}} />
      <AbsoluteFill style={{background: '#fff3d0', opacity: flash * 0.35}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={`M 0 ${GROUND - 260} L 300 820 L 520 640 L 760 760 L 1080 980 L 1080 ${GROUND} L 0 ${GROUND} Z`} fill="#6a4a5e" />
        {/* the abbey on the hilltop */}
        <rect x={430} y={560} width={190} height={90} fill="#f1e6d6" />
        <rect x={470} y={520} width={110} height={50} fill="#e4d6c2" />
        <path d="M 495 520 Q 525 470, 555 520 Z" fill="#e4d6c2" />
        {Array.from({length: 6}).map((_, k) => <rect key={k} x={444 + k * 28} y={590} width={12} height={22} fill="#7a6a72" />)}
        {[[600, 0], [380, 1], [760, 2]].map(([x, i]) => (
          <g key={x} opacity={0.55}>
            {[0, 1, 2, 3].map((j) => <circle key={j} cx={x + Math.sin(s * 0.8 + j + i) * 20} cy={620 - j * 70 - ((s * 30) % 70)} r={40 + j * 16} fill="#8a7a84" />)}
          </g>
        ))}
        <path d={`M 0 ${GROUND - 120} Q 400 ${GROUND - 260}, 1080 ${GROUND - 160} L 1080 ${GROUND} L 0 ${GROUND} Z`} fill="#4e3a46" />
        {/* a 25-pounder gun */}
        <g transform={`translate(150 ${GROUND - 120})`}>
          <rect x={-10} y={-40} width={260} height={34} rx={12} fill="#4f5a3a" transform="rotate(-18 0 0)" />
          <rect x={-60} y={-60} width={130} height={70} rx={10} fill="#5f6a46" />
          <circle cx={0} cy={30} r={64} fill="#2a2420" /><circle cx={0} cy={30} r={22} fill="#5f6a46" />
        </g>
        {/* the ammunition dump */}
        {[[860, 0], [960, 0], [910, 1]].map(([x, r], k) => (
          <g key={k} transform={`translate(${x - 70} ${GROUND - 100 - r * 90}) scale(0.58)`}><Crate label="100 LB" /></g>
        ))}
      </svg>
      <Ground top="#5a4a3a" bot="#3e3228" lip="#6e5a46" />
      {s >= tB && s < tB + 0.5 ? <Shock x={520} y={600} k={(s - tB) / 0.5} color="#ffd23f" /> : null}
      <Fig x={bx} y={GROUND + 24} w={400}><Bear face={s >= tN ? 'smug' : 'angry'} t={s} pose={{carry: s >= tC ? 1 : 0}} walk={s >= tC && bx > 331 ? s * 1.6 : 0} look={-1} /></Fig>
      {s >= tC ? (
        <svg width={260} height={170} style={{position: 'absolute', left: bx - 128, top: GROUND - 690, overflow: 'visible'}}>
          <g transform="scale(1.05)"><Crate label="100 LB" /></g>
        </svg>
      ) : null}
    </>
  );
};

const BadgeScene: React.FC<Ctx> = ({s, T}) => {
  const tB = T('badge');
  const tP = T('promote');
  const lineT = tB - 1.03;
  const k = clamp01((s - lineT) / 0.5);
  const sc = spring({frame: Math.round((s - lineT) * FPS), fps: FPS, config: {damping: 10, stiffness: 140}});
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: '#c8323a'}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {Array.from({length: 18}).map((_, i) => {
          const a = (i / 18) * Math.PI * 2 + s * 0.25;
          return <path key={i} d={`M 540 1080 L ${540 + Math.cos(a) * 1600} ${1080 + Math.sin(a) * 1600} L ${540 + Math.cos(a + 0.17) * 1600} ${1080 + Math.sin(a + 0.17) * 1600} Z`} fill="#e04450" />;
        })}
      </svg>
      <svg width={640} height={640} viewBox="0 0 400 400" style={{position: 'absolute', left: 220, top: 860, transform: `scale(${sc}) rotate(${(1 - k) * -30}deg)`, overflow: 'visible'}}>
        <Emblem t={s} />
      </svg>
      {s >= tB && s < tB + 0.6 ? <Spark x={760} y={960} k={(s - tB) / 0.6} color="#ffffff" /> : null}
      {s >= tP ? (
        <svg width={360} height={240} style={{position: 'absolute', left: 360, top: 1420, overflow: 'visible', transform: `scale(${pop(s, tP)})`}}>
          {[0, 1].map((j) => {
            const d = clamp01((s - tP - j * 0.12) / 0.15);
            return <path key={j} d={`M 10 ${40 + j * 90} L 180 ${-20 + j * 90} L 350 ${40 + j * 90} L 350 ${100 + j * 90} L 180 ${40 + j * 90} L 10 ${100 + j * 90} Z`}
              fill="#ffd23f" stroke="#111" strokeWidth={8} opacity={d} transform={`translate(0 ${(1 - d) * -200})`} />;
          })}
        </svg>
      ) : null}
    </>
  );
};

const Zoo: React.FC<Ctx> = ({s, T}) => {
  const tV = T('visit');
  const tC = T('call');
  const tA = T('answer');
  const tS = T('salute');
  const vk = ease(clamp01((s - tV) / 1.4));
  const ans = s >= tA ? clamp01((s - tA) / 0.3) : 0;
  const sal = s >= tS ? clamp01((s - tS) / 0.3) : 0;
  const warm = clamp01((s - tC) / 1.5);
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#9bb7d6, #f2dcc0 65%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(transparent, #ffb36b)', opacity: warm * 0.35}} />
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {/* the castle on its rock */}
        <path d={`M 0 1100 L 60 960 L 200 930 L 330 990 L 420 1100 Z`} fill="#7d8798" />
        <rect x={80} y={850} width={260} height={110} fill="#8e98a8" />
        {[90, 140, 190, 240, 290].map((x) => <rect key={x} x={x} y={830} width={30} height={30} fill="#8e98a8" />)}
        <rect x={170} y={780} width={70} height={90} fill="#8e98a8" />
        <ellipse cx={540} cy={GROUND - 40} rx={900} ry={240} fill="#9cbf86" />
        {/* the enclosure: rocks, pool */}
        <path d={`M 560 ${GROUND} L 600 1130 Q 760 1040, 900 1110 L 1080 1060 L 1080 ${GROUND} Z`} fill="#a89e8c" />
        <path d={`M 640 ${GROUND} L 680 1220 Q 800 1170, 940 1230 L 1080 1200 L 1080 ${GROUND} Z`} fill="#bdb3a0" />
      </svg>
      {/* hidden gag: a penguin in a beret on the far rock, side-eyeing the bear */}
      <Fig x={1010} y={1068} w={80} sq><Penguin t={s} /></Fig>
      <Ground top="#8fb07a" bot="#6e8e5c" lip="#a6c690" />
      <Fig x={800} y={GROUND + 24} w={360}><Bear face={s >= tA ? 'happy' : 'sad'} t={s} cap={s >= tS} pose={{wave: s >= tS ? 0 : ans, salute: sal}} look={-1} /></Fig>
      {/* the fence between them */}
      <svg width={W} height={300} style={{position: 'absolute', left: 0, top: GROUND - 230}}>
        <rect x={560} y={40} width={30} height={260} fill="#4a4f60" />
        {Array.from({length: 7}).map((_, k) => <rect key={k} x={0} y={60 + k * 34} width={590} height={8} fill="#4a4f60" opacity={0.5} />)}
      </svg>
      {s >= tV ? [0, 1, 2].map((k) => (
        <Fig key={k} x={lerp(-260 + k * 140, 110 + k * 150, vk)} y={GROUND + 10} w={240}>
          <Soldier i={k} old face="happy" t={s} walk={vk < 1 ? s * 1.6 + k : 0} wave={k === 2 && s >= tC && s < tS ? 1 : 0} salute={s >= tS ? sal : 0} />
        </Fig>
      )) : null}
      {s >= tC && s < tA + 0.4 ? (
        <div style={{position: 'absolute', left: 430, top: GROUND - 500, padding: '14px 26px', background: SPAL.white, borderRadius: 26, fontFamily: heavy, fontWeight: 900,
          fontSize: 56, color: '#1b1b22', transform: `scale(${pop(s, tC)}) rotate(-4deg)`, boxShadow: '0 8px 0 rgba(0,0,0,.25)'}}>WOJTEK!</div>
      ) : null}
      {s >= tA ? Array.from({length: 6}).map((_, k) => {
        const d = (s - tA - k * 0.25) / 1.6;
        if (d < 0 || d > 1) return null;
        return <div key={k} style={{position: 'absolute', left: 760 + Math.sin(k * 2 + s * 3) * 60, top: GROUND - 660 - d * 300, fontSize: 70, color: '#ff4f7b', opacity: 1 - d, fontFamily: heavy, fontWeight: 900}}>♥</div>;
      }) : null}
    </>
  );
};

const SCENES: Record<string, React.FC<Ctx>> = {parade: Parade, desert: Desert, tent: Tent, camp: Camp, port: Port, office: Office, cassino: Cassino, badge: BadgeScene, zoo: Zoo};

/* ───────────── the SERVICE RECORD card (progress bar) ───────────── */
const Card: React.FC<{ep: StoryEpisode; s: number; T: (k: string) => number; chapter: string}> = ({s, T, chapter}) => {
  const typed = (txt: string, t0: number) => (s < t0 ? '' : txt.slice(0, Math.ceil(clamp01((s - t0) / 0.5) * txt.length)));
  const tName = T('name');
  const tEnl = T('stamp');
  const tRank = T('rank');
  const tProm = T('promote');
  const field = (label: string, val: React.ReactNode, top: number) => (
    <div style={{position: 'absolute', left: 170, top, fontFamily: TYPE, fontWeight: 900, fontSize: 33, color: '#3a2e1c', whiteSpace: 'nowrap'}}>
      <span style={{opacity: 0.6}}>{label}</span> {val}
    </div>
  );
  return (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 196, background: '#efe4c8', borderRadius: 12, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 840, height: 46, background: '#3e4a2c', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box'}}>
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: '#efe4c8'}}>SERVICE RECORD</span>
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 2, color: '#ffd23f'}}>{chapter}</span>
      </div>
      <div style={{position: 'absolute', left: 18, top: 58, width: 130, height: 126, background: '#cbbd98', borderRadius: 6, overflow: 'hidden'}}>
        <svg width={130} height={126} viewBox="80 60 250 242"><Bear face="happy" t={0} cap={s >= tEnl} /></svg>
      </div>
      {field('NAME:', <span>{s < tName ? '???' : typed('WOJTEK', tName)}</span>, 62)}
      {field('SPECIES:', <span>BEAR</span>, 102)}
      {field('RANK:', s < tRank ? <span>—</span> : (
        <>
          <span style={{textDecoration: s >= tProm ? 'line-through' : 'none', opacity: s >= tProm ? 0.45 : 1}}>{typed('PRIVATE', tRank)}</span>
          {s >= tProm ? <span style={{color: SPAL.red, marginLeft: 14, display: 'inline-block', transform: `scale(${pop(s, tProm)})`}}>CORPORAL</span> : null}
        </>
      ), 142)}
      {s >= tEnl ? (
        <div style={{position: 'absolute', left: 588, top: 54, padding: '2px 12px', border: `6px solid ${SPAL.red}`, borderRadius: 10, color: SPAL.red,
          fontFamily: heavy, fontWeight: 900, fontSize: 36, letterSpacing: 2, opacity: 0.88,
          transform: `rotate(-8deg) scale(${s < tEnl + 0.12 ? 2.2 - 1.2 * ((s - tEnl) / 0.12) : 1})`}}>ENLISTED</div>
      ) : null}
    </div>
  );
};

/* ───────────── composition ───────────── */
export const Story: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const T = (k: string) => at(plan, k);
  const li = lineAt(plan, s);
  const ctx: Ctx = {s, frame, T, ev: plan.events};

  // ── director: a default framing per scene, punch-ins on events
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 1100, z: 1, r: 0, ...c});
  shot(0, 0.01, {z: 1.0, y: 1120});
  shot(0.05, 2.6, {z: 1.14, y: 1120});
  plan.cuts.forEach((c) => {
    const base: Record<string, Partial<Shot>> = {
      desert: {z: 1.05, y: 1150}, tent: {z: 1.12, x: 600, y: 1180}, camp: {z: 1.0}, port: {z: 1.0}, office: {z: 1.05, y: 1150},
      cassino: {z: 1.0, y: 1060}, badge: {z: 1.0}, zoo: {z: 1.0, y: 1100},
    };
    shot(c.t, 0.01, base[c.to] ?? {});
  });
  for (const e of plan.events) {
    switch (e.kind) {
      case 'reveal': shot(e.t, 0.22, {x: 560, y: GROUND - 520, z: 1.6, r: -3}); break;
      case 'handover': shot(e.t, 0.5, {x: 560, y: 1260, z: 1.25}); break;
      case 'zoom': shot(e.t, 0.35, {x: 690, y: GROUND - 240, z: 2.2, r: 3}); break;
      case 'vodka': shot(e.t - 0.1, 0.3, {x: 540, y: 1215, z: 1.85, r: -4}); break;
      case 'name': shot(e.t, 0.3, {x: 560, y: 1180, z: 1.1}); break;
      case 'grow': shot(e.t, 0.5, {x: 480, y: 1120, z: 1.0}); break;
      case 'wrestle': shot(e.t, 0.2, {x: 540, y: 1250, z: 1.35, r: -4}); break;
      case 'beer': shot(e.t - 0.1, 0.25, {x: 470, y: GROUND - 470, z: 1.6, r: 3}); break;
      case 'problem': shot(e.t, 0.15, {x: 330, y: GROUND - 460, z: 1.7, r: 6}); break;
      case 'nopets': shot(e.t, 0.2, {x: 640, y: 1150, z: 1.2, r: 0}); break;
      case 'stamp': shot(e.t, 0.15, {x: 540, y: 1000, z: 1.0}); break;
      case 'rank': shot(e.t, 0.3, {x: 340, y: GROUND - 460, z: 1.55, r: -3}); break;
      case 'paybook': shot(e.t, 0.3, {x: 560, y: 1120, z: 1.1}); break;
      case 'boom': shot(e.t, 0.12, {x: 540, y: 820, z: 1.35, r: 3}); shot(e.t + 0.7, 0.6, {x: 760, y: 1150, z: 1.15}); break;
      case 'carry': {
        for (let k = 0; k <= 6; k += 1) shot(e.t + k * 0.75, 0.75, {x: Math.max(380, 860 - k * 0.75 * 120), y: 1120, z: 1.25, r: 0});
        break;
      }
      case 'never': shot(e.t, 0.18, {x: 380, y: GROUND - 560, z: 1.6, r: -4}); break;
      case 'badge': shot(e.t, 0.4, {z: 1.08}); break;
      case 'promote': shot(e.t, 0.2, {y: 1180, z: 1.12}); break;
      case 'visit': shot(e.t, 0.8, {x: 420, y: 1200, z: 1.12}); break;
      case 'call': shot(e.t, 0.3, {x: 360, y: 1100, z: 1.3, r: -2}); break;
      case 'answer': shot(e.t, 0.25, {x: 790, y: GROUND - 470, z: 1.6, r: 3}); break;
      case 'salute': shot(e.t, 0.9, {x: 540, y: 1120, z: 1.02, r: 0}); break;
      default: break;
    }
  }
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const boomT = T('boom');
  const neverT = T('never');
  const shake = 18 * (s >= boomT ? Math.exp(-(s - boomT) * 5) : 0) + 10 * (s >= neverT ? Math.exp(-(s - neverT) * 7) : 0)
    + 8 * (s >= T('stamp') ? Math.exp(-(s - T('stamp')) * 8) : 0) + 9 * (s >= T('problem') ? Math.exp(-(s - T('problem')) * 8) : 0);
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
    const e = plan.events.find((x) => (x.kind === 'name' || x.kind === 'stamp' || x.kind === 'never') && win(s, x.t, 1.3));
    if (!e) return null;
    const txt = e.kind === 'never' ? 'DROPPED: 0' : e.text ?? '';
    return <Slam k={(s - e.t) / 1.3} text={txt} color={e.kind === 'stamp' ? '#ff3b4a' : '#ffd23f'} size={e.kind === 'never' ? 150 : 190} top={860} />;
  })();

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      {world}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 55%, transparent 58%, rgba(0,0,0,.28) 100%)'}} />
      {slam}
      <Card ep={ep} s={s} T={T} chapter={line.chapter} />
      {line.note ? (
        <div style={{position: 'absolute', top: 446, left: 120, width: 840, textAlign: 'center', fontFamily: heavy, fontWeight: 800, fontSize: 25, letterSpacing: 1.2,
          color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.9)', textTransform: 'uppercase'}}>{line.note}</div>
      ) : null}
      {cap ? (
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
      {plan.events.map((e, i) => {
        const fx: Array<[string, number, number]> = [];
        switch (e.kind) {
          case 'reveal': fx.push(['sfx/shine.wav', 0, 0.8]); break;
          case 'handover': fx.push(['sfx/coins.wav', 0, 0.5]); break;
          case 'vodka': fx.push(['sfx/pop.wav', 0.15, 0.8]); break;
          case 'name': fx.push(['sfx/slam.wav', 0, 0.7], ['sfx/printer.wav', 0, 0.35]); break;
          case 'grow': fx.push(['sfx/grow.wav', 0, 0.7]); break;
          case 'wrestle': for (let k = 0; k < 4; k += 1) fx.push(['sfx/punch.wav', k * 0.28, 0.55]); break;
          case 'beer': fx.push(['sfx/pop.wav', 0, 0.8], ['sfx/ding.wav', 0.1, 0.4]); break;
          case 'problem': fx.push(['sfx/scratch.wav', 0, 0.8]); break;
          case 'nopets': fx.push(['sfx/slam.wav', 0, 0.8]); break;
          case 'stamp': fx.push(['sfx/slam.wav', 0, 0.9], ['sfx/punch.wav', 0, 0.5]); break;
          case 'rank': fx.push(['sfx/ding.wav', 0, 0.6]); break;
          case 'paybook': fx.push(['sfx/whoosh.wav', 0, 0.5]); break;
          case 'boom': fx.push(['sfx/boom.wav', 0, 0.9], ['sfx/thunder.wav', 0.6, 0.4]); break;
          case 'carry': fx.push(['sfx/whoosh.wav', 0, 0.5]); break;
          case 'never': fx.push(['sfx/slam.wav', 0, 0.9], ['sfx/ding.wav', 0.2, 0.5]); break;
          case 'badge': fx.push(['sfx/shine.wav', 0, 0.8]); break;
          case 'promote': fx.push(['sfx/slam.wav', 0, 0.8], ['sfx/powerup.wav', 0.1, 0.5]); break;
          case 'answer': fx.push(['sfx/shine.wav', 0, 0.6]); break;
          case 'salute': fx.push(['sfx/bell.wav', 0.1, 0.5]); break;
          default: break;
        }
        return fx.map(([f, off, v], j) => (
          <Sequence key={`${i}-${j}`} from={Math.max(0, Math.round((e.t + off) * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
        ));
      })}
    </AbsoluteFill>
  );
};
