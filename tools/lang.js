// Dictionary-based translation layer on top of the English patch.
//
// The English patch (patches/en_US) is the hand-made master translation: it turns the Chinese-only build into
// English. Every other language is produced from it with a simple dictionary  "English text" -> "translation"
// (translations/<locale>/strings.json), so translators never touch code.
//
//   lang.js extract <langDir> <name> <original.asar> <english.asar> [<name> <original.asar> <english.asar> ...]
//       Collects every English UI string that the English patch introduced (plus English texts the app's own
//       locale for this language is missing) and merges them into <langDir>/strings.json.
//       Existing translations are kept; new strings are added with "" (= not translated yet).
//
//   lang.js build <langDir> <name> <original.asar> <english.asar> <out.asar>
//       Writes <out.asar> = English build with every dictionary entry translated, language codes switched
//       (language.json "codes") and the app's built-in locale files completed (language.json "asars.<name>.locales").
//
// <name> is the archive name used in language.json: "app.asar" or "vivoControl_app.asar".
// Needs acorn (JS tokenizer). It is taken from the PC Suite archive itself (node_modules/terser/node_modules/acorn).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const asar = require('./asar');
const { diff } = require('./mkpatch');
const { checkJs } = require('./jscheck');

// ---------- helpers ----------
function loadAcorn(asarFiles) {
  const tries = [];
  for (const a0 of asarFiles) { const a = path.resolve(a0); tries.push(path.join(a, 'node_modules/terser/node_modules/acorn'), path.join(a, 'node_modules/acorn')); }
  const own = path.join(path.dirname(process.execPath), 'resources', 'app.asar');   // when run by pcsuite.exe itself
  tries.push(path.join(own, 'node_modules/terser/node_modules/acorn'), 'acorn');
  for (const t of tries) {
    const prev = process.noAsar; process.noAsar = false;            // allow require() from inside the archive
    try { return require(t); } catch (e) { } finally { process.noAsar = prev; }
  }
  throw new Error('acorn (JavaScript tokenizer) not found - expected inside app.asar/node_modules/terser/node_modules/acorn');
}
let acorn = null;
const readJson = (f, d) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')) : d;
const hasLetters = s => /[A-Za-z]/.test(s);
const CJK = /[㐀-鿿豈-﫿]/;
const splitWs = s => { const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s); return [m[1], m[2], m[3]]; };

