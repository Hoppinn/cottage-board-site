@echo off
setlocal
set "PREVIEW_REMOTE=https://github.com/Hoppinn/cottage-board-site.git"
set "PREVIEW_BRANCH=cloud-preview"
set "PREVIEW_DIR=%LOCALAPPDATA%\CottageBoardPreview\cottage-board-site"

where git >nul 2>nul || (
  echo Git for Windows is required. Install it from https://git-scm.com/download/win
  goto failed
)
where node >nul 2>nul || (
  echo Node.js 20 or newer is required. Install it from https://nodejs.org/
  goto failed
)

if exist "%PREVIEW_DIR%\.git\" goto update
if exist "%PREVIEW_DIR%" (
  echo The preview folder already exists and is not a Git checkout.
  goto failed
)
git clone --depth 1 --single-branch --branch "%PREVIEW_BRANCH%" "%PREVIEW_REMOTE%" "%PREVIEW_DIR%" || goto failed
goto launch

:update
for /f "delims=" %%R in ('git -C "%PREVIEW_DIR%" remote get-url origin') do set "PREVIEW_ORIGIN=%%R"
for /f "delims=" %%B in ('git -C "%PREVIEW_DIR%" branch --show-current') do set "PREVIEW_CURRENT_BRANCH=%%B"
if /i not "%PREVIEW_ORIGIN%"=="%PREVIEW_REMOTE%" goto unexpected
if not "%PREVIEW_CURRENT_BRANCH%"=="%PREVIEW_BRANCH%" goto unexpected
for /f "delims=" %%L in ('git -C "%PREVIEW_DIR%" status --porcelain') do (
  echo The preview checkout contains local changes. Sync was stopped.
  goto failed
)
git -C "%PREVIEW_DIR%" pull --ff-only origin "%PREVIEW_BRANCH%" || goto failed
for /f "delims=" %%H in ('git -C "%PREVIEW_DIR%" rev-parse HEAD') do set "PREVIEW_HEAD=%%H"
for /f "delims=" %%H in ('git -C "%PREVIEW_DIR%" rev-parse FETCH_HEAD') do set "PREVIEW_FETCHED=%%H"
if not defined PREVIEW_HEAD goto failed
if not "%PREVIEW_HEAD%"=="%PREVIEW_FETCHED%" (
  echo The preview checkout has local commits. Sync was stopped.
  goto failed
)

:launch
git -C "%PREVIEW_DIR%" log -1 --format="Testing %%h %%s"
call "%PREVIEW_DIR%\local-server.cmd"
exit /b %errorlevel%

:unexpected
echo The preview checkout has a different repository or branch.

:failed
echo Preview folder: "%PREVIEW_DIR%"
pause
exit /b 1
