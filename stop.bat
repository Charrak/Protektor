@echo off
:: SMS Stoppen - Windows

title SMS - Stoppen
color 0C

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   SMS - Security Management System - Stoppen              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd Protektor 2>nul
if errorlevel 1 (
    echo ❌ Protektor Verzeichnis nicht gefunden!
    pause
    exit /b 1
)

echo ⏹️  Stoppe SMS...
docker-compose down

echo.
echo ✅ SMS wurde gestoppt
echo.
echo Zum erneuten Starten: start.bat ausführen
echo.
pause
