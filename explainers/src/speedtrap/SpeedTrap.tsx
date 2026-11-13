import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadOverpass} from '@remotion/google-fonts/Overpass';
import {loadFont as loadOverpassMono} from '@remotion/google-fonts/OverpassMono';
import {loadFont as loadCourier} from '@remotion/google-fonts/CourierPrime';
import {LedText} from '../lib/LedText';
import {Pictogram, ArtKey} from '../art/Pictograms';
import {
  ART_W, DIVE_FROM, DIVE_TO, RUN_X0, RUN_X1, Beat, Episode, beatAt, buildBeats, citationIn, citationOut,
  INTRO, flashAmount, outroStart, radarText, radarValue, scaleMax, sfxEvents, tickStep, vmsLines,
} from './timeline';

// "A highway speed-camera installation at night, made of asphalt, concrete and
//  road-sign aluminium, lit by amber radar LEDs and one white camera flash."
const C = {
  sky0: '#06080d', sky1: '#131826', skyline: '#0d1119', window: '#3a2f1c',
  steel: '#2b2e35', steelHi: '#41454e',
  wallHi: '#878b93', wallLo: '#41444b', joint: '#2a2c32', reflector: '#c98a1e',
  road: '#1b1d23', paint: '#d9d3bf', ground: '#0a0b0e',
  ink: '#0b0c10', signWhite: '#ecebe4', housing: '#0d0e11', bezel: '#26282e',
  amber: '#ffb21a', amberDim: '#2a2115', red: '#ff3b2f', redDim: '#2b1513',
  paper: '#f1ead6', paperInk: '#25221d', stamp: '#c22b21', chrome: '#8f96a1',
};

const overpass = loadOverpass('normal', {weights: ['700', '800', '900'], subsets: ['latin']}).fontFamily;
const mono = loadOverpassMono('normal', {weights: ['600', '700'], subsets: ['latin']}).fontFamily;
const courier = loadCourier('normal', {weights: ['400', '700'], subsets: ['latin']}).fontFamily;

const WALL_TOP = 930;
const ROAD_TOP = 1335;
const GROUND_Y = 1335; // animals' feet
const ART_H = (ART_W * 260) / 400;
const ART_TOP = GROUND_Y - (ART_H * 250) / 260;
const SCALE_Y = 1495;
const SX0 = 110;
const SX1 = 970;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ───────────────────────── static world ───────────────────────── */

const Sky: React.FC = () => (
  <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.sky0} 0%, ${C.sky1} 48%, #1a2030 100%)`}}>
    <svg width={1080} height={WALL_TOP} style={{position: 'absolute', top: 0}}>
      {[
        [0, 760, 120], [110, 700, 90], [190, 790, 140], [320, 720, 70], [380, 660, 110],
        [480, 770, 90], [560, 690, 130], [680, 750, 100], [770, 640, 120], [880, 730, 90], [960, 780, 120],
      ].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={WALL_TOP - y} fill={C.skyline} />
          {Array.from({length: 6}).map((_, k) => (
            <rect key={k} x={x + 14 + ((k * 37 + i * 13) % (w - 24))} y={y + 22 + ((k * 53 + i * 29) % (WALL_TOP - y - 40))}
              width={8} height={10} fill={C.window} opacity={0.8} />
          ))}
        </g>
      ))}
    </svg>
  </AbsoluteFill>
);

const Wall: React.FC = () => (
  <div style={{position: 'absolute', top: WALL_TOP, left: 0, width: 1080, height: ROAD_TOP - WALL_TOP,
    background: `radial-gradient(ellipse 260px 300px at 200px 0px, ${C.wallHi}, transparent),
      radial-gradient(ellipse 260px 300px at 560px 0px, ${C.wallHi}, transparent),
      radial-gradient(ellipse 260px 300px at 920px 0px, ${C.wallHi}, transparent),
      linear-gradient(180deg, #686c74, ${C.wallLo})`}}>
    {Array.from({length: 7}).map((_, i) => (
      <div key={i} style={{position: 'absolute', left: 90 + i * 180, top: 0, width: 4, height: '100%', background: C.joint, opacity: 0.6}} />
    ))}
    <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: 10, background: '#9a9ea6'}} />
    {Array.from({length: 12}).map((_, i) => (
      <div key={i} style={{position: 'absolute', top: 22, left: 40 + i * 90, width: 22, height: 10, borderRadius: 3, background: C.reflector}} />
    ))}
  </div>
);

