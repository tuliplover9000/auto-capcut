import React, {useId} from 'react';
import {litDots} from './font5x7';

/** A real LED matrix: every dot exists (dim when unlit), lit dots glow.
 *  The panel is charCols x charRows character cells of 6x8 dots each. */
export const LedText: React.FC<{
  lines: string[];
  charCols: number;
  charRows: number;
  pitch: number;
  color: string;
  dim?: string;
  glow?: number;
  opacity?: number;
}> = ({lines, charCols, charRows, pitch, color, dim = '#26201a', glow = 1, opacity = 1}) => {
  const id = useId().replace(/:/g, '');
  const cols = charCols * 6 - 1;
  const rows = charRows * 8 - 1;
  const w = cols * pitch;
  const h = rows * pitch;
  const r = pitch * 0.38;
  const dots = litDots(lines, charCols, charRows);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block', overflow: 'visible'}}>
      <defs>
        <pattern id={`p${id}`} width={pitch} height={pitch} patternUnits="userSpaceOnUse">
          <circle cx={pitch / 2} cy={pitch / 2} r={r} fill={dim} />
        </pattern>
        <filter id={`g${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={pitch * 0.55 * glow} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={w} height={h} fill={`url(#p${id})`} />
      <g filter={glow > 0 ? `url(#g${id})` : undefined} opacity={opacity}>
        {dots.map(([c, rr]) => (
          <circle key={`${c}-${rr}`} cx={c * pitch + pitch / 2} cy={rr * pitch + pitch / 2} r={r} fill={color} />
        ))}
      </g>
    </svg>
  );
};
