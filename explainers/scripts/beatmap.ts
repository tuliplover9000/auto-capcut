// Beat map for an episode — line up a retention curve against exact beats.
//   node scripts/beatmap.ts [episodes/<id>.json]
import {readFileSync} from 'node:fs';
import {buildBeats, totalFrames, citationIn, outroStart, flashPeaks, FPS, INTRO, OVERFLOW_REVEAL, type Episode} from '../src/speedtrap/timeline.ts';

const file = process.argv[2] ?? 'episodes/animals-speeding.json';
const ep: Episode = JSON.parse(readFileSync(file, 'utf8'));
const beats = buildBeats(ep);
const total = totalFrames(ep);
const t = (f: number) => (f / FPS).toFixed(1).padStart(5) + 's';
const pct = (f: number) => `${Math.round((f / total) * 100)}%`.padStart(4);

const rows: Array<[number, string]> = [[0, `HOOK  ${ep.hook.join(' ')}`], [INTRO, 'first contender named']];
for (const b of beats) {
  const c = ep.contenders[b.index];
  rows.push([b.runStart, `${c.name.join(' ')} enters (${c.speed} ${ep.unit})`]);
  if (b.ticket) rows.push([b.passFrame, b.overflow ? 'radar OVERFLOW + strobes' : 'FLASH (ticket)']);
  rows.push([b.verdictStart, `verdict: ${c.verdict.join(' ')}`]);
  if (b.overflow) rows.push([b.verdictStart + OVERFLOW_REVEAL, `REVEAL ${c.speed} ${ep.unit}`]);
  if (b.ticket) rows.push([citationIn(b), 'citation prints']);
}
rows.push([outroStart(ep), `OUTRO ${ep.outro.join(' ')}`], [total, 'end (loops)']);
rows.sort((a, b) => a[0] - b[0]);
console.log(`${file} — ${t(total).trim()} total, first flash at ${t(flashPeaks(beats)[0] ?? total).trim()}`);
for (const [f, label] of rows) console.log(`${t(f)} ${pct(f)}  ${label}`);
