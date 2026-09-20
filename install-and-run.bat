@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo        LUDO FRIENDS ONLINE - SETUP
echo ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Please install Node.js 18 or newer from https://nodejs.org/
  pause
  exit /b 1
)
echo Installing required files...
npm install
if errorlevel 1 (
  echo.
  echo Installation failed. Check your internet connection.
  pause
  exit /b 1
)
echo.
echo Starting Ludo server...
echo Keep this window open while playing.
echo Open http://localhost:3000 in your browser.
echo.
start "" http://localhost:3000
npm start
pause
