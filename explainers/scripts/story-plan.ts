// node scripts/story-plan.ts episodes/<id>.json -> episodes/<id>.plan.json (for story_music.py)
import {readFileSync, writeFileSync} from 'node:fs';
import {buildPlan, type StoryEpisode} from '../src/story/timeline.ts';
import type {Timing} from '../src/fight/timeline.ts';

const file = process.argv[2];
const ep: StoryEpisode = JSON.parse(readFileSync(file, 'utf8'));
const t: Timing = JSON.parse(readFileSync(file.replace(/\.json$/, '.timing.json'), 'utf8'));
const p = buildPlan(ep, t);
const words = t.lines.flatMap((ln, i) => ln.words.map((w) => ({start: p.lineStarts[i] + w.start, end: p.lineStarts[i] + w.end})));
writeFileSync(file.replace(/\.json$/, '.plan.json'), JSON.stringify({...p, words}, null, 1), 'utf8');
console.log(`plan: ${p.end.toFixed(1)}s, cuts: ` + p.cuts.map((c) => `${c.to}@${c.t.toFixed(1)}`).join(' '));
console.log('events: ' + p.events.map((e) => `${e.kind}@${e.t.toFixed(1)}`).join(' '));
