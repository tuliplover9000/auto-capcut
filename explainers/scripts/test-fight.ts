// node scripts/test-fight.ts [episode] — asserts the Fight timeline invariants.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {buildPlan, captions, hpAt, ghostAt, type FightEpisode, type Timing} from '../src/fight/timeline.ts';

const file = process.argv[2] ?? 'episodes/tulip-vs-sunflower.json';
const ep: FightEpisode = JSON.parse(readFileSync(file, 'utf8'));
const t: Timing = JSON.parse(readFileSync(file.replace(/\.json$/, '.timing.json'), 'utf8'));
const p = buildPlan(ep, t);

// narration lines never overlap; the hook starts at 0
assert.equal(p.lineStarts[0], 0);
for (let i = 1; i < p.lineStarts.length; i++) assert.ok(p.lineStarts[i] >= p.lineEnds[i - 1], `line ${i} overlaps`);
// every event sits inside its own line
for (const e of p.events) assert.ok(e.t >= p.lineStarts[e.line] - 1e-6 && e.t <= p.lineEnds[e.line] + 1e-6, `${e.kind} outside line`);
// HP: 100 at start, never negative, both KO'd by the end (the deer eats everyone)
assert.equal(hpAt(p, 'L', 0), 100); assert.equal(hpAt(p, 'R', 0), 100);
assert.equal(hpAt(p, 'L', p.end), 0); assert.equal(hpAt(p, 'R', p.end), 0);
for (let s = 0; s < p.end; s += 0.1) for (const side of ['L', 'R'] as const) {
  assert.ok(hpAt(p, side, s) >= 0); assert.ok(ghostAt(p, side, s) >= hpAt(p, side, s));
}
// the tulip is near death BEFORE "should be dead" (line 4) — the script says so
const dead = p.lineStarts[4];
assert.ok(hpAt(p, 'L', dead) <= 35, `tulip HP at "should be dead" = ${hpAt(p, 'L', dead)}`);
// sunflower survives until the deer: alive at the "Sunflower wins" line
assert.ok(hpAt(p, 'R', p.lineStarts[7] + 0.5) > 0, 'sunflower must be alive when it "wins"');
assert.equal(hpAt(p, 'L', p.lineStarts[7]), 0, 'tulip must be KO before "Sunflower wins"');
// captions: ordered, and cover every word token
const caps = captions(ep, t, p);
for (let i = 1; i < caps.length; i++) assert.ok(caps[i].start >= caps[i - 1].start);
assert.equal(caps.reduce((a, c) => a + c.n, 0), t.lines.reduce((a, l) => a + l.words.length, 0));
// twist position: the deer lands in the story's back half (story hits: twist 54-76%)
const deer = p.events.find((e) => e.kind === 'deer')!;
const pct = (deer.t / p.end) * 100;
console.log(`PASS — ${p.end.toFixed(1)}s = ${Math.ceil(p.end * 30)} frames; deer twist @${deer.t.toFixed(1)}s (${pct.toFixed(0)}%); ` +
  `HP after each line L/R: ${p.lineEnds.map((e) => `${Math.round(hpAt(p, 'L', e + 1.5))}/${Math.round(hpAt(p, 'R', e + 1.5))}`).join(' ')}`);
