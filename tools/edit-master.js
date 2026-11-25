// Edit the hand-made English master safely and regenerate its patch.
//
//   edit-master.js <archive> <edits.json> [--backup <folder>] [--dry-run]
//
//   <archive>     app.asar | vivoControl_app.asar | VClaw_app.asar
//   <edits.json>  [ { "file": "dist/electron/main.js", "find": "title:\"文件另存为\"", "replace": "title:\"Save as\"", "count": 1 }, ... ]
//                 "count" = expected number of occurrences (default 1); the run stops if it differs.
//                 "find" may also be { "regex": "...", "flags": "g" } - then "replace" may use $1 etc.
//
// Steps: original (newest backup_original_*) + patches/en_US/<patch>.patch.json -> English build, apply the edits,
// syntax-check every changed JS file (jscheck.js), write build/en_US/<archive>, regenerate patches/en_US/<patch>.patch.json.
// Afterwards run tools/make-lang.js <locale> for every other language (new English strings appear as "" to translate).
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
process.noAsar = true;
const asar = require('./asar');
const { checkJs } = require('./jscheck');
const ARCHIVES = require('./archives');
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const [name, editsFile] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--backup');
if (!name || !editsFile || !ARCHIVES[name]) { console.error('usage: edit-master.js <' + Object.keys(ARCHIVES).join('|') + '> <edits.json> [--backup <folder>] [--dry-run]'); process.exit(2); }
let backup = opt('--backup');
if (!backup) {
  const b = fs.readdirSync(ROOT).filter(d => /^backup_original_/.test(d) && fs.existsSync(path.join(ROOT, d, name)))
    .sort((x, y) => fs.statSync(path.join(ROOT, y)).mtimeMs - fs.statSync(path.join(ROOT, x)).mtimeMs);
  if (!b.length) { console.error('no backup_original_* folder with ' + name); process.exit(2); }
  backup = path.join(ROOT, b[0]);
}
const orig = path.join(backup, name), patch = path.join(ROOT, 'patches', 'en_US', ARCHIVES[name].patch + '.patch.json');
const out = path.join(ROOT, 'build', 'en_US', name);
fs.mkdirSync(path.dirname(out), { recursive: true });
const node = (script, ...a) => {
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...a], { env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' }), encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) { process.stderr.write(r.stderr || ''); console.error(script + ' failed'); process.exit(1); }
  return r.stdout.trim();
};

// 1. current English build
const tmp = out + '.base';
if (fs.existsSync(patch)) console.log('base: ' + node('patcher.js', orig, patch, tmp)); else fs.copyFileSync(orig, tmp);

// 2. edits
const edits = JSON.parse(fs.readFileSync(editsFile, 'utf8').replace(/^﻿/, ''));
const B = asar.open(tmp), cur = new Map();
let bad = 0;
// "file" may contain * (any characters except /); "count" is then the total over all matching files
const expand = p => {
  if (!p.includes('*')) return B.has(p) ? [p] : [];
  const re = new RegExp('^' + p.split('*').map(s => s.replace(/[.+?^$()|[\]\\{}]/g, '\\$&')).join('[^/]*') + '$');
  return [...B.ent.keys()].filter(x => re.test(x));
};
for (const e of edits) {
  const files = expand(e.file);
  if (!files.length) { console.error('missing file: ' + e.file); bad++; continue; }
  const want = e.count == null ? 1 : e.count, next = new Map();
  let n = 0;
  for (const f of files) {
    let src = cur.has(f) ? cur.get(f) : B.text(f), k;
    if (typeof e.find === 'object') { const fl = e.find.flags || 'g'; const re = new RegExp(e.find.regex, fl.includes('g') ? fl : fl + 'g'); k = (src.match(re) || []).length; src = src.replace(re, e.replace); }
    else { k = src.split(e.find).length - 1; src = src.split(e.find).join(e.replace); }
    if (k) { n += k; next.set(f, src); }
  }
  if (n !== want) { console.error(`${e.file}: expected ${want} x ${JSON.stringify(e.find).slice(0, 80)}, found ${n}`); bad++; continue; }
  for (const [f, src] of next) cur.set(f, src);
}
for (const [f, src] of cur) if (/\.js$/.test(f)) { const m = checkJs(src, f); if (m) { console.error('syntax error after edits in ' + f + ': ' + m); bad++; } }
if (bad) { B.close(); fs.unlinkSync(tmp); console.error(bad + ' problem(s) - nothing written'); process.exit(1); }
console.log(`edits: ${edits.length} applied to ${cur.size} file(s)`);
if (args.includes('--dry-run')) { B.close(); fs.unlinkSync(tmp); process.exit(0); }
const mods = new Map([...cur].map(([f, s]) => [f, Buffer.from(s, 'utf8')]));
asar.write(B, out + '.tmp', mods); B.close();
fs.renameSync(out + '.tmp', out); fs.unlinkSync(tmp);

// 3. regenerate the master patch
console.log('patch: ' + node('mkpatch.js', orig, out, patch, 'PC Suite English master'));
