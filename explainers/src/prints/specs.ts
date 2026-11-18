import {makePrint, PrintData, Spec} from './ridges';

// The crime-scene print and suspect C are the SAME spec (C is the match).
// B is C's identical twin: same pattern type, different core + details.
const CRIME: Spec = {kind: 'loop', core: [-8, -22], ang: 62, seed: 3, hl: 1,
  mins: [{k: 'end', p: [-58, 38], dir: 1}, {k: 'fork', p: [42, -66], dir: 1}, {k: 'dot', p: [24, 58]}]};
export const SPECS: Record<string, Spec> = {
  crime: CRIME,
  A: {kind: 'whorl', core: [4, -14], ang: 70, len: 13, seed: 8},
  B: {kind: 'loop', core: [14, -2], ang: 76, seed: 5,
    mins: [{k: 'fork', p: [-52, 34], dir: -1}, {k: 'end', p: [56, -48], dir: -1}, {k: 'dot', p: [-30, -70]}]},
  C: CRIME,
  loop: {kind: 'loop', core: [-4, -18], ang: 58, seed: 11, hl: 1},
  whorl: {kind: 'whorl', core: [0, -12], ang: 80, len: 10, seed: 12, hl: 2},
  arch: {kind: 'arch', core: [0, -10], ang: 0, seed: 13, hl: -2},
  detail: {kind: 'arch', core: [0, -60], ang: 0, seed: 21, warp: 2, amp: 22,
    mins: [{k: 'end', p: [-40, 4], dir: 1, len: 200}, {k: 'fork', p: [-2, 26], dir: 1}, {k: 'dot', p: [56, -12]}]},
};
const cache: Record<string, PrintData> = {};
export const printData = (id: string): PrintData => (cache[id] ??= makePrint(SPECS[id]));
