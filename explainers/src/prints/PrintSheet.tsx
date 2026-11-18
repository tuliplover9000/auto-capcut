import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Mugshot, Print} from './PrintArt';
import {printData} from './specs';

// Art review sheet: every print at test size + the minutiae positions.
export const PrintSheet: React.FC = () => {
  const ids = ['crime', 'A', 'B', 'C', 'loop', 'whorl', 'arch', 'detail'];
  return (
    <AbsoluteFill style={{background: '#14161d'}}>
      <svg width={1080} height={1920}>
        {ids.map((id, i) => {
          const x = 140 + (i % 4) * 267;
          const y = 260 + Math.floor(i / 4) * 420;
          const pd = printData(id);
          return (
            <g key={id}>
              <rect x={x - 125} y={y - 170} width={250} height={370} rx={12} fill="#f6f1e4" />
              <Print id={id} x={x} y={y} s={0.95} uid={`s${i}`} hl={0.8} />
              {pd.mins.map((m, j) => <circle key={j} cx={x + m.x * 0.95} cy={y + m.y * 0.95} r={14} fill="none" stroke="#ff2e47" strokeWidth={3} />)}
              <text x={x} y={y + 190} textAnchor="middle" fontSize={30} fontWeight={900} fill="#1b1b22">{id}</text>
            </g>
          );
        })}
        {/* lens-size detail */}
        <g>
          <rect x={60} y={1080} width={600} height={600} fill="#f6f1e4" />
          <svg x={60} y={1080} width={600} height={600} viewBox="-90 -90 180 180"><Print id="detail" x={0} y={0} s={1} uid="dz" /></svg>
        </g>
        <Mugshot x={860} y={1300} s={0.9} tag="B" />
        <Print id="B" x={860} y={1700} s={0.7} uid="sB" />
      </svg>
    </AbsoluteFill>
  );
};
