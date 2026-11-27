// Party crowd for the manor whodunit (2026-11-27, v2 "hard mode"): ~40 guests and waiters
// across 12 rooms. Everything is a pure function of the party clock p, so the replay can
// rewind it. Decoys: green cocktails everywhere, butler-lookalike waiters, a blue bottle
// passed between strangers, a pink pour, simultaneous glass handoffs near the real ones.
import * as THREE from 'three';
import {V, hash, lerp, smoother} from './kit';
import {COLX, FY} from './manor';
import {Look, Pose, Prop} from './manor-toon';

export type GEvent = {t0: number; t1: number; pose: Pose};
export type Guest = {
  id: number; look: Look; home: THREE.Vector3; kind: 'stand' | 'sit' | 'stroll' | 'dance';
  to?: THREE.Vector3; per?: number; off?: number; prop?: Prop; events?: GEvent[];
};

const SKIN = ['#f2c8a8', '#e8b48c', '#c98e64', '#b9825c', '#8a5a3a', '#f0d0b8', '#d9a27c'];
const HAIR = ['#241726', '#6b3e26', '#e0a040', '#a9a6a2', '#8a2733', '#3a2a22', '#f4f1ea'];
const TOPS = ['#2f5f9a', '#3d8a5a', '#d9772f', '#6a3f7a', '#c9452f', '#2aa9a3', '#e0a83a', '#26242e', '#7a8a9a', '#b3294a', '#3a4a8a'];
const STYLES: Look['hairStyle'][] = ['short', 'bun', 'bob', 'short', 'pony', 'bald', 'short', 'bob'];
export const guestLook = (i: number): Look => {
  const h = (k: number) => hash(i + 17, k);
  const skirt = h(1) > 0.5;
  const style = STYLES[Math.floor(h(2) * STYLES.length)];
  const top = TOPS[Math.floor(h(3) * TOPS.length)];
  return {
    skin: SKIN[Math.floor(h(4) * SKIN.length)], hair: HAIR[Math.floor(h(5) * HAIR.length)], hairStyle: skirt && style === 'bald' ? 'bob' : style,
    top, top2: h(6) > 0.5 ? '#f4f1ea' : TOPS[Math.floor(h(7) * TOPS.length)], legs: skirt ? top : ['#26242e', '#4a4650', '#3a3346', '#5a4a3a'][Math.floor(h(8) * 4)],
    skirt, tie: !skirt && h(9) > 0.55 ? (h(10) > 0.5 ? 'bow' : '#8a2733') : undefined, glasses: h(11) > 0.78, pearls: skirt && h(12) > 0.6,
    mustache: !skirt && h(13) > 0.8 ? '#3a2a22' : undefined, scale: 0.93 + h(14) * 0.1,
  };
};
const waiterLook = (i: number): Look => ({skin: SKIN[i % SKIN.length], hair: HAIR[(i * 3) % 6], hairStyle: 'short', top: '#2a2630', top2: '#ffffff', legs: '#2a2630', tie: 'bow', tails: true});
const pinkGirl: Look = {skin: '#e8b48c', hair: '#6b3e26', hairStyle: 'pony', top: '#ff8fbf', top2: '#ffffff', legs: '#ff8fbf', skirt: true, scale: 0.9};

// room-relative placement: floor f (0..3), column c (0..2), dx from column centre, z
const P = (f: number, c: number, dx: number, z: number) => V(COLX[c] + dx, FY[f], z);
let N = 0;
const G = (f: number, c: number, dx: number, z: number, kind: Guest['kind'], o: Partial<Guest> = {}): Guest => {
  const id = N++;
  return {id, look: o.look ?? guestLook(id), home: P(f, c, dx, z), kind, per: 7, off: hash(id, 30) * 7, ...o};
};
const give = (t0: number, dir: -1 | 1, prop: Prop, t1 = t0 + 0.45): GEvent => ({t0, t1, pose: {arms: 'give', dir, prop, face: 'happy', eye: dir}});
const holdE = (t0: number, t1: number, prop: Prop): GEvent => ({t0, t1, pose: {arms: 'hold', prop, face: 'neutral'}});

