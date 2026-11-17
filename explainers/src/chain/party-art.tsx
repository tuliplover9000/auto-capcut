import React from 'react';
import {OPAL} from '../observe/art';

// Props for CHAIN REACTION #3 ("party" — a park birthday). Same flat style as
// karma-art.tsx: origin = ground contact point, +y down, units scale with kAt(y).

/* lawn sprinkler; `on` 0..1 ramps the spray, `t` animates the sweep */
export const Sprinkler: React.FC<{on: number; t: number; reach?: number}> = ({on, t, reach = 70}) => {
  const head = -7 - 5 * Math.min(1, on * 3); // pops up when it switches on
  const sweep = Math.sin(t * 3.2) * 0.5;
  return (
    <g>
      <ellipse cx={0} cy={0} rx={9} ry={3} fill="#7a8a6a" />
      <rect x={-2.2} y={head} width={4.4} height={-head} fill="#8a96a4" />
      <rect x={-5} y={head - 3} width={10} height={4} rx={2} fill="#5a6676" />
      {on > 0
        ? Array.from({length: 7}).map((_, j) => {
            const side = j % 2 ? -1 : 1;
            const a = 0.35 + (j >> 1) * 0.28 + sweep * side * 0.4;
            const r = reach * on * (0.6 + 0.4 * ((j >> 1) / 3));
            const ex = side * Math.cos(a) * r;
            const peak = head - 4 - Math.sin(a) * r * 0.55;
            return Array.from({length: 6}).map((__, d) => {
              const u = ((d + 1) / 6 + (t * 1.7 + j * 0.13)) % 1;
              const x = ex * u;
              const y = head - 3 + (peak - head + 3) * 4 * u * (1 - u) + (u * u) * (-head);
              return <ellipse key={`${j}-${d}`} cx={x} cy={y} rx={1.5} ry={2.2} fill="#8fd6ff" stroke="#fff" strokeWidth={0.5} opacity={0.95} />;
            });
          })
        : null}
    </g>
  );
};

/* goose, side view facing right. mode: sleep (head tucked), honk (neck up, wings out), run */
export const Goose: React.FC<{mode: 'sleep' | 'honk' | 'run'; t: number; wet?: boolean}> = ({mode, t, wet}) => {
  const flap = mode === 'sleep' ? 0 : Math.sin(t * (mode === 'run' ? 22 : 30));
  const step = mode === 'run' ? Math.sin(t * 20) : 0;
  return (
    <g>
      <ellipse cx={0} cy={0} rx={18} ry={4} fill="rgba(0,0,0,.15)" />
      {mode !== 'sleep'
        ? [1, -1].map((d) => (
            <path key={d} d={`M ${-2 + d * 3} -8 L ${-2 + d * 3 + step * d * 7} 0 l 6 0`} fill="none" stroke="#f08a24" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          ))
        : null}
      {/* far wing */}
      {mode !== 'sleep' ? <path d={`M -2 -18 Q -14 ${-30 - 14 * flap} -24 ${-26 - 18 * flap} Q -14 -16 -2 -14 Z`} fill="#dcdcd4" /> : null}
      <ellipse cx={-2} cy={mode === 'sleep' ? -9 : -14} rx={18} ry={mode === 'sleep' ? 9 : 10} fill="#f6f6f0" stroke="#c8c8bc" strokeWidth={1} />
      <path d={`M -18 ${mode === 'sleep' ? -10 : -16} l -6 -4 l 2 7 Z`} fill="#e6e6dc" />
      {mode === 'sleep' ? (
        <g>
          <path d="M 10 -14 Q 16 -20 8 -21 Q 2 -20 4 -14 Z" fill="#f6f6f0" stroke="#c8c8bc" strokeWidth={1} />
          <path d="M 6 -19 l 6 1 l -5 2 Z" fill="#f08a24" />
          <path d="M 4 -19.5 q 1.5 1 3 0" fill="none" stroke={OPAL.ink} strokeWidth={0.9} />
        </g>
      ) : (
        <g>
          <path d={mode === 'honk' ? 'M 10 -20 Q 13 -34 12 -46' : 'M 12 -18 Q 22 -26 28 -30'} fill="none" stroke="#f6f6f0" strokeWidth={7} strokeLinecap="round" />
          <g transform={mode === 'honk' ? 'translate(12 -47)' : 'translate(29 -31)'}>
            <circle cx={0} cy={0} r={5.2} fill="#f6f6f0" />
            <circle cx={1.5} cy={-1.4} r={1.1} fill={OPAL.ink} />
            {/* beak: open while honking / running */}
            <path d={`M 4 -1 L 12 ${-1 + (mode === 'honk' ? -2.5 : -1)} L 4 1 Z`} fill="#f08a24" />
            <path d={`M 4 1.4 L 11 ${2.6 + (mode === 'honk' ? 2.5 : 1)} L 4 2.6 Z`} fill="#d06a14" />
          </g>
          <path d={`M -2 -16 Q 10 ${-26 - 16 * flap} 18 ${-22 - 18 * flap} Q 8 -12 -2 -12 Z`} fill="#e8e8de" stroke="#c8c8bc" strokeWidth={0.8} />
        </g>
      )}
      {wet ? [-10, -2, 7].map((x, k) => <ellipse key={x} cx={x} cy={-24 + ((t * 40 + k * 9) % 22)} rx={1.2} ry={2} fill="#8fd6ff" />) : null}
    </g>
  );
};

