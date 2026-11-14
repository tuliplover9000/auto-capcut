// node scripts/test-odds.ts episodes/pirate-token-odds.json — timeline invariants
import {readFileSync, writeFileSync} from 'node:fs';
import {buildPlan, captions, markerAt, tierOf, valueAt, type OddsEpisode, type Timing} from '../src/odds/timeline.ts';

const file = process.argv[2] ?? 'episodes/pirate-token-odds.json';
const ep: OddsEpisode = JSON.parse(readFileSync(file, 'utf8'));
const t: Timing = JSON.parse(readFileSync(file.replace(/\.json$/, '.timing.json'), 'utf8'));
const p = buildPlan(ep, t);
let fails = 0;
const ok = (c: boolean, msg: string) => { if (!c) { fails++; console.log('FAIL', msg); } };

for (let i = 1; i < p.lineStarts.length; i++) ok(p.lineStarts[i] >= p.lineEnds[i - 1] + 0.1, `line ${i} overlaps line ${i - 1}`);
p.beats.forEach((b, k) => {
  ok(b.landing > p.lineStarts[b.line] && b.landing < p.lineEnds[b.line], `beat ${k} lands outside its line`);
  ok(b.enter < b.rampStart && b.rampStart < b.landing, `beat ${k} enter<ramp<landing`);
  ok(valueAt(b, b.landing) === b.item.odds, `beat ${k} readout exact at landing`);
  ok(valueAt(b, b.landing - 0.01) <= b.item.odds, `beat ${k} readout never overshoots`);
  if (k) ok(b.enter >= p.beats[k - 1].landing + 0.3, `beat ${k} enters before the last one has landed+0.3`);
  ok(b.leave > b.landing, `beat ${k} leaves after landing`);
});
const ladder = p.beats.filter((b) => b.odds).map((b) => b.item.odds);
ok(ladder.every((v, i) => !i || v > ladder[i - 1]), 'odds ladder strictly rises');
ok(ladder[ladder.length - 1] / ladder[ladder.length - 2] >= 2, 'finale beats runner-up by >=2x');
const fin = p.beats.filter((b) => b.odds).pop()!;
const pos = fin.landing / p.end;
ok(pos > 0.7 && pos < 0.95, `finale lands at ${(pos * 100).toFixed(0)}% (want 70–95%)`);
ok(markerAt(p, p.end) === fin.item.odds, 'marker ends on the finale');
ok(tierOf(137500).name === 'LEGENDARY', 'token is legendary');
// fact math
ok(Math.abs(Math.log(2) * 137500 - 95309) < 5, 'coin-flip chest count ~95,309');
ok(Math.round(292201338 / 137500) === 2125, '2,125 tokens per Powerball');
ok(Math.round(1222000 / 137500) === 9, 'lightning ~9x rarer');
const caps = captions(ep, t, p);
caps.forEach((c, i) => { if (i) ok(c.start >= caps[i - 1].start, `caption ${i} order`); });
ok(caps.every((c) => c.text.split(' ').length <= 2), 'captions <= 2 words');
console.log(`end ${p.end.toFixed(1)}s · finale ${(pos * 100).toFixed(0)}% · ${p.beats.length} beats · ${caps.length} caption chunks`);
p.beats.forEach((b) => console.log(`  ${b.item.art.padEnd(9)} enter ${b.enter.toFixed(2)} land ${b.landing.toFixed(2)} (${(b.landing / p.end * 100).toFixed(0)}%)`));
const words = t.lines.flatMap((ln, i) => ln.words.map((w) => ({start: p.lineStarts[i] + w.start, end: p.lineStarts[i] + w.end})));
writeFileSync(file.replace(/\.json$/, '.plan.json'), JSON.stringify({...p, beats: p.beats.map((b) => ({...b, leave: Number.isFinite(b.leave) ? b.leave : null, art: b.item.art})), words}, null, 1));
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(fails ? 1 : 0);