export const GUESTS: Guest[] = [
  // F1 bar
  G(0, 0, 0.95, -1.55, 'stand', {prop: 'cocktail'}),
  G(0, 0, 1.35, -0.95, 'stroll', {to: P(0, 1, -1.35, -0.55), per: 8, prop: 'glass'}),
  // F1 dining (seated behind the table) + a waiter who looks like the butler
  G(0, 1, -1.0, -1.8, 'sit', {prop: 'glass'}),
  G(0, 1, 0.3, -1.8, 'sit', {prop: 'cocktail'}),
  G(0, 1, -1.45, -0.55, 'stroll', {to: P(0, 1, -0.25, -0.45), per: 6.5, off: 1.0, prop: 'tray', look: waiterLook(1)}),
  // F1 foyer
  G(0, 2, -0.9, -1.4, 'stand', {prop: 'cocktail'}),
  G(0, 2, -0.45, -0.95, 'stand'),
  G(0, 2, 0.4, -0.6, 'stroll', {to: P(0, 2, 1.2, -0.75), per: 5.5}),
  G(0, 2, 0.3, -1.95, 'stroll', {to: P(0, 2, -0.25, -0.85), per: 9, off: 0}),
  G(0, 2, 1.15, -1.35, 'stand', {prop: 'glass'}),
  // F2 kitchen helper
  G(1, 0, 0.85, -1.15, 'stroll', {to: P(1, 0, 1.4, -0.5), per: 6, prop: 'tray', look: waiterLook(2)}),
  // F2 gallery: blue-bottle relay (silent) + a pink pour (noisy)
  G(1, 1, -1.0, -1.3, 'stand', {events: [holdE(0, 4.0, 'vialBlue'), give(4.0, 1, 'vialBlue', 4.4)]}),
  G(1, 1, -0.3, -0.95, 'stand', {events: [give(4.0, -1, 'none', 4.4), holdE(4.4, 11.4, 'vialBlue'), give(11.4, 1, 'vialBlue', 11.8)]}),
  G(1, 1, 0.45, -1.35, 'stand', {prop: 'glass', events: [give(11.4, -1, 'none', 11.8), holdE(11.8, 16, 'vialBlue')]}),
  G(1, 1, 1.0, -0.7, 'stroll', {to: P(1, 1, -0.6, -0.55), per: 7.5}),
  G(1, 1, 0.15, -0.55, 'stand', {prop: 'glass', events: [{t0: 2.3, t1: 3.2, pose: {arms: 'pour', prop: 'vialPink', face: 'sly', eye: -1}}]}),
  // F2 lounge
  G(1, 2, -1.05, -1.0, 'stand', {prop: 'cocktail'}),
  G(1, 2, -0.05, -0.8, 'stand'),
  G(1, 2, -0.5, -1.55, 'stroll', {to: P(1, 1, 1.2, -1.0), per: 9, off: 3}),
  // F3 billiards
  G(2, 0, -0.5, -1.0, 'stand', {prop: 'cue', events: [{t0: 1.1, t1: 1.6, pose: {arms: 'point', dir: 1, prop: 'cue', face: 'smirk'}}, {t0: 9.7, t1: 10.2, pose: {arms: 'point', dir: 1, prop: 'cue', face: 'smirk'}}]}),
  G(2, 0, 1.25, -1.2, 'stand', {prop: 'cue'}),
  G(2, 0, 0.6, -0.55, 'stand', {prop: 'cocktail'}),
  // F3 ballroom: dancers + a waiter + a girl in a pink dress
  G(2, 1, -1.1, -1.35, 'dance'), G(2, 1, -0.4, -0.95, 'dance', {look: pinkGirl}), G(2, 1, 0.3, -1.45, 'dance'),
  G(2, 1, 1.0, -0.95, 'dance'), G(2, 1, -0.85, -0.45, 'dance'), G(2, 1, 0.75, -0.4, 'dance'),
  G(2, 1, -1.3, -0.7, 'stroll', {to: P(2, 1, 1.3, -0.7), per: 6, prop: 'tray', look: waiterLook(3)}),
  // F3 card room
  G(2, 2, -0.45, -1.55, 'sit', {prop: 'card'}), G(2, 2, 0.85, -1.55, 'sit', {prop: 'card'}), G(2, 2, 0.2, -2.05, 'sit', {prop: 'card'}),
  G(2, 2, 1.3, -0.8, 'stand', {prop: 'cocktail'}),
  // F4 conservatory: one guest walks into the music room right as the real handoff happens
  G(3, 0, 0.35, -0.6, 'stand', {prop: 'glass'}),
  G(3, 0, 0.9, -1.4, 'stroll', {to: P(3, 1, -1.0, -1.25), per: 8, off: 6.0}),
  // F4 music room: pianist + listeners, with a decoy glass handoff at the same moment as the real one
  G(3, 1, -0.7, -1.45, 'sit', {}),
  G(3, 1, 0.45, -1.4, 'stand', {prop: 'cocktail', events: [give(2.9, 1, 'cocktail', 3.35), holdE(3.35, 16, 'none')]}),
  G(3, 1, 1.05, -0.95, 'stand', {events: [give(2.9, -1, 'none', 3.35), holdE(3.35, 16, 'cocktail')]}),
  G(3, 1, 0.2, -0.6, 'stroll', {to: P(3, 1, 1.25, -0.5), per: 7, off: 4.5, prop: 'glass'}),
  // F4 library
  G(3, 2, -1.0, -1.6, 'stand', {prop: 'book'}),
  G(3, 2, -0.3, -1.05, 'stroll', {to: P(3, 1, 0.8, -1.05), per: 7, off: 2.0, prop: 'cocktail'}),
];