/* soccer ball (ground contact at origin) */
export const Ball: React.FC<{spin?: number}> = ({spin = 0}) => (
  <g>
    <ellipse cx={0} cy={0} rx={6} ry={1.8} fill="rgba(0,0,0,.18)" />
    <g transform={`translate(0 -6.5) rotate(${spin * 57.3})`}>
      <circle cx={0} cy={0} r={6.5} fill="#fff" stroke={OPAL.ink} strokeWidth={1} />
      <path d="M 0 -2.6 L 2.5 -0.8 L 1.6 2.1 L -1.6 2.1 L -2.5 -0.8 Z" fill={OPAL.ink} />
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        return <circle key={k} cx={Math.cos(a) * 5.6} cy={Math.sin(a) * 5.6} r={1.5} fill={OPAL.ink} />;
      })}
    </g>
  </g>
);

/* seesaw: the plank pivots at (0, PIVOT_Y); tilt in degrees (+ = right end down) */
export const SEESAW_HALF = 70;
export const SEESAW_PIVOT_Y = -16;
export const Seesaw: React.FC<{tilt: number}> = ({tilt}) => (
  <g>
    <ellipse cx={0} cy={0} rx={60} ry={6} fill="rgba(0,0,0,.14)" />
    <path d="M -12 0 L 0 -18 L 12 0 Z" fill="#c8504a" stroke="#8a3a34" strokeWidth={1.5} />
    <g transform={`rotate(${tilt} 0 ${SEESAW_PIVOT_Y})`}>
      <rect x={-SEESAW_HALF} y={SEESAW_PIVOT_Y - 5} width={SEESAW_HALF * 2} height={6} rx={2} fill="#ffd23f" stroke="#c89a1a" strokeWidth={1} />
      {[-1, 1].map((d) => (
        <path key={d} d={`M ${d * (SEESAW_HALF - 16)} ${SEESAW_PIVOT_Y - 5} l 0 -9 l ${-d * 6} 0`} fill="none" stroke="#3a4a5a" strokeWidth={2.4} strokeLinecap="round" />
      ))}
    </g>
    <circle cx={0} cy={SEESAW_PIVOT_Y} r={2.6} fill="#3a4a5a" />
  </g>
);

