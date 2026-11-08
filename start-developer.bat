@echo off
:: SMS Schnellstart - Windows
:: Startet das SMS ohne Neuinstallation

title SMS - Schnellstart
color 0B

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   SMS - Security Management System - Schnellstart         ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Prüfen ob Docker läuft
docker ps >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker läuft nicht! Bitte starte Docker Desktop zuerst.
    pause
    exit /b 1
)

:: In Protektor Verzeichnis wechseln
cd Protektor 2>nul
if errorlevel 1 (
    echo ❌ Protektor Verzeichnis nicht gefunden!
    echo    Bitte erst install.bat ausführen.
    pause
    exit /b 1
)

:: Container starten
echo 🚀 Starte SMS...
docker-compose up -d

:: Warten
echo ⏳ Warte bis Services bereit sind...
timeout /t 10 /nobreak >nul

:: Erfolg
echo.
echo ✅ SMS ist gestartet!
echo.
echo 🌐 Frontend: http://localhost:5173
echo 🔧 Platform: http://localhost:5173/platform
echo 📚 API Docs: http://localhost:5000/api-docs
echo.

:: Browser öffnen
choice /C YN /M "Browser öffnen (J/N)"
if errorlevel 2 goto :end
start http://localhost:5173

:end
echo.
echo Zum Stoppen: docker-compose down
echo.
pause
