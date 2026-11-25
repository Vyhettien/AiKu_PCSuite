// Developer tool: (re)generate patches/<locale>/ for a dictionary-based language.
//
//   make-lang.js <locale> [--extract-only] [--backup <folder with original app.asar + vivoControl_app.asar (+ VClaw_app.asar)>]
//
// Steps:
//   1. builds the English archives from the originals with patches/en_US        -> build/en_US/
//   2. lang.js extract: adds new English strings to translations/<locale>/strings.json (value "" = to translate)
//      (stops here with --extract-only)
//   3. lang.js build: English archives + dictionary                              -> build/<locale>/
//   4. mkpatch.js: original vs translated                                        -> patches/<locale>/*.patch.json
//   5. copies translations/<locale>/language.json                                -> patches/<locale>/language.json
// Run with PC Suite's own engine:  set ELECTRON_RUN_AS_NODE=1 & "C:\Program Files (x86)\pcsuite\pcsuite.exe" tools\make-lang.js vi_VN
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const ARCHIVES = Object.fromEntries(Object.entries(require('./archives')).map(([n, a]) => [n, a.patch]));   // name -> patch base name

const args = process.argv.slice(2);
const locale = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--backup');
const extractOnly = args.includes('--extract-only');
let backup = args.includes('--backup') ? path.resolve(args[args.indexOf('--backup') + 1]) : null;
if (!locale || locale === 'en_US') { console.error('usage: make-lang.js <locale> [--extract-only] [--backup <folder>]   (en_US is the hand-made master)'); process.exit(2); }
const langDir = path.join(ROOT, 'translations', locale);
if (!fs.existsSync(path.join(langDir, 'language.json'))) { console.error('missing ' + path.join(langDir, 'language.json')); process.exit(2); }
if (!backup) {
  const b = fs.readdirSync(ROOT).filter(d => /^backup_original_/.test(d)).sort((x, y) => fs.statSync(path.join(ROOT, y)).mtimeMs - fs.statSync(path.join(ROOT, x)).mtimeMs);
  if (!b.length) { console.error('no backup_original_<version> folder - run Translate-PCSuite.ps1 once, or pass --backup'); process.exit(2); }
  backup = path.join(ROOT, b[0]);
}
const node = (script, ...a) => {
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...a], { env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' }), encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) { console.error(script + ' failed'); process.exit(1); }
  return r.stdout.trim();
};
const have = Object.keys(ARCHIVES).filter(n => fs.existsSync(path.join(backup, n)));
console.log('originals: ' + backup);

// 1. English
const enDir = path.join(ROOT, 'build', 'en_US'); fs.mkdirSync(enDir, { recursive: true });
for (const n of have) console.log('en_US ' + n + ': ' + node('patcher.js', path.join(backup, n), path.join(ROOT, 'patches', 'en_US', ARCHIVES[n] + '.patch.json'), path.join(enDir, n)));

// 2. extract
const ex = []; for (const n of have) ex.push(n, path.join(backup, n), path.join(enDir, n));
console.log('extract: ' + node('lang.js', 'extract', langDir, ...ex));
if (extractOnly) process.exit(0);

// 3 + 4. build and make patches
const outDir = path.join(ROOT, 'build', locale), patchDir = path.join(ROOT, 'patches', locale);
fs.mkdirSync(outDir, { recursive: true }); fs.mkdirSync(patchDir, { recursive: true });
for (const n of have) {
  console.log(locale + ' ' + n + ': ' + node('lang.js', 'build', langDir, n, path.join(backup, n), path.join(enDir, n), path.join(outDir, n)));
  console.log('  patch: ' + node('mkpatch.js', path.join(backup, n), path.join(outDir, n), path.join(patchDir, ARCHIVES[n] + '.patch.json'), 'PC Suite ' + locale + ' patch'));
}
// 5. metadata for Translate-PCSuite.ps1
fs.copyFileSync(path.join(langDir, 'language.json'), path.join(patchDir, 'language.json'));
console.log('done: ' + patchDir);