/* toy sand bucket (origin = bottom centre) */
export const SandBucket: React.FC<{full?: boolean}> = ({full = true}) => (
  <g>
    <path d="M -9 -18 Q 0 -29 9 -18" fill="none" stroke="#2a6ab0" strokeWidth={1.8} />
    <path d="M -9 -18 L 9 -18 L 7 0 L -7 0 Z" fill="#e8505b" stroke="#a83440" strokeWidth={1} />
    <rect x={-8.2} y={-12} width={16.4} height={3} fill="#ffd23f" />
    {full ? <ellipse cx={0} cy={-18} rx={9} ry={2.4} fill="#e6c88a" /> : null}
  </g>
);

/* diamond kite (origin = centre); the bridle point where the string ties is KITE_TIE */
export const KITE_TIE: [number, number] = [0, 10];
export const Kite: React.FC<{t: number; col?: string; col2?: string}> = ({t, col = '#ff4f5e', col2 = '#ffd23f'}) => {
  const tail = Array.from({length: 7}).map((_, k) => [Math.sin(t * 5 + k * 0.9) * (3 + k * 1.6), 34 + k * 9] as [number, number]);
  return (
    <g>
      <path d={`M 0 32 ${tail.map(([x, y]) => `L ${x} ${y}`).join(' ')}`} fill="none" stroke="#3a3a44" strokeWidth={1.4} />
      {tail.filter((_, k) => k % 2 === 1).map(([x, y], k) => (
        <path key={k} d={`M ${x - 5} ${y - 3} L ${x + 5} ${y + 3} L ${x + 5} ${y - 3} L ${x - 5} ${y + 3} Z`} fill={k % 2 ? col : col2} />
      ))}
      <path d="M 0 -32 L 22 -4 L 0 32 L -22 -4 Z" fill={col} stroke="#1b1b22" strokeWidth={2} />
      <path d="M 0 -32 L 22 -4 L 0 -4 Z" fill={col2} />
      <path d="M 0 32 L -22 -4 L 0 -4 Z" fill={col2} />
      <line x1={0} y1={-32} x2={0} y2={32} stroke="#5a3a24" strokeWidth={1.6} />
      <line x1={-22} y1={-4} x2={22} y2={-4} stroke="#5a3a24" strokeWidth={1.6} />
    </g>
  );
};

