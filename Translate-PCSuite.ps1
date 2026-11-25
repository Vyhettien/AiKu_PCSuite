<#
  AiKu_PCSuite - translate vivo PC Suite (Chinese-ROM version), one click.

  What it does:
    1. Finds PC Suite, closes it (and Remote PC, Phone Mirroring, VClaw).
    2. Backs up the ORIGINAL files once per PC Suite version (backup_original_<version>\);
       VClaw updates on its own, so its archive is backed up whenever the installed copy is an original.
    3. Builds the translated files from those originals with patches\<language>\*.patch.json.
    4. Installs them, sets config.ini, restarts PC Suite.
  Maintainer guide: AGENTS.md

  Usage (double-click the .cmd files, or run in PowerShell):
    .\Translate-PCSuite.ps1                        English (default)
    .\Translate-PCSuite.ps1 -Language vi_VN        Vietnamese (any folder name under patches\)
    .\Translate-PCSuite.ps1 -Restore               put the original Chinese files back
    .\Translate-PCSuite.ps1 -BuildOnly             only build into build\<language>\ (no install, no admin)
    .\Translate-PCSuite.ps1 -InstallDir "D:\Programs\pcsuite"   if PC Suite is installed somewhere else
  Keep this file ASCII-only (Windows PowerShell 5.1 reads it with the ANSI code page).
#>
[CmdletBinding()]
param(
  [string]$Language = "en_US",
  [string]$InstallDir = "",
  [switch]$Restore,
  [switch]$BuildOnly,
  [string]$UserAppData = $env:APPDATA,
  [switch]$NoPause
)
$ErrorActionPreference = 'Stop'
$Root  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Log   = Join-Path $Root 'translate_log.txt'

function Write-Step($msg) { $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg; Write-Host $line; Add-Content -Path $Log -Value $line -Encoding UTF8 }
function Stop-Script($msg) { Write-Step "ERROR: $msg"; if (-not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }; exit 1 }

# ---------- language ----------
$PatchDir = Join-Path $Root "patches\$Language"
$MetaFile = Join-Path $PatchDir 'language.json'
if (-not $Restore) {
  if (-not (Test-Path $MetaFile)) {
    $avail = (Get-ChildItem (Join-Path $Root 'patches') -Directory | ForEach-Object { $_.Name }) -join ', '
    Stop-Script "Unknown language '$Language'. Available: $avail"
  }
  $Meta = [IO.File]::ReadAllText($MetaFile, [Text.Encoding]::UTF8) | ConvertFrom-Json
}

