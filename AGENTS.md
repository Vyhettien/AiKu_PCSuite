# AGENTS.md — AiKu_PCSuite maintainer guide

This document is the technical reference for anyone — AI assistant or human — who maintains or extends this project:
updating the patches for a new vivo release, adding a language, or fixing a translation. Read it completely before
changing anything. User-facing documentation lives in [README.md](README.md) / [README.vi.md](README.vi.md).

**Contents**
1. [Ground rules](#1-ground-rules)
2. [Environment](#2-environment)
3. [Repository layout](#3-repository-layout)
4. [Architecture](#4-architecture)
5. [How each component chooses its language](#5-how-each-component-chooses-its-language)
6. [The translation layer (`tools/lang.js`)](#6-the-translation-layer-toolslangjs)
7. [Workflows](#7-workflows)
8. [Verification checklist](#8-verification-checklist)
9. [Known limitations and intentional Chinese](#9-known-limitations-and-intentional-chinese)
10. [Pitfalls](#10-pitfalls)

---

## 1. Ground rules

| Rule | Why |
|---|---|
| **Never commit or push** unless the user explicitly asks. | The user reviews every change. |
| **Never change `IS_EXPORT`** (`window.__buildConfig__.IS_EXPORT`, `resources/build-config.json`). | It selects the phone ecosystem; flipping it breaks the connection to Chinese-ROM phones. |
| **Never translate** AI prompts sent to servers, AI keyword lists, compare keys, ids, event names, folder paths (`/DCIM/...`), log / telemetry strings, server error codes, test data, RRULE values (`WEEKLY`, `MO`), country codes. | These are data, not UI. Translating them breaks features. When unsure, leave the string unchanged. |
| **Never commit vivo files** (`*.asar`, `*.exe`, `backup_original_*/`, `build/`). | Proprietary, hundreds of MB; already git-ignored. The repository contains only text patches, dictionaries and tools. |
| **Keep `Translate-PCSuite.ps1` ASCII-only.** | Windows PowerShell 5.1 reads it with the ANSI code page. |
| **Every edited JavaScript file must stay valid.** | All tools syntax-check their output (`tools/jscheck.js`); a file that fails is left untranslated so the app still starts. |

## 2. Environment

- Windows 10/11 with vivo PC Suite (Chinese-ROM build) in `C:\Program Files (x86)\pcsuite`. VClaw, if installed, is in
  `...\pcsuite\VClaw`.
- No Node.js installation is needed: PC Suite's Electron binary runs the tools.
  ```powershell
  $env:ELECTRON_RUN_AS_NODE=1; & "C:\Program Files (x86)\pcsuite\pcsuite.exe" tools\<tool>.js <args>
  ```
  Git Bash: `ELECTRON_RUN_AS_NODE=1 "/c/Program Files (x86)/pcsuite/pcsuite.exe" tools/<tool>.js <args>`
- The JavaScript tokenizer/parser (acorn) is loaded from PC Suite's own `app.asar`
  (`node_modules/terser/node_modules/acorn`).
- Installing needs administrator rights (one UAC prompt); building (`-BuildOnly`) does not.

## 3. Repository layout

| Path | Purpose |
|---|---|
| `Translate-PCSuite.ps1` | End-user script: locate the install → back up originals → build from patches → install → set `config.ini` → restart. |
| `1. English.cmd`, `2. Tiếng Việt.cmd`, `3. Restore original (Chinese).cmd` | Double-click launchers (ASCII content, CRLF). |
| `patches/en_US/*.patch.json` | **English master** — hand-made Chinese → English patches. |
| `patches/<locale>/*.patch.json` | Generated patches for other languages (do not edit by hand). |
| `patches/<locale>/language.json` | Copy of the language metadata, read by the script (`configIni`, `vivoScreen`). |
| `translations/<locale>/strings.json` | Dictionary English → target language. |
| `translations/<locale>/language.json` | Language codes, locale files to complete, source replacements. |
| `img/<zh_CN\|en_US\|vi_VN>/NN-<screen>.png` | Side-by-side screenshots used by the README gallery (same 32 screens per language); `img/fixes/` before/after pictures. |
| `tools/archives.js` | The list of patched archives (name, patch file, install path, check mode). |
| `tools/asar.js` | Read and repack `.asar` archives (keeps file order, recomputes SHA-256 integrity, 4 MB blocks). |
| `tools/patcher.js` | Apply a patch: exact by offset when the file hash matches, otherwise each hunk is located by its context. |
| `tools/mkpatch.js` | Diff original vs. translated archive → patch (hunks `{p,a,o,n,b}`: offset, 60 chars before, old, new, 60 chars after). |
| `tools/edit-master.js` | Apply a JSON list of edits to the English master and regenerate its patch. |
| `tools/lang.js` | `extract` English strings into a dictionary; `build` a language from the English archive. |
| `tools/make-lang.js` | Full pipeline for one locale: English build → extract → build → mkpatch → copy `language.json`. |
| `tools/i18next-bundle.js` | Reads the i18next resources bundled into a Vite build (VClaw). |
| `tools/jscheck.js` | Syntax check: `vm.Script` for classic scripts, acorn (`sourceType: module`) for ES modules. |
| `tools/check.js` | Prints `original` / `translated` for an installed archive (`check.js <asar> [vclaw]`). |
| `tools/compare.js` | Compares the contents of two archives (ignores layout) and verifies integrity. |

Git-ignored local folders: `backup_original_<PC Suite version>\` (originals, created by the script), `build\<locale>\`
(build output), `translate_log.txt`.

## 4. Architecture

Two layers. Only the English master is written by hand; every other language is derived from it.

```
original archive (Chinese, vivo)        backup_original_<version>\<archive>
   │  patches/en_US/<patch>.patch.json   hand-made: Chinese → English, removes forced zh_CN
   ▼
English archive                         build\en_US\<archive>
   │  translations/<locale>/strings.json     dictionary English → target
   │  translations/<locale>/language.json    codes, locale completion, source replacements
   ▼  tools/lang.js build
translated archive                      build\<locale>\<archive>
   │  tools/mkpatch.js (diff against the ORIGINAL)
   ▼
patches/<locale>/<patch>.patch.json     what Translate-PCSuite.ps1 applies
```

### Patched components

| Archive name | Installed at (under `pcsuite\`) | Patch | Notes |
|---|---|---|---|
| `app.asar` | `resources\app.asar` | `app.patch.json` | PC Suite (Vue 2 + webpack + vue-i18n). |
| `vivoControl_app.asar` | `vivoControl\resources\app.asar` | `vivoControl.patch.json` | Remote PC window. |
| `VClaw_app.asar` | `VClaw\resources\app.asar` | `vclaw.patch.json` | VClaw AI assistant (React + Vite + i18next). Optional component. |
| `vivoScreen.exe` | `vivoScreen\vivoScreen.exe` | — | Phone Mirroring (Qt). Byte-patched: default `zh-CN` → `language.json → vivoScreen` (`en-US`, `vi-VN`). |

### Patch format and robustness

Each hunk stores its offset, the original text, the new text and 60 characters of context on each side.
- Same file hash → hunks are replayed by offset (byte-exact).
- Different version → each hunk is located by context; hunks that cannot be found are skipped and counted.
- Any JavaScript file that fails the syntax check is left original (`revertedFiles`), so the app always starts.

### Backups

`Translate-PCSuite.ps1` backs up the originals once per PC Suite version into `backup_original_<version>\` and always
builds from those originals. It refuses to back up files that are already translated (`check.js`). VClaw is updated
independently of PC Suite, so its archive is backed up **every time the installed copy is an original** (new VClaw
release ⇒ fresh backup).

## 5. How each component chooses its language

### PC Suite (`app.asar`)

The Chinese build forces Chinese in many places: `if(!n)return"zh_CN"`, `n?o():"zh_CN"`, `this._currentLanguage="zh_CN"`,
`setItem("currentLanguage","zh_CN")`, `vLang "vzh_rCN"`, TinyMCE `language:"zh_CN"`, `Intl.DateTimeFormat("zh-CN")`, …
The English master replaces these with `"en_US"` / `"vus"` / `"en-US"` / `"en_US_in"`. For other languages,
`language.json → codes` maps them to the target (`vi_VN`, `vvi`, `vi-VN`). `fallbackLocale` stays `en_US`
(`keepCodesAfter`), so a key missing in the target locale shows English, never a raw key.

The Notes editor (TinyMCE) appends `_in` to the language when `IS_EXPORT` is false (`…IS_EXPORT?e:e+"_in"` in
`app-modules-note.js`), so it loads `static/tinymce/<date>/langs/<locale>_in.js`. vivo ships only `zh_CN_in.js`; the English
master adds `en_US_in.js`, and other languages need a `tinymce` locale entry (§6.3) that creates `<locale>_in.js` —
without it the editor shows raw keys (`headingLabel`, `noteCountWithNum`, `editorAiWinPlaceholder`).

Locales: `dist/electron/locales-<locale>.js` (webpack chunk; modules `ID:function(e){e.exports=JSON.parse('…')}` and a map
`{"./common.json":ID,…}`) and `dist/electron/locales/<locale>/framework.json`. The `langMap` in `renderer.js`
(`{region:"vi_VN",vRegion:"vvi",code:"1066",…}`) lists region, vivo region and LCID of every supported language.

### Remote PC (`vivoControl_app.asar`)

Locales `dist/assets/lang/v<code>.json` (`vus.json`, `vvi.json`, …); language code `vus` → `vvi` via `codes`.

### Phone Mirroring (`vivoScreen.exe`)

`LanguageManager` loads `:/translations/win/<code>.qm` from the Qt resources compiled into the exe (log:
`%APPDATA%\pcsuite\log\mirrorscreen_log\VivoScreen_<date>.log`, `load translation … result:true`). 7.0.6 contains about 60
complete `.qm` files (156 messages each), `vi-VN.qm` included. The Chinese build ignores `config.json` and always loads its
default `"zh-CN"` (ASCII, directly followed by `\0\0\0` and the fallback `"en-US"`). `Translate-PCSuite.ps1` overwrites
that 5-byte default with `language.json → vivoScreen` after checking that the exe contains the UTF-16BE resource name
`<code>.qm`; otherwise it uses `en-US`. If a translation fails to load, the app itself falls back to `en-US`. To list the
built-in codes, search the exe for UTF-16BE names ending in `.qm` (pattern `xx-YY.qm`; note `iw-IL`, `in-ID`, `my-ZG`).

### VClaw (`VClaw_app.asar`)

- Electron + Vite + React + i18next; renderer bundles are ES modules named `dist/assets/index-<hash>.js`.
- Chinese is forced in the renderer (`isExport=${l}`),l?d:"zh_CN"`) and in the main process (default settings,
  `getSetting("language")||"zh_CN"`, `gn("language","zh_CN")`, `settings:getLanguageSync` returning `"zh_CN"`). VClaw does
  not read PC Suite's language at start-up (`%APPDATA%\pcsuite\config.json` has no `currentLanguage`); it only follows
  PC Suite's WebSocket `language-changed` event. The English master forces `en_US`; `codes` maps it.
- The preload sets `window.electron.appName = "小V Claw"`, which is injected as `common:appName` into every language;
  the master renames it to `VClaw`.
- VClaw ships a `vi_VN` locale that lacks whole namespaces (agents, clawh5, dashboard, setup) and some keys; locale type
  `i18next-bundle` fills them (§6.3).
- Bundle names contain a content hash, so every VClaw release renames them: regenerate `vclaw.patch.json` (§7.2) and use
  `*` in `language.json` paths.

## 6. The translation layer (`tools/lang.js`)

### 6.1 What `extract` picks up

A string literal of the English build is *introduced UI text* when it lies in a region changed by the English master
**and** either its value appears nowhere in the original file, or its own small exact edit replaced Chinese.

Compare keys are protected: an unchanged literal of the original code in a key position (`case "x"`, `x === "y"`,
`key:`, `value:`, `type:`, `path:`, `countryCode:`, …) blocks translation of that value in the whole file, so producer
and comparison stay equal. Exception: a copy of that value that replaced Chinese outside a key position in a small edit,
when the file gained at least as many copies as there are such candidates (`case"Birthday":t="生日"` → `t="Birthday"`
is translated, `case"Birthday"` is not). More candidates than new copies means moved code confused the diff (7.0.6
`8.js`: `ref:"year"`, `data-key`) — then nothing is translated and `sourceReplace` is the tool. Keys created by the
English master itself (`"日历"===x` → `"Calendar"===x`) are translated consistently on both sides.

JSON payloads inside JS (`JSON.parse('…')`) are inspected leaf by leaf; only new leaves count.

### 6.2 `language.json` reference

```jsonc
{
  "name": "Tiếng Việt", "locale": "vi_VN", "about": "…",
  "codes": { "en_US": "vi_VN", "en_US_in": "vi_VN", "en-US": "vi-VN", "vus": "vvi" },  // introduced language codes
  "keepCodesAfter": ["fallbackLocale:"],          // a code right after this text is not mapped
  "exclude": [],                                  // English values that must never be translated
  "configIni": { "LanguageID": "1066", "LanguageTag": "vi_VN" },
  "vivoScreen": "vi-VN",                          // Phone Mirroring .qm code (§5); en-US if the exe lacks it
  "asars": {
    "<archive name>": {
      "locales": [ … ],                           // §6.3
      "sourceReplace": [ … ]                      // §6.4
    }
  }
}
```

### 6.3 Completing the app's own locales (`locales`)

| `type` | Fields | Behaviour |
|---|---|---|
| `webpack` | `from`, `to` (e.g. `dist/electron/locales-en_US.js` → `locales-vi_VN.js`) | Missing or empty keys of `to` are filled from `from` (English as built), translated through the dictionary. A missing namespace becomes a new module (id ≥ 990000) plus a map entry. |
| `json` | `from`, `to` | Same for a JSON file; indentation and CRLF are preserved. |
| `tinymce` | `base`, `from`, `to`, `code` (e.g. `…/langs/vi_VN.js` + `en_US_in.js` → `vi_VN_in.js`, `vi_VN_in`); `base` may contain `*`, `from`/`to` are taken from the same folder | Writes a TinyMCE language pack `to` (new file if missing) registered as `code`: the `base` pack, with missing or empty keys filled from `from` through the dictionary. Needed because the Notes editor asks for `<language>_in` (§5). |
| `i18next-bundle` | `file` (may contain `*`), `anchor`, `from`, `to` | Reads the bundled i18next resources (`tools/i18next-bundle.js`, ~30 s for a 15 MB bundle). `extract` adds every English value that `to` lacks — missing, empty, or still identical to English — to the dictionary; `build` injects the translations into `resources[to]` immediately before `anchor` (deep merge). |

If an app has **no** built-in locale for a language, set `to` = `from` and keep `en_US` in `codes`: all English values
are then translated in place.

### 6.4 Exact source replacements (`sourceReplace`)

For UI that a one-to-one dictionary cannot express (ambiguous single letters, formats, literals the extractor protects):

```json
{ "file": "dist/electron/171.js", "find": "[\"S\",\"M\",\"T\",\"W\",\"T\",\"F\",\"S\"]", "replace": "[\"CN\",\"T2\",\"T3\",\"T4\",\"T5\",\"T6\",\"T7\"]" }
```

- Replaces **all** occurrences; runs **after** the dictionary, so `find` must match the already-translated text.
- `files: [...]` applies one replacement to several files (renderer.js, child-window.js and module-share-preview.js
  often share code). Paths may contain `*`; then only matching files that contain `find` are changed.
- A replacement that no longer matches is reported in `revertedFiles` — after an update, look up the new text.
- Prefer short, unambiguous anchors such as `labelText:"S",value:0`.

Current vi_VN uses: calendar weekday letters (the `["S","M",…]` arrays and `weekData` `labelText`), Element UI date/time
placeholders, the Element (`la`) locale loader key (`"./vi.js"` → `"./vi_VN.js"`, otherwise date pickers fall back to
English), FullCalendar `locale:"en"` → `"vi"`, Calendar repeat units (`freqName`), the yearly-repeat date format
(`MMM D` → `D/M`), Vietnamese word order in a few templates (monthly ordinal, "the selected …", Wi-Fi hint), and
VClaw texts that are English in the original build (OAuth login dialog, environment check, scheduled-task notices), and
one wrong string in VClaw's own vi_VN locale (`feedbackUploadLog` "Đang tải lên nhật ký" → "Tải lên nhật ký").

## 7. Workflows

### 7.1 A new PC Suite version

1. Run `1. English.cmd`. The originals are backed up to `backup_original_<new version>\` and the master is applied by
   context. Read `translate_log.txt`: `N changes applied, M not found`, `left untranslated: <file> (…)`.
2. If `M` is small and nothing was reverted, the master is fine. Otherwise repair it (§7.3): search the English build for
   remaining Chinese UI literals, write edits, regenerate.
3. Re-check every "forced zh_CN" spot (§5) — new code may add more.
4. Compare `locales-zh_CN.js` with `locales-en_US.js`: vivo sometimes ships English values empty (7.0.6: 36 `record.*`
   keys); fill them in the master.
5. Regenerate every language: `make-lang.js <locale> --extract-only` → translate the new `""` entries (§7.5) →
   `make-lang.js <locale>`.
6. Verify (§8).

### 7.2 A new VClaw version

The script backs up the new original automatically. Bundle names change with every release, so:
1. Build the English archive from the new original and re-apply the master edits by context
   (`patcher.js` reports `missingFiles` for renamed bundles).
2. Re-create the edits for renamed files with `edit-master.js VClaw_app.asar <edits.json>` (the find strings rarely
   change; only the file names do).
3. `make-lang.js <locale>` for every language; check that the `i18next-bundle` locale entry still finds its anchor.

### 7.3 Editing the English master

Write the edits as JSON and let the tool apply, check and regenerate:

```json
[
  { "file": "dist/electron/main.js", "find": "showSaveDialog({title:\"文件另存为\"", "replace": "showSaveDialog({title:\"Save as\"", "count": 1 },
  { "file": "dist/electron/8.js", "find": { "regex": "message:\"插入表格数量不能超过\"\\.concat\\(([^)]+\\)),\"个\"\\)" }, "replace": "message:\"You can insert up to \".concat($1,\" tables\")", "count": 2 }
]
```

```powershell
tools\edit-master.js app.asar edits.json --dry-run    # check counts and syntax only
tools\edit-master.js app.asar edits.json              # write build\en_US\app.asar and patches\en_US\app.patch.json
```

`file` may contain `*` (e.g. `dist/electron/static/tinymce/*/plugins/*/plugin.min.js`); `count` is then the total.
Guidelines: include enough context in `find` to be unique, set `count` to the expected number of occurrences, keep
the English natural and short, translate full sentences rather than isolated words, and never touch the categories in §1.
Then regenerate every other language (§7.1 step 5).

### 7.4 Adding a language

1. Check which locales the apps ship: `dist/electron/locales-<xx_YY>.js`, `dist/electron/locales/<xx_YY>/framework.json`,
   TinyMCE `dist/electron/static/tinymce/*/langs/<xx_YY>.js`, vivoControl `dist/assets/lang/v<code>.json`,
   VClaw `resources/locales/<xx_YY>/`. Take region, vRegion and LCID from `langMap` in `renderer.js`.
2. Copy `translations/vi_VN/language.json` to `translations/<xx_YY>/`; adjust `name`, `locale`, `codes`, `configIni`,
   `vivoScreen` (the Phone Mirroring `.qm` code, §5), locale file names; remove vi-specific `sourceReplace` entries
   (write new ones as needed).
3. `make-lang.js <xx_YY> --extract-only` creates `strings.json` with every English string as `""`.
4. Translate (§7.5), then `make-lang.js <xx_YY>`.
5. Add a launcher `N. <Language>.cmd` (copy an existing one; ASCII content; `-Language <xx_YY>`) and a README row.

### 7.5 Translating `strings.json`

- Format `{ "English": "translation" }`. `""` = not yet translated (stays English). A value identical to the key means
  "deliberately unchanged" (code, format pattern, brand). Keys are trimmed; leading/trailing spaces of the literal are
  re-applied automatically. A space the translator puts at an edge of the value wins (word order differs:
  `"'s birthday": " - Sinh nhật"`).
- A key is shared by every place that produces the same English text. Before changing a fragment for one sentence,
  search `build/en_US` for all uses; if two sentences need different translations, reword the English master instead.
- When a literal is compared with a locale value in code (e.g. a failure reason compared with `$t(...)`), translate it
  with exactly the official locale text.
- Keep placeholders and markup exactly: `{0}`, `{name}`, `{{count}}`, `%s`, `%d`, `$t(common:appName)`, HTML tags, `\n`.
  `extract` reports `placeholderMismatches`; it must be 0.
- Many keys are **fragments** joined in code (`"Delete"` + n + `" items"`). Look the code up in `build/en_US` and
  translate so the joined sentence reads naturally; words may move between neighbouring fragments.
- Follow the apps' own terminology. Build a glossary from the official locales (same keys in `locales-en_US.js` and
  `locales-<target>.js`; VClaw `resources/locales`). Vietnamese glossary: Notes = Ghi chú, Recorder = Trình ghi âm,
  Calendar = Lịch, To-do = Việc cần làm, BlueLM Copilot = Trợ lý ảo BlueLM, PC Suite = Bộ công cụ vivo Office,
  Agent = tác tử, Skill = Kỹ năng, Channel = Kênh, Gateway = cổng kết nối, Model = mô hình, AI points = điểm AI,
  Daily / Weekly / Monthly / Yearly = Hằng ngày / Hằng tuần / Hằng tháng / Hằng năm. Vietnamese UI uses sentence case.
- Keep unchanged: date/time patterns, units (`h`, `min`, `s`), brands (vivo, iQOO, BlueLM, WeChat, QQ, DingTalk,
  EasyShare, WeCom), city names, SQL, file names, language codes.
- Large batches: split into chunks of ~450 keys, translate in parallel with the glossary, merge, and run `extract`
  again (0 untranslated, 0 placeholder mismatches).

## 8. Verification checklist

1. `make-lang.js` output: `revertedFiles: []` for every archive (this also catches stale `sourceReplace` entries),
   `untranslated` ≈ 0, patch sizes comparable to the master. Reference for 7.0.6 / VClaw 1.5.7:

   | Archive | English master | Vietnamese |
   |---|---|---|
   | `app.asar` | 118 files, 2,539 hunks | 120 files, 2,560 hunks, 2 added files (`en_US_in.js`, `vi_VN_in.js`) |
   | `vivoControl_app.asar` | 5 files, 11 hunks | 5 files, 11 hunks |
   | `VClaw_app.asar` | 4 files, 70 hunks | 4 files, 89 hunks |

2. `Translate-PCSuite.ps1 -Language <locale> -BuildOnly -NoPause` → `N changes applied, 0 not found` for every archive.
3. Install (one UAC prompt) and check on screen: Home; device page and File manager (date groups such as "Hôm nay",
   "Thg 11 23"); Notes; Calendar (month / week / year views, event and to-do dialogs, repeat list); Album; Recorder;
   Settings (all tabs); BlueLM Copilot; Tools; Remote PC; Phone Mirroring (title bar, settings menu; log line
   `load translation :/translations/win/<code>.qm result:true`); VClaw (chat, Skills, Tasks, Files, Settings, credits panel).
   For a visual regression check, repeat the 32 screens in `img/<locale>/` (same window size, same steps, original
   Chinese first) and compare them side by side; the README gallery is built from these files. Pixelate personal data
   (Remote PC device code, account e-mail, PC name, user paths) before committing pictures.
4. Mixed languages on one screen usually mean a language code was not switched (search the built JS for `"en_US"` near
   `getItem("currentLanguage")` or `new …({locale:`) or a locale chunk did not load.
5. Logs: `%APPDATA%\pcsuite\log\framework_log\render\render-<date>.log` (`set currentLanguage:<locale>`).
   `%APPDATA%\pcsuite\config.ini` may be rewritten by the app; the patch does not depend on it.

## 9. Known limitations and intentional Chinese

- Content from vivo servers (AI answers, notices, the vivo account page, BlueLM suggestions not in the built-in fallback
  list) and the account nickname placeholder stay Chinese. Folder names created by the phone stay as the phone names them.
- Phone Mirroring uses vivo's built-in translation for the language (§5) and English when the exe has none. Pictures
  with embedded Chinese text are unchanged.
- Chinese literals kept on purpose (audit of 7.0.6 / VClaw 1.5.7): log and telemetry text; lunar-calendar tables
  (天干地支, 农历 month/day names) and lunar dates such as `(十月初五)`; other languages' locale data (moment, dayjs,
  Element UI, antd, TinyMCE, zh/ja/ko locales); language names in pickers; album folder → app-name maps
  (`itemName:"/DCIM/..."`); mock/test data; debug pages; macOS-only dialogs; AI prompts and AI template lists
  (Notes AI panel `vnoteaipanel`, VClaw skills/security review); the Recorder default speaker name `说话人N` (matched
  against server text by a RegExp); VClaw's `AI 生成` content label; compare keys such as `"“屏幕扩展”和“键鼠协同”"===e`.
- The Calendar date field joins day, month, year and weekday in separate inputs (`24/11/ 2026T3`); its spacing comes
  from the component layout, not from translatable text.
- Not translated on purpose (audit 2026-11): Claw API / IPC result codes that only VClaw's agent reads, the H5-only
  pickers, Element UI zh-TW/ja/ko locale objects, unreachable connection pages (`QRCODE_SUCCESS`, `TEST_MODE`, …),
  the vivoControl legacy sidebar, and `desc.endsWith("与电脑接入同一 WLAN 网络后重试。")` (compares server text).

## 10. Pitfalls

- **Shell quoting.** Bash heredocs in some agent environments drop backslashes and expand `${…}`. Create scripts with a
  file-writing tool, or keep JSON edit lists in files and run `edit-master.js`.
- **File locks on Windows.** Close an archive (`A.close()`) before renaming or overwriting it.
- **ES modules.** `vm.Script` cannot compile `import`/`export`; use `tools/jscheck.js` (acorn module parse).
- **Minified variable names** change between releases; anchor `find` strings on literals and property names, not on
  single-letter variables, where possible.
- **Running app.** The installer closes `pcsuite`, `vivocontrol`, `vivoScreen`, `pc_toast` and `VClaw` before copying;
  an archive in use cannot be replaced.
