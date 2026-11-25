// Apply a translation patch file to an ORIGINAL PC Suite .asar and write the translated .asar.
// Usage (run with pcsuite.exe as Node):  patcher.js <original.asar> <patch.json> <out.asar>
//  - If a file is byte-identical to the one the patch was made from (same version), every change is applied exactly.
//  - Otherwise (newer/older PC Suite), each change is located by its surrounding text; changes that can't be
//    found are skipped and reported. Any JS file that would end up with a syntax error is left untranslated.
// Prints a JSON report: {exactFiles, fuzzyFiles, applied, skipped, missingFiles, revertedFiles, output, bytes}
'use strict';
const fs = require('fs'), vm = require('vm');
const asar = require('./asar');
const [SRC, PATCH, DST] = process.argv.slice(2);
if (!DST) { console.error('usage: patcher.js <original.asar> <patch.json> <out.asar>'); process.exit(2); }
const P = JSON.parse(fs.readFileSync(PATCH, 'utf8'));
const A = asar.open(SRC);
const count = (s, x) => { let c = 0, i = -1; while ((i = s.indexOf(x, i + 1)) >= 0) { c++; if (c > 1) break; } return c; };

function applyFuzzy(t, spec, report) {
  for (const hk of spec.hunks) {
    const tries = [[hk.a + hk.o + hk.b, hk.a.length], [hk.o + hk.b, 0], [hk.a + hk.o, hk.a.length], [hk.o, 0]];
    let done = false;
    for (const [needle, off] of tries) {
      if (!needle || needle.length < 12 || (needle === hk.o && hk.o.length < 24)) continue;
      if (count(t, needle) !== 1) continue;
      const i = t.indexOf(needle) + off;
      t = t.slice(0, i) + hk.n + t.slice(i + hk.o.length); done = true; break;
    }
    if (!done) {                                     // repeated code: pick the copy nearest the expected position
      const needle = hk.a + hk.o + hk.b;
      if (needle.length >= 40) {
        const want = hk.p * (t.length / spec.size); let best = -1, i = -1, n = 0;
        while ((i = t.indexOf(needle, i + 1)) >= 0 && n++ < 200) if (best < 0 || Math.abs(i - want) < Math.abs(best - want)) best = i;
        if (best >= 0) { const s = best + hk.a.length; t = t.slice(0, s) + hk.n + t.slice(s + hk.o.length); done = true; }
      }
    }
    if (done) report.applied++; else report.skipped++;
  }
  return t;
}

const mods = new Map();
const report = { exactFiles: 0, fuzzyFiles: 0, applied: 0, skipped: 0, missingFiles: [], revertedFiles: [] };
for (const name in P.files) {
  const spec = P.files[name];
  if (!A.has(name)) { report.missingFiles.push(name); continue; }
  const buf = A.read(name), a = buf.toString('utf8');
  let out;
  if (asar.sha(buf) === spec.sha) {                  // same version: exact positional replay
    let r = '', prev = 0;
    for (const hk of spec.hunks) { r += a.slice(prev, hk.p) + hk.n; prev = hk.p + hk.o.length; }
    out = r + a.slice(prev); report.exactFiles++; report.applied += spec.hunks.length;
  } else {                                           // different version: locate by context
    out = applyFuzzy(a, spec, report); report.fuzzyFiles++;
  }
  if (/\.js$/.test(name)) {
    const bad = require('./jscheck').checkJs(out, name);
    if (bad) { report.revertedFiles.push(name + ' (' + bad + ')'); continue; }
  }
  mods.set(name, Buffer.from(out, 'utf8'));
}
const added = {};                                    // files the translation adds (e.g. a TinyMCE language pack)
for (const name in (P.added || {})) if (!A.has(name)) added[name] = Buffer.from(P.added[name], 'base64');
const w = asar.write(A, DST, mods, added);
report.missingFiles.push(...w.missing.map(p => '(add) ' + p));
report.output = DST; report.bytes = fs.statSync(DST).size;
console.log(JSON.stringify(report));
