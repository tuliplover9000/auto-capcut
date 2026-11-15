import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Kid} from '../lift/art';
import {Bear, Crate, Emblem, Penguin, Ship, Shell, Sign, Soldier} from './art';

// Dev-only review sheet (svg-craft rubric): poses at hero size, phone size, silhouette.
const B: React.FC<{x: number; y: number; w: number; h?: number; vb?: string; sil?: boolean; children: React.ReactNode}> = ({x, y, w, h, vb = '0 0 400 700', sil, children}) => (
  <svg width={w} height={h ?? w * 1.75} viewBox={vb} style={{position: 'absolute', left: x, top: y, overflow: 'visible', filter: sil ? 'brightness(0)' : undefined}}>{children}</svg>
);
export const StoryArtSheet: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(#9fd3ff, #e9d9b0)'}}>
    <B x={10} y={10} w={200}><Bear face="happy" t={0} cap /></B>
    <B x={220} y={10} w={200}><Bear face="smug" t={0} cap pose={{salute: 1}} /></B>
    <B x={430} y={10} w={200}><Bear face="happy" t={0} pose={{bottle: 1}} /></B>
    <B x={640} y={10} w={200}><Bear face="happy" t={0} pose={{bottle: 1}} label="BEER" /></B>
    <B x={850} y={10} w={200}><Bear face="happy" t={0.2} pose={{wave: 1}} /></B>
    <B x={10} y={380} w={200}><Bear face="angry" t={0} pose={{carry: 1}} /></B>
    <svg width={240} height={150} style={{position: 'absolute', left: 30, top: 300}}><g transform="translate(20 20) scale(0.62)"><Crate /></g></svg>
    <B x={220} y={380} w={200}><Bear face="happy" t={0} pose={{hug: 1}} /></B>
    <B x={430} y={380} w={60}><Bear face="happy" t={0} cap pose={{salute: 1}} /></B>
    <B x={500} y={380} w={60} sil><Bear face="happy" t={0} cap pose={{salute: 1}} /></B>
    <B x={570} y={380} w={60} sil><Bear face="happy" t={0} pose={{carry: 1}} /></B>
    {[0, 1, 2, 3].map((i) => <B key={i} x={640 + i * 105} y={380} w={100}><Soldier i={i} face={i % 2 ? 'happy' : 'smug'} t={0} salute={i === 0 ? 1 : 0} cheer={i === 1 ? 1 : 0} hold={i === 2 ? 1 : 0} wave={i === 3 ? 1 : 0} /></B>)}
    {[0, 1, 2].map((i) => <B key={i} x={640 + i * 105} y={590} w={100}><Soldier i={i} old face="happy" t={0} wave={i === 1 ? 1 : 0} /></B>)}
    <B x={10} y={760} w={300} h={300} vb="0 0 400 400"><Emblem t={0} /></B>
    <B x={320} y={760} w={200} h={200} vb="0 0 400 400"><Penguin t={0} /></B>
    <B x={530} y={760} w={200} h={200} vb="0 0 400 400"><Kid face="happy" t={0} /></B>
    <svg width={500} height={300} style={{position: 'absolute', left: 30, top: 1350, overflow: 'visible'}}><g transform="translate(0 280) scale(0.5)"><Ship t={0} /></g></svg>
    <svg width={340} height={360} style={{position: 'absolute', left: 560, top: 1000}}><Sign lines={['NO PETS', 'ON BOARD']} /></svg>
    <svg width={300} height={100} style={{position: 'absolute', left: 740, top: 800}}><Shell /></svg>
  </AbsoluteFill>
);
