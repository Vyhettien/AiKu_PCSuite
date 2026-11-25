# AiKu_PCSuite

English and Vietnamese translation patches for the Chinese-ROM version of **vivo PC Suite (vivo办公套件)**.

[Đọc bản tiếng Việt (README.vi.md)](README.vi.md)

If you use a vivo or iQOO phone on the Chinese ROM, you have to use the Chinese build of vivo PC Suite, which is locked to Simplified Chinese. Simply switching the app's export flag breaks pairing with Chinese phones, so this repo patches the UI text and hardcoded `zh_CN` checks into **English** or **Vietnamese** while leaving the Chinese-ROM connection logic untouched.

Everything runs on PC Suite's own bundled Electron runtime, so you don't need to install Node.js or Python. Before touching anything, the script backs up your original files once per version (so restoring Chinese is one click), and patches match by surrounding context rather than fixed offsets so they survive most vivo updates.

Tested on Windows 11 with **PC Suite 7.0.6** and **VClaw 1.5.7**.

## What gets translated

| Component | English | Vietnamese |
|---|:---:|:---:|
| PC Suite (Home, Device, File Manager, Notes, Calendar, Album, Recorder, Settings, Sync, Tools, BlueLM Copilot) | Yes | Yes |
| Remote PC window | Yes | Yes |
| Phone Mirroring | Yes | Yes¹ |
| VClaw AI assistant (Chat, Skills, Tasks, Files, Settings, Credits) | Yes | Yes |

¹ Phone Mirroring already includes vivo's official Vietnamese `.qm` translation inside the Chinese build, but the app hardcodes `zh-CN` at startup. This patch switches that default to `vi-VN` (or `en-US`).

## Quick start

You'll need Windows 10 or 11, the Chinese-ROM vivo PC Suite installed (by default at `C:\Program Files (x86)\pcsuite`; other folders are auto-detected or can be passed with `-InstallDir`), and Administrator permission when prompted to overwrite files in `Program Files`.

1. Download this repo (**Code -> Download ZIP**) and extract it, or `git clone` it.
2. Double-click the launcher you want:

   | File | What it does |
   |---|---|
   | `1. English.cmd` | Switches PC Suite, Remote PC, Phone Mirroring, and VClaw to English |
   | `2. Tiếng Việt.cmd` | Switches everything to Vietnamese |
   | `3. Restore original (Chinese).cmd` | Puts your backed-up Chinese files back |

3. Accept the UAC prompt. Running PC Suite and VClaw processes will close, get patched, and restart automatically.

