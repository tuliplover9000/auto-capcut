import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Cage, Carriage, Gorilla, Man, Napoleon, Rabbit} from './art';

// Dev-only review sheet (svg-craft rubric): poses at hero size, phone size, silhouette.
const B: React.FC<{x: number; y: number; w: number; h?: number; vb?: string; sil?: boolean; children: React.ReactNode}> = ({x, y, w, h, vb = '0 0 400 400', sil, children}) => (
  <svg width={w} height={h ?? w} viewBox={vb} style={{position: 'absolute', left: x, top: y, overflow: 'visible', filter: sil ? 'brightness(0)' : undefined}}>{children}</svg>
);
export const HordeArtSheet: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(#5aa84a, #2f6b2a)'}}>
    <B x={10} y={10} w={250}><Gorilla face="angry" t={0} /></B>
    <B x={270} y={10} w={250}><Gorilla face="angry" t={0} swing={1} /></B>
    <B x={530} y={10} w={250}><Gorilla face="shock" t={0.1} beat={1} /></B>
    <B x={790} y={10} w={250}><Gorilla face="happy" t={0} eat={1} /></B>
    <B x={10} y={270} w={120}><Gorilla face="angry" t={0} /></B>
    <B x={140} y={270} w={120} sil><Gorilla face="angry" t={0} /></B>
    {[0, 1, 2, 3, 4, 5].map((i) => <B key={i} x={280 + i * 130} y={280} w={130}><Man i={i} face={i % 2 ? 'angry' : 'shock'} run={i * 0.15} /></B>)}
    <B x={10} y={440} w={260} h={455} vb="0 0 400 700"><Napoleon face="smug" t={0} /></B>
    <B x={290} y={440} w={260} h={455} vb="0 0 400 700"><Napoleon face="angry" t={0} crop={1} /></B>
    <B x={570} y={440} w={120} h={210} vb="0 0 400 700"><Napoleon face="shock" t={0} /></B>
    <B x={700} y={440} w={120} h={210} vb="0 0 400 700" sil><Napoleon face="shock" t={0} /></B>
    {[0, 1, 2, 3].map((i) => <B key={i} x={560 + i * 125} y={700} w={120}><Rabbit i={i} hop={i * 0.25} /></B>)}
    <B x={20} y={960} w={360}><Carriage t={0} bunnies={1} shake={0} /></B>
    <B x={400} y={960} w={300}><Cage open={0} /></B>
    <B x={720} y={960} w={300}><Cage open={1} /></B>
    <B x={20} y={1330} w={60}><Rabbit i={0} hop={0} /></B>
    <B x={90} y={1330} w={60}><Man i={1} face="angry" run={0} /></B>
  </AbsoluteFill>
);
