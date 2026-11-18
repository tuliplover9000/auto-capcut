import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import {Slam} from '../fight/Fight';
import {camAt, Shot} from '../fight/camera';
import {captions, FightEpisode, Timing} from '../fight/timeline';
import {FPS, StoryEpisode, at, buildPlan, lineAt} from '../story/timeline';
import {Bust, Icon} from './art';

// SPOT THE LIAR (hard). Teach-then-test #3: bust two body-language myths,
// then ONE real tool, the backwards retelling (Vrij et al. 2008, hedged on
// screen). Nobody offers evidence, so the only key is comparing each story
// with its rewind: honest A says "um" but keeps every detail, honest C adds
// colour ("video games") but changes nothing, calm B is smooth but drove ->
// bus. Kicker: 54% accuracy over 206 studies (Bond & DePaulo 2006).
const heavy = loadMontserrat('normal', {weights: ['800', '900'], subsets: ['latin']}).fontFamily;
const MONO = '"Courier New", Courier, monospace';
const W = 1080;
const H = 1920;
const TEST_SECS = 10;
const BACK_AT = 3.5; // the backwards lines appear this far into the test
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

const ROW_Y = [815, 1085, 1355];
type Chip = {icon: 'name' | 'receipt' | 'camera'; text: string};
const CWF = 16.8; // Courier advance at 28px
const CWB = 15.6; // ... at 26px
const BACK_X = 392;
// fi/fl + bi/bl: the changed word (forward / backwards) for the proof
const ALIBI: Array<{fwd: string; back: string; fi: number; fl: number; bi: number; bl: number}> = [
  {fwd: 'BUS TO GYM → TACOS → HOME', back: 'UM... HOME ← TACOS ← UH, BUS TO GYM', fi: 0, fl: 0, bi: 0, bl: 0},
  {fwd: 'DROVE TO MALL → MOVIE → PIZZA', back: 'PIZZA ← MOVIE ← BUS TO MALL', fi: 0, fl: 5, bi: 16, bl: 3},
  {fwd: "WALKED TO SAM'S → GAMES → CAKE", back: 'CAKE ← VIDEO GAMES ← WALKED OVER', fi: 0, fl: 0, bi: 0, bl: 0},
];