const q = (v: number, step: number) => Math.round(v / step) * step;
/** a guest's position + pose at party time p */
export const guestAt = (g: Guest, p: number): {at: THREE.Vector3; pose: Pose} => {
  const per = g.per ?? 7;
  const off = g.off ?? 0;
  let at = g.home.clone();
  let moving = false;
  if ((g.kind === 'stroll') && g.to) {
    const u = (((p + off) % per) + per) % per / per;
    if (u < 0.3) at = g.home.clone();
    else if (u < 0.5) { at = g.home.clone().lerp(g.to, smoother((u - 0.3) / 0.2)); moving = true; }
    else if (u < 0.8) at = g.to.clone();
    else { at = g.to.clone().lerp(g.home, smoother((u - 0.8) / 0.2)); moving = true; }
  } else if (g.kind === 'dance') {
    at = g.home.clone().add(V(Math.sin(p * 2.2 + off) * 0.3, 0, Math.cos(p * 1.7 + off) * 0.12));
  }
  const prop = g.prop ?? 'none';
  const drinks = prop === 'glass' || prop === 'cocktail';
  const eye = q(Math.sin(p * 0.9 + off * 2), 1);
  let pose: Pose = {arms: prop === 'none' ? 'down' : prop === 'book' ? 'read' : 'hold', prop, face: hash(g.id, 40) > 0.4 ? 'happy' : 'neutral', eye, sit: g.kind === 'sit'};
  if (g.kind === 'sit' && prop === 'none') pose = {...pose, arms: 'knit'}; // the pianist's hands on the keys
  if (drinks && (((p + off * 1.3) % 5) + 5) % 5 < 0.8 && !moving) pose = {...pose, arms: 'drink'};
  if (moving) pose = {...pose, walk: p * 11, arms: prop === 'tray' ? 'tray' : prop === 'none' ? 'down' : 'hold'};
  if (prop === 'tray' && !moving) pose = {...pose, arms: 'tray'};
  if (g.kind === 'dance') pose = {...pose, walk: p * 7, arms: (((p + off) % 3) + 3) % 3 < 1.2 ? 'up' : 'down', face: 'happy'};
  for (const e of g.events ?? []) if (p >= e.t0 && p < e.t1) pose = {...pose, ...e.pose, sit: g.kind === 'sit'};
  return {at, pose};
};
export const lerpN = lerp;
