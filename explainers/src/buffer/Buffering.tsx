import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMontserrat} from '@remotion/google-fonts/Montserrat';
import type {Timing} from '../fight/timeline';
import {buildPlan, lineAt, type SLine, type StoryEpisode} from '../story/timeline';
import {COL, Heart, Mood, OL, Orb, Screen, Toaster, Toon, Who} from './art';

// BUFFERING: a 3-friend voice-over skit (Dex, Bolt, Nova + the SYSTEM voice).
// The guide-track TTS sets every line's timing; the video always shows the
// line being spoken (speaker chip + karaoke words) so friends can dub it live.
//   mode 'dub'   - captions + UP NEXT prompter, no voices  (record against this)
//   mode 'clean' - captions only, no voices                (put the recording over this)
//   mode 'guide' - prompter + the AI guide voices          (hear the pacing)
// All three share one timeline, so a recording made on 'dub' lines up on 'clean'.
export type BLine = SLine & {speaker: 'DEX' | 'BOLT' | 'NOVA' | 'SYS'; style: string};
export type BufferEpisode = StoryEpisode & {intro: number; outro: number; lines: BLine[]};
export type BufferMode = 'dub' | 'clean' | 'guide';

const heavy = loadMontserrat('normal', {weights: ['700', '800', '900'], subsets: ['latin']}).fontFamily;
const W = 1080;
const H = 1920;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const inK = (s: number, t0: number, d = 0.35) => ease(clamp01((s - t0) / d));
const pop = (s: number, t0: number, d = 0.35) => (s < t0 ? 0 : 1 + 0.25 * Math.sin(clamp01((s - t0) / d) * Math.PI) * (1 - clamp01((s - t0) / d)));
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const STYLE_TAG: Record<string, string> = {robot: 'ROBOT VOICE', slow: 'ROBOT · SLOWING DOWN', ad: 'TV-AD VOICE', whisper: 'WHISPER', quiet: 'QUIETLY'};
const NAME: Record<string, string> = {DEX: 'DEX', BOLT: 'BOLT', NOVA: 'NOVA', SYS: 'SYSTEM'};

// mood ranges: [fromLine, toLine, mood]
type MR = Array<[number, number, Mood]>;
const MOODS: Record<Who, MR> = {
  DEX: [[0, 0, 'neutral'], [1, 4, 'shock'], [5, 11, 'neutral'], [12, 12, 'nervous'], [13, 13, 'shock'], [14, 21, 'smug'], [22, 30, 'nervous'], [31, 31, 'robot'],
    [32, 33, 'nervous'], [34, 34, 'robot'], [35, 39, 'shock'], [40, 40, 'robot'], [41, 41, 'neutral'], [42, 44, 'nervous'], [45, 45, 'shock'], [46, 49, 'ad'],
    [50, 50, 'hurt'], [51, 52, 'shock'], [53, 53, 'happy'], [54, 55, 'nervous'], [56, 56, 'shock'], [57, 57, 'love'], [58, 58, 'happy'], [59, 59, 'nervous'],
    [60, 61, 'love'], [62, 62, 'shock'], [63, 66, 'love'], [67, 68, 'smug'], [69, 72, 'happy']],
  BOLT: [[0, 13, 'happy'], [14, 20, 'smug'], [21, 21, 'nervous'], [22, 27, 'smug'], [28, 36, 'happy'], [37, 39, 'smug'], [40, 48, 'shock'], [49, 53, 'smug'],
    [54, 57, 'neutral'], [58, 58, 'shock'], [59, 66, 'happy'], [67, 68, 'smug'], [69, 72, 'shock']],
  NOVA: [[0, 29, 'neutral'], [30, 35, 'smug'], [36, 45, 'shock'], [46, 53, 'happy'], [54, 54, 'shock'], [55, 55, 'smug'], [56, 59, 'happy'], [60, 72, 'happy']],
};
const moodOf = (who: Who, li: number): Mood => MOODS[who].find(([a, b]) => li >= a && li <= b)?.[2] ?? 'neutral';

