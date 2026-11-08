@echo off
setlocal EnableDelayedExpansion

:: ============================================
:: SMS - Customer Installation (Windows)
:: Production Build - No Source Code
:: ============================================

echo.
echo ========================================
echo   SMS - Security Management System
echo   Kunden-Installation (Production)
echo ========================================
echo.
echo Diese Installation enthaelt:
echo   - Fertige Docker-Images (kein Source-Code)
echo   - Einfache Konfiguration
echo   - Produktionseinsatz bereit
echo.
echo Voraussetzungen:
echo   - Docker Desktop installiert und gestartet
echo   - Mindestens 4GB RAM frei
echo   - 10GB Festplattenspeicher
echo.
pause

:: Check Docker
echo.
echo [1/6] Pruefe Docker-Installation...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo FEHLER: Docker ist nicht installiert!
    echo.
    echo Bitte installieren Sie Docker Desktop:
    echo https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)
echo   [OK] Docker ist installiert

:: Check Docker running
echo.
echo [2/6] Pruefe ob Docker laeuft...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo FEHLER: Docker Desktop ist nicht gestartet!
    echo.
    echo Bitte starten Sie Docker Desktop und versuchen Sie es erneut.
    echo.
    pause
    exit /b 1
)
echo   [OK] Docker laeuft

:: Create installation directory
echo.
echo [3/6] Erstelle Installationsverzeichnis...
if not exist "SMS-Server" mkdir SMS-Server
cd SMS-Server
echo   [OK] Verzeichnis erstellt: %cd%

:: Download Docker Compose file
echo.
echo [4/6] Lade Docker-Konfiguration...
powershell -Command "& {$url='https://raw.githubusercontent.com/Charrak/Protektor/main/docker-compose.prod.yml'; $output='docker-compose.yml'; Invoke-WebRequest -Uri $url -OutFile $output}" >nul 2>&1
if %errorlevel% neq 0 (
    echo FEHLER: Konnte Docker-Konfiguration nicht herunterladen.
    echo Bitte pruefen Sie Ihre Internetverbindung.
    pause
    exit /b 1
)
echo   [OK] Docker-Konfiguration geladen

:: Create .env file
echo.
echo [5/6] Erstelle Konfigurationsdatei...
if not exist ".env" (
    echo # SMS Server Konfiguration> .env
    echo.>> .env
    echo # Datenbank Passwort (AENDERN!)> .env
    echo POSTGRES_PASSWORD=sms_password_%random%>> .env
    echo.>> .env
    echo # JWT Secret (AENDERN!)> .env
    echo JWT_SECRET=change-this-secret-%random%-%random%-%random%>> .env
    echo.>> .env
    echo # Admin Email> .env
    echo PLATFORM_ADMIN_EMAIL=admin@sms-platform.com>> .env
    echo.>> .env
    echo # Admin Password (AENDERN!)> .env
    echo PLATFORM_ADMIN_PASSWORD=Admin123!>> .env
    echo.
    echo   [OK] Konfigurationsdatei erstellt: .env
    echo   [WICHTIG] Bitte .env oeffnen und Passwoerter aendern!
) else (
    echo   [INFO] .env existiert bereits, wird uebersprungen
)

:: Start containers
echo.
echo [6/6] Starte SMS Server...
docker-compose pull
docker-compose up -d

if %errorlevel% neq 0 (
    echo.
    echo FEHLER: Container konnten nicht gestartet werden.
    echo Bitte pruefen Sie die Logs: docker-compose logs
    pause
    exit /b 1
)

:: Wait for services
echo.
echo Warte bis alle Services bereit sind...
timeout /t 30 /nobreak >nul

:: Initialize database
echo.
echo Initialisiere Datenbank...
docker-compose exec -T backend npx prisma migrate deploy >nul 2>&1

:: Show success message
echo.
echo ========================================
echo   INSTALLATION ABGESCHLOSSEN!
echo ========================================
echo.
echo Ihr SMS Server laeuft jetzt!
echo.
echo Zugriff:
echo   Webseite: http://localhost:5173
echo   API: http://localhost:5000/api
echo.
echo Admin-Zugangsdaten:
echo   Email: admin@sms-platform.com
echo   Passwort: Admin123!
echo   [WICHTIG] Bitte sofort aendern!
echo.
echo Naechste Schritte:
echo   1. .env oeffnen und Passwoerter aendern
echo   2. Browser oeffnen: http://localhost:5173
echo   3. Mit Admin-Zugangsdaten anmelden
echo   4. Tenant anlegen fuer ersten Kunden
echo.
echo Hilfe:
echo   Logs anzeigen: docker-compose logs -f
echo   Server stoppen: docker-compose down
echo   Server starten: docker-compose up -d
echo.

:: Offer to open browser
set /p openBrowser="Browser jetzt oeffnen? (J/N): "
if /i "%openBrowser%"=="J" start http://localhost:5173

echo.
echo Installation abgeschlossen.
pause