If a vivo update resets the interface back to Chinese, just double-click the same `.cmd` file again. Backups are kept per version in `backup_original_<version>\`, and translations are always built from those clean originals.

## Screenshots (original Chinese vs. English)

All screenshots below were taken on the same PC Suite 7.0.6 / VClaw 1.5.7 install with no phone connected. Sensitive info (Remote PC device code, account email, PC name, local paths, and a chat title) is blurred out. Click any image to view it full size; every screenshot is stored under [`img/`](img), and the Vietnamese gallery is in [README.vi.md](README.vi.md).

<p align="center">
  <img src="img/zh_CN/01-home.png" width="49%" alt="Original (Chinese)">
  <img src="img/en_US/01-home.png" width="49%" alt="English">
  <br><sub>Home screen: original Chinese vs. English</sub>
</p>

<details open>
<summary><b>Home, Notes, Album, Recorder</b> (7)</summary>

| Screen | Original (Chinese) | English |
|---|---|---|
| Home | <a href="img/zh_CN/01-home.png"><img src="img/zh_CN/01-home.png" width="400"></a> | <a href="img/en_US/01-home.png"><img src="img/en_US/01-home.png" width="400"></a> |
| Notes | <a href="img/zh_CN/02-notes.png"><img src="img/zh_CN/02-notes.png" width="400"></a> | <a href="img/en_US/02-notes.png"><img src="img/en_US/02-notes.png" width="400"></a> |
| Notes (more menu) | <a href="img/zh_CN/03-notes-menu.png"><img src="img/zh_CN/03-notes-menu.png" width="400"></a> | <a href="img/en_US/03-notes-menu.png"><img src="img/en_US/03-notes-menu.png" width="400"></a> |
| Album | <a href="img/zh_CN/11-album.png"><img src="img/zh_CN/11-album.png" width="400"></a> | <a href="img/en_US/11-album.png"><img src="img/en_US/11-album.png" width="400"></a> |
| Recorder | <a href="img/zh_CN/12-recorder.png"><img src="img/zh_CN/12-recorder.png" width="400"></a> | <a href="img/en_US/12-recorder.png"><img src="img/en_US/12-recorder.png" width="400"></a> |
| Tools menu | <a href="img/zh_CN/13-tools-menu.png"><img src="img/zh_CN/13-tools-menu.png" width="400"></a> | <a href="img/en_US/13-tools-menu.png"><img src="img/en_US/13-tools-menu.png" width="400"></a> |
| Transfer history | <a href="img/zh_CN/23-transfer-history.png"><img src="img/zh_CN/23-transfer-history.png" width="400"></a> | <a href="img/en_US/23-transfer-history.png"><img src="img/en_US/23-transfer-history.png" width="400"></a> |

</details>

<details>
<summary><b>Calendar and To-do</b> (7)</summary>

| Screen | Original (Chinese) | English |
|---|---|---|
| Calendar (month) | <a href="img/zh_CN/04-calendar-month.png"><img src="img/zh_CN/04-calendar-month.png" width="400"></a> | <a href="img/en_US/04-calendar-month.png"><img src="img/en_US/04-calendar-month.png" width="400"></a> |
| Calendar (week) | <a href="img/zh_CN/05-calendar-week.png"><img src="img/zh_CN/05-calendar-week.png" width="400"></a> | <a href="img/en_US/05-calendar-week.png"><img src="img/en_US/05-calendar-week.png" width="400"></a> |
| Calendar (year) | <a href="img/zh_CN/06-calendar-year.png"><img src="img/zh_CN/06-calendar-year.png" width="400"></a> | <a href="img/en_US/06-calendar-year.png"><img src="img/en_US/06-calendar-year.png" width="400"></a> |
| New event | <a href="img/zh_CN/07-calendar-new-event.png"><img src="img/zh_CN/07-calendar-new-event.png" width="400"></a> | <a href="img/en_US/07-calendar-new-event.png"><img src="img/en_US/07-calendar-new-event.png" width="400"></a> |
| Repeat options | <a href="img/zh_CN/08-calendar-repeat.png"><img src="img/zh_CN/08-calendar-repeat.png" width="400"></a> | <a href="img/en_US/08-calendar-repeat.png"><img src="img/en_US/08-calendar-repeat.png" width="400"></a> |
| New to-do | <a href="img/zh_CN/09-calendar-new-todo.png"><img src="img/zh_CN/09-calendar-new-todo.png" width="400"></a> | <a href="img/en_US/09-calendar-new-todo.png"><img src="img/en_US/09-calendar-new-todo.png" width="400"></a> |
| To-do list | <a href="img/zh_CN/10-todo.png"><img src="img/zh_CN/10-todo.png" width="400"></a> | <a href="img/en_US/10-todo.png"><img src="img/en_US/10-todo.png" width="400"></a> |

</details>

<details>
<summary><b>Settings and connection</b> (9)</summary>

| Screen | Original (Chinese) | English |
|---|---|---|
| Settings: sync | <a href="img/zh_CN/14-settings-sync.png"><img src="img/zh_CN/14-settings-sync.png" width="400"></a> | <a href="img/en_US/14-settings-sync.png"><img src="img/en_US/14-settings-sync.png" width="400"></a> |
| Settings: general | <a href="img/zh_CN/15-settings-general.png"><img src="img/zh_CN/15-settings-general.png" width="400"></a> | <a href="img/en_US/15-settings-general.png"><img src="img/en_US/15-settings-general.png" width="400"></a> |
| Settings: device connection | <a href="img/zh_CN/16-settings-devices.png"><img src="img/zh_CN/16-settings-devices.png" width="400"></a> | <a href="img/en_US/16-settings-devices.png"><img src="img/en_US/16-settings-devices.png" width="400"></a> |
| Settings: Calendar | <a href="img/zh_CN/17-settings-calendar.png"><img src="img/zh_CN/17-settings-calendar.png" width="400"></a> | <a href="img/en_US/17-settings-calendar.png"><img src="img/en_US/17-settings-calendar.png" width="400"></a> |
| Settings: BlueLM Copilot | <a href="img/zh_CN/18-settings-bluelm.png"><img src="img/zh_CN/18-settings-bluelm.png" width="400"></a> | <a href="img/en_US/18-settings-bluelm.png"><img src="img/en_US/18-settings-bluelm.png" width="400"></a> |
| Settings: version | <a href="img/zh_CN/19-settings-about.png"><img src="img/zh_CN/19-settings-about.png" width="400"></a> | <a href="img/en_US/19-settings-about.png"><img src="img/en_US/19-settings-about.png" width="400"></a> |
| Connect device | <a href="img/zh_CN/20-connect-device.png"><img src="img/zh_CN/20-connect-device.png" width="400"></a> | <a href="img/en_US/20-connect-device.png"><img src="img/en_US/20-connect-device.png" width="400"></a> |
| Connect via USB | <a href="img/zh_CN/21-connect-usb.png"><img src="img/zh_CN/21-connect-usb.png" width="400"></a> | <a href="img/en_US/21-connect-usb.png"><img src="img/en_US/21-connect-usb.png" width="400"></a> |
| BlueLM Copilot | <a href="img/zh_CN/22-bluelm.png"><img src="img/zh_CN/22-bluelm.png" width="400"></a> | <a href="img/en_US/22-bluelm.png"><img src="img/en_US/22-bluelm.png" width="400"></a> |

</details>

<details>
<summary><b>Remote PC and VClaw</b> (9)</summary>

| Screen | Original (Chinese) | English |
|---|---|---|
| Remote PC | <a href="img/zh_CN/24-remote-pc.png"><img src="img/zh_CN/24-remote-pc.png" width="400"></a> | <a href="img/en_US/24-remote-pc.png"><img src="img/en_US/24-remote-pc.png" width="400"></a> |
| VClaw: chat | <a href="img/zh_CN/25-vclaw-chat.png"><img src="img/zh_CN/25-vclaw-chat.png" width="400"></a> | <a href="img/en_US/25-vclaw-chat.png"><img src="img/en_US/25-vclaw-chat.png" width="400"></a> |
| VClaw: skills | <a href="img/zh_CN/26-vclaw-skills.png"><img src="img/zh_CN/26-vclaw-skills.png" width="400"></a> | <a href="img/en_US/26-vclaw-skills.png"><img src="img/en_US/26-vclaw-skills.png" width="400"></a> |
| VClaw: scheduled tasks | <a href="img/zh_CN/27-vclaw-tasks.png"><img src="img/zh_CN/27-vclaw-tasks.png" width="400"></a> | <a href="img/en_US/27-vclaw-tasks.png"><img src="img/en_US/27-vclaw-tasks.png" width="400"></a> |
| VClaw: files | <a href="img/zh_CN/28-vclaw-files.png"><img src="img/zh_CN/28-vclaw-files.png" width="400"></a> | <a href="img/en_US/28-vclaw-files.png"><img src="img/en_US/28-vclaw-files.png" width="400"></a> |
| VClaw: settings | <a href="img/zh_CN/29-vclaw-settings.png"><img src="img/zh_CN/29-vclaw-settings.png" width="400"></a> | <a href="img/en_US/29-vclaw-settings.png"><img src="img/en_US/29-vclaw-settings.png" width="400"></a> |
| VClaw: security | <a href="img/zh_CN/30-vclaw-security.png"><img src="img/zh_CN/30-vclaw-security.png" width="400"></a> | <a href="img/en_US/30-vclaw-security.png"><img src="img/en_US/30-vclaw-security.png" width="400"></a> |
| VClaw: remote channels | <a href="img/zh_CN/31-vclaw-channels.png"><img src="img/zh_CN/31-vclaw-channels.png" width="400"></a> | <a href="img/en_US/31-vclaw-channels.png"><img src="img/en_US/31-vclaw-channels.png" width="400"></a> |
| VClaw: AI points | <a href="img/zh_CN/32-vclaw-credits.png"><img src="img/zh_CN/32-vclaw-credits.png" width="400"></a> | <a href="img/en_US/32-vclaw-credits.png"><img src="img/en_US/32-vclaw-credits.png" width="400"></a> |

</details>

A few things stay Chinese on purpose or come straight from vivo's servers: the default nickname placeholder (`未设置昵称`), BlueLM suggestions, AI responses, server notices, the vivo account web page, folders created on your phone, and images with text baked into the artwork. Phone Mirroring and the File Manager aren't in the gallery above because they require a connected phone.

## PowerShell options

If you prefer running the script directly:

```powershell
.\Translate-PCSuite.ps1                            # English (default)
.\Translate-PCSuite.ps1 -Language vi_VN            # any locale folder in patches\
.\Translate-PCSuite.ps1 -Restore                   # restore original Chinese files
.\Translate-PCSuite.ps1 -BuildOnly                 # output to build\<language>\ without installing (no admin needed)
.\Translate-PCSuite.ps1 -InstallDir "D:\pcsuite"   # custom install path
```

Every run writes a log to `translate_log.txt`.

## What stays untouched

To avoid breaking app features or server communication, the patches intentionally leave these alone:

- Anything loaded from vivo's servers (AI replies, announcements, account portal, certain profile fields)
- Phone-side folder names and bitmap images containing Chinese characters
- Internal logic strings: hidden AI prompts, compare keys, telemetry/log strings, and lunar-calendar tables

## Troubleshooting

| Problem | What to do |
|---|---|
| PC Suite doesn't relaunch after patching | Open Task Manager, kill any leftover `pcsuite.exe` processes, and launch it manually. |
| "No backup for version …" during restore | That version wasn't backed up before patching; reinstall PC Suite to get clean originals. |
| "Installed files are already translated but there is no original backup" | Reinstall PC Suite so the original `.asar` files are back, then run the script again. |
| Untranslated Chinese text still shows up | Check `translate_log.txt` for `not found` or `left untranslated`, and open an issue with a screenshot. |

## How it works under the hood

`patches/en_US` is the hand-crafted English master patch that translates Chinese strings inside PC Suite's Electron `.asar` archives and removes hardcoded `zh_CN` fallbacks. Every other language is generated from that English build using a plain string dictionary (`translations/<locale>/strings.json`) via `tools/make-lang.js`.

Each patch hunk saves its byte offset plus 60 characters of surrounding context. If vivo ships an update, unmatched offsets fall back to context matching; anything that can't be matched safely is skipped, and any modified JS file that fails a syntax check is automatically reverted to its original so the app never refuses to boot. `IS_EXPORT` is never altered.

## Contributing & credits

New translations, fixes for newer vivo releases, and bug reports are always welcome. Check **[AGENTS.md](AGENTS.md)** for the full architecture notes, build commands, and verification checklist.

Originally based on [Lordlorio/Vivo-PC-Suite-PC-Companion-Suite-Chinese-Version-English-Translation](https://github.com/Lordlorio/Vivo-PC-Suite-PC-Companion-Suite-Chinese-Version-English-Translation) (PC Suite 7.0.5), updated for 7.0.6 and expanded with Vietnamese and VClaw support.

## License & disclaimer

All scripts, tools, and translation files here are MIT-licensed (see [LICENSE](LICENSE)). vivo PC Suite and VClaw belong to vivo; no proprietary binaries or `.asar` files are included in this repo. This is an unofficial community project not affiliated with vivo, so use it at your own discretion.
