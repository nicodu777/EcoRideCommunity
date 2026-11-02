@echo off
rem ==================================================================
rem  EcoRide - mode REEL : vrai Firebase (cles dans .env), base locale.
rem  Internet necessaire. Pour la demo sans Internet : DEMARRER-ECORIDE.bat
rem ==================================================================
chcp 65001 >nul
title EcoRide - mode reel
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est introuvable. Installez-le depuis https://nodejs.org puis relancez.
  pause
  exit /b 1
)

node scripts\demo\start.mjs --reel
echo.
pause
