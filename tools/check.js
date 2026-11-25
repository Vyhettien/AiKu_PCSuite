// Prints "translated" if the given archive already carries a translation patch, otherwise "original".
// Usage (run with pcsuite.exe as Node):  check.js <app.asar> [vclaw]
//   default: PC Suite app.asar          vclaw: VClaw\resources\app.asar
'use strict';
const asar = require('./asar');
const A = asar.open(process.argv[2]);
if (process.argv[3] === 'vclaw') {
  // the original VClaw renderer forces Chinese for non-export builds: ...isExport=${l}`),l?d:"zh_CN"
  const files = [...A.ent.keys()].filter(p => /^dist\/assets\/index-[^/]+\.js$/.test(p));
  const re = /isExport=\$\{\w+\}`\),\w+\?\w+:"(\w+)"/;
  for (const f of files) { const m = re.exec(A.text(f)); if (m) { console.log(m[1] === 'zh_CN' ? 'original' : 'translated'); process.exit(0); } }
  console.log('unknown'); process.exit(0);
}
const f = 'dist/electron/renderer.js';
if (!A.has(f)) { console.log('unknown'); process.exit(0); }
// the original Chinese build forces Chinese here; every translation replaces it with a fixed language code
console.log(A.text(f).includes('if(!n)return"zh_CN"') ? 'original' : 'translated');
