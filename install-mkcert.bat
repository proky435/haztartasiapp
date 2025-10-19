@echo off
echo ========================================
echo   mkcert Telepites es Hasznalat
echo ========================================
echo.

REM Ellenőrizzük a Chocolatey-t
where choco >nul 2>&1
if %errorlevel% neq 0 (
    echo Chocolatey nem talalhato. Telepitsd elobb:
    echo https://chocolatey.org/install
    echo.
    echo Vagy toltsd le manualis a mkcert-et:
    echo https://github.com/FiloSottile/mkcert/releases
    pause
    exit /b 1
)

echo mkcert telepitese...
choco install mkcert -y

echo.
echo mkcert inicializalasa...
mkcert -install

echo.
echo SSL tanusitvany generalasa...
if not exist "ssl" mkdir ssl
cd ssl

mkcert localhost 192.168.0.19 127.0.0.1

REM Fájlok átnevezése
ren localhost+3.pem server.crt
ren localhost+3-key.pem server.key

echo.
echo ========================================
echo mkcert tanusitvany kesz!
echo ========================================
echo.
echo Most futtasd: enable-https.bat
pause
