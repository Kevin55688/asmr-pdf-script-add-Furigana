@echo off
chcp 65001 >nul
start "PDF Furigana Tool" powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start_all.ps1"
