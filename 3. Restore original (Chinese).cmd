@echo off
rem Double-click: put the original (Chinese) PC Suite files back.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Translate-PCSuite.ps1" -Restore
