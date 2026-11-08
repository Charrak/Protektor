@echo off
:: ============================================
:: SMS - Customer Stop Server (Windows)
:: ============================================

echo.
echo ========================================
echo   SMS - Server stoppen
echo ========================================
echo.

cd SMS-Server

echo Stoppe SMS Server...
docker-compose down

if %errorlevel% neq 0 (
    echo.
    echo FEHLER: Server konnte nicht gestoppt werden.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SMS Server gestoppt!
echo ========================================
echo.
echo Zum erneuten Starten: start-customer.bat
echo.
pause
