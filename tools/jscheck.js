// JavaScript syntax check for patched files. Classic scripts use vm.Script; ES modules (Vite bundles with
// import/export, e.g. VClaw) cannot be compiled by vm.Script, so they are parsed with acorn as a module instead.
// checkJs(src, name) -> null when valid, otherwise the error message.
'use strict';
const vm = require('vm'), path = require('path');
let acorn = null;
function getAcorn() {
  if (acorn) return acorn;
  const own = path.join(path.dirname(process.execPath), 'resources', 'app.asar');   // run by pcsuite.exe
  for (const t of [path.join(own, 'node_modules/terser/node_modules/acorn'), path.join(own, 'node_modules/acorn'), 'acorn']) {
    const prev = process.noAsar; process.noAsar = false;
    try { acorn = require(t); return acorn; } catch (e) { } finally { process.noAsar = prev; }
  }
  return null;
}
function checkJs(src, name) {
  try { new vm.Script(src, { filename: name }); return null; }
  catch (e) {
    if (!/\b(import|export)\b/.test(e.message) && !/Cannot use import|import\.meta/.test(e.message)) return e.message;
    const a = getAcorn();
    if (!a) return 'ES module, acorn not found: ' + e.message;
    try { a.parse(src, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true }); return null; }
    catch (e2) { return e2.message; }
  }
}
module.exports = { checkJs, setAcorn: x => { acorn = x; } };
