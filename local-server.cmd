@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
node "%~dp0local-server.js" --open %*
if errorlevel 1 pause
