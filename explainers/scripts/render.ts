// Render any episode file:  node scripts/render.ts episodes/<id>.json [out.mp4]
// Wraps the bare episode as {"episode": ...} (what --props expects) and keeps
// the text UTF-8 end to end — a cp1252 round-trip once turned "·" into "Â·".
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {basename} from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/render.ts episodes/<id>.json [out.mp4]');
  process.exit(1);
}
const ep = JSON.parse(readFileSync(file, 'utf8'));
const out = process.argv[3] ?? `out/${basename(file, '.json')}.mp4`;
mkdirSync('out', {recursive: true});
const props = `out/.props-${basename(file)}`;
writeFileSync(props, JSON.stringify({episode: ep}), 'utf8');
const r = spawnSync('npx', ['remotion', 'render', 'SpeedTrap', out, `--props=${props}`], {stdio: 'inherit', shell: true});
process.exit(r.status ?? 1);
