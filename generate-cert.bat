@echo off
echo Fejlesztési SSL tanúsítvány generálása...

:: Ellenőrizzük, hogy van-e OpenSSL
where openssl >nul 2>nul
if %errorlevel% neq 0 (
    echo OpenSSL nem található! Telepítsd a Git for Windows-t vagy OpenSSL-t.
    echo Git for Windows: https://git-scm.com/download/win
    pause
    exit /b 1
)

:: Létrehozzuk a tanúsítvány mappát
if not exist "certs" mkdir certs
cd certs

:: Generáljuk a privát kulcsot
openssl genrsa -out server.key 2048

:: Generáljuk a tanúsítványt
openssl req -new -x509 -key server.key -out server.crt -days 365 -subj "/C=HU/ST=Budapest/L=Budapest/O=Dev/OU=Dev/CN=192.168.0.19" -addext "subjectAltName=IP:192.168.0.19,DNS:localhost"

echo.
echo ✅ Tanúsítvány sikeresen generálva!
echo.
echo Fájlok:
echo - server.key (privát kulcs)
echo - server.crt (tanúsítvány)
echo.
echo Következő lépések:
echo 1. Importáld a server.crt-t a Windows tanúsítványtárolóba
echo 2. Indítsd újra a böngészőt
echo.
pause
