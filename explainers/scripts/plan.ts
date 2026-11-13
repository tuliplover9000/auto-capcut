// Export a Wind Test episode's timeline so the music can be composed TO it:
//   node scripts/plan.ts episodes/wind-survival.json  -> episodes/wind-survival.plan.json
import {readFileSync, writeFileSync} from 'node:fs';
import {buildPlan, type WindEpisode, type Timing} from '../src/windtest/timeline.ts';

const file = process.argv[2] ?? 'episodes/wind-survival.json';
const ep: WindEpisode = JSON.parse(readFileSync(file, 'utf8'));
const timing: Timing = JSON.parse(readFileSync(file.replace(/\.json$/, '.timing.json'), 'utf8'));
const p = buildPlan(ep, timing);
const words = timing.lines.flatMap((ln, i) => ln.words.map((w) => ({start: p.lineStarts[i] + w.start, end: p.lineStarts[i] + w.end})));
const out = {...p, words};
writeFileSync(file.replace(/\.json$/, '.plan.json'), JSON.stringify(out, null, 1), 'utf8');
console.log(`plan: ${p.end.toFixed(1)}s, ${p.beats.length} beats, ${words.length} words -> ${file.replace(/\.json$/, '.plan.json')}`);