export const Buffering: React.FC<{episode: BufferEpisode; timing: Timing; mode: BufferMode}> = ({episode: ep, timing, mode}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = frame / fps;
  const INTRO = ep.intro;
  const plan = buildPlan(ep, timing);
  const LS = plan.lineStarts;
  const LE = plan.lineEnds;
  const N = ep.lines.length;
  const st = s - INTRO; // story time
  const li = lineAt(plan, st);
  const words = (i: number) => timing.lines[i].words;
  const wT = (i: number, w: string, nth = 0) => {
    const hits = words(i).filter((x) => norm(x.text) === norm(w));
    return LS[i] + (hits[nth] ?? hits[0] ?? words(i)[0]).start;
  };
  const cuts = plan.cuts.map((c) => c.t);
  const scene = ep.lines[li].scene;

  // mouth flap for whoever owns the line being spoken
  const talkOf = (spk: string) => {
    if (st < LS[li] || ep.lines[li].speaker !== spk) return 0;
    const t = st - LS[li];
    const on = words(li).some((w) => t >= w.start - 0.02 && t <= w.end + 0.03);
    return on ? 0.45 + 0.55 * Math.abs(Math.sin(t * 21)) : 0;
  };
  const blinkOf = (k: number) => ((st * 0.55 + k * 0.37) % 1 < 0.05 ? 1 : 0);

  // ── character placement
  type P = {x: number; y: number; s: number; vis: boolean; dim?: number; rot?: number};
  const smackT = LS[50] - 0.85;
  const place = (who: Who): P => {
    if (scene === 'home') {
      const enter = LS[5] - 0.8;
      if (who === 'DEX') return {x: st < enter ? 540 : lerp(540, 320, inK(st, enter, 0.5)), y: 1170, s: 1.5, vis: true};
      if (who === 'BOLT') return {x: lerp(1400, 740, inK(st, enter, 0.45)), y: 1170, s: 1.5, vis: st >= enter};
      return {x: 0, y: 0, s: 1, vis: false};
    }
    if (scene === 'cafe' || scene === 'moment') {
      const walk = LS[28] - 1.0;
      if (who === 'NOVA') return {x: lerp(850, 810, inK(st, walk, 0.7)), y: 1165, s: lerp(1.25, 1.4, inK(st, walk, 0.7)), vis: true};
      if (who === 'DEX') {
        const k = inK(st, walk, 0.7);
        const bob = st >= walk && st < walk + 0.7 ? Math.abs(Math.sin((st - walk) * 14)) * -14 : 0;
        const knock = st >= smackT ? 14 * Math.exp(-(st - smackT) * 5) * Math.sin((st - smackT) * 30) : 0;
        return {x: lerp(450, 500, k), y: lerp(1215, 1165, k) + bob, s: lerp(1.35, 1.45, k), vis: true, rot: knock};
      }
      // BOLT: hides behind the plant; runs in to fix Dex (line 49-53); back to peeking for the moment
      if (scene === 'moment') {
        const popUp = st >= LS[58] - 0.1 && st < LS[59] ? -70 * Math.sin(Math.PI * clamp01((st - LS[58] + 0.1) / 0.5)) : 0;
        return {x: 205, y: 1250 + popUp, s: 1.2, vis: true, dim: st >= LS[58] - 0.1 ? 0 : 0.3};
      }
      const runIn = inK(st, LS[49] - 0.35, 0.35);
      const lunge = st >= smackT - 0.15 && st < smackT + 0.25 ? Math.sin(Math.PI * clamp01((st - smackT + 0.15) / 0.4)) * 110 : 0;
      if (st >= walk) return {x: lerp(170, 250, runIn) + lunge, y: lerp(1245, 1180, runIn), s: lerp(1.2, 1.3, runIn), vis: true};
      return {x: 215, y: 1225, s: 1.35, vis: true};
    }
    // end: lined up
    const xs: Record<Who, number> = {BOLT: 240, DEX: 545, NOVA: 850};
    return {x: xs[who], y: 1185, s: 1.25, vis: true};
  };

  // ── forehead screens
  const spin = st * 1.6;
  const screenOf = (who: Who): Screen => {
    if (who === 'DEX') {
      if (li === 0) return {text: 'ZZZ', col: '#8aa0c0'};
      if (li <= 2) return {text: 'NOVA?', col: '#ff5d8f'};
      if (li <= 4) return {text: 'PANIC', col: '#ff4f5e', flash: true};
      if (li === 12) return {text: 'CRITICAL ERROR', col: '#ff4f5e', flash: true};
      if (li <= 21) return {text: li >= 14 ? 'SUS' : 'OK', col: '#3fd6c3'};
      if (li <= 25) return {text: 'NERVOUS', col: '#ffd23f'};
      if (li <= 30) {
        const k = clamp01((st - LS[26]) / (LE[30] - LS[26]));
        return {text: `INSTALLING ${Math.floor(k * 99)}%`, col: '#b98cff', bar: k};
      }
      if (li === 31 || li === 34) return {text: 'RIZZ.EXE', col: '#ff5df2', flash: true};
      if (li <= 39) return {text: li >= 35 ? 'HELP' : 'ERROR', col: '#ff4f5e'};
      if (li === 40) return {text: 'SHUTDOWN', col: '#ff4f5e', bar: 1 - clamp01((st - LS[40]) / (LE[40] - LS[40]))};
      if (li === 41) return {text: 'REBOOTED', col: '#6fe3ff', spin};
      if (li <= 44) return {text: 'T&C', col: '#ffd23f'};
      if (li === 45) return {text: '!!!', col: '#ff4f5e', flash: true};
      if (li <= 49) return {text: 'SPONSORED', col: '#ffd23f'};
      if (li <= 53) return {text: st < LS[51] ? 'STATIC' : 'FIXED', col: st < LS[51] ? '#aaaaaa' : '#5fd068', flash: st < LS[51]};
      if (li <= 56) return {text: li === 54 ? 'OFFLINE' : '...', col: '#3fd6c3'};
      if (li <= 66) return {heart: true, text: li >= 64 ? 'NOVA' : '', col: '#ff5d8f'};
      if (li <= 68) return {text: 'NOPE', col: '#ffd23f'};
      return {heart: true, col: '#ff5d8f'};
    }
    if (who === 'BOLT') {
      if (li <= 20) return {text: 'COOL', col: '#ffb02e'};
      if (li === 21) return {text: '...', col: '#ffb02e'};
      if (li <= 39) return {text: 'WINGMAN', col: '#ffb02e'};
      if (li <= 48) return {text: 'OOPS', col: '#ff4f5e', flash: true};
      if (li <= 53) return {text: li >= 51 ? 'GENIUS' : 'I GOT THIS', col: '#ffb02e'};
      if (li <= 57) return {text: 'SHH', col: '#8aa0c0'};
      if (li <= 66) return {text: '!!!', col: '#ffb02e'};
      if (li <= 68) return {text: 'GENIUS', col: '#ffb02e'};
      return {text: '-$400', col: '#ff4f5e', flash: li === 69 && st >= wT(69, 'bolt')};
    }
    // NOVA: she has been buffering at Dex all along (the little spinner)
    if (li >= 55 && li <= 59) return {text: 'BUFFERING', col: '#b98cff', spin};
    if (li >= 60) return {heart: true, text: 'YES', col: '#ff5d8f'};
    if (li >= 46 && li <= 48) return {text: 'LOL', col: '#b98cff'};
    return {spin: st >= LS[28] - 1 ? spin : undefined, text: st >= LS[28] - 1 ? '' : 'COFFEE', col: '#b98cff'};
  };

  // ── camera: gentle push toward each speaker, big push-ins on the gags
  const headOf = (who: string): [number, number] => {
    if (who === 'SYS') return scene === 'home' && li === 9 ? [880, 1290] : [880, 720];
    const p = place(who as Who);
    return [p.x, p.y - 26 * p.s];
  };
  type Cam = {x: number; y: number; z: number};
  const camFor = (i: number): Cam => {
    const spk = ep.lines[i].speaker;
    const [hx, hy] = headOf(spk);
    if (i === 12) return {x: hx, y: hy - 70, z: 1.45};
    if (i === 56) {
      const p = place('NOVA');
      return {x: p.x, y: p.y - 84 * p.s - 26, z: 2.1};
    }
    if (i === 54) return {x: 640, y: 1100, z: 1.12};
    if (i === 69) return {x: 540, y: 1040, z: 1.0};
    if (spk === 'SYS') return {x: 540, y: 1060, z: 1.0};
    return {x: lerp(540, hx, 0.3), y: lerp(1060, hy, 0.25), z: 1.06};
  };
  const camNow = (): Cam => {
    const cur = camFor(li);
    const prev = li > 0 && !cuts.includes(LS[li]) ? camFor(li - 1) : {x: 540, y: 1060, z: 1};
    const k = inK(st, LS[li] - 0.15, 0.45);
    return {x: lerp(prev.x, cur.x, k), y: lerp(prev.y, cur.y, k), z: lerp(prev.z, cur.z, k)};
  };
  const cam = st < 0 ? {x: 540, y: 1060, z: 1} : camNow();
  const kick = (t0: number, amp: number, d: number) => (st >= t0 ? amp * Math.exp(-(st - t0) * d) : 0);
  const shake = kick(smackT, 22, 6) + kick(wT(12, 'critical'), 8, 6) + kick(LS[4], 6, 6) + kick(wT(69, 'bolt'), 14, 6) + kick(LS[72], 10, 6) + kick(LS[58], 8, 6);
  const camStyle: React.CSSProperties = {position: 'absolute', inset: 0, transformOrigin: `${cam.x}px ${cam.y}px`,
    transform: `translate(${540 - cam.x + Math.sin(frame * 2.3) * shake}px, ${1060 - cam.y + Math.cos(frame * 2.9) * shake}px) scale(${cam.z})`};

  // ── backgrounds
  const city = (
    <g>
      <rect x={130} y={590} width={820} height={520} rx={18} fill="#1a1440" stroke="#0a0820" strokeWidth={14} />
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff8a5d" /><stop offset="0.55" stopColor="#b14fd6" /><stop offset="1" stopColor="#2a1f6a" /></linearGradient>
        <clipPath id="win"><rect x={138} y={598} width={804} height={504} rx={12} /></clipPath>
      </defs>
      <g clipPath="url(#win)">
        <rect x={130} y={590} width={820} height={520} fill="url(#sky)" />
        {Array.from({length: 14}).map((_, k) => {
          const bw = 50 + hash(k) * 50;
          const bx = 130 + k * 62 - 10;
          const bh = 160 + hash(k + 9) * 280;
          return (
            <g key={k}>
              <rect x={bx} y={1110 - bh} width={bw} height={bh} fill={k % 2 ? '#1c1648' : '#251d5a'} />
              {Array.from({length: Math.floor(bh / 34)}).map((__, r) => [0, 1].map((c) => (
                hash(k * 31 + r * 7 + c) > 0.45 ? <rect key={`${r}-${c}`} x={bx + 10 + c * (bw / 2 - 4)} y={1110 - bh + 14 + r * 34} width={10} height={14} fill={hash(k + r) > 0.5 ? '#ffd23f' : '#6fe3ff'} opacity={0.85} /> : null
              )))}
            </g>
          );
        })}
        {[0, 1, 2].map((k) => {
          const x = 130 + (((st + 2) * (70 + k * 40) + k * 300) % 1000);
          const y = 680 + k * 70;
          return <g key={k} transform={`translate(${x} ${y})`}><rect x={-26} y={-8} width={52} height={16} rx={8} fill="#f4f1ea" /><rect x={-34} y={-2} width={10} height={4} fill="#ff4f5e" /></g>;
        })}
      </g>
      <rect x={536} y={590} width={8} height={520} fill="#0a0820" />
    </g>
  );
  const homeBg = (
    <g>
      <rect x={0} y={0} width={W} height={H} fill="#2b2156" />
      {city}
      <rect x={0} y={1340} width={W} height={H - 1340} fill="#3a3f6a" />
      <rect x={0} y={1330} width={W} height={24} fill="#c9d3df" stroke={OL} strokeWidth={4} />
      {[0, 1, 2, 3].map((k) => <rect key={k} x={40 + k * 260} y={1400} width={220} height={300} rx={14} fill="#33385e" stroke="#262a4a" strokeWidth={6} />)}
    </g>
  );
  const homeFront = (
    <g>
      <rect x={0} y={1340} width={W} height={H - 1340} fill="#3a3f6a" />
      <rect x={-10} y={1330} width={W + 20} height={24} rx={6} fill="#c9d3df" stroke={OL} strokeWidth={5} />
      {[0, 1, 2, 3].map((k) => <rect key={k} x={40 + k * 260} y={1400} width={220} height={300} rx={14} fill="#33385e" stroke="#262a4a" strokeWidth={6} />)}
    </g>
  );
  const neonOn = Math.sin(st * 13) > -0.92 || st % 5 > 0.4;
  const cafeBg = (
    <g>
      <rect x={0} y={0} width={W} height={H} fill="#123039" />
      <rect x={0} y={560} width={W} height={260} fill="#0d252d" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <g key={k} transform={`translate(${120 + k * 170} 900)`}>
          <rect x={-34} y={-60} width={68} height={110} rx={10} fill="#0d252d" stroke="#1f5560" strokeWidth={5} />
          <rect x={-12} y={-72} width={24} height={14} rx={3} fill="#1f5560" />
          <rect x={-24} y={-48 + 86 * (1 - (0.3 + 0.7 * hash(k)))} width={48} height={86 * (0.3 + 0.7 * hash(k))} rx={5} fill={hash(k) > 0.5 ? '#5fd068' : '#ffd23f'} opacity={0.75} />
        </g>
      ))}
      <g opacity={neonOn ? 1 : 0.35}>
        <text x={540} y={700} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={64} fill="none" stroke="#6fe3ff" strokeWidth={10} opacity={0.25}>CHARGING STATION</text>
        <text x={540} y={700} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={64} fill="#dffaff" stroke="#6fe3ff" strokeWidth={3}>CHARGING STATION</text>
        <path d="M 520 718 L 548 718 L 532 744 L 556 744 L 512 790 L 526 756 L 504 756 Z" fill="#ffd23f" />
      </g>
      {[200, 880].map((x, k) => (
        <g key={k}>
          <rect x={x - 2} y={560} width={4} height={60 + k * 20} fill="#0a1a20" />
          <path d={`M ${x - 44} ${640 + k * 20} Q ${x} ${590 + k * 20} ${x + 44} ${640 + k * 20} Z`} fill="#ffb02e" stroke={OL} strokeWidth={4} />
          <ellipse cx={x} cy={652 + k * 20} rx={60} ry={14} fill="#ffd23f" opacity={0.25} />
        </g>
      ))}
    </g>
  );
  const cafeFront = (
    <g>
      {/* Nova's table + plugged-in coffee */}
      <rect x={600} y={1360} width={520} height={30} rx={8} fill="#8a5a3a" stroke={OL} strokeWidth={5} />
      <rect x={640} y={1388} width={440} height={600} fill="#6a4128" stroke={OL} strokeWidth={5} />
      <g transform="translate(930 1310)">
        <path d="M -30 -40 L 30 -40 L 24 46 L -24 46 Z" fill="#f4f1ea" stroke={OL} strokeWidth={5} />
        <path d="M 30 -22 Q 54 -18 50 4 Q 46 20 26 18" fill="none" stroke={OL} strokeWidth={6} />
        <rect x={-14} y={-8} width={28} height={18} rx={4} fill="#5fd068" />
        <path d="M -40 -40 Q -30 -70 -50 -90" stroke="#ffffff" strokeWidth={5} fill="none" opacity={0.5 + 0.3 * Math.sin(st * 3)} />
        <path d="M 0 46 Q 10 90 110 90" stroke="#1b1b22" strokeWidth={8} fill="none" />
      </g>
      {/* the plant Bolt hides behind */}
      <g transform="translate(320 1420)">
        {[-60, -30, 0, 30, 60].map((a, k) => (
          <path key={k} transform={`rotate(${a + Math.sin(st * 1.3 + k) * 3})`} d="M 0 0 Q -30 -80 0 -150 Q 30 -80 0 0 Z" fill={k % 2 ? '#3fae6a' : '#2f8f56'} stroke={OL} strokeWidth={5} />
        ))}
        <path d="M -90 0 L 90 0 L 70 170 L -70 170 Z" fill="#e8443a" stroke={OL} strokeWidth={6} />
        <rect x={-100} y={-12} width={200} height={26} rx={6} fill="#c22f27" stroke={OL} strokeWidth={5} />
      </g>
      <rect x={0} y={1590} width={600} height={400} fill="#0b2128" />
    </g>
  );
  const endBg = (
    <g>
      {cafeBg}
      <rect x={0} y={1350} width={W} height={H - 1350} fill="#0b2128" />
      <rect x={0} y={1340} width={W} height={20} fill="#1f5560" />
    </g>
  );

  // ── characters + devices
  const toon = (who: Who, k: number) => {
    const p = place(who);
    if (!p.vis) return null;
    const m = moodOf(who, li);
    const speaking = ep.lines[li].speaker === who && st >= LS[li];
    const style = ep.lines[li].style;
    const mood: Mood = who === 'DEX' && speaking && (style === 'robot' || style === 'slow') ? (li === 40 && st > LE[40] - 0.6 ? 'dead' : 'robot') : m;
    const sweat = who === 'DEX' && (m === 'nervous' || (li >= 35 && li <= 39)) ? 1 : 0;
    return <Toon key={who} who={who} x={p.x} y={p.y} s={p.s} rot={p.rot ?? 0} dim={p.dim ?? 0} mood={mood} talk={talkOf(who)} blink={li === 0 ? 0.6 : blinkOf(k)} screen={screenOf(who)} t={st} sweat={sweat}
      gaze={who === 'NOVA' && st < LS[28] - 1 ? -0.6 : who === 'BOLT' && scene !== 'end' ? 0.7 : 0} />;
  };
  const sysTalk = talkOf('SYS');
  const orbK = st < LS[1] - 0.3 ? 0 : inK(st, LS[1] - 0.3, 0.4);
  const orb = scene === 'home' && li === 9 ? null : <Orb x={880} y={scene === 'home' ? 720 : 760} s={0.9} talk={sysTalk} t={st} k={orbK} />;

  // ── gag props
  const gags: React.ReactNode[] = [];
  const bp = place('BOLT');
  if (li >= 13 && li <= 21 && st >= wT(13, 'this')) {
    const k = pop(st, wT(13, 'this'));
    gags.push(
      <g key="rizz" transform={`translate(${bp.x} ${790 + Math.sin(st * 2.4) * 8}) scale(${k})`}>
        <circle r={110} fill="#ff5df2" opacity={0.15} />
        <rect x={-74} y={-74} width={148} height={148} rx={32} fill="#ff5df2" stroke={OL} strokeWidth={6} />
        <rect x={-74} y={-74} width={148} height={60} rx={32} fill="#ffffff" opacity={0.18} />
        <text y={34} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={96} fill="#fff" stroke={OL} strokeWidth={4}>R</text>
        <rect x={-100} y={88} width={200} height={44} rx={10} fill={OL} />
        <text y={120} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={28} fill="#ff5df2">RIZZ.EXE v2.0</text>
        {li >= 19 ? (
          <g transform="translate(0 168)">
            {[-2, -1, 0, 1, 2].map((j) => {
              const sk = pop(st, LS[19] + 0.2 + (j + 2) * 0.09);
              return <path key={j} transform={`translate(${j * 42} 0) scale(${sk})`} d="M 0 -18 L 5 -6 L 18 -6 L 8 3 L 12 16 L 0 8 L -12 16 L -8 3 L -18 -6 L -5 -6 Z" fill="#ffd23f" stroke={OL} strokeWidth={3} />;
            })}
            {li >= 21 ? <text y={52} textAnchor="middle" fontFamily={heavy} fontWeight={800} fontSize={24} fill="#fff" opacity={inK(st, LS[21])}>— review by: THE GUY</text> : null}
          </g>
        ) : null}
      </g>,
    );
  }
  if (li >= 26 && li <= 30) {
    const k = clamp01((st - LS[26]) / (LE[30] - LS[26]));
    const done = k >= 1;
    gags.push(
      <g key="install" transform={`translate(540 860) scale(${pop(st, LS[26])})`}>
        <rect x={-300} y={-60} width={600} height={120} rx={20} fill="#0b1422" stroke="#b98cff" strokeWidth={6} />
        <text x={-270} y={-14} fontFamily={heavy} fontWeight={900} fontSize={30} fill="#fff">{done ? 'RIZZ.EXE INSTALLED' : 'INSTALLING RIZZ.EXE'}</text>
        <text x={270} y={-14} textAnchor="end" fontFamily={heavy} fontWeight={900} fontSize={30} fill="#b98cff">{done ? '100%' : `${Math.floor(k * 99)}%`}</text>
        <rect x={-270} y={10} width={540} height={26} rx={13} fill="#24324a" />
        <rect x={-270} y={10} width={540 * (done ? 1 : k)} height={26} rx={13} fill="#b98cff" />
      </g>,
    );
  }
  const dx = place('DEX');
  const dexHead: [number, number] = [dx.x, dx.y - 26 * dx.s];
  if (li === 31 || li === 34) {
    const k = pop(st, LS[li]);
    gags.push(
      <g key={`pick${li}`} transform={`translate(${dexHead[0] + 10} ${dexHead[1] - 260}) scale(${k})`}>
        {li === 31 ? [0, 1, 2].map((j) => (
          <path key={j} d={`M ${-30 - j * 26} ${-j * 22} Q 0 ${-40 - j * 46} ${30 + j * 26} ${-j * 22}`} fill="none" stroke="#ff5df2" strokeWidth={12} strokeLinecap="round" opacity={(st * 3 + j) % 3 < 2 ? 1 : 0.3} />
        )) : (
          <g>
            <rect x={-110} y={-80} width={220} height={90} rx={14} fill="#2b2f45" stroke={OL} strokeWidth={6} />
            {Array.from({length: 18}).map((_, j) => <rect key={j} x={-96 + (j % 6) * 33} y={-68 + Math.floor(j / 6) * 26} width={26} height={20} rx={4} fill={(Math.floor(st * 6) + j) % 7 === 0 ? '#ff5df2' : '#c9d3df'} />)}
          </g>
        )}
      </g>,
    );
  }
  if (li >= 42 && li <= 44) {
    const k = pop(st, LS[42]);
    const accepted = st >= LS[43] + 0.3;
    gags.push(
      <g key="tc" transform={`translate(540 860) scale(${k})`}>
        <rect x={-260} y={-150} width={520} height={300} rx={18} fill="#f4f1ea" stroke={OL} strokeWidth={6} />
        <text y={-104} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={34} fill={OL}>TERMS & CONDITIONS</text>
        <defs><clipPath id="tcc"><rect x={-230} y={-90} width={460} height={140} /></clipPath></defs>
        <g clipPath="url(#tcc)">
          {Array.from({length: 30}).map((_, j) => <rect key={j} x={-230} y={-86 + j * 18 - ((st - LS[42]) * 60) % 18 * 0 - (st - LS[42]) * 40} width={160 + hash(j) * 300} height={8} rx={4} fill="#b9b2a2" />)}
        </g>
        <g transform={`translate(0 100) scale(${accepted ? pop(st, LS[43] + 0.3) : 1})`}>
          <rect x={-110} y={-30} width={220} height={60} rx={14} fill={accepted ? '#5fd068' : '#2f6fd6'} stroke={OL} strokeWidth={5} />
          <text y={12} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={32} fill="#fff">{accepted ? 'ACCEPTED' : 'ACCEPT'}</text>
        </g>
      </g>,
    );
  }
  if (li >= 46 && li <= 48) {
    gags.push(
      <g key="ad">
        <g transform={`translate(540 800) rotate(-4) scale(${pop(st, LS[46])})`}>
          <rect x={-250} y={-46} width={500} height={92} rx={16} fill="#ffd23f" stroke={OL} strokeWidth={6} />
          <text y={18} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={50} fill={OL}>SPONSORED</text>
        </g>
        {li === 46 && st >= wT(46, 'less') - 0.3 ? (
          <g transform={`translate(${dexHead[0] + 230} ${dexHead[1] - 40}) rotate(${st * 30}) scale(${pop(st, wT(46, 'less') - 0.3)})`}>
            <path d={Array.from({length: 24}).map((_, j) => `${j ? 'L' : 'M'} ${Math.cos((j / 24) * Math.PI * 2) * (j % 2 ? 72 : 100)} ${Math.sin((j / 24) * Math.PI * 2) * (j % 2 ? 72 : 100)}`).join(' ') + ' Z'} fill="#ff4f5e" stroke={OL} strokeWidth={5} />
            <text y={-4} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={34} fill="#fff" transform={`rotate(${-st * 30})`}>50%</text>
            <text y={26} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={20} fill="#fff" transform={`rotate(${-st * 30})`}>LESS AWKWARD</text>
          </g>
        ) : null}
      </g>,
    );
  }
  if (st >= smackT && st < smackT + 1.0) {
    const k = pop(st, smackT, 0.3);
    gags.push(
      <g key="smack" transform={`translate(${dexHead[0] - 110} ${dexHead[1] - 120}) rotate(-12) scale(${k})`} opacity={1 - clamp01((st - smackT - 0.7) / 0.3)}>
        <path d={Array.from({length: 20}).map((_, j) => `${j ? 'L' : 'M'} ${Math.cos((j / 20) * Math.PI * 2) * (j % 2 ? 90 : 150)} ${Math.sin((j / 20) * Math.PI * 2) * (j % 2 ? 60 : 100)}`).join(' ') + ' Z'} fill="#ffd23f" stroke={OL} strokeWidth={7} />
        <text y={22} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={66} fill="#ff4f5e" stroke={OL} strokeWidth={4}>SMACK!</text>
      </g>,
    );
  }
  if (li >= 61 && li <= 66) {
    const digits = ['', '', '', '', '', ''];
    if (li >= 64) {
      const t = st - LS[64];
      const ws = words(64);
      ['4', '8', '2', '♥'].forEach((d, j) => {
        const w = ws[[0, 1, 2, 3][j]];
        if (w && t >= w.start) digits[j] = d;
      });
    }
    gags.push(
      <g key="code" transform={`translate(540 850) scale(${pop(st, LS[61])})`}>
        <rect x={-300} y={-80} width={600} height={160} rx={20} fill="#0b1422" stroke="#6fe3ff" strokeWidth={6} />
        <text y={-34} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={28} fill="#6fe3ff">ENTER 6-DIGIT CODE</text>
        {digits.map((d, j) => (
          <g key={j} transform={`translate(${-225 + j * 90} 30)`}>
            <rect x={-34} y={-34} width={68} height={68} rx={12} fill="#16223a" stroke={d ? (d === '♥' ? '#ff5d8f' : '#6fe3ff') : '#2c3a55'} strokeWidth={4} />
            {d === '♥' ? <Heart x={0} y={4} s={1.3} /> : <text y={16} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={44} fill="#fff">{d}</text>}
          </g>
        ))}
      </g>,
    );
  }
  if (li >= 69) {
    const t0 = wT(69, 'bolt');
    if (st >= t0) {
      gags.push(
        <g key="bill" transform={`translate(${place('BOLT').x + 40} 820) rotate(-6) scale(${pop(st, t0, 0.3)})`}>
          <path d="M -170 -110 L 170 -110 L 170 100 L 140 120 L 110 100 L 80 120 L 50 100 L 20 120 L -10 100 L -40 120 L -70 100 L -100 120 L -130 100 L -170 120 Z" fill="#f4f1ea" stroke={OL} strokeWidth={6} />
          <text y={-62} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={26} fill={OL}>FREE TRIAL ENDED</text>
          <text y={14} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={80} fill="#ff4f5e">-$400</text>
          <text y={70} textAnchor="middle" fontFamily={heavy} fontWeight={900} fontSize={26} fill={OL}>CHARGED TO: BOLT</text>
        </g>,
      );
    }
  }
  // floating hearts for the yes
  const hearts = scene === 'moment' && st >= LS[60] ? Array.from({length: 14}).map((_, j) => {
    const t = st - LS[60] - j * 0.35;
    if (t < 0) return null;
    const y = 1450 - ((t * 120) % 900);
    return <Heart key={j} x={100 + hash(j) * 880 + Math.sin(t * 2 + j) * 30} y={y} s={0.8 + hash(j + 4) * 1.2} op={0.75} />;
  }) : null;

  // ── stage
  const stage = (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      {scene === 'home' ? homeBg : scene === 'end' ? endBg : cafeBg}
      {scene === 'home' ? (
        <g>
          {toon('DEX', 0)}
          {toon('BOLT', 1)}
          {homeFront}
          <Toaster x={900} y={1290} s={1.05} talk={li === 9 ? sysTalk : 0} t={st} />
        </g>
      ) : scene === 'end' ? (
        <g>{toon('BOLT', 1)}{toon('DEX', 0)}{toon('NOVA', 2)}<rect x={0} y={1352} width={W} height={H} fill="#0b2128" /><rect x={0} y={1340} width={W} height={20} fill="#1f5560" /></g>
      ) : (
        <g>
          {hearts}
          {toon('BOLT', 1)}
          {toon('NOVA', 2)}
          {toon('DEX', 0)}
          {cafeFront}
        </g>
      )}
      {orb}
      {gags}
    </svg>
  );

  // ── overlays: moment tint, shutdown blackout, scene wipes
  const tint = scene === 'moment' ? inK(st, LS[54] - 0.3, 0.8) * (st >= LS[61] ? 1 - inK(st, LS[61], 0.5) * 0.6 : 1) : 0;
  const offA = LE[40] - 0.1;
  const offZ = LS[41] - 0.25;
  const black = st >= offA && st < LS[41] + 0.2 ? (st < offZ ? inK(st, offA, 0.25) : 1 - inK(st, offZ, 0.4)) : 0;
  const wipeAt = cuts.find((c) => c !== LS[54] && st >= c - 0.35 && st < c + 0.35);
  const wipeK = wipeAt !== undefined ? (st - wipeAt + 0.35) / 0.7 : -1;

  // ── captions
  const shownLine = (() => {
    if (st < LS[0] - 0.6) return -1;
    if (mode === 'clean') return st >= LS[li] - 0.12 && st < LE[li] + 0.6 ? li : -1;
    const nxt = li + 1 < N && st >= LE[li] + 0.25 ? li + 1 : li; // dub: show the next line as soon as this one is said
    return nxt;
  })();
  const capBox = (i: number) => {
    const ln = ep.lines[i];
    const col = COL[ln.speaker];
    const live = st >= LS[i];
    const t = st - LS[i];
    const ws = words(i);
    const said = live ? ws.filter((w) => t >= w.start).length : 0;
    const disp = ln.text.split(' ');
    const lit = Math.round((said / ws.length) * disp.length);
    const len = ln.text.length;
    let fs = 64;
    while (fs > 34) {
      const per = Math.floor(840 / (fs * 0.6));
      const rows = Math.ceil(len / per) + (len > per ? 0.4 : 0);
      if (rows * fs * 1.18 <= 200) break;
      fs -= 2;
    }
    const tag = STYLE_TAG[ln.style];
    const ready = !live ? clamp01(1 - (LS[i] - st) / 0.8) : 1;
    return (
      <div style={{position: 'absolute', left: 100, top: 240, width: 880, minHeight: 230, boxSizing: 'border-box', padding: '20px 22px 18px', borderRadius: 22,
        background: 'rgba(8,12,24,0.88)', border: `5px solid ${live ? col : '#3a4560'}`, boxShadow: live ? `0 0 28px ${col}55` : 'none'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10}}>
          <div style={{background: col, color: OL, fontFamily: heavy, fontWeight: 900, fontSize: 32, padding: '4px 16px', borderRadius: 10, letterSpacing: 2,
            opacity: live ? 1 : 0.55 + 0.45 * ready}}>{NAME[ln.speaker]}</div>
          {tag ? <div style={{color: col, fontFamily: heavy, fontWeight: 800, fontSize: 24, letterSpacing: 2}}>({tag})</div> : null}
          {mode !== 'clean' && !live ? (
            <div style={{marginLeft: 'auto', width: 120, height: 12, borderRadius: 6, background: '#24324a', overflow: 'hidden'}}>
              <div style={{width: `${ready * 100}%`, height: '100%', background: col}} />
            </div>
          ) : null}
          {mode !== 'clean' && live && t < ws[ws.length - 1].end ? <div style={{marginLeft: 'auto', fontFamily: heavy, fontWeight: 900, fontSize: 24, color: '#ff4f5e', letterSpacing: 2}}>● GO</div> : null}
        </div>
        <div style={{fontFamily: heavy, fontWeight: 800, fontSize: fs, lineHeight: 1.16, color: '#fff'}}>
          {disp.map((w, j) => <span key={j} style={{color: j < lit ? '#ffffff' : mode === 'clean' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.42)'}}>{w}{j < disp.length - 1 ? ' ' : ''}</span>)}
        </div>
      </div>
    );
  };
  const nextIdx = shownLine >= 0 ? shownLine + 1 : 0;
  const upNext = mode !== 'clean' && st >= -0.6 && nextIdx < N ? (
    <div style={{position: 'absolute', left: 100, top: 1610, width: 880, boxSizing: 'border-box', padding: '14px 20px', borderRadius: 16, background: 'rgba(8,12,24,0.8)', border: '3px dashed #3a4560'}}>
      <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 22, letterSpacing: 3, color: '#8aa0c0'}}>UP NEXT · <span style={{color: COL[ep.lines[nextIdx].speaker]}}>{NAME[ep.lines[nextIdx].speaker]}</span></div>
      <div style={{fontFamily: heavy, fontWeight: 700, fontSize: 30, lineHeight: 1.2, color: '#c9d3df', marginTop: 4}}>{ep.lines[nextIdx].text}</div>
    </div>
  ) : null;

  // ── intro + outro cards
  const introK = s < INTRO ? 1 - inK(s, INTRO - 0.5, 0.45) : 0;
  const total = INTRO + plan.end + ep.outro;
  const outroK = s >= total - ep.outro - 0.4 ? inK(s, total - ep.outro - 0.4, 0.5) : 0;
  const titleCard = (k: number, sub: string, extra?: React.ReactNode) => (
    <div style={{position: 'absolute', inset: 0, background: `rgba(8,10,24,${0.92 * k})`, opacity: k, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <svg width={120} height={120} style={{marginBottom: 20}}>
        {Array.from({length: 8}).map((_, j) => {
          const a = (j / 8) * Math.PI * 2;
          const age = (j - Math.floor(s * 10) % 8 + 8) % 8;
          return <circle key={j} cx={60 + Math.cos(a) * 40} cy={60 + Math.sin(a) * 40} r={11} fill="#b98cff" opacity={1 - age / 9} />;
        })}
      </svg>
      <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 150, color: '#fff', letterSpacing: 4, WebkitTextStroke: '6px #111', paintOrder: 'stroke fill', textShadow: '0 0 40px #b98cff'}}>BUFFERING</div>
      <div style={{fontFamily: heavy, fontWeight: 800, fontSize: 40, color: '#b98cff', letterSpacing: 6, marginTop: 6}}>{sub}</div>
      {extra}
    </div>
  );
  const castRow = mode !== 'clean' ? (
    <div style={{display: 'flex', gap: 14, marginTop: 50, flexWrap: 'wrap', justifyContent: 'center', width: 900}}>
      {(['DEX', 'BOLT', 'NOVA', 'SYS'] as const).map((k) => (
        <div key={k} style={{background: COL[k], color: OL, fontFamily: heavy, fontWeight: 900, fontSize: 30, padding: '6px 18px', borderRadius: 10}}>{NAME[k]}</div>
      ))}
      <div style={{width: '100%', textAlign: 'center', fontFamily: heavy, fontWeight: 700, fontSize: 28, color: '#c9d3df', marginTop: 10}}>SYSTEM = anyone, in a robot voice</div>
    </div>
  ) : null;

  // ── audio
  const sfx: Array<[number, string, number]> = [
    [0.1, 'sfx/whoosh.wav', 0.5], [0.5, 'sfx/shine.wav', 0.4], [INTRO - 0.6, 'sfx/bell.wav', 0.5],
    [LS[1] - 0.3, 'sfx/powerup.wav', 0.3], [LS[3] + 0.1, 'sfx/ding.wav', 0.5], [LS[4], 'sfx/fail.wav', 0.4],
    [LS[5] - 0.8, 'sfx/whoosh.wav', 0.6], [LS[9], 'sfx/ding.wav', 0.4], [wT(12, 'critical'), 'sfx/fail.wav', 0.5],
    [wT(13, 'this'), 'sfx/shine.wav', 0.6], [wT(13, 'this'), 'sfx/powerup.wav', 0.4],
    ...[0, 1, 2, 3, 4].map((j) => [LS[19] + 0.2 + j * 0.09, 'sfx/pop.wav', 0.4] as [number, string, number]),
    [LS[21] - 0.5, 'sfx/scratch.wav', 0.45],
    ...cuts.filter((c) => c !== LS[54]).map((c) => [c - 0.35, 'sfx/whoosh.wav', 0.6] as [number, string, number]),
    [LS[54] - 0.4, 'sfx/shine.wav', 0.4],
    [LS[26], 'sfx/printer.wav', 0.3], [LS[31], 'sfx/zap.wav', 0.5], [LS[34], 'sfx/zap.wav', 0.5],
    [LS[40], 'sfx/powerdown.wav', 0.6], [LS[41] - 0.9, 'sfx/powerup.wav', 0.5], [LS[41] - 0.5, 'sfx/bell.wav', 0.4],
    [LS[42], 'sfx/printer.wav', 0.3], [LS[43] + 0.3, 'sfx/ding.wav', 0.6], [LS[46], 'sfx/bell.wav', 0.4], [wT(46, 'less') - 0.3, 'sfx/coins.wav', 0.4],
    [smackT, 'sfx/punch.wav', 0.9], [smackT + 0.02, 'sfx/slam.wav', 0.5], [LS[51] + 0.1, 'sfx/ding.wav', 0.5],
    [LS[56], 'sfx/shine.wav', 0.5], [LS[58], 'sfx/pop.wav', 0.6], [LS[60] + 0.3, 'sfx/shine.wav', 0.5],
    [LS[61], 'sfx/ding.wav', 0.5], [LS[64] - 0.6, 'sfx/ding.wav', 0.5],
    ...[0, 1, 2, 3].map((j) => [LS[64] + (words(64)[j]?.start ?? 0), j === 3 ? 'sfx/pop.wav' : 'sfx/tick.wav', 0.6] as [number, string, number]),
    [wT(69, 'charging'), 'sfx/coins.wav', 0.6], [wT(69, 'bolt'), 'sfx/slam.wav', 0.8], [wT(69, 'bolt') + 0.2, 'sfx/fail.wav', 0.4], [LS[72], 'sfx/crack.wav', 0.5],
    [plan.end - 0.4, 'sfx/whoosh.wav', 0.5],
  ];

  return (
    <AbsoluteFill style={{background: '#0b0f1e', overflow: 'hidden'}}>
      <div style={camStyle}>{stage}</div>
      {tint > 0 ? <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 60% 55%, rgba(255,93,143,${0.18 * tint}) 0%, rgba(40,0,30,${0.55 * tint}) 85%)`}} /> : null}
      {black > 0 ? (
        <div style={{position: 'absolute', inset: 0, background: '#000', opacity: black, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
          {st > offA + 0.6 ? (
            <>
              <div style={{fontFamily: heavy, fontWeight: 900, fontSize: 56, color: '#6fe3ff', letterSpacing: 6}}>DEX OS</div>
              <div style={{width: 360, height: 14, borderRadius: 7, background: '#1a2232', marginTop: 24, overflow: 'hidden'}}>
                <div style={{width: `${clamp01((st - offA - 0.6) / (offZ - offA - 0.6)) * 100}%`, height: '100%', background: '#6fe3ff'}} />
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      {wipeK >= 0 ? (
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          {[0, 1, 2].map((j) => {
            const x = lerp(-1700, 1500, ease(clamp01(wipeK * 1.1 - j * 0.05)));
            return <rect key={j} x={x + j * 160} y={-200} width={900} height={2400} fill={['#b98cff', '#3fd6c3', '#ff7a3d'][j]} transform={`skewX(-18)`} />;
          })}
        </svg>
      ) : null}
      {shownLine >= 0 && introK < 0.5 && outroK < 0.5 ? capBox(shownLine) : null}
      {introK < 0.5 && outroK < 0.5 ? upNext : null}
      {introK > 0 ? titleCard(introK, 'A TECHTOPIA STORY', castRow) : null}
      {outroK > 0 ? titleCard(outroK, 'THE END') : null}

      <Audio src={staticFile('music/buffering.wav')} volume={mode === 'guide' ? 0.3 : 0.34} />
      {mode === 'guide' ? timing.lines.map((ln, i) => (
        <Sequence key={i} from={Math.round((INTRO + LS[i]) * fps)}><Audio src={staticFile(ln.file)} /></Sequence>
      )) : null}
      {sfx.map(([t, f, v], i) => (
        <Sequence key={`f${i}`} from={Math.max(0, Math.round((INTRO + t) * fps))} durationInFrames={90}><Audio src={staticFile(f)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const bufferFrames = (ep: BufferEpisode, t: Timing) => Math.ceil((ep.intro + buildPlan(ep, t).end + ep.outro) * 30);
