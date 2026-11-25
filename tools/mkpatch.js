// Developer tool: build a reusable patch file by diffing an ORIGINAL .asar against a TRANSLATED .asar.
// Usage (run with pcsuite.exe as Node):  mkpatch.js <original.asar> <translated.asar> <out.json>
// Output: { files: { "<path>": { sha, size, newSha, hunks:[{p, a, o, n, b}] } }, added: { "<path>": "<base64>" } }
//   p = offset in the original file, o = original text, n = new text, a/b = 60 chars of context (for other versions).
'use strict';
const fs = require('fs');
const asar = require('./asar');

// character diff tuned for "mostly identical, localized edits"; returns [[i0,i1,j0,j1], ...]
function diff(a, b, mergeGap = 160) {
  const hunks = []; let i = 0, j = 0; const PROBE = 48, WIN = 60000;
  while (i < a.length || j < b.length) {
    if (a[i] === b[j] && i < a.length) { i++; j++; continue; }
    let found = null;
    for (let l = 0; l <= WIN && j + l <= b.length && !found; l++) {
      const probe = b.substr(j + l, PROBE);
      if (probe.length < PROBE) { if (j + l >= b.length) found = [a.length, b.length]; continue; }
      const k = a.slice(i, i + WIN + PROBE).indexOf(probe);
      if (k >= 0) found = [i + k, j + l];
    }
    if (!found) found = [a.length, b.length];
    hunks.push([i, found[0], j, found[1]]);
    i = found[0]; j = found[1];
  }
  const merged = [];                                 // merge close hunks so contexts never overlap
  for (const hk of hunks) {
    const last = merged[merged.length - 1];
    if (last && hk[0] - last[1] < mergeGap) { last[1] = hk[1]; last[3] = hk[3]; } else merged.push(hk.slice());
  }
  return merged;
}

function makePatch(A, B, tool) {
  const out = { tool, created: new Date().toISOString(), files: {}, added: {} };
  let total = 0;
  for (const [name] of B.ent) {
    if (!A.has(name)) { out.added[name] = B.read(name).toString('base64'); continue; }
    const ab = A.read(name), bb = B.read(name);
    if (ab.equals(bb)) continue;
    const a = ab.toString('utf8'), b = bb.toString('utf8');
    const hunks = diff(a, b).map(([i0, i1, j0, j1]) => ({ p: i0, a: a.slice(Math.max(0, i0 - 60), i0), o: a.slice(i0, i1), n: b.slice(j0, j1), b: a.slice(i1, i1 + 60) }));
    let r = '', prev = 0; for (const h of hunks) { r += a.slice(prev, h.p) + h.n; prev = h.p + h.o.length; } r += a.slice(prev);
    if (r !== b) throw new Error('replay mismatch in ' + name);   // self-check
    out.files[name] = { sha: asar.sha(ab), size: ab.length, newSha: asar.sha(bb), hunks };
    total += hunks.length;
  }
  return { patch: out, total };
}

module.exports = { diff, makePatch };

if (require.main === module) {
  const [ORIG, NEW, OUT, TOOL] = process.argv.slice(2);
  if (!OUT) { console.error('usage: mkpatch.js <original.asar> <translated.asar> <out.json> [label]'); process.exit(2); }
  const { patch, total } = makePatch(asar.open(ORIG), asar.open(NEW), TOOL || 'PC Suite translation patch');
  fs.writeFileSync(OUT, JSON.stringify(patch));
  console.log('changed files:', Object.keys(patch.files).length, 'hunks:', total, 'added files:', Object.keys(patch.added).length, 'size:', fs.statSync(OUT).size);
}
