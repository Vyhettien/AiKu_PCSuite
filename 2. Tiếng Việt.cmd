@echo off
rem Nhap dup: dich PC Suite sang tieng Viet (chay lai sau moi lan vivo cap nhat).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Translate-PCSuite.ps1" -Language vi_VN
