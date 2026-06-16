@echo off
REM Voxel Editor - Setup & Run Script for Windows
REM Usage: setup.bat

setlocal enabledelayedexpansion

echo.
echo ======================================================
echo          Voxel Editor - Setup ^& Run Script
echo ======================================================
echo.

REM Check if in correct directory
if not exist "package.json" (
    echo Error: package.json not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check for npm
where npm >nul 2>nul
if errorlevel 1 (
    echo Installing npm...
    npm install -g npm
)

REM Check for Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo Error: Node.js is required but not installed.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js %NODE_VERSION% found

REM Option: Clean install
set /p clean_install="Do you want to do a clean install? (clears cache, reinstalls deps) [y/N]: "
if /i "%clean_install%"=="y" (
    echo Cleaning cache and dependencies...
    rmdir /s /q .next node_modules 2>nul
    del package-lock.json 2>nul
    echo Cleaned.
)

REM Install dependencies
echo.
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo Error during npm install
    pause
    exit /b 1
)
echo Dependencies installed.

REM Build (optional)
set /p build_prod="Do you want to build for production first? (takes ~30s) [y/N]: "
if /i "%build_prod%"=="y" (
    echo Building for production...
    call npm run build
    if errorlevel 1 (
        echo Error during build
        pause
        exit /b 1
    )
    echo Production build complete.
)

REM Start dev server
echo.
echo Starting development server...
echo.
echo Ready to go!
echo.
echo Dev server will start on http://localhost:3000
echo.
echo To access the app:
echo   1. Open http://localhost:3000 in your browser
echo   2. Hard refresh: Ctrl+Shift+R
echo   3. Clear cache if still seeing black canvas (see TROUBLESHOOTING.md)
echo.
echo To stop the server: Press Ctrl+C in this window
echo.
echo For help: See README.md or TROUBLESHOOTING.md
echo.
pause

call npm run dev

endlocal
