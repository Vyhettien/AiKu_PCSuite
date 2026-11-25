// Reads the i18next resources that a Vite build bundles into one JS file (VClaw renderer):
//   const localeModules = Object.assign({"../locales/en_US/common.json": __vite_glob_0_N, ...})
//   __vite_glob_0_N = Object.defineProperty({__proto__:null, key: key$3, ..., default: default$3}, Symbol.toStringTag, ...)
//   key$3 = "text", default$3 = {key: key$3, nested: nested$3}, nested$3 = {title: "..."}
// bundleResources(src, acorn) -> { en_US: { common: {...}, ... }, vi_VN: {...}, ... }
'use strict';

function bundleResources(src, acorn) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true });
  const decl = new Map();                                   // identifier -> init node (top level only)
  const visit = n => {
    if (n.type === 'VariableDeclaration') for (const d of n.declarations) { if (d.id.type === 'Identifier' && d.init) decl.set(d.id.name, d.init); }
    else if (n.type === 'ExportNamedDeclaration' && n.declaration) visit(n.declaration);
  };
  for (const n of ast.body) visit(n);

  const seen = new Set();
  const value = node => {
    if (!node) return undefined;
    switch (node.type) {
      case 'Literal': return node.value;
      case 'TemplateLiteral': return node.expressions.length ? undefined : node.quasis[0].value.cooked;
      case 'Identifier': {
        if (seen.has(node.name)) return undefined;
        seen.add(node.name); const v = value(decl.get(node.name)); seen.delete(node.name); return v;
      }
      case 'ObjectExpression': {
        const o = {};
        for (const p of node.properties) {
          if (p.type !== 'Property') continue;
          const k = p.key.type === 'Identifier' ? p.key.name : p.key.value;
          if (k === '__proto__') continue;
          const v = value(p.value); if (v !== undefined) o[k] = v;
        }
        return o;
      }
      case 'CallExpression':                                  // Object.defineProperty({...}, Symbol.toStringTag, ...) / Object.freeze({...})
        return node.arguments.length ? value(node.arguments[0]) : undefined;
      default: return undefined;
    }
  };

  // find the object literal whose keys look like "../locales/<lang>/<ns>.json"
  const out = {};
  const walk = node => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'ObjectExpression' && node.properties.length && node.properties.every(p => p.type === 'Property' && p.key.type === 'Literal' && /locales\/[^/]+\/[^/]+\.json$/.test(p.key.value))) {
      for (const p of node.properties) {
        const [, lang, ns] = /locales\/([^/]+)\/([^/]+)\.json$/.exec(p.key.value);
        const mod = value(p.value);
        const data = mod && (mod.default !== undefined ? mod.default : mod);
        if (data && typeof data === 'object') (out[lang] = out[lang] || {})[ns] = data;
      }
      return;
    }
    for (const k in node) {
      if (k === 'type' || k === 'start' || k === 'end') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v);
    }
  };
  walk(ast);
  return out;
}
module.exports = { bundleResources };
