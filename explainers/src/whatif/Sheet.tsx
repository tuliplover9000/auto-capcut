import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Asteroid, Chicken, Dinosauroid, Earth, Human, Mammoth, Shrew, TRex, Troodon} from './art';

// Dev-only review sheet (svg-craft rubric): hero size, phone size, silhouette.
const B: React.FC<{x: number; y: number; w: number; h: number; vb: string; sil?: boolean; children: React.ReactNode}> = ({x, y, w, h, vb, sil, children}) => (
  <svg width={w} height={h} viewBox={vb} style={{position: 'absolute', left: x, top: y, overflow: 'visible', filter: sil ? 'brightness(0)' : undefined}}>{children}</svg>
);
export const WhatIfArtSheet: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(#9fd3ff, #d9e9b0)'}}>
    <B x={20} y={20} w={500} h={375} vb="0 0 800 600"><TRex face="angry" t={0} /></B>
    <B x={540} y={20} w={500} h={375} vb="0 0 800 600"><TRex face="smug" t={0} jaw={1} stomp={1} /></B>
    <B x={20} y={420} w={300} h={250} vb="0 0 600 500"><Troodon face="happy" t={0} /></B>
    <B x={340} y={420} w={220} h={220} vb="0 0 400 400"><Shrew face="shock" t={0} /></B>
    <B x={580} y={420} w={300} h={250} vb="0 0 600 500"><Mammoth face="happy" t={0} /></B>
    <B x={900} y={460} w={160} h={160} vb="0 0 400 400"><Chicken t={0} /></B>
    <B x={20} y={700} w={240} h={420} vb="0 0 400 700"><Dinosauroid face="happy" t={0} /></B>
    <B x={270} y={700} w={240} h={420} vb="0 0 400 700"><Dinosauroid face="smug" t={0} rig={{phone: 1, sit: 1}} /></B>
    <B x={520} y={700} w={240} h={420} vb="0 0 400 700"><Dinosauroid face="happy" t={0} statue /></B>
    <B x={770} y={700} w={240} h={420} vb="0 0 400 700"><Human face="happy" t={0} rig={{phone: 1, sit: 1}} /></B>
    <B x={20} y={1150} w={240} h={420} vb="0 0 400 700"><Human face="smug" t={0} coat glasses rig={{wave: 1}} /></B>
    <B x={290} y={1170} w={340} h={340} vb="0 0 400 400"><Earth face="shock" t={0} /></B>
    <svg width={400} height={400} style={{position: 'absolute', left: 640, top: 1350, overflow: 'visible'}}><g transform="translate(120 260)"><Asteroid t={0} /></g></svg>
    <B x={30} y={1640} w={60} h={105} vb="0 0 400 700"><Dinosauroid face="happy" t={0} /></B>
    <B x={100} y={1640} w={60} h={105} vb="0 0 400 700" sil><Dinosauroid face="happy" t={0} /></B>
    <B x={180} y={1660} w={110} h={82} vb="0 0 800 600" sil><TRex face="angry" t={0} /></B>
    <B x={310} y={1660} w={100} h={83} vb="0 0 600 500" sil><Troodon face="happy" t={0} /></B>
    <B x={430} y={1670} w={70} h={70} vb="0 0 400 400" sil><Shrew face="happy" t={0} /></B>
    <B x={520} y={1660} w={100} h={83} vb="0 0 600 500" sil><Mammoth face="happy" t={0} /></B>
  </AbsoluteFill>
);