/* picnic table with the birthday cake; splat 0..1 squashes it; balloons tied at the ends */
export const PartyTable: React.FC<{t: number; splat: number; popped?: boolean}> = ({t, splat, popped}) => {
  const sq = Math.min(1, splat * 4);
  const BAL: Array<[number, string]> = [[-58, '#ff4f5e'], [-50, '#5fa8ff'], [58, '#ffd23f'], [50, '#b45cff']];
  return (
    <g>
      <ellipse cx={0} cy={0} rx={70} ry={8} fill="rgba(0,0,0,.15)" />
      {/* balloons on strings */}
      {BAL.map(([x, c], k) => {
        if (popped && k === 3) return null;
        const bx = x + Math.sin(t * 1.6 + k) * 3 + (x > 0 ? 6 : -6);
        const by = -96 - (k % 2) * 12;
        return (
          <g key={k}>
            <path d={`M ${x} -34 Q ${(x + bx) / 2 + 3} ${(by - 34) / 2} ${bx} ${by + 13}`} fill="none" stroke="#8a8f9c" strokeWidth={0.8} />
            <ellipse cx={bx} cy={by} rx={9} ry={11.5} fill={c} />
            <ellipse cx={bx - 3} cy={by - 4} rx={2.2} ry={3.4} fill="#fff" opacity={0.45} />
          </g>
        );
      })}
      {/* benches + table */}
      <rect x={-62} y={-14} width={124} height={5} rx={2} fill="#8a5a3a" />
      {[-48, 48].map((x) => <rect key={x} x={x - 3} y={-34} width={6} height={34} fill="#6a4a3a" />)}
      <rect x={-66} y={-38} width={132} height={8} rx={2} fill="#a8724a" />
      <path d="M -66 -38 L 66 -38 L 70 -24 L -70 -24 Z" fill="#fff" />
      {Array.from({length: 7}).map((_, k) => <rect key={k} x={-66 + k * 19} y={-38} width={9.5} height={14} fill="#e8505b" opacity={0.8} />)}
      {/* plates */}
      {[-42, 40].map((x) => <ellipse key={x} cx={x} cy={-38} rx={9} ry={2.6} fill="#f4f1ea" stroke="#c8c2b4" strokeWidth={0.8} />)}
      {/* the cake */}
      {splat <= 0 ? (
        <g>
          <ellipse cx={0} cy={-38} rx={20} ry={4} fill="#d8d2c4" />
          <rect x={-17} y={-56} width={34} height={18} rx={3} fill="#ff9fc8" />
          <path d="M -17 -54 q 4 5 8 0 q 4 5 8 0 q 4 5 9 0 q 4 5 9 0 L 17 -56 L -17 -56 Z" fill="#fff" />
          <rect x={-11} y={-68} width={22} height={12} rx={3} fill="#ffc4de" />
          <path d="M -11 -66 q 3.6 4 7.3 0 q 3.6 4 7.3 0 q 3.6 4 7.4 0 L 11 -68 L -11 -68 Z" fill="#fff" />
          {[-6, 0, 6].map((x, k) => (
            <g key={x}>
              <rect x={x - 1} y={-77} width={2} height={9} fill={['#5fa8ff', '#7be07b', '#ffd23f'][k]} />
              <ellipse cx={x} cy={-80 + Math.sin(t * 14 + k) * 0.5} rx={1.6} ry={2.6} fill="#ffb03a" />
            </g>
          ))}
        </g>
      ) : (
        <g>
          {/* flattened cake + frosting spray */}
          <ellipse cx={0} cy={-40} rx={22 + 8 * sq} ry={6} fill="#ff9fc8" />
          <ellipse cx={0} cy={-43} rx={17 + 6 * sq} ry={5} fill="#fff" />
          {Array.from({length: 12}).map((_, k) => {
            const a = Math.PI * (1.05 + 0.9 * (k / 11));
            const r = 18 + (k % 3) * 9 + 14 * sq;
            return <ellipse key={k} cx={Math.cos(a) * r * 1.5} cy={-42 + Math.sin(a) * r * 0.7} rx={3 + (k % 2) * 2} ry={2.4} fill={k % 3 ? '#ff9fc8' : '#fff'} />;
          })}
        </g>
      )}
    </g>
  );
};

/* party hat drawn over a Person's head (person units) */
export const PartyHat: React.FC<{col?: string}> = ({col = '#b45cff'}) => (
  <g>
    <path d="M -6 -56 L 0 -74 L 6 -56 Z" fill={col} stroke="#1b1b22" strokeWidth={0.8} />
    <path d="M -4 -61 L 4 -61" stroke="#ffd23f" strokeWidth={1.6} />
    <circle cx={0} cy={-75} r={2.4} fill="#ffd23f" />
  </g>
);

/* tree for the park backdrop / lawn */
export const Tree: React.FC<{s?: number; col?: string}> = ({s = 1, col = '#5fae5a'}) => (
  <g transform={`scale(${s})`}>
    <ellipse cx={0} cy={0} rx={26} ry={6} fill="rgba(0,0,0,.14)" />
    <rect x={-6} y={-70} width={12} height={70} fill="#8a5a3a" />
    <circle cx={0} cy={-100} r={44} fill={col} />
    <circle cx={-26} cy={-80} r={28} fill={col} />
    <circle cx={26} cy={-82} r={30} fill={col} />
    <circle cx={-10} cy={-116} r={22} fill="#7cc46e" opacity={0.7} />
  </g>
);
