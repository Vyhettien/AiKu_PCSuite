# CLAUDE.md — AiKu_PCSuite

Instructions for Claude Code in this repository. The full maintainer guide is **[AGENTS.md](AGENTS.md)** — read it
before changing patches, dictionaries or tools.

## Project in one paragraph

Translation patches for the Chinese-ROM build of vivo PC Suite (Electron) and its companion apps (Remote PC, Phone
Mirroring, VClaw). `patches/en_US` is the hand-made English master; other languages are generated from the English
build with `translations/<locale>/strings.json` by `tools/make-lang.js`. `Translate-PCSuite.ps1` backs up, builds and
installs.

## Non-negotiable rules

- Do not commit or push unless the user asks.
- Never modify `IS_EXPORT`.
- Never translate AI prompts, compare keys, ids, event names, folder paths, log/telemetry strings, server error codes,
  test data, RRULE values or country codes.
- Never add vivo binaries or archives to the repository.
- Keep `Translate-PCSuite.ps1` ASCII-only.
- Every changed JavaScript file must pass `tools/jscheck.js`.

## Working conventions

- Run tools with PC Suite's engine: `ELECTRON_RUN_AS_NODE=1 "/c/Program Files (x86)/pcsuite/pcsuite.exe" tools/<tool>.js`.
- Edit the English master through `tools/edit-master.js <archive> <edits.json>` (expected counts, syntax check, patch
  regeneration), then run `tools/make-lang.js <locale>` for every other language.
- Write scripts and JSON containing backslashes or `${…}` with the file-writing tool, not Bash heredocs.
- Installing needs the user's UAC approval; `-BuildOnly` does not. Ask before installing over the user's running apps.
- Before reporting success, complete the checklist in AGENTS.md §8 and state what was not verified on screen.
- Answer the user in the language they write in.