function tokens(src) {                          // string + template-chunk tokens with positions, sorted by start
  const out = [];
  try {
    for (const t of acorn.tokenizer(src, { ecmaVersion: 'latest', allowHashBang: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true, allowImportExportEverywhere: true })) {
      const l = t.type.label;
      if (l === 'string') out.push({ s: t.start, e: t.end, v: t.value, k: 'str' });
      else if (l === 'template' && t.value != null) out.push({ s: t.start, e: t.end, v: t.value, k: 'tpl' });
    }
  } catch (e) { return null; }
  return out;
}
function overlapping(toks, s, e) {               // tokens that overlap [s, e)  (zero-length range: tokens containing s)
  if (e <= s) e = s + 1;
  let lo = 0, hi = toks.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (toks[m].e <= s) lo = m + 1; else hi = m; }
  const r = []; for (let i = lo; i < toks.length && toks[i].s < e; i++) r.push(toks[i]); return r;
}
function asJson(v) {
  if (v.length < 2 || !/^[\[{]/.test(v)) return null;
  try { const o = JSON.parse(v); return o && typeof o === 'object' ? o : null; } catch (e) { return null; }
}
function leaves(o, cb) {
  if (Array.isArray(o)) o.forEach((x, i) => typeof x === 'string' ? cb(x, o, i) : x && typeof x === 'object' && leaves(x, cb));
  else for (const k in o) { const x = o[k]; if (typeof x === 'string') cb(x, o, k); else if (x && typeof x === 'object') leaves(x, cb); }
}
function encode(value, kind, quote) {           // value -> raw source text of a string literal / template chunk
  let r = '';
  for (const c of value) {
    if (c === '\\') r += '\\\\';
    else if (c === '\n') r += '\\n';
    else if (c === '\r') r += '\\r';
    else if (c === ' ' || c === ' ') r += '\\u' + c.charCodeAt(0).toString(16);
    else if (kind === 'str' && c === quote) r += '\\' + c;
    else if (kind === 'tpl' && c === '`') r += '\\`';
    else r += c;
  }
  if (kind === 'tpl') r = r.replace(/\$\{/g, '\\${');
  return kind === 'str' ? quote + r + quote : r;
}

// Literals in these positions are identifiers / compare keys:  case "x":   x === "y"   key:"x"   value:"x" ...
const KEY_BEFORE = /(?:\bcase\s*|\b(?:countryCode|langCode|cName|key|value|model|itemName|path|iconName|type|code|region|action|event|id)\s*:\s*|[=!]==?\s*)$/;
const KEY_AFTER = /^\s*[=!]==?/;
const isKeyPos = (src, t) => KEY_BEFORE.test(src.slice(Math.max(0, t.s - 24), t.s)) || KEY_AFTER.test(src.slice(t.e, t.e + 4));

// ---------- 1. strings the English patch introduced, per file ----------
// Compares original vs English file. A string literal of the English file is "introduced" (= gets translated) when
// it lies in a changed region and
//   - its value appears nowhere in the original file, or
//   - its own small, exact change replaced Chinese text (name:"日历" -> name:"Calendar").
// Compare keys: a key of the original code (unchanged literal in a key position, e.g. countryCode:"AM") is protected -
// the same value is then not translated anywhere in that file (except display text that replaced Chinese outside a
// key position, e.g. case"Birthday":t="生日" -> t="Birthday"), so producer and comparison stay equal. A key that
// the English patch created ("日历"===x -> "Calendar"===x) is translated like any other text, consistently.
// JSON payloads (JSON.parse('...')) are looked into: only string leaves that are new count.
// Language codes (keys of `codes`, e.g. "en_US") use the exact diff only: "zh_CN" -> "en_US" counts even when the same
// code appears right next to it. `exclude` (language.json) lists English values that must never be translated.
function introduced(a, b, codes = {}, exclude = []) {
  const ta = tokens(a), tb = tokens(b);
  if (!ta || !tb) return null;
  const found = [], done = new Set(), ov = new Set(), ol = new Set(), fromCJK = new Set(), smallCJK = new Set(), cntCJK = new Set(), ex = new Set(exclude), keys = new Set();
  const fa = {}, fb = {};                                          // value counts per file
  for (const t of ta) { ov.add(t.v); fa[t.v] = (fa[t.v] || 0) + 1; const j = asJson(t.v); if (j) leaves(j, x => ol.add(x)); }
  for (const t of tb) fb[t.v] = (fb[t.v] || 0) + 1;
  for (const [i0, i1, j0, j1] of diff(a, b, 0)) {
    const before = new Set(overlapping(ta, i0, i1).map(x => x.v)), cjk = i1 - i0 < 4000 && j1 - j0 < 4000 && CJK.test(a.slice(i0, i1));
    const bt = overlapping(tb, j0, j1), cntA = {}, cntB = {}, small = cjk && i1 - i0 < 600 && j1 - j0 < 600;
    for (const x of overlapping(ta, i0, i1)) cntA[x.v] = (cntA[x.v] || 0) + 1;
    for (const x of bt) cntB[x.v] = (cntB[x.v] || 0) + 1;
    for (const t of bt) {
      if (t.v in codes) { if (!before.has(t.v) && !done.has(t)) { done.add(t); found.push({ t, code: true }); } }
      else if (cjk && !before.has(t.v)) { fromCJK.add(t); if (small) smallCJK.add(t); }   // the literal itself changed
      // same value also existed in the hunk as a key (case"Birthday":t="生日" -> t="Birthday"): the extra copy outside
      // a key position is new display text
      else if (small && cntB[t.v] > cntA[t.v] && !isKeyPos(b, t)) cntCJK.add(t);
    }
  }
  for (const t of tb) if (ov.has(t.v) && !fromCJK.has(t) && isKeyPos(b, t)) keys.add(t.v);   // compare keys of the original code
  // Display copies of an existing value (see above) are accepted only when the file gained at least that many copies;
  // more candidates than new copies means the diff is misaligned (moved code) and none of them is trusted.
  const cand = new Map(), relaxed = new Set();
  for (const t of [...smallCJK].filter(t => keys.has(t.v) && !isKeyPos(b, t)).concat([...cntCJK])) {
    if (!cand.has(t.v)) cand.set(t.v, new Set()); cand.get(t.v).add(t);
  }
  for (const [v, s] of cand) if (s.size <= (fb[v] || 0) - (fa[v] || 0)) for (const t of s) relaxed.add(t);
  for (const [, , j0, j1] of diff(a, b)) {
    for (const t of overlapping(tb, j0, j1)) {
      if (done.has(t) || t.v in codes || ex.has(t.v)) continue;
      // a protected key value is still translated where it is display text made from Chinese
      // (case"Birthday":t="生日" -> t="Birthday") in a small change that adds a copy of the value, never in a key position
      if (keys.has(t.v) && !relaxed.has(t)) continue;
      if (ov.has(t.v) && !fromCJK.has(t) && !relaxed.has(t)) continue;
      done.add(t);
      const j = asJson(t.v);
      if (j) { const L = new Set(); leaves(j, x => { if (!ol.has(x) && hasLetters(x) && !CJK.test(x)) L.add(x); }); if (L.size) found.push({ t, json: L }); }
      else if (hasLetters(t.v) && !CJK.test(t.v) && !/^\s*<(symbol|svg)\b/.test(t.v)) found.push({ t });
    }
  }
  return found;
}

// ---------- 2. built-in locale files ----------
const MOD_RE = /(\d+):function\((\w)\)\{\2\.exports=JSON\.parse\(/g;
function parseWebpackLocale(src) {              // -> { mods: {id:{s,e,quote,obj}}, map:{s,e,obj:{ns:id}} }
  const mods = {};
  for (const m of src.matchAll(MOD_RE)) {
    const at = m.index + m[0].length;
    const t = acorn.tokenizer(src.slice(at), { ecmaVersion: 'latest' }).getToken();
    if (t.type.label !== 'string') continue;
    mods[m[1]] = { s: at, e: at + t.end, quote: src[at], obj: JSON.parse(t.value) };
  }
  let map = null;
  for (const m of src.matchAll(/\{"\.\/[\w-]+\.json":\d+(?:,"\.\/[\w-]+\.json":\d+)*\}/g)) {
    const obj = {}; for (const x of m[0].matchAll(/"\.\/([\w-]+)\.json":(\d+)/g)) obj[x[1]] = x[2];
    if (!map || Object.keys(obj).length > Object.keys(map.obj).length) map = { s: m.index, e: m.index + m[0].length, obj };
  }
  return { mods, map };
}
function webpackLocaleObject(src) { const p = parseWebpackLocale(src), r = {}; if (p.map) for (const ns in p.map.obj) if (p.mods[p.map.obj[ns]]) r[ns] = p.mods[p.map.obj[ns]].obj; return r; }

// what has to be added to `to` from `from` (missing or empty keys), or everything when from === to (no built-in locale)
function fillPlan(fromObj, toObj, same) {
  const texts = [];
  (function walk(f, t) {
    for (const k in f) {
      const v = f[k];
      if (v && typeof v === 'object') walk(v, same ? v : (t && typeof t[k] === 'object' ? t[k] : null));
      else if (typeof v === 'string' && (same || !t || !(k in t) || t[k] === '') && hasLetters(v) && !CJK.test(v)) texts.push(v);
    }
  })(fromObj, toObj);
  return texts;
}
function fillObject(fromObj, toObj, same, tr) { // returns number of values written
  let n = 0;
  (function walk(f, t) {
    for (const k in f) {
      const v = f[k];
      if (v && typeof v === 'object') { if (!same && (typeof t[k] !== 'object' || !t[k])) t[k] = Array.isArray(v) ? [] : {}; walk(v, same ? v : t[k]); }
      else if (same) { if (typeof v === 'string') { const x = tr(v); if (x !== v) { f[k] = x; n++; } } }
      else if (!(k in t) || (t[k] === '' && v !== '')) { t[k] = typeof v === 'string' ? tr(v) : v; n++; }
    }
  })(fromObj, same ? fromObj : toObj);
  return n;
}

// files of an archive matching a pattern with * (bundle names carry a content hash: dist/assets/index-*.js)
function expandFiles(B, pat) {
  if (!pat.includes('*')) return B.has(pat) ? [pat] : [];
  const re = new RegExp('^' + pat.split('*').map(s => s.replace(/[.+?^$()|[\]\\{}]/g, '\\$&')).join('[^/]*') + '$');
  return [...B.ent.keys()].filter(p => re.test(p));
}
// i18next resources bundled by Vite (VClaw): what "to" lacks compared with "from" (missing, empty, or still identical
// to the English text). Returns { plan: [english texts], fill(tr) -> {ns: {key: value}} } or null.
function bundleGap(src, L) {
  if (!src.includes(L.anchor)) return null;
  const res = require('./i18next-bundle').bundleResources(src, acorn);
  const from = res[L.from] || {}, to = res[L.to] || {};
  const plan = [];
  const fill = tr => {
    const walk = (f, t) => {
      let out = null;
      for (const k in f) {
        const v = f[k], cur = t && typeof t === 'object' ? t[k] : undefined;
        if (v && typeof v === 'object') { const x = walk(v, cur); if (x) (out = out || {})[k] = x; }
        else if (typeof v === 'string' && hasLetters(v) && !CJK.test(v) && (cur === undefined || cur === '' || cur === v)) {
          if (!tr) plan.push(v); else { const y = tr(v); if (y !== v || cur === undefined || cur === '') (out = out || {})[k] = y; }
        }
      }
      return out;
    };
    const o = {}; for (const ns in from) { const x = walk(from[ns], to[ns]); if (x) o[ns] = x; } return o;
  };
  fill(null);
  return { plan, fill };
}

// TinyMCE language pack: tinymce.addI18n('<code>', { ...JSON... });
function tinymceLang(src) {
  const m = /^\s*tinymce\.addI18n\(\s*(['"])([^'"]+)\1\s*,\s*/.exec(src); if (!m) throw new Error('not a TinyMCE language pack');
  const j = src.lastIndexOf('}');
  return { code: m[2], obj: JSON.parse(src.slice(m[0].length, j + 1)), tail: src.slice(j + 1) };
}

// a "tinymce" locale entry per TinyMCE version folder: base may contain * (the folder name is a build date); from and
// to are taken from the same folder as each matching base file.
function tinymceSets(B, L) {
  const name = p => p.slice(p.lastIndexOf('/') + 1);
  return expandFiles(B, L.base).map(base => { const dir = base.slice(0, base.lastIndexOf('/') + 1); return { base, from: dir + name(L.from), to: dir + name(L.to) }; })
    .filter(s => B.has(s.from));
}

// ---------- dictionary ----------
function makeTranslator(dict) {
  const used = new Set(), missing = new Set();
  const tr = s => {
    const [l, core, r] = splitWs(s);
    if (!core) return s;
    const t = dict[core];
    if (typeof t === 'string' && t !== '') {
      used.add(core);
      // edge spaces of the original literal are re-applied; spaces the translator put at an edge of the value win
      // (word order differs between languages: "'s birthday" -> " - Sinh nhật")
      const [tl, tc, tr2] = splitWs(t);
      return tc ? (tl || l) + tc + (tr2 || r) : l + r;
    }
    missing.add(core); return s;
  };
  return { tr, used, missing };
}
function placeholderCheck(dict) {               // warn when {0}, %s, <b>, \n ... differ between English and translation
  const P = /\{[\w.]*\}|%\d*\$?[sdf@]|<\/?[a-zA-Z][^>]*>|\$\{|\n/g, bad = [];
  for (const k in dict) {
    if (!dict[k]) continue;
    const a = (k.match(P) || []).sort().join(' '), b = (dict[k].match(P) || []).sort().join(' ');
    if (a !== b) bad.push(k);
  }
  return bad;
}

// ---------- commands ----------
function collect(name, orig, en, conf, add) {
  const A = asar.open(orig), B = asar.open(en);
  let files = 0;
  for (const [p] of B.ent) {
    if (!/\.js$/.test(p) || !A.has(p)) continue;
    const ab = A.read(p), bb = B.read(p);
    if (ab.equals(bb)) continue;
    const f = introduced(ab.toString('utf8'), bb.toString('utf8'), conf.codes, conf.exclude);
    if (!f) { console.error('  (could not tokenize ' + p + ')'); continue; }
    files++;
    for (const x of f) {
      if (x.json) for (const v of x.json) add(v, p);
      else if (!x.code) add(x.t.v, p);
    }
  }
  for (const L of ((conf.asars || {})[name] || {}).locales || []) {
    if (L.type === 'i18next-bundle') {
      let hit = 0;
      for (const p of expandFiles(B, L.file)) { const g = bundleGap(B.text(p), L); if (g) { hit++; for (const v of g.plan) add(v, p); } }
      if (!hit) console.error('  i18next bundle not found: ' + L.file);
      continue;
    }
    if (L.type === 'tinymce') {
      const sets = tinymceSets(B, L);
      if (!sets.length) console.error('  locale file missing: ' + L.from + ' / ' + L.base);
      for (const s of sets) for (const v of fillPlan(tinymceLang(B.text(s.from)).obj, tinymceLang(B.text(s.base)).obj, false)) add(v, s.to);
      continue;
    }
    if (!B.has(L.from) || !B.has(L.to)) { console.error('  locale file missing: ' + L.from + ' / ' + L.to); continue; }
    const get = p => L.type === 'webpack' ? webpackLocaleObject(B.text(p)) : JSON.parse(B.text(p).replace(/^\uFEFF/, ''));
    for (const v of fillPlan(get(L.from), get(L.to), L.from === L.to)) add(v, L.to);
  }
  A.close(); B.close();
  return files;
}

function cmdExtract(dir, sets) {
  const conf = readJson(path.join(dir, 'language.json'), {});
  const file = path.join(dir, 'strings.json'); const old = readJson(file, {});
  const seen = new Map();
  const add = (v, p) => { const core = splitWs(v)[1]; if (core && hasLetters(core) && !seen.has(core)) seen.set(core, p); };
  for (let i = 0; i < sets.length; i += 3) { console.error('scanning ' + sets[i] + ' ...'); collect(sets[i], sets[i + 1], sets[i + 2], conf, add); }
  const out = {}; let kept = 0, fresh = 0;
  for (const k of seen.keys()) { out[k] = typeof old[k] === 'string' ? old[k] : ''; if (out[k]) kept++; else fresh++; }
  const obsolete = Object.keys(old).filter(k => !seen.has(k));
  for (const k of obsolete) if (old[k]) out[k] = old[k];          // keep translations that are no longer needed (harmless)
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  const bad = placeholderCheck(out);
  console.log(JSON.stringify({ strings: seen.size, translated: kept, untranslated: fresh, obsoleteKept: obsolete.filter(k => old[k]).length, placeholderMismatches: bad.length, file }));
  if (bad.length) console.error('placeholder mismatches:\n  ' + bad.slice(0, 30).join('\n  '));
}

function cmdBuild(dir, name, orig, en, out) {
  const conf = readJson(path.join(dir, 'language.json'), {});
  const dict = readJson(path.join(dir, 'strings.json'), {});
  const codes = conf.codes || {}, keep = conf.keepCodesAfter || [];
  const T = makeTranslator(dict);
  const A = asar.open(orig), B = asar.open(en);
  const mods = new Map(), added = {}, report = { files: 0, strings: 0, codes: 0, localeValues: 0, revertedFiles: [], untranslated: 0 };

  for (const [p] of B.ent) {
    if (!/\.js$/.test(p) || !A.has(p)) continue;
    const ab = A.read(p), bb = B.read(p);
    if (ab.equals(bb)) continue;
    const src = bb.toString('utf8');
    const f = introduced(ab.toString('utf8'), src, codes, conf.exclude);
    if (!f) { report.revertedFiles.push(p + ' (tokenize)'); continue; }
    const edits = [];
    for (const x of f) {
      const t = x.t; let nv = null;
      if (x.json) {
        const o = JSON.parse(t.v); let ch = false;
        leaves(o, (v, parent, key) => { if (x.json.has(v)) { const y = T.tr(v); if (y !== v) { parent[key] = y; ch = true; report.strings++; } } });
        if (ch) nv = JSON.stringify(o);
      } else if (x.code) {
        const before = src.slice(Math.max(0, t.s - 40), t.s);
        if (!keep.some(k => before.includes(k))) { nv = codes[t.v]; report.codes++; }
      } else {
        const y = T.tr(t.v); if (y !== t.v) { nv = y; report.strings++; }
      }
      if (nv !== null) edits.push([t.s, t.e, encode(nv, t.k, src[t.s])]);
    }
    if (!edits.length) continue;
    edits.sort((x, y) => y[0] - x[0]);
    let r = src; for (const [s, e, raw] of edits) r = r.slice(0, s) + raw + r.slice(e);
    { const bad = checkJs(r, p); if (bad) { report.revertedFiles.push(p + ' (' + bad + ')'); continue; } }
    mods.set(p, Buffer.from(r, 'utf8')); report.files++;
  }

  // exact source replacements for what a dictionary cannot express (language.json asars.<name>.sourceReplace):
  //   { "file": "dist/electron/171.js", "find": "[\"S\",\"M\",...]", "replace": "[\"CN\",\"T2\",...]" }   (all occurrences)
  //   "files": [ ... ] instead of "file" applies the same replacement to several files. Runs after the dictionary,
  //   so "find" must match the text as it is after translation.
  report.sourceReplace = 0;
  for (const R of ((conf.asars || {})[name] || {}).sourceReplace || []) {
    const text = x => mods.has(x) ? mods.get(x).toString('utf8') : B.text(x);
    const list = [].concat(...(R.files || [R.file]).map(p => p.includes('*') ? expandFiles(B, p).filter(x => text(x).includes(R.find)) : [p]));
    if (!list.length) report.revertedFiles.push((R.files || [R.file]).join(',') + ' (sourceReplace: no file contains: ' + R.find.slice(0, 40) + ')');
    for (const file of list) {
      if (!B.has(file)) { report.revertedFiles.push(file + ' (sourceReplace: file missing)'); continue; }
      const cur = mods.has(file) ? mods.get(file).toString('utf8') : B.text(file);
      const n = cur.split(R.find).length - 1;
      if (!n) { report.revertedFiles.push(file + ' (sourceReplace: text not found: ' + R.find.slice(0, 40) + ')'); continue; }
      const r = cur.split(R.find).join(R.replace);
      if (/\.js$/.test(file)) { const bad = checkJs(r, file); if (bad) { report.revertedFiles.push(file + ' (sourceReplace: ' + bad + ')'); continue; } }
      mods.set(file, Buffer.from(r, 'utf8')); report.sourceReplace += n;
    }
  }

  // complete / translate the app's own locale files
  for (const L of ((conf.asars || {})[name] || {}).locales || []) {
    const cur = p => mods.has(p) ? mods.get(p).toString('utf8') : B.text(p);
    if (L.type === 'i18next-bundle') {           // { file: "dist/assets/index-*.js", anchor, from: "en_US", to: "vi_VN" }
      let hit = 0;
      for (const p of expandFiles(B, L.file)) {
        const g = bundleGap(B.text(p), L); if (!g) continue;          // gap measured on the English build
        hit++;
        const data = g.fill(T.tr); const n = JSON.stringify(data).split('":"').length - 1;
        const to = JSON.stringify(L.to);
        const code = '(x=>{const m=(a,b)=>{for(const k in b)a[k]=b[k]&&typeof b[k]=="object"?m(a[k]&&typeof a[k]=="object"?{...a[k]}:{},b[k]):b[k];return a};' +
          'const r=resources[' + to + ']=resources[' + to + ']||{};for(const n in x)r[n]=m({...(r[n]||{})},x[n])})(JSON.parse(' + encode(JSON.stringify(data), 'str', '"') + '));';
        const out = cur(p).split(L.anchor).join(code + L.anchor), bad = checkJs(out, p);
        if (bad) { report.revertedFiles.push(p + ' (' + bad + ')'); continue; }
        mods.set(p, Buffer.from(out, 'utf8')); report.localeValues += n;
      }
      if (!hit) report.revertedFiles.push(L.file + ' (i18next bundle not found)');
      continue;
    }
    if (L.type === 'tinymce') {                  // { from: ".../en_US_in.js", base: ".../vi_VN.js", to: ".../vi_VN_in.js", code: "vi_VN_in" }
      const sets = tinymceSets(B, L);
      if (!sets.length) report.revertedFiles.push(L.to + ' (tinymce: ' + L.from + ' / ' + L.base + ' missing)');
      for (const s of sets) {
        const base = tinymceLang(cur(s.base)), obj = JSON.parse(JSON.stringify(base.obj));
        report.localeValues += fillObject(tinymceLang(B.text(s.from)).obj, obj, false, T.tr);
        const js = "tinymce.addI18n('" + (L.code || base.code) + "', " + JSON.stringify(obj, null, 2) + base.tail;
        const bad = checkJs(js, s.to); if (bad) { report.revertedFiles.push(s.to + ' (' + bad + ')'); continue; }
        if (B.has(s.to)) mods.set(s.to, Buffer.from(js, 'utf8')); else added[s.to] = Buffer.from(js, 'utf8');
      }
      continue;
    }
    if (!B.has(L.from) || !B.has(L.to)) continue;
    const same = L.from === L.to;
    if (L.type === 'json') {
      const raw = cur(L.to); const ind = (/\n([ \t]+)"/.exec(raw) || [])[1];
      const from = JSON.parse((same ? cur(L.from) : B.text(L.from)).replace(/^\uFEFF/, '')), to = same ? from : JSON.parse(raw.replace(/^\uFEFF/, ''));
      report.localeValues += fillObject(from, to, same, T.tr);
      let js = ind ? JSON.stringify(to, null, ind) : JSON.stringify(to);
      if (raw.includes('\r\n')) js = js.replace(/\n/g, '\r\n');
      mods.set(L.to, Buffer.from(js, 'utf8'));
    } else {
      const fromObj = webpackLocaleObject(same ? cur(L.from) : B.text(L.from));   // English as built, not as translated above
      let src = cur(L.to); const P = parseWebpackLocale(src);
      const edits = [], newMods = {};
      let nextId = 990000; const allIds = new Set(Object.keys(P.mods));
      for (const ns in fromObj) {
        const id = P.map && P.map.obj[ns];
        if (id && P.mods[id]) {
          const obj = P.mods[id].obj;
          const n = fillObject(same ? obj : fromObj[ns], obj, same, T.tr);
          if (n) { report.localeValues += n; edits.push([P.mods[id].s, P.mods[id].e, encode(JSON.stringify(obj), 'str', P.mods[id].quote)]); }
        } else if (P.map && !same) {                 // namespace missing in this language: add a module
          const obj = {}; report.localeValues += fillObject(fromObj[ns], obj, false, T.tr);
          while (allIds.has(String(nextId)) || src.includes(nextId + ':function')) nextId++;
          allIds.add(String(nextId)); newMods[ns] = nextId++;
          P.map.obj[ns] = String(newMods[ns]);
          edits.push([-1, -1, newMods[ns] + ':function(e){e.exports=JSON.parse(' + encode(JSON.stringify(obj), 'str', "'") + ')},']);
        }
      }
      if (Object.keys(newMods).length) edits.push([P.map.s, P.map.e, '{' + Object.keys(P.map.obj).map(k => '"./' + k + '.json":' + P.map.obj[k]).join(',') + '}']);
      const ins = edits.filter(x => x[0] < 0).map(x => x[2]).join('');
      edits.filter(x => x[0] >= 0).sort((x, y) => y[0] - x[0]).forEach(([s, e, raw]) => { src = src.slice(0, s) + raw + src.slice(e); });
      if (ins) { const at = src.indexOf(']).push([[') >= 0 ? src.indexOf('{', src.indexOf('push([[')) + 1 : -1; if (at > 0) src = src.slice(0, at) + ins + src.slice(at); }
      try { new vm.Script(src, { filename: L.to }); mods.set(L.to, Buffer.from(src, 'utf8')); }
      catch (e) { report.revertedFiles.push(L.to + ' (' + e.message + ')'); }
    }
  }
  asar.write(B, out, mods, added);
  report.untranslated = T.missing.size; report.untranslatedSample = [...T.missing].slice(0, 15); report.output = out;
  console.log(JSON.stringify(report));
}

// ---------- main ----------
if (require.main === module) {
  const [cmd, dir, ...rest] = process.argv.slice(2);
  if (cmd === 'extract' && rest.length >= 3 && rest.length % 3 === 0) {
    acorn = loadAcorn(rest.filter((_, i) => i % 3 === 1));
    cmdExtract(dir, rest);
  } else if (cmd === 'build' && rest.length === 4) {
    acorn = loadAcorn([rest[1]]);
    cmdBuild(dir, rest[0], rest[1], rest[2], rest[3]);
  } else {
    console.error('usage:\n  lang.js extract <langDir> <name> <original.asar> <english.asar> [...]\n  lang.js build <langDir> <name> <original.asar> <english.asar> <out.asar>');
    process.exit(2);
  }
}
module.exports = { _setAcorn: x => { acorn = x; }, _tokens: s => tokens(s), introduced, parseWebpackLocale, webpackLocaleObject, placeholderCheck };
