// The archives this project patches: name used in backups / build folders / language.json -> patch file base name,
// install path (relative to the PC Suite folder) and an optional check.js mode.
'use strict';
module.exports = {
  'app.asar':             { patch: 'app',         path: 'resources\\app.asar' },
  'vivoControl_app.asar': { patch: 'vivoControl', path: 'vivoControl\\resources\\app.asar' },
  'VClaw_app.asar':       { patch: 'vclaw',       path: 'VClaw\\resources\\app.asar', check: 'vclaw' },
};
