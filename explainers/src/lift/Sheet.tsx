import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Balloon, BALLOON_COLS, Kid, LiftArt} from './art';

// Dev-only review sheet (svg-craft rubric): hero size on the sky, phone size, chip size, silhouette.
const ARTS = ['cat', 'person', 'car', 'whale', 'titanic', 'kid'];
export const LiftArtSheet: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(#5ec8ff, #d6f3ff)'}}>
    {ARTS.map((a, i) => {
      const y = 20 + i * 315;
      const body = a === 'kid' ? <Kid face="sad" t={0} /> : <LiftArt art={a} face="shock" t={0} />;
      return (
        <React.Fragment key={a}>
          <svg width={300} height={300} viewBox="0 0 400 400" style={{position: 'absolute', left: 20, top: y}}>{body}</svg>
          <svg width={120} height={120} viewBox="0 0 400 400" style={{position: 'absolute', left: 360, top: y + 90}}>{body}</svg>
          <svg width={40} height={40} viewBox="0 0 400 400" style={{position: 'absolute', left: 520, top: y + 130}}>{body}</svg>
          <svg width={300} height={300} viewBox="0 0 400 400" style={{position: 'absolute', left: 600, top: y, filter: 'brightness(0)'}}>{body}</svg>
        </React.Fragment>
      );
    })}
    <svg width={160} height={1900} style={{position: 'absolute', left: 920, top: 0}}>
      {BALLOON_COLS.map((c, i) => <Balloon key={c} x={80} y={80 + i * 220} r={48} color={c} />)}
    </svg>
  </AbsoluteFill>
);