const ChipBox: React.FC<{x: number; y: number; c: Chip; k: number; tick?: number; dim?: boolean}> = ({x, y, c, k, tick = 0, dim}) => {
  const w = 64 + c.text.length * 17;
  return k <= 0 ? null : (
    <g transform={`translate(${x} ${y}) scale(${k})`} opacity={dim ? 0.35 : 1}>
      <rect x={0} y={-22} width={w} height={44} rx={10} fill="#e9f2ff" stroke={OL} strokeWidth={4} />
      <g transform="translate(26 0) scale(0.95)"><Icon k={c.icon} /></g>
      <text x={50} y={9} fontFamily={heavy} fontWeight={900} fontSize={24} fill={OL}>{c.text}</text>
      {tick > 0 ? (
        <g transform={`translate(${w} -20) scale(${tick})`}>
          <circle r={15} fill={GOOD} stroke={OL} strokeWidth={3.5} />
          <path d="M -7 0 L -2 6 L 8 -6" fill="none" stroke={OL} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
    </g>
  );
};
const Stamp: React.FC<{x: number; y: number; text: string; col: string; k: number; rot?: number; size?: number}> = ({x, y, text, col, k, rot = -10, size = 46}) => {
  const w = text.length * size * 0.78 + 36;
  return k <= 0 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${k < 1 ? 2.2 - 1.2 * k : k})`} opacity={clamp01(k * 3)}>
      <rect x={-w / 2} y={-size * 0.85} width={w} height={size * 1.5} rx={8} fill="rgba(0,0,0,.25)" stroke={OL} strokeWidth={10} />
      <rect x={-w / 2} y={-size * 0.85} width={w} height={size * 1.5} rx={8} fill={PAPER} stroke={col} strokeWidth={6} />
      <text y={size * 0.32} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={size} fill={col} letterSpacing={3}>{text}</text>
    </g>
  );
};
const Tag: React.FC<{x: number; y: number; text: string; bg?: string; fg?: string; k?: number; size?: number}> = ({x, y, text, bg = OL, fg = YEL, k = 1, size = 34}) => {
  const w = text.length * size * 0.72 + 40;
  return k <= 0 ? null : (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <rect x={-w / 2} y={-size * 1.05} width={w} height={size * 1.7} rx={12} fill={bg} stroke={OL} strokeWidth={5} />
      <text y={size * 0.12} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={size} fill={fg}>{text}</text>
    </g>
  );
};

export const Liar: React.FC<{episode: StoryEpisode; timing: Timing}> = ({episode: ep, timing}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const plan = buildPlan(ep, timing);
  const T = (k: string) => at(plan, k);
  const LS = plan.lineStarts;
  const LE = plan.lineEnds;
  const li = lineAt(plan, s);
  const tTest = LE[6] + 0.05;
  const tBack = tTest + BACK_AT;
  const answered = s >= T('answer');

  // ── camera
  const shots: Shot[] = [];
  const shot = (t: number, blend: number, c: Partial<Shot>) => shots.push({t, blend, x: 540, y: 960, z: 1, r: 0, ...c});
  shot(0, 0.01, {x: 540, y: 1000, z: 1.08});
  shot(0.05, 2.6, {x: 540, y: 960, z: 1.0});
  shot(T('a') - 0.1, 0.5, {x: 540, y: 900, z: 1.1});
  shot(LS[10], 0.5, {x: 540, y: 960, z: 1.0});
  shots.sort((a, b) => a.t - b.t);
  const cam = camAt(shots, s);
  const kick = (t0: number, amp: number, decay: number) => (s >= t0 ? amp * Math.exp(-(s - t0) * decay) : 0);
  const shake = kick(T('test'), 10, 7) + kick(T('answer'), 9, 7) + kick(T('myth'), 6, 8) + kick(T('truth'), 8, 7) + kick(T('pct'), 10, 6) + kick(T('coin'), 6, 7);
  const shx = Math.sin(frame * 2.3) * shake;
  const shy = Math.cos(frame * 2.9) * shake;
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + shx}px, ${960 - cam.y + shy}px) scale(${cam.z})`};

  // ── suspect behaviour (A nervous, B calm, C neutral)
  const behave = (i: number, t: number) => {
    if (i === 0) return {gaze: Math.sin(t * 3.1) > 0.3 ? 1 : Math.sin(t * 3.1) < -0.5 ? -1 : 0, sweat: 1, mood: 'nervous' as const, jx: Math.sin(t * 31) * 2.5, blink: (t * 1.7) % 1 < 0.06 ? 1 : 0};
    if (i === 1) return {gaze: 0, sweat: 0, mood: 'calm' as const, jx: 0, blink: (t * 0.4) % 1 < 0.04 ? 1 : 0};
    return {gaze: Math.sin(t * 0.7) > 0.8 ? 0.5 : 0, sweat: 0, mood: 'neutral' as const, jx: 0, blink: (t * 0.6 + 0.3) % 1 < 0.05 ? 1 : 0};
  };

  // ── the lineup tiles (hook + test + answer + twist)
  const hookOut = LS[1] - 0.3;
  const tilesOn = s < hookOut + 0.35 || (s >= T('test') - 0.15 && s < LS[10] + 0.4);
  const tilesK = s < hookOut ? 1 : s < T('test') ? 1 - inK(s, hookOut, 0.3) : s < LS[10] ? 1 : 1 - inK(s, LS[10], 0.35);
  const rowIn = (i: number) => (s < hookOut + 0.4 ? inK(s, 0.05 + i * 0.12, 0.3) : inK(s, T('test') - 0.12 + i * 0.1, 0.3));
  const inTest = s >= T('test') - 0.15;
  const twist = s >= T('a');
  const tiles = tilesOn ? (
    <g opacity={tilesK}>
      {ROW_Y.map((ry, i) => {
        const b = behave(i, s + i * 1.3);
        const al = ALIBI[i];
        const dimTwist = twist && i !== 0 ? 0.5 : 0;
        const isLiar = i === 1;
        const border = answered && isLiar ? BAD : twist && i === 0 && s >= T('truth') ? GOOD : '#2c3a55';
        const fwdK = inTest ? inK(s, T('test') + 0.2 + i * 0.25, 0.3) : 0;
        const backK = inTest ? inK(s, tBack + i * 0.3, 0.3) : 0;
        const proof = isLiar && li === 7;
        const fX = 354 + al.fi * CWF;
        const bX = BACK_X + al.bi * CWB;
        return (
          <g key={i} opacity={1 - dimTwist} transform={`translate(${(1 - rowIn(i)) * (i % 2 ? 1100 : -1100)} 0)`}>
            <rect x={120} y={ry - 125} width={840} height={250} rx={18} fill="#16223a" stroke={border} strokeWidth={border === '#2c3a55' ? 4 : 10} />
            {[-90, -50, -10, 30, 70].map((dy) => <rect key={dy} x={132} y={ry + dy} width={186} height={2} fill="#2c3a55" />)}
            <g>
              <defs><clipPath id={`tc${i}`}><rect x={124} y={ry - 121} width={832} height={242} rx={15} /></clipPath></defs>
              <g clipPath={`url(#tc${i})`}>
                <Bust x={225 + b.jx} y={ry + 18} s={0.64} who={'ABC'[i]} gaze={b.gaze} sweat={b.sweat} mood={b.mood} blink={b.blink} />
              </g>
            </g>
            <g transform={`translate(150 ${ry - 92})`}>
              <circle r={26} fill={YEL} stroke={OL} strokeWidth={5} />
              <text y={12} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={32} fill={OL}>{'ABC'[i]}</text>
            </g>
            <path d={`M 340 ${ry - 112} L 940 ${ry - 112} Q 948 ${ry - 112} 948 ${ry - 104} L 948 ${ry + 104} Q 948 ${ry + 112} 940 ${ry + 112} L 340 ${ry + 112} Q 332 ${ry + 112} 332 ${ry + 104} L 332 ${ry + 10} L 310 ${ry - 4} L 332 ${ry - 18} L 332 ${ry - 104} Q 332 ${ry - 112} 340 ${ry - 112} Z`}
              fill={PAPER} stroke={OL} strokeWidth={5} />
            {!inTest ? (
              <text x={640} y={ry + 26} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={84} fill="#c9c2b2">?</text>
            ) : (
              <g>
                <g opacity={fwdK} transform={`translate(${(1 - fwdK) * 30} 0)`}>
                  <text x={354} y={ry - 80} fontFamily={heavy} fontWeight={900} fontSize={20} fill="#8a8172" letterSpacing={2}>LAST NIGHT:</text>
                  {proof && s >= T('drove') ? <rect x={fX - 4} y={ry - 66} width={al.fl * CWF + 8} height={36} rx={6} fill={YEL} /> : null}
                  <text x={354} y={ry - 38} fontFamily={MONO} fontWeight={900} fontSize={28} fill={OL}>{al.fwd}</text>
                </g>
                {backK > 0 ? (
                  <g opacity={backK} transform={`translate(${(1 - backK) * 30} 0)`}>
                    <rect x={348} y={ry - 10} width={584} height={2} fill="#d0c8b6" />
                    <g transform={`translate(368 ${ry + 44})`}><Icon k="rewind" col="#2f6fd6" /></g>
                    {proof && s >= T('bus') ? <rect x={bX - 4} y={ry + 26} width={al.bl * CWB + 8} height={34} rx={6} fill={BAD} /> : null}
                    <text x={BACK_X} y={ry + 53} fontFamily={MONO} fontWeight={900} fontSize={26} fill="#2f3a52">{al.back}</text>
                  </g>
                ) : null}
                {proof && s >= T('bus') ? (() => {
                  const k = inK(s, T('bus'), 0.3);
                  const x1 = fX + (al.fl * CWF) / 2;
                  const x2 = bX + (al.bl * CWB) / 2;
                  const y1 = ry - 30;
                  const y2 = ry + 26;
                  return (
                    <g>
                      <line x1={x1} y1={y1} x2={lerp(x1, x2, k)} y2={lerp(y1, y2, k)} stroke={BAD} strokeWidth={6} strokeLinecap="round" />
                      <g transform={`translate(${(x1 + x2) / 2} ${(y1 + y2) / 2}) scale(${pop(s, T('bus') + 0.25)})`}>
                        <circle r={22} fill={BAD} stroke={OL} strokeWidth={4} />
                        <text y={12} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={34} fill={OL}>≠</text>
                      </g>
                    </g>
                  );
                })() : null}
              </g>
            )}
            {isLiar && answered && li <= 7 ? <Stamp x={228} y={ry + 40} text="LIAR" col={BAD} k={clamp01((s - T('answer')) / 0.18)} /> : null}
            {i === 0 && s >= T('truth') ? <Stamp x={228} y={ry + 40} text="TRUTH" col="#2a8a5a" k={clamp01((s - T('truth')) / 0.18)} size={40} /> : null}
          </g>
        );
      })}
      {s >= tBack && s < T('answer') ? (
        <g transform={`translate(540 ${ROW_Y[0] - 150}) scale(${pop(s, tBack)})`}>
          <rect x={-250} y={-30} width={500} height={56} rx={28} fill="#2f6fd6" stroke={OL} strokeWidth={5} />
          <g transform="translate(-205 -2)"><Icon k="rewind" col="#fff" /></g>
          <text x={18} y={10} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={30} fill="#fff">NOW TELL IT BACKWARDS</text>
        </g>
      ) : null}
      {s >= T('nerves') && li === 9 ? <Tag x={540} y={ROW_Y[1] + 20} text="NERVES ≠ LIES" size={56} k={pop(s, T('nerves'))} /> : null}
    </g>
  ) : null;

  // ── lessons with suspect D
  const lessonOn = s >= hookOut && s < T('test');
  const lessonK = s < LS[6] ? inK(s, hookOut + 0.1, 0.35) : 1 - inK(s, LS[6] + 0.1, 0.3);
  const DX = 280;
  const DY = 1230;
  const gazeOn = s >= T('gaze') && s < T('myth') + 0.8;
  const fidgetOn = s >= T('fidget') && s < T('myth') + 0.8;
  const dGaze = gazeOn ? (Math.sin((s - T('gaze')) * 9) > 0 ? 1 : -1) : 0;
  const dJit = fidgetOn ? Math.sin(s * 34) * 5 : 0;
  const talking = li >= 2 && li <= 5 ? Math.max(0, Math.sin(s * 15)) * 0.8 : 0;
  const bubbleK = li >= 2 ? inK(s, T('trick') - 0.15, 0.3) : 0;
  const BX0 = 420;
  const BX1 = 950;
  const BY0 = 690;
  const BY1 = 1000;
  const XS = [500, 685, 870];
  // a 3-step story whose words hop from one order to another
  const seq = (y: number, from: string[], to: string[], k: number, back: boolean, red: string[] = [], size = 34) => (
    <g>
      {from.map((w, j) => {
        const tj = to.indexOf(w);
        const x = lerp(XS[j], XS[tj], k);
        const dy = tj === j ? 0 : (tj > j ? -1 : 1) * 46 * Math.sin(Math.PI * k);
        const isRed = red.includes(w);
        return (
          <g key={w}>
            {isRed ? <rect x={x - w.length * size * 0.36 - 8} y={y + dy - size * 0.95} width={w.length * size * 0.72 + 16} height={size * 1.25} rx={8} fill={BAD} /> : null}
            <text x={x} y={y + dy} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={size} fill={OL}>{w}</text>
          </g>
        );
      })}
      {[0, 1].map((j) => (
        <text key={j} x={(XS[j] + XS[j + 1]) / 2} y={y - 2} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={28} fill="#2f6fd6">{back ? '←' : '→'}</text>
      ))}
    </g>
  );
  const STORY = ['BUS', 'MOVIE', 'PIZZA'];
  const REV = ['PIZZA', 'MOVIE', 'BUS'];
  const SLIP = ['PIZZA', 'BUS', 'MOVIE'];
  const cleanK = inK(s, T('clean'), 0.6);
  const slipK = inK(s, T('slip'), 0.6);
  const slipShake = s >= T('slip') + 0.6 && li === 4 ? Math.sin(s * 40) * 5 * Math.exp(-(s - T('slip') - 0.6) * 3) : 0;
  const lessons = lessonOn ? (
    <g opacity={lessonK}>
      <Bust x={DX + dJit} y={DY} s={1.15} who="D" gaze={dGaze} sweat={fidgetOn ? 1 : 0} mood={li === 1 && s >= T('fidget') ? 'nervous' : 'neutral'} talk={talking} />
      {li === 1 ? (
        <g>
          {s >= T('gaze') ? (
            <g transform={`translate(720 820) scale(${pop(s, T('gaze'))})`}>
              <rect x={-220} y={-50} width={440} height={100} rx={16} fill={PAPER} stroke={OL} strokeWidth={6} />
              <text y={16} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={42} fill={OL}>LOOKING AWAY</text>
              {s >= T('myth') ? <rect x={-200} y={-4} width={400 * inK(s, T('myth'), 0.25)} height={8} fill={BAD} /> : null}
            </g>
          ) : null}
          {s >= T('fidget') ? (
            <g transform={`translate(720 990) scale(${pop(s, T('fidget'))})`}>
              <rect x={-220} y={-50} width={440} height={100} rx={16} fill={PAPER} stroke={OL} strokeWidth={6} />
              <text y={16} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={42} fill={OL}>FIDGETING</text>
              {s >= T('myth') ? <rect x={-200} y={-4} width={400 * inK(s, T('myth') + 0.1, 0.25)} height={8} fill={BAD} /> : null}
            </g>
          ) : null}
          <Stamp x={760} y={1170} text="MYTHS" col={BAD} k={clamp01((s - T('myth')) / 0.18)} size={64} rot={-8} />
        </g>
      ) : null}
      {bubbleK > 0 ? (
        <g opacity={bubbleK} transform={`translate(${(BX0 + BX1) / 2} ${BY1}) scale(${0.6 + 0.4 * bubbleK}) translate(${-(BX0 + BX1) / 2} ${-BY1})`}>
          <path d={`M ${BX0 + 14} ${BY0} L ${BX1 - 14} ${BY0} Q ${BX1} ${BY0} ${BX1} ${BY0 + 14} L ${BX1} ${BY1 - 14} Q ${BX1} ${BY1} ${BX1 - 14} ${BY1} L ${BX0 + 130} ${BY1} L ${DX + 70} ${DY - 110} L ${BX0 + 60} ${BY1} L ${BX0 + 14} ${BY1} Q ${BX0} ${BY1} ${BX0} ${BY1 - 14} L ${BX0} ${BY0 + 14} Q ${BX0} ${BY0} ${BX0 + 14} ${BY0} Z`}
            fill={PAPER} stroke={OL} strokeWidth={6} />
          {li === 2 ? (
            <g>
              {seq(800, STORY, STORY, 0, false)}
              {s >= T('back') ? (
                <g transform={`translate(${(BX0 + BX1) / 2} 900) scale(${pop(s, T('back'))})`}>
                  <rect x={-150} y={-36} width={300} height={66} rx={33} fill="#2f6fd6" stroke={OL} strokeWidth={5} />
                  <g transform="translate(-104 -3)"><Icon k="rewind" col="#fff" /></g>
                  <text x={16} y={9} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={30} fill="#fff">BACKWARDS</text>
                </g>
              ) : null}
            </g>
          ) : li === 3 ? (
            <g>
              {seq(800, STORY, REV, cleanK, cleanK > 0.5)}
              {s >= T('mem') ? <text x={(BX0 + BX1) / 2} y={735} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={24} fill="#2a8a5a" letterSpacing={2}>TRUTH</text> : null}
              {cleanK >= 1 ? <Tag x={(BX0 + BX1) / 2} y={905} text="SAME STORY ✓" bg={GOOD} fg={OL} size={34} k={pop(s, T('clean') + 0.6)} /> : null}
            </g>
          ) : li === 4 ? (
            <g transform={`translate(${slipShake} 0)`}>
              {seq(800, STORY, SLIP, slipK, slipK > 0.5, slipK >= 1 ? ['BUS', 'MOVIE'] : [])}
              <text x={(BX0 + BX1) / 2} y={735} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={24} fill={BAD} letterSpacing={2}>LIE</text>
              {slipK >= 1 ? <Tag x={(BX0 + BX1) / 2} y={905} text="THINGS SLIP" bg={BAD} fg={OL} size={34} k={pop(s, T('slip') + 0.6)} /> : null}
            </g>
          ) : (
            <g>
              {s >= T('moves') ? (
                <g opacity={inK(s, T('moves'), 0.25)}>
                  {seq(782, SLIP, SLIP, 0, true, ['BUS', 'MOVIE'], 30)}
                  <text x={(BX0 + BX1) / 2} y={828} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={24} fill={BAD}>A STEP MOVED</text>
                </g>
              ) : null}
              {s >= T('changes') ? (
                <g opacity={inK(s, T('changes'), 0.25)}>
                  {seq(915, ['PIZZA', 'MOVIE', 'CAR'], ['PIZZA', 'MOVIE', 'CAR'], 0, true, ['CAR'], 30)}
                  <text x={(BX0 + BX1) / 2} y={961} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={24} fill={BAD}>BUS BECAME CAR</text>
                </g>
              ) : null}
            </g>
          )}
        </g>
      ) : null}
    </g>
  ) : null;

  // ── kicker: the 54% meter + coin
  const meterOn = s >= LS[10] - 0.1;
  const pctK = inK(s, T('pct'), 0.8);
  const fill = lerp(0, 54, pctK);
  const MX0 = 160;
  const MX1 = 920;
  const mx = (p: number) => MX0 + (MX1 - MX0) * (p / 100);
  const coinT = s - T('coin');
  const kicker = meterOn ? (
    <g opacity={inK(s, LS[10] - 0.1, 0.4)}>
      <Tag x={540} y={760} text="200+ STUDIES · 24,000+ PEOPLE" size={32} k={s >= T('studies') ? pop(s, T('studies')) : 0} />
      <g>
        <rect x={MX0} y={900} width={MX1 - MX0} height={90} rx={45} fill="#1b2740" stroke={OL} strokeWidth={6} />
        <rect x={MX0} y={900} width={Math.max(0, mx(fill) - MX0)} height={90} rx={45} fill={YEL} stroke={OL} strokeWidth={6} />
        <rect x={mx(50) - 3} y={880} width={6} height={130} fill="#fff" />
        <text x={mx(50)} y={1050} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={30} fill="#fff">50% = GUESSING</text>
        <text x={MX0} y={870} fontFamily={heavy} fontWeight={900} fontSize={28} fill="#8fa0b8">0%</text>
        <text x={MX1} y={870} textAnchor="end" fontFamily={heavy} fontWeight={900} fontSize={28} fill="#8fa0b8">100%</text>
        {s >= T('pct') ? <text x={mx(fill)} y={968} textAnchor="end" dx={-20} fontFamily={heavy} fontWeight={900} fontSize={48} fill={OL}>{Math.round(fill)}%</text> : null}
      </g>
      {s >= T('coin') ? (
        <g transform={`translate(540 ${1390 - 150 * Math.sin(Math.PI * clamp01(coinT / 1.1))})`}>
          <g transform={`scale(1 ${coinT < 1.1 ? Math.cos(coinT * 22) : 1})`}>
            <circle r={110} fill="#e6b422" stroke={OL} strokeWidth={8} />
            <circle r={84} fill="none" stroke="#b88a12" strokeWidth={6} />
            <text y={34} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={96} fill="#b88a12">?</text>
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
  const header = li === 0 ? 'SPOT THE LIAR' : li === 1 ? 'MYTHS' : li <= 5 ? 'REAL SIGNS' : li <= 7 ? (answered ? 'THE ANSWER' : 'YOUR TURN') : li <= 9 ? 'THE TWIST' : 'REAL LIFE';
  const bigText = (t: string, col = OL, sz = 52) => <div style={{position: 'absolute', left: 26, top: 60, width: 790, fontFamily: heavy, fontWeight: 900, fontSize: sz, lineHeight: 1.05, color: col, whiteSpace: 'nowrap'}}>{t}</div>;
  const subText = (t: string) => <div style={{position: 'absolute', left: 28, top: 126, width: 790, fontFamily: MONO, fontWeight: 900, fontSize: 27, color: '#5a6070', whiteSpace: 'nowrap'}}>{t}</div>;
  let body: React.ReactNode = null;
  if (li === 0) body = <>{bigText('WHO IS LYING?', '#d6293a', 58)}{subText('LEARN THE SIGNS, THEN YOU TRY')}</>;
  else if (li === 1) body = <>{bigText(s >= T('myth') ? 'BODY LANGUAGE: MYTH' : 'BODY LANGUAGE?')}{subText('LOOKING AWAY · FIDGETING')}</>;
  else if (li <= 5) {
    const got = [s >= T('moves'), s >= T('changes')];
    body = (
      <>
        {bigText('THE BACKWARDS TRICK', OL, 46)}
        {['A STEP MOVES', 'A DETAIL CHANGES'].map((n, k) => (
          <div key={n} style={{position: 'absolute', left: 26 + k * 400, top: 120, width: 380, height: 42, borderRadius: 8, border: '4px solid #1b1b22', boxSizing: 'border-box',
            background: got[k] ? YEL : '#e2ddd2', fontFamily: heavy, fontWeight: 900, fontSize: 23, lineHeight: '34px', textAlign: 'center', color: got[k] ? OL : '#aaa39a',
            transform: `scale(${got[k] ? pop(s, k ? T('changes') : T('moves')) : 1})`}}>{got[k] ? n : '?'}</div>
        ))}
      </>
    );
  } else if (li <= 7) {
    body = (
      <>
        {['A', 'B', 'C'].map((L, k) => {
          const right = k === 1;
          const col = answered ? (right ? '#7be07b' : '#e2ddd2') : '#fff';
          return (
            <div key={L} style={{position: 'absolute', left: 20 + k * 214, top: 62, width: 200, height: 98, borderRadius: 12, background: col, border: '5px solid #1b1b22', boxSizing: 'border-box',
              transform: `scale(${answered && right ? pop(s, T('answer')) : s >= T('ask') ? pop(s, T('ask') + k * 0.08) : 0.0001})`, opacity: answered && !right ? 0.5 : 1}}>
              <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 40, textAlign: 'center', lineHeight: '46px', color: OL}}>{answered && right ? '✓ ' : ''}{L}</div>
              <div style={{fontFamily: MONO, fontWeight: 900, fontSize: 22, textAlign: 'center', color: OL}}>{answered ? (right ? 'LIAR' : 'TRUTH') : 'SUSPECT'}</div>
            </div>
          );
        })}
        <svg width={150} height={150} style={{position: 'absolute', left: 676, top: 36}}>
          <circle cx={75} cy={75} r={56} fill={urgent ? '#ffe0e0' : '#fff'} stroke="#d8d2c4" strokeWidth={12} />
          <circle cx={75} cy={75} r={56} fill="none" stroke={urgent ? BAD : '#2a8a5a'} strokeWidth={12} strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 56 * ringK} 999`} transform="rotate(-90 75 75)" />
          <text x={75} y={93} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={54} fill={urgent ? '#d6293a' : OL}>{answered ? '✓' : s < tTest ? TEST_SECS : secs}</text>
        </svg>
      </>
    );
  } else if (li <= 9) body = <>{bigText(s >= T('truth') ? 'A WAS HONEST' : 'AND A?', s >= T('truth') ? '#2a8a5a' : OL)}{subText(s >= T('nerves') ? 'NERVES ≠ LIES' : 'SWEATY · FIDGETY · LOOKED AWAY')}</>;
  else body = <>{bigText(s >= T('pct') ? (li === 11 ? 'A COIN FLIP' : '54% ACCURATE') : 'HOW GOOD ARE WE?', s >= T('pct') ? '#d6293a' : OL)}{subText(s >= T('studies') ? 'BOND & DePAULO, 206 STUDIES' : 'AT SPOTTING LIES')}</>;
  const card = (
    <div style={{position: 'absolute', left: 120, top: 236, width: 840, height: 176, background: PAPER, borderRadius: 14, boxShadow: '0 10px 0 rgba(0,0,0,.3)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 840, height: 46, background: '#2a0d12', display: 'flex', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: BAD}} />
        <span style={{fontFamily: heavy, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: PAPER}}>{header}</span>
      </div>
      {body}
    </div>
  );
  const note = li >= 2 && li <= 5 ? '* VRIJ ET AL. 2008 · HELPS IN STUDIES, NOT A LIE DETECTOR' : li === 7 && s >= T('drove') ? 'EVERYONE ELSE KEPT THEIR DETAILS' : li === 10 && s >= T('studies') ? 'PERSONALITY & SOCIAL PSYCHOLOGY REVIEW, 2006' : '';

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

  const slam = s >= T('answer') && s < T('answer') + 0.9 ? <Slam k={(s - T('answer')) / 0.9} text="B!" color="#7be07b" size={190} top={1480} />
    : s >= T('pct') && li === 10 ? <Slam k={Math.min(0.5, (s - T('pct')) / 1.2)} text="54%" color={YEL} size={170} top={1430} />
    : s >= T('coin') ? <Slam k={Math.min(0.5, (s - T('coin')) / 1.2)} text="COIN FLIP" color={BAD} size={130} top={1480} /> : null;
  const late = s >= tTest + TEST_SECS && s < T('answer');
  const ticks = Array.from({length: TEST_SECS}).map((_, k) => tTest + k);

  return (
    <AbsoluteFill style={{background: '#0d1424', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 55%, #24314f 0%, #0d1424 72%)'}} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, opacity: 0.1}}>
        {Array.from({length: 24}).map((_, k) => <rect key={k} x={0} y={600 + k * 60} width={W} height={3} fill="#9fb0c8" />)}
      </svg>
      <div style={camStyle}>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {lessons}
          {tiles}
          {kicker}
        </svg>
      </div>
      {late ? <div style={{position: 'absolute', left: 0, top: 1500, width: W, textAlign: 'center', fontFamily: heavy, fontWeight: 900, fontSize: 110, color: '#fff', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill', transform: `rotate(-3deg) scale(${pop(s, tTest + TEST_SECS)})`}}>TIME!</div> : null}
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
        [0.05, 'sfx/whoosh.wav', 0.5], [T('lying'), 'sfx/ding.wav', 0.4], [hookOut, 'sfx/whoosh.wav', 0.6],
        [T('gaze'), 'sfx/pop.wav', 0.6], [T('fidget'), 'sfx/pop.wav', 0.6], [T('myth'), 'sfx/slam.wav', 0.75], [T('myth') + 0.05, 'sfx/fail.wav', 0.35],
        [T('trick'), 'sfx/pop.wav', 0.55], [T('back'), 'sfx/pop.wav', 0.6], [T('mem'), 'sfx/ding.wav', 0.4], [T('clean'), 'sfx/scratch.wav', 0.5], [T('clean') + 0.6, 'sfx/ding.wav', 0.6],
        [T('built'), 'sfx/pop.wav', 0.5], [T('slip'), 'sfx/scratch.wav', 0.5], [T('slip') + 0.6, 'sfx/fail.wav', 0.45], [T('moves'), 'sfx/pop.wav', 0.6], [T('changes'), 'sfx/pop.wav', 0.6],
        [T('test'), 'sfx/slam.wav', 0.8], [tBack, 'sfx/scratch.wav', 0.5], [tTest + TEST_SECS, 'sfx/fail.wav', 0.5],
        [T('answer'), 'sfx/ding.wav', 0.8], [T('answer'), 'sfx/shine.wav', 0.6], [T('answer') + 0.05, 'sfx/slam.wav', 0.6],
        [T('drove'), 'sfx/pop.wav', 0.6], [T('bus'), 'sfx/crack.wav', 0.6], [T('bus') + 0.25, 'sfx/fail.wav', 0.4],
        [T('a'), 'sfx/whoosh.wav', 0.5], [T('truth'), 'sfx/slam.wav', 0.8], [T('truth') + 0.05, 'sfx/ding.wav', 0.6], [T('nerves'), 'sfx/pop.wav', 0.6],
        [T('studies'), 'sfx/printer.wav', 0.35], [T('pct'), 'sfx/slam.wav', 0.85], [T('coin'), 'sfx/coins.wav', 0.6], [T('coin') + 1.1, 'sfx/boom.wav', 0.45],
      ] as Array<[number, string, number]>).map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round(t * FPS))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
