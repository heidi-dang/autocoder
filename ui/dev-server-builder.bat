# Builder.io Development Server
# Windows batch file for launching dev server with Builder.io integration

@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo 🚀 Starting Builder.io Development Server...
echo.

REM Check if .env.local exists
if not exist ".env.local" (
    echo ⚠️  .env.local not found. Creating template...
    (
        echo # Builder.io Configuration
        echo # Get your API key from https://builder.io/account/settings
        echo VITE_BUILDER_API_KEY=your_api_key_here
    ) > .env.local
    echo ✅ Created .env.local
    echo 📝 Please edit .env.local and add your Builder.io API key
    echo.
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo 📦 Node version: %NODE_VERSION%
echo 📦 npm version: %NPM_VERSION%
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📥 Installing dependencies...
    call npm install --legacy-peer-deps
    echo.
)

REM Start dev server
echo 🔥 Vite dev server starting on http://localhost:5173
echo.
echo 💡 Tips:
echo    - Builder.io Edit Mode: http://localhost:5173?builder.edit=true
echo    - API Key from: https://builder.io/account/settings
echo    - Docs: https://www.builder.io/docs/react
echo.

call npm run dev

pause