const Road: React.FC = () => (
  <>
    <div style={{position: 'absolute', top: ROAD_TOP, left: 0, width: 1080, height: 95, background: C.road}}>
      <div style={{position: 'absolute', top: 6, left: 0, width: '100%', height: 6, background: C.paint, opacity: 0.85}} />
      {Array.from({length: 7}).map((_, i) => (
        <div key={i} style={{position: 'absolute', top: 62, left: 30 + i * 160, width: 90, height: 8, background: C.paint, opacity: 0.7}} />
      ))}
    </div>
    <div style={{position: 'absolute', top: ROAD_TOP + 95, left: 0, width: 1080, height: 1920 - ROAD_TOP - 95, background: C.ground}} />
  </>
);

const Gantry: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 30, top: 118, width: 18, height: WALL_TOP - 118, background: C.steel}} />
    <div style={{position: 'absolute', left: 1032, top: 118, width: 18, height: WALL_TOP - 118, background: C.steel}} />
    <div style={{position: 'absolute', left: 30, top: 112, width: 1020, height: 22, background: C.steelHi}} />
  </>
);

const LimitSign: React.FC<{limit: number}> = ({limit}) => (
  <>
    <div style={{position: 'absolute', left: 200, top: 780, width: 14, height: WALL_TOP - 780, background: C.steel}} />
    <div style={{position: 'absolute', left: 96, top: 492, width: 222, height: 292, background: C.signWhite, borderRadius: 14,
      boxShadow: 'inset 0 0 0 7px #ecebe4, inset 0 0 0 12px #111', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', fontFamily: overpass, color: '#111', lineHeight: 0.95}}>
      <div style={{fontWeight: 800, fontSize: 46, marginTop: 6}}>SPEED</div>
      <div style={{fontWeight: 800, fontSize: 46}}>LIMIT</div>
      <div style={{fontWeight: 900, fontSize: 132, marginTop: 4}}>{limit}</div>
    </div>
  </>
);

/* ───────────────────────── live instruments ───────────────────────── */

const Vms: React.FC<{lines: string[]}> = ({lines}) => (
  <div style={{position: 'absolute', left: 70, top: 140, width: 940, height: 290, background: C.housing, borderRadius: 10,
    boxShadow: `0 0 0 6px ${C.bezel}, 0 18px 40px rgba(0,0,0,.6)`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <LedText lines={lines} charCols={15} charRows={3} pitch={10} color={C.amber} dim={C.amberDim} />
  </div>
);

const RadarSign: React.FC<{text: string; over: boolean; frame: number}> = ({text, over, frame}) => {
  const color = over ? C.red : C.amber;
  const blink = Math.floor(frame / 6) % 2 === 0;
  return (
    <>
      <div style={{position: 'absolute', left: 694, top: 846, width: 14, height: WALL_TOP - 846, background: C.steel}} />
      <div style={{position: 'absolute', left: 420, top: 488, width: 560, height: 362, background: C.housing, borderRadius: 12,
        boxShadow: `0 0 0 6px ${C.bezel}, 0 18px 40px rgba(0,0,0,.6)`}}>
        <div style={{position: 'absolute', top: 16, width: '100%', textAlign: 'center', fontFamily: overpass, fontWeight: 900,
          fontSize: 44, letterSpacing: 2, color: C.signWhite}}>YOUR SPEED</div>
        <div style={{position: 'absolute', top: 84, left: 126}}>
          <LedText lines={[text]} charCols={2} charRows={1} pitch={28} color={color} dim={over ? C.redDim : C.amberDim} glow={1.2} />
        </div>
        <div style={{position: 'absolute', top: 300, width: '100%', display: 'flex', justifyContent: 'center'}}>
          {over ? (
            <LedText lines={['SLOW DOWN']} charCols={9} charRows={1} pitch={6} color={C.red} dim={C.redDim} opacity={blink ? 1 : 0.15} />
          ) : (
            <div style={{fontFamily: overpass, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: C.signWhite}}>MPH</div>
          )}
        </div>
      </div>
    </>
  );
};

const Camera: React.FC<{flash: number; frame: number}> = ({flash, frame}) => (
  <div style={{position: 'absolute', left: 838, top: 438, width: 140, height: 52, background: '#1b1c21', borderRadius: 8,
    boxShadow: `0 0 0 3px ${C.bezel}`}}>
    <div style={{position: 'absolute', left: 12, top: 12, width: 52, height: 28, borderRadius: 4,
      background: flash > 0.05 ? '#ffffff' : '#9da2ab', boxShadow: flash > 0.05 ? `0 0 ${80 * flash}px ${40 * flash}px #fff` : 'none'}} />
    <div style={{position: 'absolute', left: 86, top: 8, width: 36, height: 36, borderRadius: 18, background: '#05060a',
      boxShadow: 'inset 0 0 0 5px #30333a'}} />
    <div style={{position: 'absolute', left: 124, top: 6, width: 9, height: 9, borderRadius: 5,
      background: Math.floor(frame / 15) % 2 ? '#ff2a20' : '#4a1210'}} />
  </div>
);

/* ───────────────────────── the contender ───────────────────────── */

const Contender: React.FC<{ep: Episode; b: Beat; frame: number}> = ({ep, b, frame}) => {
  if (frame < b.runStart || frame > b.runEnd) return null;
  const c = ep.contenders[b.index];
  const t = (frame - b.runStart) / (b.runEnd - b.runStart);
  const dive = c.motion === 'dive';
  const x = dive ? lerp(DIVE_FROM[0], DIVE_TO[0], t) : lerp(RUN_X0, RUN_X1, t);
  const y = dive ? lerp(DIVE_FROM[1], DIVE_TO[1], t) : ART_TOP - Math.abs(Math.sin(frame * 0.9)) * 12;
  const angle = dive ? (Math.atan2(DIVE_TO[1] - DIVE_FROM[1], DIVE_TO[0] - DIVE_FROM[0]) * 180) / Math.PI : 0;
  const streak = Math.min(1, c.speed / 70);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: ART_W, transform: `rotate(${angle}deg)`, transformOrigin: 'center'}}>
      {[0, 1, 2, 3].map((k) => (
        <div key={k} style={{position: 'absolute', left: -140 * streak - k * 30, top: 70 + k * 42, height: 6, borderRadius: 3,
          width: 120 + 220 * streak, background: 'rgba(255,255,255,.22)'}} />
      ))}
      <div style={{filter: dive ? 'drop-shadow(0 0 10px rgba(255,255,255,.55))' : undefined}}>
        <Pictogram art={c.art as ArtKey} color={C.ink} width={ART_W} stride={Math.sin(frame * 0.9)} />
      </div>
    </div>
  );
};

/* ───────────────────────── the lineup scale ───────────────────────── */

const Scale: React.FC<{ep: Episode; beats: Beat[]; frame: number; fps: number}> = ({ep, beats, frame, fps}) => {
  const max = scaleMax(ep, frame);
  const xOf = (v: number) => SX0 + (Math.min(v, max) / max) * (SX1 - SX0);
  const step = tickStep(max);
  const labelStep = step * 2;
  const zoomed = max > 100;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920}}>
      <div style={{position: 'absolute', left: xOf(ep.limit), top: SCALE_Y - 4, width: SX1 - xOf(ep.limit), height: 8, background: C.red, opacity: 0.55}} />
      <div style={{position: 'absolute', left: SX0, top: SCALE_Y - 2, width: SX1 - SX0, height: 4, background: C.chrome}} />
      {Array.from({length: Math.floor(max / step) + 1}).map((_, i) => {
        const v = i * step;
        const big = Math.abs(v / labelStep - Math.round(v / labelStep)) < 1e-6;
        return (
          <React.Fragment key={v}>
            <div style={{position: 'absolute', left: xOf(v) - 1, top: SCALE_Y + 4, width: 2, height: big ? 16 : 9, background: C.chrome}} />
            {big ? (
              <div style={{position: 'absolute', left: xOf(v) - 30, width: 60, top: SCALE_Y + 22, textAlign: 'center',
                fontFamily: mono, fontWeight: 600, fontSize: 22, color: C.chrome}}>{v}</div>
            ) : null}
          </React.Fragment>
        );
      })}
      <div style={{position: 'absolute', left: xOf(ep.limit) - 2, top: SCALE_Y - 34, width: 4, height: 50, background: C.red}} />
      {beats.filter((b) => frame >= b.verdictStart).map((b) => {
        const c = ep.contenders[b.index];
        const pop = spring({frame: frame - b.verdictStart, fps, config: {damping: 12, stiffness: 180}});
        const r = interpolate(max, [80, 260], [27, 17], {extrapolateRight: 'clamp'});
        const lift = zoomed && b.index % 2 ? 44 : 0;
        const pinned = c.speed > max;
        const showLabel = !zoomed || b.overflow;
        return (
          <div key={b.index} style={{position: 'absolute', left: xOf(c.speed) - r, top: SCALE_Y - r - 36 - lift,
            width: r * 2, transform: `scale(${pop})`}}>
            {showLabel ? (
              <div style={{position: 'absolute', bottom: r * 2 + 4, left: -40, width: r * 2 + 80, textAlign: 'center',
                fontFamily: mono, fontWeight: 700, fontSize: 24, color: b.ticket ? C.red : C.signWhite}}>
                {pinned ? `${c.speed} →` : c.speed}
              </div>
            ) : null}
            <div style={{width: r * 2, height: r * 2, borderRadius: r, background: C.signWhite, display: 'flex',
              alignItems: 'center', justifyContent: 'center', boxShadow: b.ticket ? `0 0 0 4px ${C.red}` : 'none', overflow: 'hidden'}}>
              <Pictogram art={c.art as ArtKey} color={C.ink} width={r * 1.75} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Note: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', top: 1572, width: 1080, textAlign: 'center', fontFamily: mono, fontWeight: 600,
    fontSize: 24, letterSpacing: 3, textTransform: 'uppercase', color: C.chrome}}>{text}</div>
);

/* ───────────────────────── the citation ───────────────────────── */

const Citation: React.FC<{ep: Episode; b: Beat; frame: number; fps: number}> = ({ep, b, frame, fps}) => {
  const cin = citationIn(b);
  const cout = citationOut(b);
  if (!b.ticket || frame < cin || frame > cout + 12) return null;
  const c = ep.contenders[b.index];
  const enter = spring({frame: frame - cin, fps, config: {damping: 16, stiffness: 120}});
  const exit = interpolate(frame, [cout, cout + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const top = lerp(1950, 560, enter) + exit * 1400;
  const rows: Array<[string, string]> = [
    ['DRIVER', c.name.join(' ')],
    ['RECORDED SPEED', `${c.speed} ${ep.unit}`],
    ['POSTED LIMIT', `${ep.limit} ${ep.unit}`],
    ['FINE', c.fine ?? '$150'],
  ];
  const stampT = frame - (cin + 8 + rows.length * 5 + 6);
  const stamp = stampT >= 0 ? interpolate(stampT, [0, 5], [2.2, 1], {extrapolateRight: 'clamp'}) : 0;
  return (
    <div style={{position: 'absolute', left: 110, top, width: 860, background: C.paper, borderRadius: 6, padding: '34px 40px 150px',
      transform: 'rotate(-1.6deg)', boxShadow: '0 30px 70px rgba(0,0,0,.65)', color: C.paperInk}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <div style={{fontFamily: overpass, fontWeight: 900, fontSize: 40, letterSpacing: 1}}>HIGHWAY PATROL</div>
        <div style={{fontFamily: mono, fontWeight: 700, fontSize: 24}}>No. 0041{b.index + 2}</div>
      </div>
      <div style={{fontFamily: overpass, fontWeight: 700, fontSize: 24, letterSpacing: 5, marginTop: 4}}>UNIFORM TRAFFIC CITATION</div>
      <div style={{height: 3, background: C.paperInk, margin: '18px 0 20px'}} />
      {rows.map(([k, v], i) => (
        <div key={k} style={{display: 'flex', justifyContent: 'space-between', fontFamily: courier, fontSize: 36, lineHeight: 1.55,
          opacity: frame >= cin + 8 + i * 5 ? 1 : 0}}>
          <span>{k}</span>
          <span style={{fontWeight: 700}}>{v}</span>
        </div>
      ))}
      {c.fineNote ? (
        <div style={{fontFamily: courier, fontStyle: 'italic', fontSize: 30, color: C.stamp, textAlign: 'right', marginTop: 6,
          opacity: frame >= cin + 8 + rows.length * 5 ? 1 : 0}}>({c.fineNote})</div>
      ) : null}
      {stamp > 0 ? (
        <div style={{position: 'absolute', left: 48, bottom: 34, transform: `rotate(-8deg) scale(${stamp})`, border: `7px solid ${C.stamp}`,
          borderRadius: 8, padding: '6px 22px', fontFamily: overpass, fontWeight: 900, fontSize: 64, letterSpacing: 4, color: C.stamp,
          opacity: 0.88}}>{c.stamp ?? 'SPEEDING'}</div>
      ) : null}
    </div>
  );
};

/* ───────────────────────── composition ───────────────────────── */

export const SpeedTrap: React.FC<{episode: Episode}> = ({episode: ep}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const beats = buildBeats(ep);
  const b = beatAt(beats, frame);
  const v = radarValue(ep, beats, frame);
  const over = v !== null && v > ep.limit;
  const flash = flashAmount(beats, frame);
  const ob = beats.find((x) => x.overflow && frame >= x.passFrame && frame < x.passFrame + 26);
  const decay = ob ? 1 - (frame - ob.passFrame) / 26 : 0;
  const shakeX = ob ? Math.sin(frame * 2.7) * 18 * decay : 0;
  const shakeY = ob ? Math.cos(frame * 3.1) * 11 * decay : 0;
  const note = frame >= outroStart(ep) ? 'Speeds are peak, approximate'
    : b ? ep.contenders[b.index].note : `Posted limit · ${ep.limit} ${ep.unit.toLowerCase()}`;
  // The hook must MOVE, not just sit: a slow push-in over the intro (the
  // question stays fully readable from frame 0), then it holds.
  const push = 1 + 0.03 * interpolate(frame, [0, INTRO], [0, 1], {extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 2)});

  return (
    <AbsoluteFill style={{background: C.ground}}>
      <AbsoluteFill style={{transform: `translate(${shakeX}px, ${shakeY}px) scale(${push})`, transformOrigin: '50% 40%'}}>
        <Sky />
        <Gantry />
        <Wall />
        <Road />
        <LimitSign limit={ep.limit} />
        <RadarSign text={radarText(v, frame)} over={over} frame={frame} />
        <Camera flash={flash} frame={frame} />
        <Vms lines={vmsLines(ep, beats, frame)} />
        {b ? <Contender ep={ep} b={b} frame={frame} /> : null}
        <Scale ep={ep} beats={beats} frame={frame} fps={fps} />
        <Note text={note} />
        {b ? <Citation ep={ep} b={b} frame={frame} fps={fps} /> : null}
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#fff', opacity: flash, pointerEvents: 'none'}} />
      <Audio src={staticFile('sfx/ambience.wav')} volume={0.22} />
      {sfxEvents(ep, beats).map((e, i) => (
        <Sequence key={i} from={e.frame} durationInFrames={45}>
          <Audio src={staticFile(`sfx/${e.sfx}.wav`)} volume={e.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
