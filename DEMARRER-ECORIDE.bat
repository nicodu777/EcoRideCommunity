@echo off
rem ==================================================================
rem  EcoRide - mode demo local : double-cliquer pour tout demarrer
rem  (base PostgreSQL, authentification de demo, application)
rem ==================================================================
chcp 65001 >nul
title EcoRide - demo locale
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est introuvable. Installez-le depuis https://nodejs.org puis relancez.
  pause
  exit /b 1
)

node scripts\demo\start.mjs
echo.
pause
