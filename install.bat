@echo off
setlocal enabledelayedexpansion

:: ═══════════════════════════════════════════════════════════════
:: SMS - Security Management System
:: One-Click Installation für Windows
:: ═══════════════════════════════════════════════════════════════

title SMS Installation - Security Management System
color 0B

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║   SMS - Security Management System                        ║
echo ║   One-Click Installation für Windows                      ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Prüfen ob Docker installiert ist
echo [1/6] Prüfe Docker Installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ FEHLER: Docker ist nicht installiert!
    echo.
    echo Bitte installiere Docker Desktop zuerst:
    echo https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe
    echo.
    echo Oder besuche: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)
echo ✅ Docker ist installiert
docker --version
echo.

:: Prüfen ob Docker läuft
echo [2/6] Prüfe ob Docker läuft...
docker ps >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ FEHLER: Docker läuft nicht!
    echo.
    echo Bitte starte Docker Desktop:
    echo 1. Öffne Docker Desktop aus dem Startmenü
    echo 2. Warte bis Docker vollständig gestartet ist
    echo 3. Starte dieses Script erneut
    echo.
    pause
    exit /b 1
)
echo ✅ Docker läuft
echo.

:: Prüfen ob Git installiert ist
echo [3/6] Prüfe Git Installation...
git --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ FEHLER: Git ist nicht installiert!
    echo.
    echo Bitte installiere Git zuerst:
    echo https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe
    echo.
    echo Oder besuche: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)
echo ✅ Git ist installiert
git --version
echo.

:: Repository klonen falls nötig
echo [4/6] Prüfe Repository...
if not exist "Protektor" (
    echo 📥 Klone Repository...
    git clone https://github.com/Charrak/Protektor.git
    if errorlevel 1 (
        echo.
        echo ❌ FEHLER: Repository konnte nicht geklont werden!
        echo.
        pause
        exit /b 1
    )
    echo ✅ Repository geklont
) else (
    echo ✅ Repository existiert bereits
    cd Protektor
)
cd Protektor
echo.

:: Docker Compose starten
echo [5/6] Starte Docker Container...
echo ⚠️  Dies kann beim ersten Mal 2-5 Minuten dauern...
echo.
docker-compose up -d
if errorlevel 1 (
    echo.
    echo ❌ FEHLER: Docker Container konnten nicht gestartet werden!
    echo.
    docker-compose logs
    echo.
    pause
    exit /b 1
)
echo ✅ Docker Container gestartet
echo.

:: Warten bis Services ready sind
echo ⏳ Warte bis alle Services bereit sind...
timeout /t 30 /nobreak >nul
echo ✅ Services sollten jetzt bereit sein
echo.

:: Database Migration
echo [6/6] Initialisiere Datenbank...
docker-compose exec -T backend npx prisma migrate deploy
if errorlevel 1 (
    echo.
    echo ⚠️  WARNUNG: Database Migration fehlgeschlagen
    echo    (Möglicherweise läuft der Container noch nicht)
    echo.
) else (
    echo ✅ Datenbank initialisiert
)
echo.

:: Demo-Daten einspielen
echo 🎭 Spiele Demo-Daten ein...
docker-compose exec -T backend npm run seed:demo
if errorlevel 1 (
    echo.
    echo ⚠️  WARNUNG: Demo-Daten konnten nicht eingespielt werden
    echo.
) else (
    echo ✅ Demo-Daten eingespielt
)
echo.

:: Erfolgsmeldung
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║   ✅ INSTALLATION ERFOLGREICH!                             ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo ══════════════════════════════════════════════════════════════
echo ZUGANGSDATEN
echo ══════════════════════════════════════════════════════════════
echo.
echo 📊 PLATFORM ADMIN (Software-Betreiber):
echo    URL: http://localhost:5173/platform
echo    Email: admin@sms-platform.com
echo    Password: Admin123!
echo.
echo 🏢 TENANT 1: Security Nord GmbH (Premium)
echo    URL: http://localhost:5173
echo    License Key: lic_security-nord_premium
echo    Email: admin@security-nord.de
echo    Password: Password123!
echo.
echo 🏢 TENANT 2: Schutz & Dienstleistungen AG (Enterprise)
echo    URL: http://localhost:5173
echo    License Key: lic_schutz-ag_enterprise
echo    Email: info@schutz-ag.de
echo    Password: Password123!
echo.
echo 🏢 TENANT 3: Secure Solutions UG (Test)
echo    URL: http://localhost:5173
echo    License Key: lic_secure-solutions_test
echo    Email: kontakt@secure-solutions.de
echo    Password: Password123!
echo.
echo 📚 API DOKUMENTATION:
echo    URL: http://localhost:5000/api-docs
echo.
echo ══════════════════════════════════════════════════════════════
echo.
echo 🌐 Öffne Browser mit Frontend?
echo.
choice /C YN /M "Browser öffnen (J/N)"
if errorlevel 2 goto :end
start http://localhost:5173

:end
echo.
echo ══════════════════════════════════════════════════════════════
echo WICHTIGE BEFEHLE
echo ══════════════════════════════════════════════════════════════
echo.
echo SMS stoppen:     docker-compose down
echo SMS starten:     docker-compose up -d
echo Logs anzeigen:   docker-compose logs -f
echo Status prüfen:   docker-compose ps
echo.
echo Bei Problemen: DOCKER-INSTALL-GUIDE.md lesen
echo.
pause
