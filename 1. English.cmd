@echo off
rem Double-click: translate PC Suite to English (run again after every vivo update).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Translate-PCSuite.ps1" -Language en_US
