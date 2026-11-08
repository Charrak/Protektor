@echo off
:: ============================================
:: SMS - Customer Quick Start (Windows)
:: ============================================

echo.
echo ========================================
echo   SMS - Server starten
echo ========================================
echo.

cd SMS-Server

echo Starte SMS Server...
docker-compose up -d

if %errorlevel% neq 0 (
    echo.
    echo FEHLER: Server konnte nicht gestartet werden.
    echo Bitte pruefen Sie ob Docker laeuft.
    pause
    exit /b 1
)

echo.
echo Warte bis Server bereit ist...
timeout /t 15 /nobreak >nul

echo.
echo ========================================
echo   SMS Server gestartet!
echo ========================================
echo.
echo Zugriff: http://localhost:5173
echo.

set /p openBrowser="Browser oeffnen? (J/N): "
if /i "%openBrowser%"=="J" start http://localhost:5173

echo.
pause