# ---------- locate PC Suite ----------
function Find-PCSuite {
  if ($InstallDir -and (Test-Path (Join-Path $InstallDir 'pcsuite.exe'))) { return (Resolve-Path $InstallDir).Path }
  $keys = 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*','HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
  foreach ($k in $keys) {
    foreach ($e in (Get-ItemProperty $k -ErrorAction SilentlyContinue)) {
      $loc = $e.InstallLocation
      if (-not $loc -and $e.UninstallString) { $loc = Split-Path -Parent ($e.UninstallString -replace '"','') }
      if ($loc -and (Test-Path (Join-Path $loc 'pcsuite.exe'))) { return $loc.TrimEnd('\') }
    }
  }
  foreach ($d in @("${env:ProgramFiles(x86)}\pcsuite", "$env:ProgramFiles\pcsuite", "${env:ProgramFiles(x86)}\vivo\pcsuite", "$env:ProgramFiles\vivo\pcsuite")) {
    if (Test-Path (Join-Path $d 'pcsuite.exe')) { return $d }
  }
  return $null
}
$App = Find-PCSuite
if (-not $App) { Stop-Script 'PC Suite (pcsuite.exe) not found. Run again with -InstallDir "<folder that contains pcsuite.exe>".' }

# ---------- elevate when we need to write into Program Files ----------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $BuildOnly -and -not $isAdmin) {
  Write-Host 'Asking for administrator rights (needed to write into the PC Suite folder)...'
  $argList = @('-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$($MyInvocation.MyCommand.Path)`"",'-Language',$Language,'-InstallDir',"`"$App`"",'-UserAppData',"`"$UserAppData`"")
  if ($Restore) { $argList += '-Restore' }
  if ($NoPause) { $argList += '-NoPause' }
  try { Start-Process powershell.exe -Verb RunAs -ArgumentList $argList -Wait } catch { Stop-Script 'Administrator permission was not granted.' }
  exit 0
}

$Node    = Join-Path $App 'pcsuite.exe'
$Version = (Get-Item $Node).VersionInfo.FileVersion
$Backup  = Join-Path $Root "backup_original_$Version"
$Build   = Join-Path $Root "build\$Language"
$Files   = @(
  @{ name = 'app.asar';             path = Join-Path $App 'resources\app.asar';             patch = Join-Path $PatchDir 'app.patch.json' },
  @{ name = 'vivoControl_app.asar'; path = Join-Path $App 'vivoControl\resources\app.asar'; patch = Join-Path $PatchDir 'vivoControl.patch.json' },
  @{ name = 'vivoScreen.exe';       path = Join-Path $App 'vivoScreen\vivoScreen.exe';      patch = $null },
  @{ name = 'VClaw_app.asar';       path = Join-Path $App 'VClaw\resources\app.asar';       patch = Join-Path $PatchDir 'vclaw.patch.json'; check = 'vclaw' }
)
$Config = Join-Path $UserAppData 'pcsuite\config.ini'
Write-Step "PC Suite $Version found in $App"

function Invoke-Node([string[]]$a) {
  # runs PC Suite's own Electron as Node.js (no separate Node install needed)
  $ErrorActionPreference = 'Continue'
  $env:ELECTRON_RUN_AS_NODE = '1'
  $o = & $Node @a 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE
  Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  return @{ out = ($o -join "`n"); code = $code }
}
function Close-PCSuite {
  foreach ($n in 'pcsuite','vivocontrol','vivoScreen','pc_toast','VClaw') { Get-Process -Name $n -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 3
}
function Start-PCSuite { try { Start-Process explorer.exe "`"$Node`"" } catch { Start-Process $Node } }   # via Explorer = not elevated
function Set-ConfigLanguage([string]$id, [string]$tag) {
  if (-not (Test-Path $Config)) { Write-Step "config.ini not found ($Config) - skipped"; return }
  $t = [IO.File]::ReadAllText($Config)
  $t = $t -replace 'LanguageID=\d+', "LanguageID=$id" -replace 'LanguageTag=\S+', "LanguageTag=$tag"
  [IO.File]::WriteAllText($Config, $t, (New-Object Text.UTF8Encoding($false)))
  Write-Step "config.ini set to $id / $tag"
}

# ---------- restore ----------
if ($Restore) {
  if (-not (Test-Path $Backup)) { Stop-Script "No backup for version $Version in $Backup" }
  Close-PCSuite
  foreach ($f in $Files) { $b = Join-Path $Backup $f.name; if (Test-Path $b) { Copy-Item $b $f.path -Force; Write-Step "restored $($f.name)" } }
  if (Test-Path (Join-Path $Backup 'config.ini')) { Copy-Item (Join-Path $Backup 'config.ini') $Config -Force; Write-Step 'restored config.ini' }
  Start-PCSuite
  Write-Step 'DONE - original Chinese PC Suite restored.'
  if (-not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
  exit 0
}
Write-Step "Language: $($Meta.locale)"

# ---------- back up originals (once per version, never back up already-translated files) ----------
if (-not (Test-Path (Join-Path $Backup 'app.asar'))) {
  $state = (Invoke-Node @((Join-Path $Root 'tools\check.js'), $Files[0].path)).out.Trim()
  if ($state -eq 'translated') { Stop-Script "The installed files are already translated but there is no original backup for $Version. Reinstall PC Suite, then run this again." }
  New-Item -ItemType Directory -Force $Backup | Out-Null
  foreach ($f in $Files) { if ((Test-Path $f.path) -and -not $f.check) { Copy-Item $f.path (Join-Path $Backup $f.name) -Force } }
  if (Test-Path $Config) { Copy-Item $Config (Join-Path $Backup 'config.ini') -Force }
  Write-Step "originals backed up to $Backup"
}
# VClaw updates on its own (not with PC Suite): back it up whenever the installed copy is an original
foreach ($f in ($Files | Where-Object { $_.check })) {
  if (-not (Test-Path $f.path)) { continue }
  $state = (Invoke-Node @((Join-Path $Root 'tools\check.js'), $f.path, $f.check)).out.Trim()
  $b = Join-Path $Backup $f.name
  if ($state -eq 'original') {
    if (-not (Test-Path $b) -or (Get-FileHash $b).Hash -ne (Get-FileHash $f.path).Hash) { Copy-Item $f.path $b -Force; Write-Step "original $($f.name) backed up" }
  } elseif (-not (Test-Path $b)) { Write-Step "$($f.name) is already modified and has no original backup - skipped" }
}

# ---------- build translated files from the originals ----------
New-Item -ItemType Directory -Force $Build | Out-Null
foreach ($f in $Files) {
  $src = Join-Path $Backup $f.name; $dst = Join-Path $Build $f.name
  if (-not (Test-Path $src)) { Write-Step "skip $($f.name) (not installed)"; continue }
  if ($f.patch) {
    if (-not (Test-Path $f.patch)) { Write-Step "skip $($f.name) (no patch for $Language)"; Copy-Item $src $dst -Force; continue }
    $r = Invoke-Node @((Join-Path $Root 'tools\patcher.js'), $src, $f.patch, $dst)
    if ($r.code -ne 0) { Stop-Script "building $($f.name) failed: $($r.out)" }
    $rep = $r.out | ConvertFrom-Json
    Write-Step ("built {0}: {1} changes applied, {2} not found{3}" -f $f.name, $rep.applied, $rep.skipped, $(if ($rep.revertedFiles.Count) { ", left untranslated: " + ($rep.revertedFiles -join '; ') } else { '' }))
    if ($rep.fuzzyFiles -gt 0) { Write-Step "  note: this PC Suite version differs from the one the patch was made for, so changes were matched by surrounding text" }
  } else {
    # Phone Mirroring window (Qt): its LanguageManager loads :/translations/win/<code>.qm, compiled into the exe for
    # about 60 languages. The Chinese build always uses its default "zh-CN" (followed by the fallback "en-US"); replace
    # that default with language.json -> vivoScreen (same length, e.g. en-US, vi-VN). A code without a built-in .qm
    # falls back to en-US here; the app itself also falls back to en-US if a translation cannot be loaded.
    $b = [IO.File]::ReadAllBytes($src)
    $code = [string]$Meta.vivoScreen
    if ($code -notmatch '^[a-z]{2}-[A-Z]{2}$') { $code = 'en-US' }
    $qm = [Text.Encoding]::BigEndianUnicode.GetBytes("$code.qm")   # Qt resource names are UTF-16BE
    $hasQm = $false; for ($i = 0; $i -le $b.Length - $qm.Length; $i++) { if ($b[$i] -ne $qm[0] -or $b[$i+1] -ne $qm[1]) { continue }; $ok = $true; for ($j = 2; $j -lt $qm.Length; $j++) { if ($b[$i+$j] -ne $qm[$j]) { $ok = $false; break } }; if ($ok) { $hasQm = $true; break } }
    if (-not $hasQm) { Write-Step "vivoScreen.exe has no built-in $code translation - using en-US"; $code = 'en-US' }
    $pat = [Text.Encoding]::ASCII.GetBytes('zh-CN') + [byte[]](0,0,0) + [Text.Encoding]::ASCII.GetBytes('en-US')
    $hits = @(); for ($i = 0; $i -le $b.Length - $pat.Length; $i++) { if ($b[$i] -ne 0x7A) { continue }; $ok = $true; for ($j = 1; $j -lt $pat.Length; $j++) { if ($b[$i+$j] -ne $pat[$j]) { $ok = $false; break } }; if ($ok) { $hits += $i } }
    if ($hits.Count -eq 1) { $cb = [Text.Encoding]::ASCII.GetBytes($code); for ($j = 0; $j -lt 5; $j++) { $b[$hits[0]+$j] = $cb[$j] }; [IO.File]::WriteAllBytes($dst, $b); Write-Step "built vivoScreen.exe (Phone Mirroring set to $code)" }
    else { Write-Step "vivoScreen.exe: language default not found ($($hits.Count) matches) - left unchanged"; Copy-Item $src $dst -Force }
  }
}
if ($BuildOnly) { Write-Step "DONE - translated files are in $Build (not installed)."; if (-not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }; exit 0 }

# ---------- install ----------
Close-PCSuite
foreach ($f in $Files) {
  $dst = Join-Path $Build $f.name
  if (-not (Test-Path $dst)) { continue }
  Copy-Item $dst $f.path -Force
  if ((Get-FileHash $dst).Hash -ne (Get-FileHash $f.path).Hash) { Stop-Script "copy check failed for $($f.name)" }
  Write-Step "installed $($f.name)"
}
Set-ConfigLanguage $Meta.configIni.LanguageID $Meta.configIni.LanguageTag
Start-PCSuite
Write-Step "DONE - PC Suite is now in $($Meta.locale). (If it does not open, end all pcsuite.exe in Task Manager and start it again.)"
if (-not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
