// Compare the CONTENTS of every file in two .asar archives (ignores internal layout) and check integrity hashes.
// Usage (run with pcsuite.exe as Node):  compare.js <a.asar> <b.asar>
'use strict';
const asar = require('./asar');
const [X, Y] = process.argv.slice(2); const A = asar.open(X), B = asar.open(Y);
let diff = 0, bad = 0;
for (const [n, m] of A.ent) {
  const a = A.read(n);
  if (m.integrity && asar.sha(a) !== m.integrity.hash) bad++;
  if (!B.has(n) || !a.equals(B.read(n))) { diff++; if (diff <= 5) console.log('differs:', n); }
}
for (const n of B.ent.keys()) if (!A.has(n)) { diff++; console.log('only in second:', n); }
console.log('files:', A.ent.size, '| content differences:', diff, '| integrity failures in first:', bad);
