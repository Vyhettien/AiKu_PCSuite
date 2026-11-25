// Minimal reader/writer for Electron .asar archives (no dependencies).
// Used by patcher.js, mkpatch.js, lang.js, check.js and compare.js.
'use strict';
process.noAsar = true;                 // read .asar files as plain files, even when run by Electron
const fs = require('fs'), crypto = require('crypto');

const BLOCK = 4 * 1024 * 1024;
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function integrity(b) {
  const blocks = [];
  for (let i = 0; i < b.length; i += BLOCK) blocks.push(sha(b.subarray(i, i + BLOCK)));
  if (!blocks.length) blocks.push(sha(Buffer.alloc(0)));
  return { algorithm: 'SHA256', hash: sha(b), blockSize: BLOCK, blocks };
}

// open(file) -> { hdr, order:[[path,node]], ent:Map(path->node), has, read(path)->Buffer, text(path)->string, close }
function open(file) {
  const fd = fs.openSync(file, 'r'); const h16 = Buffer.alloc(16); fs.readSync(fd, h16, 0, 16, 0);
  const hs = h16.readUInt32LE(12); const hb = Buffer.alloc(hs); fs.readSync(fd, hb, 0, hs, 16);
  const hdr = JSON.parse(hb.toString('utf8')); const base = 12 + Math.ceil((4 + hs) / 4) * 4;
  const order = [];
  (function walk(n, pre) {
    for (const k in n.files) {
      const f = n.files[k], q = pre ? pre + '/' + k : k;
      if (f.files) walk(f, q); else if (!f.unpacked && !('link' in f)) order.push([q, f]);
    }
  })(hdr, '');
  const ent = new Map(order);
  const read = p => { const m = ent.get(p); const b = Buffer.alloc(m.size); fs.readSync(fd, b, 0, m.size, base + Number(m.offset)); return b; };
  return { file, fd, hdr, base, order, ent, has: p => ent.has(p), read, text: p => read(p).toString('utf8'), close: () => fs.closeSync(fd) };
}

// write(src, dst, mods:Map(path->Buffer), added:{path:Buffer}) -> { missing:[...] }
// Repacks src into dst keeping the original file order; modified files get new size + integrity,
// new files are appended to their (existing) folder.
function write(src, dst, mods, added = {}) {
  const missing = [];
  for (const p in added) {
    if (src.ent.has(p)) { mods.set(p, added[p]); continue; }
    const parts = p.split('/'); let node = src.hdr; let ok = true;
    for (const d of parts.slice(0, -1)) { if (!node.files || !node.files[d] || !node.files[d].files) { ok = false; break; } node = node.files[d]; }
    if (!ok) { missing.push(p); continue; }
    const f = node.files[parts[parts.length - 1]] = { size: added[p].length, offset: '0', integrity: integrity(added[p]) };
    src.order.push([p, f]); src.ent.set(p, f); mods.set(p, added[p]); f.__new = true;
  }
  const old = new Map(); let off = 0;
  for (const [p, f] of src.order) {
    old.set(p, [Number(f.offset), f.size]);
    if (mods.has(p)) { f.size = mods.get(p).length; if (f.integrity || f.__new) f.integrity = integrity(mods.get(p)); delete f.__new; }
    f.offset = String(off); off += f.size;
  }
  const hj = Buffer.from(JSON.stringify(src.hdr), 'utf8'); const p2 = Math.ceil((4 + hj.length) / 4) * 4;
  const hd = Buffer.alloc(16); hd.writeUInt32LE(4, 0); hd.writeUInt32LE(4 + p2, 4); hd.writeUInt32LE(p2, 8); hd.writeUInt32LE(hj.length, 12);
  const out = fs.openSync(dst, 'w'); fs.writeSync(out, hd); fs.writeSync(out, hj); fs.writeSync(out, Buffer.alloc(p2 - 4 - hj.length));
  const chunk = Buffer.alloc(1 << 20);
  for (const [p] of src.order) {
    if (mods.has(p)) { fs.writeSync(out, mods.get(p)); continue; }
    let [o, s] = old.get(p), pos = src.base + o;
    while (s > 0) { const n = fs.readSync(src.fd, chunk, 0, Math.min(chunk.length, s), pos); fs.writeSync(out, chunk, 0, n); s -= n; pos += n; }
  }
  fs.closeSync(out);
  return { missing };
}

module.exports = { open, write, sha, integrity };
