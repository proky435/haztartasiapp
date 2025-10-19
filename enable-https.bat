@echo off
echo ========================================
echo   HTTPS Engedelyezese
echo ========================================
echo.

cd client

REM Ellenőrizzük, hogy léteznek-e az SSL fájlok
if not exist "..\ssl\server.crt" (
    echo HIBA: SSL tanusitvany nem talalhato!
    echo Futtasd elobb a generate-ssl.bat fajlt.
    pause
    exit /b 1
)

if not exist "..\ssl\server.key" (
    echo HIBA: SSL kulcs nem talalhato!
    echo Futtasd elobb a generate-ssl.bat fajlt.
    pause
    exit /b 1
)

echo SSL fajlok megtalalva. .env frissitese...

REM .env backup
if exist ".env" (
    copy ".env" ".env.backup" >nul
    echo .env backup keszult: .env.backup
)

REM .env frissítése
(
echo # Development server configuration
echo HOST=0.0.0.0
echo PORT=3000
echo.
echo # Allow access from any IP address on the local network
echo DANGEROUSLY_DISABLE_HOST_CHECK=true
echo.
echo # Disable host checking for mobile access
echo WDS_SOCKET_HOST=0.0.0.0
echo WDS_SOCKET_PORT=3000
echo.
echo # Enable HTTPS for camera access on mobile
echo HTTPS=true
echo SSL_CRT_FILE=../ssl/server.crt
echo SSL_KEY_FILE=../ssl/server.key
echo.
echo # Fast refresh settings
echo FAST_REFRESH=true
) > .env

echo.
echo ========================================
echo HTTPS sikeresen engedelyezve!
echo ========================================
echo.
echo Most inditsad ujra az alkalmazast:
echo cd client
echo npm start
echo.
echo Az alkalmazas elerheto lesz:
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        echo https://%%j:3000
    )
)
echo.
pause
